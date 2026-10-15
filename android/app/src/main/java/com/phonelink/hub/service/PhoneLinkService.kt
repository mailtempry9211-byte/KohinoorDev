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
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.phonelink.hub.MainActivity
import com.phonelink.hub.R
import com.phonelink.hub.calls.CallLogRepository
import com.phonelink.hub.contacts.ContactsRepository
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.data.Events
import com.phonelink.hub.files.FileRepository
import com.phonelink.hub.findphone.FindPhoneManager
import com.phonelink.hub.location.LocationRepository
import com.phonelink.hub.net.WebSocketClient
import com.phonelink.hub.sms.SmsRepository
import com.phonelink.hub.util.Battery
import com.phonelink.hub.util.WifiName
import com.phonelink.hub.notifications.NotificationListener
import com.phonelink.hub.notifications.WebSocketHolder
import com.phonelink.hub.remote.AudioPlayer
import com.phonelink.hub.remote.ClipboardReader
import com.phonelink.hub.remote.LockController
import com.phonelink.hub.remote.TtsSpeaker
import com.phonelink.hub.remote.VibratorController
import com.phonelink.hub.remote.WallpaperSetter
import com.phonelink.hub.accessibility.FindPhoneAccessibilityService
import com.phonelink.hub.files.MediaGalleryRepository
import com.phonelink.hub.remote.ClipboardWriter
import com.phonelink.hub.remote.LostModeController
import com.phonelink.hub.remote.UrlOpener
import com.phonelink.hub.remote.VolumeController
import com.phonelink.hub.system.AppLauncher
import com.phonelink.hub.system.AppsRepository
import com.phonelink.hub.system.SysInfoRepository
import com.phonelink.hub.system.WifiRepository
import org.json.JSONObject

/**
 * Foreground service that keeps the relay socket alive, streams telemetry and
 * answers the dashboard commands. The persistent notification is what lets
 * Android keep this process running while the user is in another app.
 */
class PhoneLinkService : Service() {

    private lateinit var webSocket: WebSocketClient
    private lateinit var location: LocationRepository
    private lateinit var ttsSpeaker: TtsSpeaker
    private lateinit var audioPlayer: AudioPlayer

    // BUG 2: periodic refresh so calls/SMS stay fresh while the service runs
    // (previously they synced only once inside onOpen/syncAll).
    private val syncHandler = Handler(Looper.getMainLooper())
    private val periodicSync = object : Runnable {
        override fun run() {
            try {
                pushCalls()
                pushSms()
                pushContacts()
                if (DevicePrefs.notificationSyncEnabled) {
                    pushNotifications()
                }
                pushStatus()
            } catch (e: Exception) {
                Log.w(TAG, "periodic sync failed", e)
            }
            syncHandler.postDelayed(this, PERIODIC_SYNC_MS)
        }
    }

    private fun startPeriodicSync() {
        syncHandler.removeCallbacks(periodicSync)
        syncHandler.postDelayed(periodicSync, PERIODIC_SYNC_MS)
    }

    private fun stopPeriodicSync() {
        syncHandler.removeCallbacks(periodicSync)
    }

    override fun onCreate() {
        super.onCreate()
        DevicePrefs.init(this)

        location = LocationRepository(this)
        ttsSpeaker = TtsSpeaker(this)
        audioPlayer = AudioPlayer(this)

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
                    flushOfflineLocations()
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
        if (DevicePrefs.locationFeatureEnabled && location.hasPermission) {
            location.startUpdates(LOCATION_INTERVAL_MS) { fix ->
                onLocationFix(fix)
            }
        }
        startPeriodicSync()
        // FEATURE D: safety net — reschedules the 15-min restart check.
        try { com.phonelink.hub.receiver.KeepAliveWorker.schedule(this) } catch (_: Exception) { }

        return START_STICKY
    }

    override fun onDestroy() {
        stopPeriodicSync()
        webSocket.disconnect()
        location.stopUpdates()
        ttsSpeaker.shutdown()
        audioPlayer.release()
        ClipboardReader.release(this)
        com.phonelink.hub.media.MicRecorder.cancel()
        com.phonelink.hub.media.ScreenRecorder.stop()
        com.phonelink.hub.media.CameraStreamer.stop()
        com.phonelink.hub.media.AudioStreamer.stop()
        try { com.phonelink.hub.remote.TorchController.toggleTorch(this, false) } catch (_: Exception) {}
        com.phonelink.hub.media.MediaProjectionHolder.release()
        // The listener is bound by the OS, so stop pointing it at our dead socket.
        WebSocketHolder.webSocket = null
        instance = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /** True while the relay socket is actually established. */
    val isServiceConnected: Boolean
        get() = webSocket.isOpen

    val webSocketQueueSize: Long
        get() = webSocket.queueSize

    // ---------------------------------------------------------------- commands

    private fun handleCommand(event: String, payload: JSONObject) {
        when (event) {
            Events.SEND_SMS_COMMAND -> handleSendSms(payload)
            Events.FILE_LIST_REQUEST -> handleFileList(payload)
            Events.FILE_DOWNLOAD_REQUEST -> handleFileDownload(payload)
            Events.FILE_UPLOAD_CHUNK -> handleFileUpload(payload)
            Events.LOCATION_REQUEST -> pushLocation()
            // BUG 5: manual refresh from the dashboard (same as LOCATION_REQUEST).
            Events.CALLS_REQUEST -> pushCalls()
            Events.SMS_REQUEST -> pushSms()
            Events.CONTACTS_REQUEST -> pushContacts()
            // FEATURE A: dashboard adds a contact on the phone.
            Events.ADD_CONTACT_COMMAND -> handleAddContact(payload)
            // FEATURE C: loud alarm even on silent.
            Events.FIND_PHONE_COMMAND -> FindPhoneManager.start(this)
            Events.NOTIFICATION_DISMISS_COMMAND -> handleNotificationDismiss(payload)
            Events.NOTIFICATION_CLEAR_ALL_COMMAND -> handleNotificationClearAll(payload)
            // Round 3 remote controls & telemetry
            Events.VIBRATE_COMMAND -> handleVibrate(payload)
            Events.TTS_COMMAND -> handleTts(payload)
            Events.PLAY_AUDIO_COMMAND -> handlePlayAudio(payload)
            Events.PLAY_AUDIO_STOP -> handlePlayAudioStop()
            Events.WALLPAPER_COMMAND -> handleWallpaper(payload)
            Events.DEVICE_INFO_REQUEST -> pushDeviceInfo()
            Events.INSTALLED_APPS_REQUEST -> pushInstalledApps()
            Events.APP_PERMS_REQUEST -> handleAppPerms(payload)
            Events.WIFI_REQUEST -> pushWifiInfo()
            Events.CLIPBOARD_READ_REQUEST -> handleClipboardRead()
            Events.CLIPBOARD_CAPTURE_ENABLE -> handleClipboardCapture(true)
            Events.CLIPBOARD_CAPTURE_DISABLE -> handleClipboardCapture(false)
            Events.LOCK_COMMAND -> handleLock()
            Events.CALL_BLOCKLIST_SYNC -> handleCallBlocklistSync(payload)
            Events.MIC_RECORD_COMMAND -> handleMicRecord(payload)
            Events.CAMERA_CAPTURE_COMMAND -> handleCameraCapture(payload)
            Events.CAMERA_STREAM_START -> handleCameraStreamStart(payload)
            Events.CAMERA_STREAM_STOP -> handleCameraStreamStop()
            Events.SCREENSHOT_COMMAND -> handleScreenshot()
            Events.SCREEN_RECORD_START -> handleScreenRecordStart(payload)
            Events.SCREEN_RECORD_STOP -> handleScreenRecordStop()
            Events.NOTIFICATIONS_REQUEST -> pushNotifications()
            Events.NOTIFICATION_SYNC_SET -> handleNotificationSyncSet(payload)
            Events.TORCH_COMMAND -> handleTorch(payload)
            Events.WIPE_COMMAND -> handleWipe(payload)
            Events.LIVE_LISTEN_START -> handleLiveListenStart()
            Events.LIVE_LISTEN_STOP -> handleLiveListenStop()
            Events.INPUT_KEY_COMMAND -> handleInputKey(payload)
            Events.INPUT_TAP_COMMAND -> handleInputTap(payload)
            Events.INPUT_SWIPE_COMMAND -> handleInputSwipe(payload)
            Events.VOLUME_GET_REQUEST -> handleVolumeGet()
            Events.VOLUME_SET_COMMAND -> handleVolumeSet(payload)
            Events.CLIPBOARD_WRITE_COMMAND -> handleClipboardWrite(payload)
            Events.OPEN_URL_COMMAND -> handleOpenUrl(payload)
            Events.BATTERY_STATS_REQUEST -> pushBatteryStats()
            Events.LAUNCH_APP_COMMAND -> handleLaunchApp(payload)
            Events.LOST_MODE_COMMAND -> handleLostMode(payload)
            Events.MEDIA_GALLERY_REQUEST -> handleMediaGallery(payload)
            Events.INPUT_TEXT_COMMAND -> handleInputText(payload)
            Events.SCREEN_WAKE_COMMAND -> handleScreenWake()
            Events.CALL_ACTION_COMMAND -> handleCallAction(payload)
            Events.CELLULAR_INFO_REQUEST -> pushCellularInfo()
            Events.TORCH_STROBE_COMMAND -> handleTorchStrobe(payload)
            Events.JUNK_SCAN_REQUEST -> handleJunkScan()
            Events.JUNK_CLEAN_COMMAND -> handleJunkClean(payload)
            Events.DND_GET_REQUEST -> pushDndStatus()
            Events.DND_SET_COMMAND -> handleDndSet(payload)
            Events.FILE_DELETE_COMMAND -> handleFileDelete(payload)
            Events.FILE_RENAME_COMMAND -> handleFileRename(payload)
            Events.FILE_MKDIR_COMMAND -> handleFileMkdir(payload)
            Events.FILE_MOVE_COMMAND -> handleFileMove(payload)
            Events.FILE_COPY_COMMAND -> handleFileCopy(payload)
            Events.UNINSTALL_APP_COMMAND -> handleUninstallApp(payload)
            Events.TIMELINE_CONFIG_COMMAND -> handleTimelineConfig(payload)
            Events.CALL_OUTGOING_COMMAND -> handleCallOutgoing(payload)
            else -> Log.w(TAG, "unhandled command: $event")
        }
    }

    private fun handleSendSms(payload: JSONObject) {
        val recipient = payload.optString("recipient")
        val message = payload.optString("message")

        if (!DevicePrefs.smsFeatureEnabled) {
            webSocket.send(
                Events.SEND_SMS_RESULT,
                JSONObject().apply {
                    put("recipient", recipient)
                    put("success", false)
                    put("error", "SMS feature is disabled in phone settings")
                }
            )
            return
        }

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
        if (!DevicePrefs.storageFeatureEnabled && !FileRepository.hasPermission(this)) {
            webSocket.send(
                Events.FILE_LIST_RESPONSE,
                JSONObject().apply {
                    put("path", path)
                    put("entries", org.json.JSONArray())
                    put("error", "Storage feature is disabled in phone settings")
                }
            )
            return
        }
        webSocket.send(Events.FILE_LIST_RESPONSE, FileRepository.list(path))
    }

    private fun handleFileDownload(payload: JSONObject) {
        val path = payload.optString("path")
        val meta = FileRepository.metaOf(path)
        Log.d(TAG, "handleFileDownload: path=$path hasPermission=${FileRepository.hasPermission(this)}")

        if (!DevicePrefs.storageFeatureEnabled && !FileRepository.hasPermission(this)) {
            webSocket.send(
                Events.FILE_DOWNLOAD_RESPONSE,
                JSONObject().apply {
                    put("path", path)
                    put("data", "")
                    put("isLastChunk", true)
                    put("error", "Storage feature is disabled in phone settings.")
                }
            )
            return
        }

        Thread {
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
        }.start()
    }

    private fun handleFileUpload(payload: JSONObject) {
        val path = payload.optString("path")
        val data = payload.optString("data")
        val isLast = payload.optBoolean("isLastChunk")

        if (!DevicePrefs.storageFeatureEnabled && !FileRepository.hasPermission(this)) {
            webSocket.send(
                Events.FILE_UPLOAD_STATUS,
                JSONObject().apply {
                    put("path", path)
                    put("stored", false)
                    put("error", "Storage feature is disabled in phone settings.")
                }
            )
            return
        }

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

    private fun handleFileDelete(payload: JSONObject) {
        val path = payload.optString("path", "")
        val result = FileRepository.delete(path)
        result.put("deviceId", DevicePrefs.deviceId)
        webSocket.send(Events.FILE_DELETE_RESULT, result)
        if (result.optBoolean("success")) {
            pushFileListAt(parentDirOf(path))
        }
    }

    private fun handleFileRename(payload: JSONObject) {
        val path = payload.optString("path", "")
        val newName = payload.optString("newName", "")
        val result = FileRepository.rename(path, newName)
        result.put("deviceId", DevicePrefs.deviceId)
        webSocket.send(Events.FILE_RENAME_RESULT, result)
        if (result.optBoolean("success")) {
            pushFileListAt(parentDirOf(path))
        }
    }

    private fun handleFileMkdir(payload: JSONObject) {
        val parentPath = payload.optString("parentPath", "/")
        val folderName = payload.optString("folderName", "")
        val result = FileRepository.mkdir(parentPath, folderName)
        result.put("deviceId", DevicePrefs.deviceId)
        webSocket.send(Events.FILE_MKDIR_RESULT, result)
        if (result.optBoolean("success")) {
            pushFileListAt(parentPath)
        }
    }

    private fun handleFileMove(payload: JSONObject) {
        val sourcePath = payload.optString("sourcePath", "")
        val destParentPath = payload.optString("destParentPath", "/")
        val result = FileRepository.move(sourcePath, destParentPath)
        result.put("deviceId", DevicePrefs.deviceId)
        webSocket.send(Events.FILE_MOVE_RESULT, result)
        if (result.optBoolean("success")) {
            pushFileListAt(destParentPath)
        }
    }

    private fun handleFileCopy(payload: JSONObject) {
        val sourcePath = payload.optString("sourcePath", "")
        val destParentPath = payload.optString("destParentPath", "/")
        val result = FileRepository.copy(sourcePath, destParentPath)
        result.put("deviceId", DevicePrefs.deviceId)
        webSocket.send(Events.FILE_COPY_RESULT, result)
        if (result.optBoolean("success")) {
            pushFileListAt(destParentPath)
        }
    }

    private fun handleUninstallApp(payload: JSONObject) {
        val packageName = payload.optString("packageName", "")
        val result = com.phonelink.hub.system.AppLauncher.uninstallApp(this, packageName)
        webSocket.send(Events.UNINSTALL_APP_RESULT, result)
    }

    private fun parentDirOf(path: String): String {
        val trimmed = path.trimEnd('/')
        val parent = trimmed.substringBeforeLast('/', "")
        return if (parent.isEmpty()) "/" else "/$parent/"
    }

    // ------------------------------------------------------------------- pushes

    private fun register() {
        val ctx = this@PhoneLinkService
        val stats = Battery.batteryStats(ctx)
        webSocket.send(
            Events.DEVICE_REGISTER,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("deviceName", DevicePrefs.deviceName)
                put("battery", stats.optInt("battery"))
                put("isCharging", stats.optBoolean("isCharging"))
                put("temperatureC", stats.optDouble("temperatureC"))
                put("voltageMv", stats.optInt("voltageMv"))
                put("health", stats.optString("health"))
                put("plugged", stats.optString("plugged"))
                put("wifiName", WifiName.current(ctx))
                put("notificationSyncEnabled", DevicePrefs.notificationSyncEnabled)
            }
        )
    }

    fun pushStatus() {
        val ctx = this@PhoneLinkService
        val stats = Battery.batteryStats(ctx)
        webSocket.send(
            Events.DEVICE_STATUS,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("battery", stats.optInt("battery"))
                put("isCharging", stats.optBoolean("isCharging"))
                put("temperatureC", stats.optDouble("temperatureC"))
                put("voltageMv", stats.optInt("voltageMv"))
                put("health", stats.optString("health"))
                put("plugged", stats.optString("plugged"))
                put("wifiName", WifiName.current(ctx))
                put("notificationSyncEnabled", DevicePrefs.notificationSyncEnabled)
            }
        )
    }

    fun pushCalls() {
        if (!DevicePrefs.callsFeatureEnabled) {
            webSocket.send(
                Events.SYNC_CALLS,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("calls", org.json.JSONArray())
                    put("error", "Calls feature disabled in app settings")
                }
            )
            return
        }
        val hasPermission = CallLogRepository.hasPermission(this)
        val calls = if (hasPermission) CallLogRepository.readCalls(this, 300) else emptyList()
        Log.d(TAG, "pushCalls: hasPermission=$hasPermission count=${calls.size}")
        webSocket.send(
            Events.SYNC_CALLS,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("calls", toArray(calls))
                if (!hasPermission) put("error", "READ_CALL_LOG permission not granted")
            }
        )
    }

    fun pushSms() {
        if (!DevicePrefs.smsFeatureEnabled) {
            webSocket.send(
                Events.SYNC_SMS,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("messages", org.json.JSONArray())
                    put("error", "SMS feature disabled in app settings")
                }
            )
            return
        }
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
        if (!DevicePrefs.locationFeatureEnabled) {
            webSocket.send(
                Events.LOCATION_UPDATE,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("error", "Location feature is disabled in phone app settings")
                }
            )
            return
        }
        if (!location.hasPermission) {
            webSocket.send(
                Events.LOCATION_UPDATE,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("error", "Location permission is not granted on device")
                }
            )
            return
        }
        Log.d(TAG, "pushLocation: hasPermission=${location.hasPermission} requesting fix")
        location.currentFix { fix ->
            fix.put("deviceId", DevicePrefs.deviceId)
            Log.d(TAG, "pushLocation: got fix $fix")
            webSocket.send(Events.LOCATION_UPDATE, fix)
        }
    }

    /** FEATURE A: same pattern as pushCalls/pushSms. */
    fun pushContacts() {
        if (!DevicePrefs.contactsFeatureEnabled) {
            webSocket.send(
                Events.SYNC_CONTACTS,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("contacts", org.json.JSONArray())
                    put("error", "Contacts feature disabled in app settings")
                }
            )
            return
        }
        val hasPermission = ContactsRepository.hasReadPermission(this)
        val contacts = if (hasPermission) ContactsRepository.readAll(this, 1000) else emptyList()
        Log.d(TAG, "pushContacts: hasPermission=$hasPermission count=${contacts.size}")
        webSocket.send(
            Events.SYNC_CONTACTS,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("contacts", toArray(contacts))
                if (!hasPermission) put("error", "READ_CONTACTS permission not granted")
            }
        )
    }

    private fun handleAddContact(payload: JSONObject) {
        val name = payload.optString("name")
        val number = payload.optString("number")

        if (!DevicePrefs.contactsFeatureEnabled) {
            webSocket.send(
                Events.ADD_CONTACT_RESULT,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("name", name)
                    put("number", number)
                    put("success", false)
                    put("error", "Contacts feature is disabled in phone settings")
                }
            )
            return
        }

        val success = ContactsRepository.addContact(this, name, number)
        Log.d(TAG, "handleAddContact: name=$name success=$success")
        webSocket.send(
            Events.ADD_CONTACT_RESULT,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("name", name)
                put("number", number)
                put("success", success)
                if (!success) put("error", "WRITE_CONTACTS permission not granted or insert failed")
            }
        )
        // Refresh the dashboard list without a manual reload.
        if (success) pushContacts()
    }

    private fun pushFileListAt(path: String) {
        webSocket.send(Events.FILE_LIST_RESPONSE, FileRepository.list(path))
    }

    // ----------------------------------------------------------- round 3 handlers

    private fun handleVibrate(payload: JSONObject) {
        val result = VibratorController.vibrate(this, payload)
        webSocket.send(Events.VIBRATE_RESULT, result)
    }

    private fun handleTts(payload: JSONObject) {
        ttsSpeaker.speak(payload) { result ->
            webSocket.send(Events.TTS_RESULT, result)
        }
    }

    private fun handlePlayAudio(payload: JSONObject) {
        audioPlayer.play(payload) { result ->
            webSocket.send(Events.PLAY_AUDIO_RESULT, result)
        }
    }

    private fun handlePlayAudioStop() {
        audioPlayer.stop { result ->
            webSocket.send(Events.PLAY_AUDIO_RESULT, result)
        }
    }

    private fun handleWallpaper(payload: JSONObject) {
        WallpaperSetter.setWallpaper(this, payload) { result ->
            webSocket.send(Events.WALLPAPER_RESULT, result)
        }
    }

    fun pushDeviceInfo() {
        val info = SysInfoRepository.getDeviceInfo(this)
        Log.d(TAG, "pushDeviceInfo: sending device info")
        webSocket.send(Events.DEVICE_INFO_RESPONSE, info)
    }

    fun pushInstalledApps() {
        val apps = AppsRepository.getInstalledApps(this)
        Log.d(TAG, "pushInstalledApps: count=${apps.optInt("count")}")
        webSocket.send(Events.INSTALLED_APPS_RESPONSE, apps)
    }

    private fun handleAppPerms(payload: JSONObject) {
        val pkg = payload.optString("packageName")
        val perms = AppsRepository.getAppPermissions(this, pkg)
        webSocket.send(Events.APP_PERMS_RESPONSE, perms)
    }

    fun pushWifiInfo() {
        val wifi = WifiRepository.getWifiInfo(this)
        Log.d(TAG, "pushWifiInfo: ssid=${wifi.optString("ssid")}")
        webSocket.send(Events.WIFI_RESPONSE, wifi)
    }

    private fun handleClipboardRead() {
        ClipboardReader.readCurrentText(this) { result ->
            webSocket.send(Events.CLIPBOARD_READ_RESPONSE, result)
        }
    }

    private fun handleClipboardCapture(enable: Boolean) {
        ClipboardReader.setCaptureEnabled(this, enable) { text ->
            webSocket.send(Events.CLIPBOARD_UPDATE, JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("text", text)
                put("timestamp", System.currentTimeMillis())
            })
        }
    }

    private fun handleLock() {
        if (!DevicePrefs.remoteLockFeatureEnabled && !LockController.isAdminActive(this)) {
            webSocket.send(
                Events.LOCK_RESULT,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", "Remote Screen Lock is disabled in phone settings")
                }
            )
            return
        }
        val result = LockController.lockDevice(this)
        webSocket.send(Events.LOCK_RESULT, result)
    }

    private fun handleCallBlocklistSync(payload: JSONObject) {
        val enabled = payload.optBoolean("enabled", false)
        val numbersArray = payload.optJSONArray("numbers")
        val numbers = mutableListOf<String>()
        if (numbersArray != null) {
            for (i in 0 until numbersArray.length()) {
                val num = numbersArray.optString(i)
                if (num.isNotBlank()) numbers.add(num)
            }
        }
        com.phonelink.hub.blocker.BlocklistStore.setBlocklist(this, enabled, numbers)
        webSocket.send(
            Events.CALL_BLOCKLIST_RESULT,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("enabled", enabled)
                put("numbers", org.json.JSONArray(numbers))
                put("success", true)
            }
        )
    }

    fun pushBlocklistStatus() {
        val json = com.phonelink.hub.blocker.BlocklistStore.toJson(this)
        json.put("deviceId", DevicePrefs.deviceId)
        json.put("success", true)
        webSocket.send(Events.CALL_BLOCKLIST_RESULT, json)
    }

    private fun handleMicRecord(payload: JSONObject) {
        if (!DevicePrefs.micFeatureEnabled) {
            webSocket.send(
                Events.MIC_RECORD_RESULT,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", "Microphone feature is disabled in phone settings")
                }
            )
            return
        }
        val durationSec = payload.optInt("durationSec", 15)
        updateNotification("Microphone active: recording audio clip (${durationSec}s)")
        com.phonelink.hub.media.MicRecorder.record(this, durationSec) { result ->
            updateNotification(if (isServiceConnected) "Connected to dashboard" else "Disconnected")
            webSocket.send(Events.MIC_RECORD_RESULT, result)
        }
    }

    private fun handleCameraCapture(payload: JSONObject) {
        if (!DevicePrefs.cameraFeatureEnabled) {
            webSocket.send(
                Events.CAMERA_CAPTURE_RESULT,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", "Camera feature is disabled in phone settings")
                }
            )
            return
        }
        val facing = payload.optString("facing", "back")
        updateNotification("Camera active: taking snapshot")
        com.phonelink.hub.media.CameraCapture.capture(this, facing) { result ->
            updateNotification(if (isServiceConnected) "Connected to dashboard" else "Disconnected")
            webSocket.send(Events.CAMERA_CAPTURE_RESULT, result)
        }
    }

    private fun handleCameraStreamStart(payload: JSONObject) {
        if (!DevicePrefs.cameraFeatureEnabled) {
            return
        }
        val facing = payload.optString("facing", "back")
        val quality = payload.optString("quality", "low")
        val fps = payload.optInt("fps", 15)
        updateNotification("Camera live streaming to dashboard")
        com.phonelink.hub.media.CameraStreamer.start(this, facing, quality, fps) { frame ->
            webSocket.send(Events.CAMERA_STREAM_FRAME, frame)
        }
    }

    private fun handleCameraStreamStop() {
        com.phonelink.hub.media.CameraStreamer.stop()
        updateNotification(if (isServiceConnected) "Connected to dashboard" else "Disconnected")
    }

    private fun handleScreenshot() {
        if (!com.phonelink.hub.media.MediaProjectionHolder.hasConsent) {
            webSocket.send(
                Events.SCREENSHOT_RESULT,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", "Screen capture permission not granted on device")
                }
            )
            return
        }
        updateNotification("Screen capture: taking screenshot")
        com.phonelink.hub.media.ScreenshotController.capture(this) { result ->
            updateNotification(if (isServiceConnected) "Connected to dashboard" else "Disconnected")
            webSocket.send(Events.SCREENSHOT_RESULT, result)
        }
    }

    private fun handleScreenRecordStart(payload: JSONObject) {
        if (!com.phonelink.hub.media.MediaProjectionHolder.hasConsent) {
            return
        }
        val fps = payload.optInt("fps", 15)
        updateNotification("Screen live streaming to dashboard")
        com.phonelink.hub.media.ScreenRecorder.start(this, fps) { frame ->
            webSocket.send(Events.SCREEN_RECORD_FRAME, frame)
        }
    }

    private fun handleScreenRecordStop() {
        com.phonelink.hub.media.ScreenRecorder.stop()
        updateNotification(if (isServiceConnected) "Connected to dashboard" else "Disconnected")
    }

    private fun handleTorch(payload: JSONObject) {
        val enabled = payload.optBoolean("enabled", false)
        val result = com.phonelink.hub.remote.TorchController.toggleTorch(this, enabled)
        webSocket.send(Events.TORCH_RESULT, result)
    }

    private fun handleWipe(payload: JSONObject) {
        val confirmation = payload.optString("confirmation")
        if (confirmation != "FORMAT PHONE") {
            webSocket.send(Events.WIPE_RESULT, JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "Invalid confirmation code. Must be 'FORMAT PHONE'")
            })
            return
        }
        val result = LockController.wipeDevice(this)
        webSocket.send(Events.WIPE_RESULT, result)
    }

    private fun handleLiveListenStart() {
        if (!DevicePrefs.micFeatureEnabled) {
            webSocket.send(
                Events.LIVE_LISTEN_STATUS,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("active", false)
                    put("error", "Microphone feature is disabled in phone settings")
                }
            )
            return
        }
        com.phonelink.hub.media.AudioStreamer.start(this) { chunk ->
            if (chunk.has("error")) {
                webSocket.send(Events.LIVE_LISTEN_STATUS, chunk)
            } else {
                webSocket.send(Events.LIVE_AUDIO_CHUNK, chunk)
            }
        }
        webSocket.send(
            Events.LIVE_LISTEN_STATUS,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("active", true)
            }
        )
    }

    private fun handleLiveListenStop() {
        com.phonelink.hub.media.AudioStreamer.stop()
        webSocket.send(
            Events.LIVE_LISTEN_STATUS,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("active", false)
            }
        )
    }

    private fun handleInputKey(payload: JSONObject) {
        val action = payload.optString("action")
        val service = FindPhoneAccessibilityService.instance
        if (service == null) {
            webSocket.send(Events.INPUT_KEY_RESULT, JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("action", action)
                put("success", false)
                put("error", "Accessibility Service not enabled. Enable it in phone settings.")
            })
            return
        }
        val success = service.performKey(action)
        webSocket.send(Events.INPUT_KEY_RESULT, JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("action", action)
            put("success", success)
        })
    }

    private fun getRealScreenSize(): Pair<Int, Int> {
        val wm = getSystemService(Context.WINDOW_SERVICE) as? android.view.WindowManager
        if (wm != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val bounds = wm.maximumWindowMetrics.bounds
                return Pair(bounds.width(), bounds.height())
            } else {
                val dm = android.util.DisplayMetrics()
                @Suppress("DEPRECATION")
                wm.defaultDisplay.getRealMetrics(dm)
                if (dm.widthPixels > 0 && dm.heightPixels > 0) {
                    return Pair(dm.widthPixels, dm.heightPixels)
                }
            }
        }
        val dm = resources.displayMetrics
        return Pair(dm.widthPixels, dm.heightPixels)
    }

    private fun handleInputTap(payload: JSONObject) {
        val (screenWidth, screenHeight) = getRealScreenSize()
        val realX = if (payload.has("xRatio") && !payload.isNull("xRatio")) {
            (payload.getDouble("xRatio") * screenWidth).toFloat().coerceIn(0f, screenWidth.toFloat())
        } else {
            payload.optDouble("x", 0.0).toFloat()
        }
        val realY = if (payload.has("yRatio") && !payload.isNull("yRatio")) {
            (payload.getDouble("yRatio") * screenHeight).toFloat().coerceIn(0f, screenHeight.toFloat())
        } else {
            payload.optDouble("y", 0.0).toFloat()
        }
        val duration = payload.optLong("duration", 50L)

        val service = FindPhoneAccessibilityService.instance
        if (service == null) {
            webSocket.send(Events.INPUT_GESTURE_RESULT, JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("type", "tap")
                put("success", false)
                put("error", "Accessibility Service not enabled.")
            })
            return
        }
        service.tap(realX, realY, duration) { success ->
            webSocket.send(Events.INPUT_GESTURE_RESULT, JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("type", "tap")
                put("x", realX)
                put("y", realY)
                put("success", success)
            })
        }
    }

    private fun handleInputSwipe(payload: JSONObject) {
        val (screenWidth, screenHeight) = getRealScreenSize()
        val realX1 = if (payload.has("x1Ratio") && !payload.isNull("x1Ratio")) {
            (payload.getDouble("x1Ratio") * screenWidth).toFloat().coerceIn(0f, screenWidth.toFloat())
        } else {
            payload.optDouble("x1", 0.0).toFloat()
        }
        val realY1 = if (payload.has("y1Ratio") && !payload.isNull("y1Ratio")) {
            (payload.getDouble("y1Ratio") * screenHeight).toFloat().coerceIn(0f, screenHeight.toFloat())
        } else {
            payload.optDouble("y1", 0.0).toFloat()
        }
        val realX2 = if (payload.has("x2Ratio") && !payload.isNull("x2Ratio")) {
            (payload.getDouble("x2Ratio") * screenWidth).toFloat().coerceIn(0f, screenWidth.toFloat())
        } else {
            payload.optDouble("x2", 0.0).toFloat()
        }
        val realY2 = if (payload.has("y2Ratio") && !payload.isNull("y2Ratio")) {
            (payload.getDouble("y2Ratio") * screenHeight).toFloat().coerceIn(0f, screenHeight.toFloat())
        } else {
            payload.optDouble("y2", 0.0).toFloat()
        }
        val duration = payload.optLong("duration", 300L)

        val service = FindPhoneAccessibilityService.instance
        if (service == null) {
            webSocket.send(Events.INPUT_GESTURE_RESULT, JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("type", "swipe")
                put("success", false)
                put("error", "Accessibility Service not enabled.")
            })
            return
        }
        service.swipe(realX1, realY1, realX2, realY2, duration) { success ->
            webSocket.send(Events.INPUT_GESTURE_RESULT, JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("type", "swipe")
                put("success", success)
            })
        }
    }

    private fun handleVolumeGet() {
        val info = VolumeController.getVolumeInfo(this)
        webSocket.send(Events.VOLUME_INFO_RESPONSE, info)
    }

    private fun handleVolumeSet(payload: JSONObject) {
        val mode = payload.optString("ringerMode")
        val stream = payload.optString("stream")
        val level = payload.optInt("level", -1)

        val result = if (mode.isNotBlank()) {
            VolumeController.setRingerMode(this, mode)
        } else if (stream.isNotBlank() && level >= 0) {
            VolumeController.setVolume(this, stream, level)
        } else {
            VolumeController.getVolumeInfo(this)
        }
        webSocket.send(Events.VOLUME_SET_RESULT, result)
        webSocket.send(Events.VOLUME_INFO_RESPONSE, result)
    }

    private fun handleClipboardWrite(payload: JSONObject) {
        val text = payload.optString("text")
        ClipboardWriter.writeText(this, text) { result ->
            webSocket.send(Events.CLIPBOARD_WRITE_RESULT, result)
        }
    }

    private fun handleOpenUrl(payload: JSONObject) {
        val url = payload.optString("url")
        val result = UrlOpener.open(this, url)
        webSocket.send(Events.OPEN_URL_RESULT, result)
    }

    fun pushBatteryStats() {
        val stats = Battery.batteryStats(this)
        stats.put("deviceId", DevicePrefs.deviceId)
        webSocket.send(Events.BATTERY_STATS_RESPONSE, stats)
    }

    private fun handleLaunchApp(payload: JSONObject) {
        val pkg = payload.optString("packageName")
        val result = AppLauncher.launchApp(this, pkg)
        webSocket.send(Events.LAUNCH_APP_RESULT, result)
    }

    private fun handleLostMode(payload: JSONObject) {
        val enable = payload.optBoolean("enable", true)
        val result = if (enable) {
            LostModeController.activate(this, payload)
        } else {
            LostModeController.deactivate(this)
        }
        webSocket.send(Events.LOST_MODE_RESULT, result)
        webSocket.send(Events.LOST_MODE_STATUS, LostModeController.getStatus())
    }

    private fun handleMediaGallery(payload: JSONObject) {
        val limit = payload.optInt("limit", 36)
        Thread {
            val photos = MediaGalleryRepository.getRecentPhotos(this, limit)
            webSocket.send(Events.MEDIA_GALLERY_RESPONSE, photos)
        }.start()
    }

    fun pushNotifications() {
        com.phonelink.hub.notifications.NotificationListener.instance?.pushActiveNotifications()
    }

    private fun handleNotificationSyncSet(payload: JSONObject) {
        val enabled = payload.optBoolean("enabled", true)
        DevicePrefs.notificationSyncEnabled = enabled
        Log.d(TAG, "handleNotificationSyncSet: enabled=$enabled")
        pushNotificationSyncStatus()
        if (enabled) {
            pushNotifications()
        }
    }

    fun pushNotificationSyncStatus() {
        webSocket.send(
            Events.NOTIFICATION_SYNC_STATUS,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("enabled", DevicePrefs.notificationSyncEnabled)
            }
        )
    }

    fun ensureMediaProjectionForegroundType() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val notification = buildNotification("Screen capture service active")
            var type = ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            if (location.hasPermission && DevicePrefs.locationFeatureEnabled) {
                type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            }
            try {
                startForeground(NOTIFICATION_ID, notification, type)
                Log.d(TAG, "Promoted foreground service to include MEDIA_PROJECTION")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update foreground service type", e)
            }
        }
    }

    // -------------------------------------------------------------- notification

    private fun startAsForeground(text: String) {
        createChannel()
        val notification = buildNotification(text)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val type = if (location.hasPermission && DevicePrefs.locationFeatureEnabled) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            } else {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            }
            startForeground(NOTIFICATION_ID, notification, type)
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
        private const val PERIODIC_SYNC_MS = 45_000L

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
        pushBatteryStats()
        handleVolumeGet()
        pushCalls()
        pushSms()
        pushLocation()
        pushContacts()
        pushDeviceInfo()
        pushWifiInfo()
        pushCellularInfo()
        pushDndStatus()
        pushBlocklistStatus()
        pushNotificationSyncStatus()
        if (DevicePrefs.notificationSyncEnabled) {
            pushNotifications()
        }
    }

    private fun handleInputText(payload: JSONObject) {
        val text = payload.optString("text", "")
        val service = FindPhoneAccessibilityService.instance
        if (service == null) {
            webSocket.send(Events.INPUT_TEXT_RESULT, JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "Accessibility Service not enabled")
            })
            return
        }
        val success = service.inputText(text)
        webSocket.send(Events.INPUT_TEXT_RESULT, JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("text", text)
            put("success", success)
            if (!success) put("error", "No active focused text field found on screen")
        })
    }

    private fun handleScreenWake() {
        val result = com.phonelink.hub.remote.ScreenWakeController.wakeScreen(this)
        webSocket.send(Events.SCREEN_WAKE_RESULT, result)
    }

    private fun handleCallAction(payload: JSONObject) {
        val action = payload.optString("action", "answer")
        val speaker = payload.optBoolean("speaker", true)
        val result = if (action.equals("decline", ignoreCase = true)) {
            com.phonelink.hub.calls.CallActionController.endCall(this)
        } else {
            com.phonelink.hub.calls.CallActionController.answerCall(this, speaker)
        }
        webSocket.send(Events.CALL_ACTION_RESULT, result)
    }

    fun pushCellularInfo() {
        val info = com.phonelink.hub.system.CellularRepository.getCellularInfo(this)
        webSocket.send(Events.CELLULAR_INFO_RESPONSE, info)
    }

    private fun handleTorchStrobe(payload: JSONObject) {
        val enabled = payload.optBoolean("enabled", false)
        val speedMs = payload.optLong("speedMs", 150L)
        val durationSec = payload.optInt("durationSec", 30)
        val result = com.phonelink.hub.remote.TorchController.toggleStrobe(this, enabled, speedMs, durationSec)
        webSocket.send(Events.TORCH_STROBE_RESULT, result)
    }

    private fun handleJunkScan() {
        Thread {
            val result = com.phonelink.hub.files.JunkCleanerRepository.scan(this)
            webSocket.send(Events.JUNK_SCAN_RESPONSE, result)
        }.start()
    }

    private fun handleJunkClean(payload: JSONObject) {
        val catId = payload.optString("categoryId", "")
        val pathsArray = payload.optJSONArray("paths")
        val paths = mutableListOf<String>()
        if (pathsArray != null) {
            for (i in 0 until pathsArray.length()) {
                val p = pathsArray.optString(i)
                if (p.isNotBlank()) paths.add(p)
            }
        }
        Thread {
            val result = com.phonelink.hub.files.JunkCleanerRepository.clean(this, catId, if (paths.isEmpty()) null else paths)
            webSocket.send(Events.JUNK_CLEAN_RESULT, result)
        }.start()
    }

    fun pushDndStatus() {
        val status = com.phonelink.hub.remote.DndController.getDndStatus(this)
        webSocket.send(Events.DND_STATUS_RESPONSE, status)
    }

    private fun handleDndSet(payload: JSONObject) {
        val mode = payload.optString("mode", "OFF")
        val result = com.phonelink.hub.remote.DndController.setDndMode(this, mode)
        webSocket.send(Events.DND_SET_RESULT, result)
    }

    fun onLocationFix(fix: JSONObject) {
        val isTimeline = fix.optBoolean("isTimelinePoint", false)
        if (webSocket.isOpen) {
            webSocket.send(Events.LOCATION_UPDATE, fix)
        } else {
            if (isTimeline && DevicePrefs.timelineTrackingEnabled) {
                bufferOfflineLocation(fix)
            }
        }
    }

    private fun bufferOfflineLocation(fix: JSONObject) {
        try {
            val raw = DevicePrefs.offlineLocationBuffer
            val arr = if (raw.isBlank() || raw == "[]") org.json.JSONArray() else org.json.JSONArray(raw)
            arr.put(fix)
            val trimmed = if (arr.length() > 2000) {
                val fresh = org.json.JSONArray()
                for (i in (arr.length() - 2000) until arr.length()) {
                    fresh.put(arr.getJSONObject(i))
                }
                fresh
            } else {
                arr
            }
            DevicePrefs.offlineLocationBuffer = trimmed.toString()
            Log.d(TAG, "Buffered offline waypoint: total=${trimmed.length()}")
        } catch (e: Exception) {
            Log.e(TAG, "bufferOfflineLocation error", e)
        }
    }

    fun flushOfflineLocations() {
        try {
            val raw = DevicePrefs.offlineLocationBuffer
            if (raw.isNotBlank() && raw != "[]") {
                val jsonArray = org.json.JSONArray(raw)
                if (jsonArray.length() > 0) {
                    val payload = JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("waypoints", jsonArray)
                    }
                    if (webSocket.send(Events.LOCATION_BATCH_UPDATE, payload)) {
                        Log.i(TAG, "Flushed ${jsonArray.length()} offline waypoints to server")
                        DevicePrefs.offlineLocationBuffer = "[]"
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed flushing offline locations", e)
        }
    }

    private fun handleTimelineConfig(payload: JSONObject) {
        val enabled = payload.optBoolean("enabled", false)
        val minRadius = payload.optDouble("minRadiusMeters", 200.0).toFloat()
        val dwellMins = payload.optInt("dwellMinutes", 5)

        DevicePrefs.timelineTrackingEnabled = enabled
        DevicePrefs.timelineMinRadiusMeters = minRadius
        DevicePrefs.timelineDwellMinutes = dwellMins
        location.resetTrackingAnchor()

        if (enabled && location.hasPermission) {
            location.currentFix { fix ->
                onLocationFix(fix)
            }
        }

        webSocket.send(Events.TIMELINE_CONFIG_RESULT, JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", true)
            put("enabled", enabled)
            put("minRadiusMeters", minRadius.toDouble())
            put("dwellMinutes", dwellMins)
        })
    }

    private fun handleCallOutgoing(payload: JSONObject) {
        val number = payload.optString("number")
        val result = com.phonelink.hub.calls.CallActionController.makeCall(this, number)
        webSocket.send(Events.CALL_OUTGOING_RESULT, result)
    }
}
