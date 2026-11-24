package expo.modules.mathvoice

import android.content.Context
import android.content.res.AssetManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.concurrent.Executors

/**
 * Story Voice: natural Piper voices that run on the tablet with sherpa-onnx, no internet.
 * Each voice lives in assets/voices/<id>/ (model.onnx, tokens.txt); espeak-ng-data is shared.
 * A voice is loaded the first time it speaks and let go when another one is used, so players
 * without Story Voice never pay for it.
 */
class MathVoiceModule : Module() {
  private val worker = Executors.newSingleThreadExecutor()
  private var tts: OfflineTts? = null
  private var loadedId: String? = null
  private var track: AudioTrack? = null
  @Volatile private var generation = 0

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No context")

  override fun definition() = ModuleDefinition {
    Name("MathVoice")

    /** Ids of the voices built into this APK, e.g. ["hfc_female", "hfc_male"]. */
    Function("voices") {
      context.assets.list("voices")?.filter { it != "espeak-ng-data" }?.toList() ?: emptyList<String>()
    }

    /** Speaks text in a built-in voice. Resolves when it has finished or was stopped. */
    AsyncFunction("speak") { voiceId: String, text: String, speed: Double, promise: expo.modules.kotlin.Promise ->
      val mine = ++generation
      stopTrack()
      worker.execute {
        try {
          if (mine != generation) return@execute promise.resolve(null)
          val engine = engineFor(voiceId)
          val audio = engine.generate(text, 0, speed.toFloat())
          if (mine != generation) return@execute promise.resolve(null)
          play(audio.samples, audio.sampleRate)
          promise.resolve(null)
        } catch (e: Throwable) {
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
    val dataDir = copyEspeakData(context.assets)
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
    return OfflineTts(assetManager = context.assets, config = config).also {
      tts = it
      loadedId = voiceId
    }
  }

  /** espeak-ng needs real files, so its data is copied out of the APK once. */
  private fun copyEspeakData(assets: AssetManager): String {
    val target = File(context.filesDir, "espeak-ng-data")
    val done = File(target, ".copied")
    if (!done.exists()) {
      copyAssetDir(assets, "voices/espeak-ng-data", target)
      done.writeText("1")
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
}
