package expo.modules.mathnearby

import android.os.Handler
import android.os.Looper
import android.os.Process
import android.os.SystemClock
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import com.google.android.gms.tasks.Task
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Only phones running Math Game find each other. */
private const val SERVICE_ID = "com.xjjohnson.mathgame"

/** One host, any number of guests. */
private val STRATEGY = Strategy.P2P_STAR

private const val ENDPOINT_FOUND = "onEndpointFound"
private const val ENDPOINT_LOST = "onEndpointLost"
private const val CONNECTION_REQUEST = "onConnectionRequest"
private const val CONNECTED = "onConnected"
private const val CONNECTION_FAILED = "onConnectionFailed"
private const val DISCONNECTED = "onDisconnected"
private const val MESSAGE = "onMessage"

/** The app closes itself after this long in the background. */
private const val BACKGROUND_LIMIT_MS = 30L * 60L * 1000L

/** How often the background clock is checked. */
private const val BACKGROUND_CHECK_MS = 60L * 1000L

/**
 * A thin bridge over Google Nearby Connections. It sends and receives short
 * text messages; the game logic and message format live in JavaScript.
 */
class MathNearbyModule : Module() {
  private val client: ConnectionsClient by lazy {
    Nearby.getConnectionsClient(appContext.reactContext ?: throw Exceptions.ReactContextLost())
  }

  private val connected = mutableSetOf<String>()

  private val mainHandler = Handler(Looper.getMainLooper())

  /** When the app last went to the background, on the clock that keeps counting while the phone sleeps. */
  private var backgroundSince = 0L

  // Checks once a minute rather than waiting 30 minutes in one go, because a
  // sleeping phone pauses timers; this way it closes soon after it wakes up.
  private val backgroundCheck = object : Runnable {
    override fun run() {
      if (SystemClock.elapsedRealtime() - backgroundSince >= BACKGROUND_LIMIT_MS) {
        closeApp()
      } else {
        mainHandler.postDelayed(this, BACKGROUND_CHECK_MS)
      }
    }
  }

  private val payloads = object : PayloadCallback() {
    override fun onPayloadReceived(endpointId: String, payload: Payload) {
      val bytes = payload.asBytes() ?: return
      sendEvent(MESSAGE, mapOf("endpointId" to endpointId, "text" to String(bytes, Charsets.UTF_8)))
    }

    override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) = Unit
  }

  private val lifecycle = object : ConnectionLifecycleCallback() {
    override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
      sendEvent(
        CONNECTION_REQUEST,
        mapOf(
          "endpointId" to endpointId,
          "name" to info.endpointName,
          "authDigits" to info.authenticationDigits,
          "incoming" to info.isIncomingConnection,
        ),
      )
      // Both sides accept right away; the screen shows the matching digits.
      client.acceptConnection(endpointId, payloads)
    }

    override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
      if (result.status.statusCode == ConnectionsStatusCodes.STATUS_OK) {
        connected.add(endpointId)
        sendEvent(CONNECTED, mapOf("endpointId" to endpointId))
      } else {
        sendEvent(
          CONNECTION_FAILED,
          mapOf("endpointId" to endpointId, "status" to result.status.statusCode),
        )
      }
    }

    override fun onDisconnected(endpointId: String) {
      connected.remove(endpointId)
      sendEvent(DISCONNECTED, mapOf("endpointId" to endpointId))
    }
  }

  private val discovery = object : EndpointDiscoveryCallback() {
    override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
      if (info.serviceId != SERVICE_ID) return
      sendEvent(ENDPOINT_FOUND, mapOf("endpointId" to endpointId, "name" to info.endpointName))
    }

    override fun onEndpointLost(endpointId: String) {
      sendEvent(ENDPOINT_LOST, mapOf("endpointId" to endpointId))
    }
  }

  override fun definition() = ModuleDefinition {
    Name("MathNearby")

    Events(
      ENDPOINT_FOUND,
      ENDPOINT_LOST,
      CONNECTION_REQUEST,
      CONNECTED,
      CONNECTION_FAILED,
      DISCONNECTED,
      MESSAGE,
    )

    AsyncFunction("startHosting") { name: String, promise: Promise ->
      val options = AdvertisingOptions.Builder().setStrategy(STRATEGY).build()
      settle(client.startAdvertising(name, SERVICE_ID, lifecycle, options), promise, "ERR_NEARBY_HOST")
    }

    AsyncFunction("startFinding") { promise: Promise ->
      val options = DiscoveryOptions.Builder().setStrategy(STRATEGY).build()
      settle(client.startDiscovery(SERVICE_ID, discovery, options), promise, "ERR_NEARBY_FIND")
    }

    AsyncFunction("connect") { name: String, endpointId: String, promise: Promise ->
      settle(client.requestConnection(name, endpointId, lifecycle), promise, "ERR_NEARBY_CONNECT")
    }

    AsyncFunction("send") { endpointId: String?, text: String, promise: Promise ->
      val targets = if (endpointId != null) listOf(endpointId) else connected.toList()
      if (targets.isEmpty()) {
        promise.reject("ERR_NEARBY_NOT_CONNECTED", "No phone is connected yet", null)
      } else {
        val payload = Payload.fromBytes(text.toByteArray(Charsets.UTF_8))
        settle(client.sendPayload(targets, payload), promise, "ERR_NEARBY_SEND")
      }
    }

    // Searching uses the radio heavily and makes open connections slow and
    // flaky, so phones stop searching once they are connected.
    Function("stopFinding") {
      stopFinding()
    }

    Function("stop") {
      stopAll()
    }

    // Nearby, sounds and timers would otherwise keep going while the app sits
    // in the background, so after 30 minutes away the app closes itself.
    OnActivityEntersBackground {
      backgroundSince = SystemClock.elapsedRealtime()
      mainHandler.removeCallbacks(backgroundCheck)
      mainHandler.postDelayed(backgroundCheck, BACKGROUND_CHECK_MS)
    }

    OnActivityEntersForeground {
      mainHandler.removeCallbacks(backgroundCheck)
    }

    OnDestroy {
      mainHandler.removeCallbacks(backgroundCheck)
      stopAll()
    }
  }

  /** Hangs up Nearby, removes the app from Recents and ends it. Progress is already saved as it changes. */
  private fun closeApp() {
    mainHandler.removeCallbacks(backgroundCheck)
    try {
      stopAll()
    } catch (error: Exception) {
      // Closing matters more than a clean hang-up.
    }
    appContext.currentActivity?.finishAndRemoveTask()
    mainHandler.postDelayed({ Process.killProcess(Process.myPid()) }, 500L)
  }

  private fun stopFinding() {
    if (appContext.reactContext == null) return
    client.stopDiscovery()
  }

  private fun stopAll() {
    if (appContext.reactContext == null) return
    client.stopAdvertising()
    client.stopDiscovery()
    client.stopAllEndpoints()
    connected.clear()
  }

  private fun settle(task: Task<Void>, promise: Promise, code: String) {
    task
      .addOnSuccessListener { promise.resolve() }
      .addOnFailureListener { error -> promise.reject(code, error.message, error) }
  }
}
