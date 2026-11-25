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
  @Volatile private var optThreads = 2
  @Volatile private var optDebug = false

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

    /** For finding the crash: how many threads the speech engine uses, and whether it prints its own details. */
    Function("setOptions") { threads: Int, debug: Boolean ->
      optThreads = threads
      optDebug = debug
      log("options: threads=$threads, debug=$debug")
    }

    /** Checks the copied speech files are all there. */
    Function("selfCheck") { selfCheck() }

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
    // Load from real files (copied out of the app once), not straight from the app's
    // assets: the assets route aborts inside the speech library on this tablet.
    val voiceDir = copyVoiceFiles(context.assets, voiceId)
    val config = OfflineTtsConfig(
      model = OfflineTtsModelConfig(
        vits = OfflineTtsVitsModelConfig(
          model = "$voiceDir/model.onnx",
          tokens = "$voiceDir/tokens.txt",
          dataDir = dataDir,
        ),
        numThreads = optThreads,
        debug = optDebug,
        provider = "cpu",
      ),
    )
    log("creating the speech engine from files (threads=$optThreads, debug=$optDebug)")
    return OfflineTts(config = config).also {
      tts = it
      loadedId = voiceId
      log("voice loaded in ${System.currentTimeMillis() - t0} ms")
    }
  }

  /** Copies a voice's model and tokens to the app's files folder the first time (about 60 MB). */
  private fun copyVoiceFiles(assets: AssetManager, voiceId: String): String {
    val dir = File(context.filesDir, "story-voice/$voiceId")
    dir.mkdirs()
    for (name in listOf("model.onnx", "tokens.txt")) {
      val target = File(dir, name)
      if (target.exists() && target.length() > 0) continue
      log("copying $voiceId/$name")
      val partial = File(dir, "$name.part")
      assets.open("voices/$voiceId/$name").use { input -> partial.outputStream().use { input.copyTo(it) } }
      if (!partial.renameTo(target)) throw IllegalStateException("couldn't save $name")
    }
    log("voice files ready in $dir")
    return dir.absolutePath
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
    out.append("\nSYSTEM LOG (speech engine and crash lines)\n").append(systemLog())
    return out.toString()
  }

  /** The app's own system log lines (the speech library writes its error here before it aborts). */
  private fun systemLog(): String {
    return try {
      val keep = Regex("(?i)(sherpa|onnx|espeak|abort|fatal|sigabrt|terminat|exception|mathvoice|story-voice|assert|cannot|symbol)")
      val found = mutableListOf<String>()
      for (args in listOf(
        arrayOf("logcat", "-d", "-b", "main,crash,system"),
        arrayOf("logcat", "-d"),
      )) {
        val process = Runtime.getRuntime().exec(args)
        process.inputStream.bufferedReader().useLines { lines -> lines.filter { keep.containsMatchIn(it) }.forEach { found.add(it) } }
        process.destroy()
        if (found.isNotEmpty()) break
      }
      if (found.isEmpty()) "(nothing)" else found.takeLast(40).joinToString("\n") { it.take(220) }
    } catch (e: Throwable) {
      "(couldn't read: ${e.message})"
    }
  }

  private fun selfCheck(): String {
    val sb = StringBuilder()
    try {
      val espeak = File(context.filesDir, "espeak-ng-data")
      val files = espeak.walkTopDown().filter { it.isFile }.toList()
      sb.append("speech data: ${files.size} files, ${files.sumOf { it.length() }} bytes (should be 355 files, 17991651 bytes)\n")
      for (name in listOf("phontab", "phonindex", "phondata", "intonations", "en_dict")) {
        sb.append("  $name: ${File(espeak, name).length()} bytes\n")
      }
      val voices = File(context.filesDir, "story-voice")
      voices.walkTopDown().filter { it.isFile }.forEach { sb.append("${it.relativeTo(voices.parentFile!!)}: ${it.length()} bytes\n") }
      sb.append("(model.onnx should be 63149198 bytes, tokens.txt 954)\n")
    } catch (e: Throwable) {
      sb.append("(couldn't check: ${e.message})\n")
    }
    return sb.toString()
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

  /** Pulls the lines that name the problem (abort message, signal, library, call stack) out of a native crash report. */
  private fun nativeCrashLines(info: ApplicationExitInfo): String {
    return try {
      val bytes = info.traceInputStream?.use { it.readBytes() } ?: return "  (no crash report kept)\n"
      val runs = Regex("[ -~]{6,}").findAll(String(bytes, Charsets.ISO_8859_1)).map { it.value }
      val keep = Regex("(?i)(abort|sigabrt|signal|terminat|exception|assert|cannot|symbol|sherpa|onnx|espeak|story-voice|mathvoice|__cxa|pthread_kill|tgkill|raise|libc\\+\\+|std::)")
      val lines = runs.filter { keep.containsMatchIn(it) }.distinct().take(60).toList()
      "  (crash report is ${bytes.size} bytes)\n" +
        if (lines.isEmpty()) "  (nothing readable)\n" else lines.joinToString("") { "  ${it.take(200)}\n" }
    } catch (e: Throwable) {
      "  (couldn't read the crash report: ${e.message})\n"
    }
  }
}
