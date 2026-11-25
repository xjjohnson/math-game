package expo.modules.mathvoice

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.content.res.AssetManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.util.Log
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

/**
 * Story Voice: natural Piper voices that run on the tablet with sherpa-onnx, no internet.
 * Each voice lives in assets/voices/<id>/ (model.onnx, tokens.txt); espeak-ng-data is shared.
 * A voice is loaded the first time it speaks and let go when another one is used, so players
 * without Story Voice never pay for it.
 */
class MathVoiceModule : Module() {
  // A big stack (16 MB): the speech engine does deep native work on this thread.
  private val worker = Executors.newSingleThreadExecutor { r -> Thread(null, r, "story-voice", 16L * 1024 * 1024) }
  private var tts: OfflineTts? = null
  private var loadedId: String? = null
  private var track: AudioTrack? = null
  @Volatile private var generation = 0

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No context")

  override fun definition() = ModuleDefinition {
    Name("MathVoice")

    OnCreate {
      val before = Thread.getDefaultUncaughtExceptionHandler()
      Thread.setDefaultUncaughtExceptionHandler { thread, error ->
        log("APP CRASH in thread ${thread.name}: ${Log.getStackTraceString(error)}")
        before?.uncaughtException(thread, error)
      }
      log("--- app started, Android ${Build.VERSION.SDK_INT}, ${Build.MODEL}")
    }

    /** What happened to the app lately (why it closed) and what Story Voice was doing. */
    Function("readLog") { readLog() }

    Function("clearLog") {
      try {
        logFile.delete()
      } catch (_: Throwable) {
      }
    }

    /** Ids of the voices built into this APK, e.g. ["hfc_female", "hfc_male"]. */
    Function("voices") {
      context.assets.list("voices")?.filter { it != "espeak-ng-data" }?.toList() ?: emptyList<String>()
    }

    /** Speaks text in a built-in voice. Resolves when it has finished or was stopped. */
    AsyncFunction("speak") { voiceId: String, text: String, speed: Double, promise: expo.modules.kotlin.Promise ->
      val mine = ++generation
      stopTrack()
      log("speak: voice=$voiceId, ${text.length} letters, speed=$speed")
      worker.execute {
        try {
          if (mine != generation) return@execute promise.resolve(null)
          val engine = engineFor(voiceId)
          log("generating sound")
          val t0 = System.currentTimeMillis()
          val audio = engine.generate(text, 0, speed.toFloat())
          log("generated ${audio.samples.size} samples at ${audio.sampleRate} Hz in ${System.currentTimeMillis() - t0} ms")
          if (mine != generation) return@execute promise.resolve(null)
          // An empty result would make a zero-size audio buffer, which crashes.
          if (audio.samples.isEmpty()) throw IllegalStateException("Story Voice made no sound")
          log("playing")
          play(audio.samples, audio.sampleRate)
          log("finished playing")
          promise.resolve(null)
        } catch (e: Throwable) {
          log("ERROR: ${Log.getStackTraceString(e)}")
          promise.reject("ERR_VOICE", e.message ?: "Story Voice couldn't speak", e)
        }
      }
    }

    Function("stop") {
      generation++
      stopTrack()
    }

    OnDestroy {
      generation++
      stopTrack()
      worker.execute {
        tts?.release()
        tts = null
      }
      worker.shutdown()
    }
  }

  private fun engineFor(voiceId: String): OfflineTts {
    tts?.let { if (loadedId == voiceId) return it }
    tts?.release()
    tts = null
    log("loading voice $voiceId")
    val t0 = System.currentTimeMillis()
    val dataDir = copyEspeakData(context.assets)
    log("speech data ready at $dataDir")
    val config = OfflineTtsConfig(
      model = OfflineTtsModelConfig(
        vits = OfflineTtsVitsModelConfig(
          model = "voices/$voiceId/model.onnx",
          tokens = "voices/$voiceId/tokens.txt",
          dataDir = dataDir,
        ),
        numThreads = 2,
        debug = false,
        provider = "cpu",
      ),
    )
    log("creating the speech engine")
    return OfflineTts(assetManager = context.assets, config = config).also {
      tts = it
      loadedId = voiceId
      log("voice loaded in ${System.currentTimeMillis() - t0} ms")
    }
  }

  /** espeak-ng needs real files, so its data is copied out of the APK once. */
  private fun copyEspeakData(assets: AssetManager): String {
    val target = File(context.filesDir, "espeak-ng-data")
    val done = File(target, ".copied")
    if (!done.exists()) {
      log("copying speech data out of the app")
      copyAssetDir(assets, "voices/espeak-ng-data", target)
      done.writeText("1")
      log("copied ${target.walkTopDown().count { it.isFile }} files")
    }
    return target.absolutePath
  }

  private fun copyAssetDir(assets: AssetManager, from: String, to: File) {
    val children = assets.list(from) ?: emptyArray()
    if (children.isEmpty()) {
      to.parentFile?.mkdirs()
      assets.open(from).use { input -> to.outputStream().use { input.copyTo(it) } }
      return
    }
    to.mkdirs()
    for (child in children) copyAssetDir(assets, "$from/$child", File(to, child))
  }

  private fun play(samples: FloatArray, sampleRate: Int) {
    val t = AudioTrack.Builder()
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build(),
      )
      .setAudioFormat(
        AudioFormat.Builder()
          .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
          .setSampleRate(sampleRate)
          .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .build(),
      )
      .setTransferMode(AudioTrack.MODE_STATIC)
      .setBufferSizeInBytes(samples.size * 4)
      .build()
    t.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING)
    synchronized(this) { track = t }
    t.play()
    // Wait until it's played (or stopped), then free it.
    val ms = samples.size * 1000L / sampleRate
    val end = System.currentTimeMillis() + ms + 200
    while (System.currentTimeMillis() < end && t.playState == AudioTrack.PLAYSTATE_PLAYING) Thread.sleep(50)
    synchronized(this) {
      if (track === t) track = null
    }
    t.release()
  }

  private fun stopTrack() {
    synchronized(this) {
      try {
        track?.stop()
      } catch (_: IllegalStateException) {
      }
    }
  }

  // ---- Story Voice log: kept in a file so it survives a crash ----

  private val logFile: File
    get() = File(context.filesDir, "story-voice.log")

  private fun stamp(time: Long = System.currentTimeMillis()): String =
    SimpleDateFormat("MMM d HH:mm:ss", Locale.US).format(Date(time))

  @Synchronized
  private fun log(message: String) {
    try {
      val file = logFile
      if (file.length() > 60_000) file.delete()
      FileOutputStream(file, true).use { out ->
        out.write("${stamp()} $message\n".toByteArray())
        out.fd.sync()
      }
    } catch (_: Throwable) {
    }
  }

  private fun readLog(): String {
    val out = StringBuilder()
    out.append("WHY THE APP CLOSED LATELY\n").append(exitReasons()).append("\n")
    out.append("STORY VOICE STEPS (newest last)\n")
    out.append(
      try {
        logFile.readText().takeLast(6000).ifBlank { "(nothing yet)" }
      } catch (_: Throwable) {
        "(nothing yet)"
      },
    )
    return out.toString()
  }

  /** Android keeps the reasons this app's recent processes ended, with a crash report for native crashes. */
  private fun exitReasons(): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return "(needs Android 11 or newer)\n"
    return try {
      val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      val infos = manager.getHistoricalProcessExitReasons(context.packageName, 0, 4)
      if (infos.isEmpty()) return "(none recorded)\n"
      val sb = StringBuilder()
      for (info in infos) {
        val reason = when (info.reason) {
          ApplicationExitInfo.REASON_CRASH -> "CRASH (Java)"
          ApplicationExitInfo.REASON_CRASH_NATIVE -> "CRASH (native)"
          ApplicationExitInfo.REASON_ANR -> "NOT RESPONDING"
          ApplicationExitInfo.REASON_LOW_MEMORY -> "OUT OF MEMORY"
          ApplicationExitInfo.REASON_EXIT_SELF -> "closed itself"
          ApplicationExitInfo.REASON_SIGNALED -> "KILLED by signal"
          ApplicationExitInfo.REASON_USER_REQUESTED -> "closed by you"
          ApplicationExitInfo.REASON_USER_STOPPED -> "force stopped"
          ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "dependency died"
          ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "permission change"
          else -> "reason ${info.reason}"
        }
        sb.append("${stamp(info.timestamp)}: $reason, status ${info.status}, ${info.description ?: ""}\n")
        if (info.reason == ApplicationExitInfo.REASON_CRASH_NATIVE) sb.append(nativeCrashLines(info))
      }
      sb.toString()
    } catch (e: Throwable) {
      "(couldn't read: ${e.message})\n"
    }
  }

  /** Pulls the readable lines (signal, library names, call stack) out of a native crash report. */
  private fun nativeCrashLines(info: ApplicationExitInfo): String {
    return try {
      val bytes = info.traceInputStream?.use { it.readBytes() } ?: return "  (no crash report kept)\n"
      val runs = Regex("[ -~]{8,}").findAll(String(bytes, Charsets.ISO_8859_1)).map { it.value }
      val keep = Regex("(?i)(signal|abort|fault|#[0-9]+ pc|\\.so|sherpa|onnx|espeak|\\.kt|java\\.|exception|cause)")
      val lines = runs.filter { keep.containsMatchIn(it) }.distinct().take(30).toList()
      if (lines.isEmpty()) "  (crash report had nothing readable)\n" else lines.joinToString("") { "  ${it.take(160)}\n" }
    } catch (e: Throwable) {
      "  (couldn't read the crash report: ${e.message})\n"
    }
  }
}
