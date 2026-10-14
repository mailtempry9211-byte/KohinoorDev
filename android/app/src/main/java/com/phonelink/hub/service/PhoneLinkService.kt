package com.phonelink.hub.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.phonelink.hub.MainActivity
import com.phonelink.hub.R
import com.phonelink.hub.calls.CallLogRepository
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.data.Events
import com.phonelink.hub.files.FileRepository
import com.phonelink.hub.location.LocationRepository
import com.phonelink.hub.net.WebSocketClient
import com.phonelink.hub.sms.SmsRepository
import com.phonelink.hub.util.Battery
import com.phonelink.hub.util.WifiName
import com.phonelink.hub.notifications.NotificationListener
import com.phonelink.hub.notifications.WebSocketHolder
import org.json.JSONObject

/**
 * Foreground service that keeps the relay socket alive, streams telemetry and
 * answers the dashboard commands. The persistent notification is what lets
 * Android keep this process running while the user is in another app.
 */
class PhoneLinkService : Service() {

    private lateinit var webSocket: WebSocketClient
    private lateinit var location: LocationRepository

    override fun onCreate() {
        super.onCreate()
        DevicePrefs.init(this)

        location = LocationRepository(this)

        webSocket = WebSocketClient(
            prefsProvider = { Pair(DevicePrefs.serverIp, DevicePrefs.serverPort) },
            listener = object : WebSocketClient.Listener {

                override fun onOpen() {
                    Log.d(TAG, "socket onOpen: registering + syncing everything")
                    pushStatus()
                    // Give the notification listener the live socket so it can
                    // mirror without owning a connection itself.
                    WebSocketHolder.webSocket = webSocket
                    register()
                    // Re-push everything so the dashboard recovers on its own
                    // after a socket drop or a relay restart.
                    syncAll()
                }

                override fun onClosed() {
                    updateNotification("Reconnecting…")
                }

                override fun onFailure(message: String) {
                    updateNotification(message)
                }

                override fun onCommand(event: String, payload: JSONObject) {
                    handleCommand(event, payload)
                }
            }
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startAsForeground("Connecting to dashboard…")
        instance = this

        // START_STICKY and receiver triggers can call this repeatedly, so only
        // open a socket if one is not already in flight.
        if (!webSocket.isOpen) {
            webSocket.connect()
        }
        location.startUpdates(LOCATION_INTERVAL_MS) { fix ->
            webSocket.send(Events.LOCATION_UPDATE, fix)
        }

        return START_STICKY
    }

    override fun onDestroy() {
        webSocket.disconnect()
        location.stopUpdates()
        // The listener is bound by the OS, so stop pointing it at our dead socket.
        WebSocketHolder.webSocket = null
        instance = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /** True while the relay socket is actually established. */
    val isServiceConnected: Boolean
        get() = webSocket.isOpen

    // ---------------------------------------------------------------- commands

    private fun handleCommand(event: String, payload: JSONObject) {
        when (event) {
            Events.SEND_SMS_COMMAND -> handleSendSms(payload)
            Events.FILE_LIST_REQUEST -> handleFileList(payload)
            Events.FILE_DOWNLOAD_REQUEST -> handleFileDownload(payload)
            Events.FILE_UPLOAD_CHUNK -> handleFileUpload(payload)
            Events.LOCATION_REQUEST -> pushLocation()
            Events.NOTIFICATION_DISMISS_COMMAND -> handleNotificationDismiss(payload)
            Events.NOTIFICATION_CLEAR_ALL_COMMAND -> handleNotificationClearAll(payload)
            else -> Log.w(TAG, "unhandled command: $event")
        }
    }

    private fun handleSendSms(payload: JSONObject) {
        val recipient = payload.optString("recipient")
        val message = payload.optString("message")

        val success = SmsRepository.sendSms(this, recipient, message)
        webSocket.send(
            Events.SEND_SMS_RESULT,
            JSONObject().apply {
                put("recipient", recipient)
                put("success", success)
                if (!success) put("error", "SMS permission not granted or send failed")
            }
        )

        if (success) pushSms()
    }

    private fun handleFileList(payload: JSONObject) {
        val path = payload.optString("path", "/")
        webSocket.send(Events.FILE_LIST_RESPONSE, FileRepository.list(path))
    }

    private fun handleFileDownload(payload: JSONObject) {
        val path = payload.optString("path")
        val meta = FileRepository.metaOf(path)
        Log.d(TAG, "handleFileDownload: path=$path hasPermission=${FileRepository.hasPermission(this)}")

        val started = FileRepository.encodeInChunks(this, path) { chunk, isLast ->
            val body = JSONObject().apply {
                put("path", path)
                put("name", meta.optString("name"))
                put("mimeType", meta.optString("mimeType"))
                put("data", chunk)
                put("isLastChunk", isLast)
            }
            webSocket.send(Events.FILE_DOWNLOAD_RESPONSE, body)
        }
        Log.d(TAG, "handleFileDownload: started=$started")

        if (!started) {
            webSocket.send(
                Events.FILE_DOWNLOAD_RESPONSE,
                JSONObject().apply {
                    put("path", path)
                    put("data", "")
                    put("isLastChunk", true)
                    put("error", "Could not read file. Grant storage access.")
                }
            )
        }
    }

    private fun handleFileUpload(payload: JSONObject) {
        val path = payload.optString("path")
        val data = payload.optString("data")
        val isLast = payload.optBoolean("isLastChunk")

        val stored = FileRepository.writeChunk(this, path, data, isLast)
        webSocket.send(
            Events.FILE_UPLOAD_STATUS,
            JSONObject().apply {
                put("path", path)
                put("stored", stored && isLast)
            }
        )

        if (stored && isLast) pushFileListAt(parentDirOf(path))
    }

    private fun handleNotificationDismiss(payload: JSONObject) {
        val key = payload.optString("key")
        if (key.isNullOrBlank()) return
        val listener = com.phonelink.hub.notifications.NotificationListener.instance
        val dismissed = listener?.cancelByKey(key) == true
        webSocket.send(
            Events.NOTIFICATION_DISMISS_RESULT,
            JSONObject().apply {
                put("key", key)
                put("deviceId", DevicePrefs.deviceId)
                put("dismissed", dismissed)
            }
        )
    }

    private fun handleNotificationClearAll(payload: JSONObject) {
        val listener = com.phonelink.hub.notifications.NotificationListener.instance
        listener?.cancelAll()
    }

    private fun parentDirOf(path: String): String {
        val trimmed = path.trimEnd('/')
        val parent = trimmed.substringBeforeLast('/', "")
        return if (parent.isEmpty()) "/" else "/$parent/"
    }

    // ------------------------------------------------------------------- pushes

    private fun register() {
        val ctx = this@PhoneLinkService
        webSocket.send(
            Events.DEVICE_REGISTER,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("deviceName", DevicePrefs.deviceName)
                put("battery", Battery.level(ctx))
                put("isCharging", Battery.isCharging(ctx))
                put("wifiName", WifiName.current(ctx))
            }
        )
    }

    fun pushStatus() {
        val ctx = this@PhoneLinkService
        webSocket.send(
            Events.DEVICE_STATUS,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("battery", Battery.level(ctx))
                put("isCharging", Battery.isCharging(ctx))
                put("wifiName", WifiName.current(ctx))
            }
        )
    }

    fun pushCalls() {
        // Always send, even when empty — an early return here made a missing
        // READ_CALL_LOG permission (or MIUI silently revoking it) look
        // identical to "no calls yet", with zero visibility into which one
        // it actually was.
        val hasPermission = CallLogRepository.hasPermission(this)
        val calls = if (hasPermission) CallLogRepository.readCalls(this, 300) else emptyList()
        Log.d(TAG, "pushCalls: hasPermission=$hasPermission count=${calls.size}")
        webSocket.send(
            Events.SYNC_CALLS,
            JSONObject().apply {
                // The server keys every dataset by deviceId — without this,
                // calls/messages/location all get silently filed under
                // "undefined" and never show up for the selected device.
                put("deviceId", DevicePrefs.deviceId)
                put("calls", toArray(calls))
                if (!hasPermission) put("error", "READ_CALL_LOG permission not granted")
            }
        )
    }

    fun pushSms() {
        val hasPermission = SmsRepository.hasReadPermission(this)
        val messages = if (hasPermission) SmsRepository.readAll(this, 600) else emptyList()
        Log.d(TAG, "pushSms: hasPermission=$hasPermission count=${messages.size}")
        webSocket.send(
            Events.SYNC_SMS,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("messages", toArray(messages))
                if (!hasPermission) put("error", "READ_SMS permission not granted")
            }
        )
    }

    fun pushLocation() {
        Log.d(TAG, "pushLocation: hasPermission=${location.hasPermission} requesting fix")
        location.currentFix { fix ->
            fix.put("deviceId", DevicePrefs.deviceId)
            Log.d(TAG, "pushLocation: got fix $fix")
            webSocket.send(Events.LOCATION_UPDATE, fix)
        }
    }

    private fun pushFileListAt(path: String) {
        webSocket.send(Events.FILE_LIST_RESPONSE, FileRepository.list(path))
    }

    // -------------------------------------------------------------- notification

    private fun startAsForeground(text: String) {
        createChannel()
        val notification = buildNotification(text)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun buildNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pi = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(DevicePrefs.deviceName)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pi)
            .build()
    }

    private fun updateNotification(text: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(text))
    }

    private fun createChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_MIN
        ).apply {
            description = getString(R.string.notification_channel_desc)
            setShowBadge(false)
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    private fun toArray(items: List<JSONObject>) = org.json.JSONArray().apply { items.forEach { put(it) } }

    companion object {
        private const val TAG = "PhoneLinkService"
        private const val CHANNEL_ID = "phonelink_service"
        private const val NOTIFICATION_ID = 4201
        private const val LOCATION_INTERVAL_MS = 20_000L

        @Volatile
        var instance: PhoneLinkService? = null
            private set

        /** Starts the service; safe to call repeatedly. */
        fun start(context: Context) {
            val intent = Intent(context, PhoneLinkService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, PhoneLinkService::class.java))
            instance = null
        }

        /** Called from the SMS receiver. */
        fun pushSmsUpdate(context: Context) {
            if (instance == null) PhoneLinkService.start(context)
            android.os.Handler(Looper.getMainLooper()).post {
                instance?.pushSms()
            }
        }

        /** Called from the phone-state receiver. */
        fun pushCallUpdate(context: Context) {
            if (instance == null) PhoneLinkService.start(context)
            android.os.Handler(Looper.getMainLooper()).post {
                instance?.pushCalls()
            }
        }

        /** Alerts the dashboard the moment the phone starts ringing. */
        fun pushIncomingCallAlert(context: Context, number: String?) {
            if (instance == null) PhoneLinkService.start(context)
            android.os.Handler(Looper.getMainLooper()).post {
                instance?.pushIncomingCall(number)
            }
        }

        fun resetReceiverState() {
            com.phonelink.hub.receiver.PhoneStateReceiver.reset()
        }
    }

    /**
     * Publishes a live ring. Broadcast intents expose the ringing number via
     * `EXTRA_INCOMING_NUMBER` (READ_CALL_LOG grantees it, deprecated on 29+ but
     * commonly still populated). It may arrive empty, so the dashboard falls
     * back to a generic "Incoming call" alert.
     */
    fun pushIncomingCall(number: String?) {
        webSocket.send(
            Events.INCOMING_CALL_RING,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("number", number ?: JSONObject.NULL)
                put("name", lookUpContactName(number))
                put("timestamp", System.currentTimeMillis())
            }
        )
    }

    /** Resolves a caller name from the call log so the alert can show a label. */
    private fun lookUpContactName(number: String?): String? {
        if (number.isNullOrBlank()) return null
        return try {
            CallLogRepository.readCalls(this, 50)
                .firstOrNull { it.optString("number") == number }
                ?.optString("name")
                ?.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }
    }

    /** Forces a full sync of every dataset. */
    fun syncAll() {
        pushStatus()
        pushCalls()
        pushSms()
        pushLocation()
    }
}
