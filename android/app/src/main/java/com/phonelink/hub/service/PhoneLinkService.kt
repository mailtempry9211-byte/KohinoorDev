package com.phonelink.hub.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import android.widget.RemoteViews
import com.phonelink.hub.MainActivity
import com.phonelink.hub.StatusActivity
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
import com.phonelink.hub.remote.TheftMotionAlarm
import com.phonelink.hub.remote.WalkieTalkieIntercom
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
    private val screenReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_SCREEN_OFF) {
                com.phonelink.hub.lock.AppLockOverlayManager.onScreenOff()
            }
        }
    }

    private var lastPolledPackage = ""
    private var lastPolledClass = ""
    private val foregroundPollerHandler = Handler(Looper.getMainLooper())
    private val foregroundPoller = object : Runnable {
        override fun run() {
            try {
                if (FindPhoneAccessibilityService.instance == null &&
                    com.phonelink.hub.lock.AppLockOverlayManager.canDrawOverlays(this@PhoneLinkService) &&
                    (DevicePrefs.overlayAppLockEnabled || DevicePrefs.overlayAntiUninstallEnabled)) {
                    checkForegroundAppStandalone()
                }
            } catch (e: Exception) {
                // Ignore transient query errors
            } finally {
                foregroundPollerHandler.postDelayed(this, 350L)
            }
        }
    }

    private fun checkForegroundAppStandalone() {
        val usm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            getSystemService(Context.USAGE_STATS_SERVICE) as? android.app.usage.UsageStatsManager
        } else null

        val now = System.currentTimeMillis()
        var fgPackage: String? = null
        var fgClass: String? = null

        if (usm != null) {
            try {
                val events = usm.queryEvents(now - 3000L, now)
                val event = android.app.usage.UsageEvents.Event()
                while (events.hasNextEvent()) {
                    events.getNextEvent(event)
                    if (event.eventType == android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED ||
                        event.eventType == 1) { // 1 = ACTIVITY_RESUMED
                        fgPackage = event.packageName
                        fgClass = event.className
                    }
                }
            } catch (_: Exception) {}
        }

        if (fgPackage.isNullOrBlank()) {
            val am = getSystemService(Context.ACTIVITY_SERVICE) as? android.app.ActivityManager
            val procs = am?.runningAppProcesses
            if (procs != null) {
                for (p in procs) {
                    if (p.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                        fgPackage = p.pkgList?.firstOrNull() ?: p.processName
                        break
                    }
                }
            }
        }

        if (fgPackage.isNullOrBlank() || com.phonelink.hub.lock.AppLockOverlayManager.isTransientPackage(fgPackage)) {
            return
        }

        if (fgPackage != lastPolledPackage || (fgClass != null && fgClass != lastPolledClass)) {
            lastPolledPackage = fgPackage
            lastPolledClass = fgClass ?: ""

            // Notify overlay manager about foreground package transition
            com.phonelink.hub.lock.AppLockOverlayManager.onForegroundPackageChanged(this, fgPackage)

            // Anti-Tamper enforcement when Accessibility is OFF:
            if (DevicePrefs.overlayAntiUninstallEnabled &&
                !com.phonelink.hub.lock.AppLockOverlayManager.isAntiTamperTemporarilyUnlocked()) {
                val lowerPkg = fgPackage.lowercase()
                val lowerCls = (fgClass ?: "").lowercase()

                if (lowerPkg.contains("packageinstaller") || lowerCls.contains("uninstall")) {
                    com.phonelink.hub.lock.AppLockOverlayManager.showOverlay(
                        this,
                        com.phonelink.hub.lock.AppLockOverlayManager.OverlayMode.ANTI_TAMPER,
                        null
                    )
                } else if (lowerPkg.contains("settings") || lowerPkg.contains("securitycenter")) {
                    if (lowerCls.contains("installedappdetails") ||
                        lowerCls.contains("appdetails") ||
                        lowerCls.contains("manageapplications") ||
                        lowerCls.contains("applications") ||
                        lowerCls.contains("subsettings") ||
                        lowerCls.contains("specialaccess") ||
                        lowerCls.contains("deviceadmin")) {
                        com.phonelink.hub.lock.AppLockOverlayManager.showOverlay(
                            this,
                            com.phonelink.hub.lock.AppLockOverlayManager.OverlayMode.ANTI_TAMPER,
                            null
                        )
                    }
                }
            }
        }
    }

    private var connectedSinceMs: Long = 0L

    val isConnected: Boolean
        get() = try { ::webSocket.isInitialized && webSocket.isOpen } catch (e: Exception) { false }

    // BUG 2: periodic refresh so calls/SMS stay fresh while the service runs
    // (previously they synced only once inside onOpen/syncAll).
    private var lastLowDataStatusMs: Long = 0L
    private val syncHandler = Handler(Looper.getMainLooper())
    private val periodicSync = object : Runnable {
        override fun run() {
            try {
                if (!DevicePrefs.lowDataMode) {
                    if (DevicePrefs.syncCalls) pushCalls()
                    if (DevicePrefs.syncSms) pushSms()
                    pushContacts()
                    if (DevicePrefs.syncNotifications && DevicePrefs.notificationSyncEnabled) {
                        pushNotifications()
                    }
                    if (DevicePrefs.syncTelemetry) pushStatus()
                } else {
                    // Ultra low data mode: heartbeat status every 5 minutes
                    val now = System.currentTimeMillis()
                    if (now - lastLowDataStatusMs > 300_000L) {
                        lastLowDataStatusMs = now
                        pushStatus()
                    }
                }
                checkBatteryAlerts()
            } catch (e: Exception) {
                Log.w(TAG, "periodic sync failed", e)
            }
            syncHandler.postDelayed(this, PERIODIC_SYNC_MS)
        }
    }

    private var lastBatteryCutoffAlertSent = 0L
    private var lastBatteryOverheatAlertSent = 0L

    private fun checkBatteryAlerts() {
        if (!DevicePrefs.batteryAlertsEnabled) return
        val stats = com.phonelink.hub.util.Battery.batteryStats(this)
        val batteryLevel = stats.optInt("battery", -1)
        val isCharging = stats.optBoolean("isCharging", false)
        val tempC = stats.optDouble("temperatureC", 0.0)
        val now = System.currentTimeMillis()

        if (isCharging && batteryLevel >= DevicePrefs.batteryMaxLevelCutoff) {
            if (now - lastBatteryCutoffAlertSent > 300_000L) {
                lastBatteryCutoffAlertSent = now
                Log.w(TAG, "Battery level $batteryLevel% reached cutoff threshold ${DevicePrefs.batteryMaxLevelCutoff}%!")
                webSocket.send(
                    Events.BATTERY_ALERT_EVENT,
                    JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("type", "CUTOFF_REACHED")
                        put("battery", batteryLevel)
                        put("cutoff", DevicePrefs.batteryMaxLevelCutoff)
                        put("message", "Battery charged to $batteryLevel%! Unplug to protect battery lifespan.")
                        put("timestamp", now)
                    }
                )
            }
        }

        if (tempC >= DevicePrefs.batteryOverheatTempThreshold) {
            if (now - lastBatteryOverheatAlertSent > 300_000L) {
                lastBatteryOverheatAlertSent = now
                Log.w(TAG, "Battery temperature $tempC°C exceeded threshold ${DevicePrefs.batteryOverheatTempThreshold}°C!")
                webSocket.send(
                    Events.BATTERY_ALERT_EVENT,
                    JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("type", "OVERHEAT_WARNING")
                        put("temperatureC", tempC)
                        put("threshold", DevicePrefs.batteryOverheatTempThreshold)
                        put("message", "High device temperature ($tempC°C)! Please cool down device.")
                        put("timestamp", now)
                    }
                )
            }
        }
    }

    private val autoTimelapseHandler = Handler(Looper.getMainLooper())
    private val autoTimelapseRunnable = object : Runnable {
        override fun run() {
            if (DevicePrefs.autoTimelapseEnabled) {
                captureAutoTimelapseFrame()
                val intervalMs = (DevicePrefs.autoTimelapseIntervalMins.coerceAtLeast(1) * 60_000L)
                autoTimelapseHandler.postDelayed(this, intervalMs)
            }
        }
    }

    private fun startAutoTimelapse() {
        autoTimelapseHandler.removeCallbacks(autoTimelapseRunnable)
        if (DevicePrefs.autoTimelapseEnabled) {
            autoTimelapseHandler.postDelayed(autoTimelapseRunnable, 10_000L)
        }
    }

    private fun stopAutoTimelapse() {
        autoTimelapseHandler.removeCallbacks(autoTimelapseRunnable)
    }

    private fun captureAutoTimelapseFrame() {
        val facing = DevicePrefs.autoTimelapseFacing
        com.phonelink.hub.media.CameraCapture.capture(this, facing) { result ->
            if (result.optBoolean("success")) {
                result.put("isTimelapse", true)
                webSocket.send(Events.AUTO_TIMELAPSE_FRAME, result)
            }
        }
    }

    private fun startPeriodicSync() {
        syncHandler.removeCallbacks(periodicSync)
        syncHandler.postDelayed(periodicSync, PERIODIC_SYNC_MS)
    }

    private fun stopPeriodicSync() {
        syncHandler.removeCallbacks(periodicSync)
    }

    private var connectivityManager: android.net.ConnectivityManager? = null
    private var networkCallback: android.net.ConnectivityManager.NetworkCallback? = null

    private fun registerNetworkCallback() {
        try {
            connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                networkCallback = object : android.net.ConnectivityManager.NetworkCallback() {
                    override fun onAvailable(network: android.net.Network) {
                        Log.i(TAG, "Network became available! Ensuring WebSocket is connected…")
                        try {
                            if (::webSocket.isInitialized && !webSocket.isOpen) {
                                webSocket.reconnectNow()
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "reconnect on network available failed", e)
                        }
                    }
                }
                connectivityManager?.registerDefaultNetworkCallback(networkCallback!!)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not register default network callback", e)
        }
    }

    private fun unregisterNetworkCallback() {
        try {
            networkCallback?.let { connectivityManager?.unregisterNetworkCallback(it) }
        } catch (_: Exception) {}
        networkCallback = null
    }

    override fun onCreate() {
        super.onCreate()
        DevicePrefs.init(this)

        location = LocationRepository(this)
        ttsSpeaker = TtsSpeaker(this)
        audioPlayer = AudioPlayer(this)
        TheftMotionAlarm.init(this)

        registerNetworkCallback()
        try {
            registerReceiver(screenReceiver, IntentFilter(Intent.ACTION_SCREEN_OFF))
        } catch (e: Exception) {
            Log.w(TAG, "registerReceiver screenReceiver failed: ${e.message}")
        }
        foregroundPollerHandler.post(foregroundPoller)

        webSocket = WebSocketClient(
            prefsProvider = { Pair(DevicePrefs.serverIp, DevicePrefs.serverPort) },
            listener = object : WebSocketClient.Listener {

                override fun onOpen() {
                    Log.d(TAG, "socket onOpen: registering + syncing everything")
                    try {
                        pushStatus()
                        // Give the notification listener the live socket so it can
                        // mirror without owning a connection itself.
                        WebSocketHolder.webSocket = webSocket
                        register()
                        connectedSinceMs = System.currentTimeMillis()
                        updateNotification("Connected to dashboard")

                        // Run heavy sync operations on a background thread so OkHttp socket listener is never blocked or crashed
                        Thread({
                            try {
                                syncAll()
                                flushOfflineLocations()
                                TheftMotionAlarm.pushStatus()
                            } catch (e: Exception) {
                                Log.e(TAG, "Background sync error: ${e.message}", e)
                            }
                        }, "PhoneLink-SyncWorker").start()
                    } catch (e: Exception) {
                        Log.e(TAG, "Error during onOpen socket registration: ${e.message}", e)
                    }
                }

                override fun onClosed() {
                    connectedSinceMs = 0L
                    updateNotification("Reconnecting…")
                }

                override fun onFailure(message: String) {
                    connectedSinceMs = 0L
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
        startAutoTimelapse()
        com.phonelink.hub.scheduler.ScheduledCommandManager.start()
        // FEATURE D: safety net — reschedules the 15-min restart check.
        try { com.phonelink.hub.receiver.KeepAliveWorker.schedule(this) } catch (_: Exception) { }

        return START_STICKY
    }

    override fun onDestroy() {
        stopPeriodicSync()
        stopAutoTimelapse()
        com.phonelink.hub.scheduler.ScheduledCommandManager.stop()
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
        unregisterNetworkCallback()
        try { unregisterReceiver(screenReceiver) } catch (_: Exception) {}
        foregroundPollerHandler.removeCallbacks(foregroundPoller)
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
            Events.FIND_PHONE_STOP_COMMAND -> FindPhoneManager.stop(this)
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
            Events.MOTION_ALARM_CONFIG_COMMAND -> handleMotionAlarmConfig(payload)
            Events.WALKIE_TALKIE_START -> handleWalkieTalkieStart()
            Events.WALKIE_TALKIE_CHUNK -> handleWalkieTalkieChunk(payload)
            Events.WALKIE_TALKIE_STOP -> handleWalkieTalkieStop()
            Events.SYNC_CONFIG_COMMAND -> handleSyncConfig(payload)
            Events.PARENTAL_CONTROL_CONFIG_COMMAND -> handleParentalControlConfig(payload)
            Events.APP_USAGE_REQUEST -> pushAppUsageStats()
            Events.BATTERY_CONFIG_COMMAND -> handleBatteryConfig(payload)
            Events.AUTO_TIMELAPSE_CONFIG_COMMAND -> handleAutoTimelapseConfig(payload)
            Events.GEOFENCE_CONFIG_COMMAND -> handleGeofenceConfig(payload)
            Events.AUTO_REPLY_CONFIG_COMMAND -> handleAutoReplyConfig(payload)
            Events.NETWORK_USAGE_REQUEST -> pushNetworkUsageStats()
            Events.SCHEDULE_COMMAND -> handleScheduleCommand(payload)
            Events.SOS_CONFIG_COMMAND -> handleSosConfig(payload)
            Events.CALL_RECORDING_CONFIG_COMMAND -> handleCallRecordingConfig(payload)
            Events.CAMOUFLAGE_CONFIG_COMMAND -> handleCamouflageConfig(payload)
            Events.QUICK_SETTING_COMMAND -> handleQuickSetting(payload)
            Events.OPEN_APP_COMMAND -> handleOpenApp()
            Events.PAUSE_MONITORING_COMMAND -> handlePauseMonitoring(payload)
            Events.DELETE_CONTACT_COMMAND -> handleDeleteContact(payload)
            Events.EDIT_CONTACT_COMMAND -> handleEditContact(payload)
            Events.DELETE_CALL_COMMAND -> handleDeleteCall(payload)
            Events.CLEAR_CALLS_COMMAND -> handleClearCalls()
            Events.LOCK_SCREEN_MESSAGE_COMMAND -> handleLockScreenMessage(payload)
            Events.STORAGE_ANALYSIS_REQUEST -> pushStorageAnalysis()
            else -> Log.w(TAG, "unhandled command: $event")
        }
    }

    private fun handleMotionAlarmConfig(payload: JSONObject) {
        val arm = payload.optBoolean("arm", false)
        val threshold = payload.optDouble("threshold", 2.5).toFloat()
        val delaySec = payload.optInt("delaySec", 3)
        val result = if (arm) {
            TheftMotionAlarm.arm(threshold, delaySec)
        } else {
            TheftMotionAlarm.disarm()
        }
        webSocket.send(Events.MOTION_ALARM_CONFIG_RESULT, result)
    }

    private fun handleSyncConfig(payload: JSONObject) {
        DevicePrefs.applySyncConfig(payload)
        Log.i(TAG, "Applied remote sync config: ${DevicePrefs.getSyncConfigJson()}")
        if (!DevicePrefs.syncLocation || DevicePrefs.lowDataMode) {
            location.stopUpdates()
        } else if (DevicePrefs.locationFeatureEnabled && location.hasPermission) {
            location.startUpdates(LOCATION_INTERVAL_MS) { fix ->
                onLocationFix(fix)
            }
        }
        webSocket.send(Events.SYNC_CONFIG_STATUS, DevicePrefs.getSyncConfigJson())
    }

    private fun handleParentalControlConfig(payload: JSONObject) {
        if (payload.has("enabled")) {
            DevicePrefs.parentalControlEnabled = payload.optBoolean("enabled", false)
        }
        if (payload.has("blockedPackages")) {
            val arr = payload.optJSONArray("blockedPackages")
            val set = mutableSetOf<String>()
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val p = arr.optString(i)
                    if (p.isNotBlank()) set.add(p)
                }
            }
            DevicePrefs.blockedPackages = set
        }
        if (payload.has("screenTimeLimitMinutes")) {
            DevicePrefs.screenTimeLimitMinutes = payload.optInt("screenTimeLimitMinutes", 0)
        }
        if (payload.has("allowedPackages")) {
            val arr = payload.optJSONArray("allowedPackages")
            val set = mutableSetOf<String>()
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val p = arr.optString(i)
                    if (p.isNotBlank()) set.add(p)
                }
            }
            if (set.isNotEmpty()) DevicePrefs.allowedPackagesDuringLimit = set
        }

        // Overlay Shield: App Lock & Anti-Tamper
        if (payload.has("overlayAppLockEnabled")) {
            DevicePrefs.overlayAppLockEnabled = payload.optBoolean("overlayAppLockEnabled")
            if (!DevicePrefs.overlayAppLockEnabled) {
                com.phonelink.hub.lock.AppLockOverlayManager.dismissOverlay()
            }
        }
        if (payload.has("overlayAntiUninstallEnabled")) {
            DevicePrefs.overlayAntiUninstallEnabled = payload.optBoolean("overlayAntiUninstallEnabled")
            if (!DevicePrefs.overlayAntiUninstallEnabled) {
                com.phonelink.hub.lock.AppLockOverlayManager.dismissOverlay()
            }
        }
        if (payload.has("overlayLockedPackages")) {
            val arr = payload.optJSONArray("overlayLockedPackages")
            val set = mutableSetOf<String>()
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val p = arr.optString(i)
                    if (p.isNotBlank()) set.add(p)
                }
            }
            DevicePrefs.overlayLockedPackages = set
        }
        if (payload.has("overlayAppLockPin")) {
            val pin = payload.optString("overlayAppLockPin", "")
            if (pin.isNotBlank()) DevicePrefs.overlayAppLockPin = pin
        }
        if (payload.has("overlayRelockTimeout")) {
            DevicePrefs.overlayRelockTimeout = payload.optInt("overlayRelockTimeout", 0)
            com.phonelink.hub.lock.AppLockOverlayManager.clearUnlockedCache()
        }

        val status = DevicePrefs.getParentalControlJson().apply {
            put("canDrawOverlays", com.phonelink.hub.lock.AppLockOverlayManager.canDrawOverlays(this@PhoneLinkService))
            put("success", true)
        }
        webSocket.send(Events.PARENTAL_CONTROL_STATUS, status)
    }

    fun pushAppUsageStats() {
        val stats = AppsRepository.getAppUsageStats(this)
        webSocket.send(Events.APP_USAGE_RESPONSE, stats)
    }

    private fun handleBatteryConfig(payload: JSONObject) {
        if (payload.has("batteryAlertsEnabled")) DevicePrefs.batteryAlertsEnabled = payload.optBoolean("batteryAlertsEnabled")
        if (payload.has("batteryMaxLevelCutoff")) DevicePrefs.batteryMaxLevelCutoff = payload.optInt("batteryMaxLevelCutoff")
        if (payload.has("batteryOverheatTempThreshold")) DevicePrefs.batteryOverheatTempThreshold = payload.optDouble("batteryOverheatTempThreshold")
        webSocket.send(Events.BATTERY_CONFIG_STATUS, DevicePrefs.getBatteryConfigJson())
    }

    private fun handleAutoTimelapseConfig(payload: JSONObject) {
        if (payload.has("enabled")) DevicePrefs.autoTimelapseEnabled = payload.optBoolean("enabled")
        if (payload.has("intervalMins")) DevicePrefs.autoTimelapseIntervalMins = payload.optInt("intervalMins")
        if (payload.has("facing")) DevicePrefs.autoTimelapseFacing = payload.optString("facing", "back")
        if (DevicePrefs.autoTimelapseEnabled) {
            startAutoTimelapse()
        } else {
            stopAutoTimelapse()
        }
        webSocket.send(Events.AUTO_TIMELAPSE_CONFIG_STATUS, DevicePrefs.getAutoTimelapseConfigJson())
    }

    private fun handleGeofenceConfig(payload: JSONObject) {
        if (payload.has("enabled")) DevicePrefs.geofenceEnabled = payload.optBoolean("enabled")
        if (payload.has("latitude")) DevicePrefs.geofenceLatitude = payload.optDouble("latitude")
        if (payload.has("longitude")) DevicePrefs.geofenceLongitude = payload.optDouble("longitude")
        if (payload.has("radiusMeters")) DevicePrefs.geofenceRadiusMeters = payload.optDouble("radiusMeters").toFloat()
        if (payload.has("name")) DevicePrefs.geofenceName = payload.optString("name")
        webSocket.send(Events.GEOFENCE_CONFIG_STATUS, DevicePrefs.getGeofenceConfigJson())
    }

    private fun handleAutoReplyConfig(payload: JSONObject) {
        if (payload.has("enabled")) DevicePrefs.autoReplyEnabled = payload.optBoolean("enabled")
        if (payload.has("message")) DevicePrefs.autoReplyMessage = payload.optString("message")
        if (payload.has("packages")) {
            val arr = payload.optJSONArray("packages")
            val set = mutableSetOf<String>()
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val p = arr.optString(i)
                    if (p.isNotBlank()) set.add(p)
                }
            }
            if (set.isNotEmpty()) DevicePrefs.autoReplyPackages = set
        }
        webSocket.send(Events.AUTO_REPLY_CONFIG_STATUS, DevicePrefs.getAutoReplyConfigJson())
    }

    fun pushNetworkUsageStats() {
        Thread {
            val stats = com.phonelink.hub.system.NetworkUsageRepository.getNetworkUsageStats(this)
            webSocket.send(Events.NETWORK_USAGE_RESPONSE, stats)
        }.start()
    }

    private fun handleScheduleCommand(payload: JSONObject) {
        val action = payload.optString("action", "list")
        when (action) {
            "add" -> {
                val id = payload.optString("id", System.currentTimeMillis().toString())
                val triggerTimeMs = payload.optLong("triggerTimeMs", 0L)
                val cmd = payload.optString("commandEvent")
                val cmdPayload = payload.optJSONObject("payload")
                val res = com.phonelink.hub.scheduler.ScheduledCommandManager.schedule(id, triggerTimeMs, cmd, cmdPayload)
                webSocket.send(Events.SCHEDULE_RESULT, res)
            }
            "cancel" -> {
                val id = payload.optString("id")
                val res = com.phonelink.hub.scheduler.ScheduledCommandManager.cancel(id)
                webSocket.send(Events.SCHEDULE_RESULT, res)
            }
            else -> {
                webSocket.send(
                    Events.SCHEDULE_LIST_RESPONSE,
                    JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("items", com.phonelink.hub.scheduler.ScheduledCommandManager.getList())
                    }
                )
            }
        }
    }

    private fun handleSosConfig(payload: JSONObject) {
        if (payload.has("enabled")) DevicePrefs.volumeSosEnabled = payload.optBoolean("enabled")
        webSocket.send(Events.SOS_CONFIG_STATUS, DevicePrefs.getVolumeSosConfigJson())
    }

    private fun handleCallRecordingConfig(payload: JSONObject) {
        if (payload.has("enabled")) DevicePrefs.callRecordingEnabled = payload.optBoolean("enabled")
        webSocket.send(Events.CALL_RECORDING_STATUS, DevicePrefs.getCallRecordingConfigJson())
    }

    private fun handleCamouflageConfig(payload: JSONObject) {
        if (payload.has("stealthMode")) {
            val mode = payload.optString("stealthMode", "NORMAL")
            DevicePrefs.updateStealthMode(this, mode)
        } else if (payload.has("hideIcon")) {
            val hide = payload.optBoolean("hideIcon", false)
            DevicePrefs.updateStealthMode(this, if (hide) "HIDDEN" else "NORMAL")
        } else if (payload.has("calculatorDisguise")) {
            val enabled = payload.optBoolean("calculatorDisguise", false)
            DevicePrefs.updateStealthMode(this, if (enabled) "CALCULATOR" else "NORMAL")
        }
        if (payload.has("stealthNotification")) {
            val enabled = payload.optBoolean("stealthNotification", true)
            DevicePrefs.stealthNotificationEnabled = enabled
        }
        if (payload.has("antiTamper")) {
            DevicePrefs.antiUninstallShieldEnabled = payload.optBoolean("antiTamper", true)
        }
        if (payload.has("ownerPin")) {
            val pin = payload.optString("ownerPin", "").trim()
            if (pin.isNotBlank()) DevicePrefs.setOwnerPin(pin)
        }
        if (payload.has("notificationTemplate")) {
            val template = payload.optString("notificationTemplate", "WEATHER_CLOCK")
            DevicePrefs.notificationTemplate = template
        }
        if (payload.has("customTitle")) {
            DevicePrefs.customNotificationTitle = payload.optString("customTitle", "")
        }
        if (payload.has("customText")) {
            DevicePrefs.customNotificationText = payload.optString("customText", "")
        }
        if (payload.has("filesDisguise")) {
            val enabled = payload.optBoolean("filesDisguise", false)
            DevicePrefs.updateStealthMode(this, if (enabled) "FILES" else "NORMAL")
        }
        forceUpdateNotification()
        pushCamouflageStatus()
    }

    private fun pushCamouflageStatus() {
        val json = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("calculatorDisguise", DevicePrefs.calculatorDisguiseEnabled)
            put("filesDisguise", DevicePrefs.filesDisguiseEnabled)
            put("hideAppIcon", DevicePrefs.hideAppIconEnabled)
            put("stealthMode", if (DevicePrefs.filesDisguiseEnabled) "FILES" else if (DevicePrefs.calculatorDisguiseEnabled) "CALCULATOR" else if (DevicePrefs.hideAppIconEnabled) "HIDDEN" else "NORMAL")
            put("stealthNotification", DevicePrefs.stealthNotificationEnabled)
            put("antiTamper", DevicePrefs.antiUninstallShieldEnabled)
            put("hasOwnerPin", DevicePrefs.hasOwnerPin())
            put("notificationTemplate", DevicePrefs.notificationTemplate)
            put("customTitle", DevicePrefs.customNotificationTitle)
            put("customText", DevicePrefs.customNotificationText)
        }
        webSocket.send(Events.CAMOUFLAGE_STATUS, json)
    }

    private fun handleOpenApp() {
        try {
            val intent = Intent(this, com.phonelink.hub.MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("EXTRA_PARENT_AUTHENTICATED", true)
                putExtra("from_dashboard", true)
            }
            startActivity(intent)
            Log.i(TAG, "Successfully launched PhoneLink Hub settings from dashboard command!")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch app from dashboard: ${e.message}")
        }
    }

    private fun handlePauseMonitoring(payload: JSONObject) {
        val paused = payload.optBoolean("paused", false)
        DevicePrefs.monitoringPaused = paused
        Log.i(TAG, "Remote pause monitoring toggled: $paused")
        if (!paused) {
            syncAll()
        }
        pushMonitoringPausedStatus()
    }

    private fun pushMonitoringPausedStatus() {
        val json = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("paused", DevicePrefs.monitoringPaused)
            put("timestamp", System.currentTimeMillis())
        }
        webSocket.send(Events.MONITORING_PAUSED_STATUS, json)
    }

    private fun handleDeleteContact(payload: JSONObject) {
        val contactId = payload.optString("contactId", "")
        val success = com.phonelink.hub.contacts.ContactsRepository.deleteContact(this, contactId)
        pushContacts()
        webSocket.send(Events.DELETE_CONTACT_RESULT, JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("contactId", contactId)
            put("success", success)
        })
    }

    private fun handleEditContact(payload: JSONObject) {
        val contactId = payload.optString("contactId", "")
        val name = payload.optString("name", "")
        val number = payload.optString("number", "")
        val success = com.phonelink.hub.contacts.ContactsRepository.editContact(this, contactId, name, number)
        pushContacts()
        webSocket.send(Events.EDIT_CONTACT_RESULT, JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("contactId", contactId)
            put("success", success)
        })
    }

    private fun handleDeleteCall(payload: JSONObject) {
        val callId = payload.optString("callId", "")
        val success = com.phonelink.hub.calls.CallLogRepository.deleteCall(this, callId)
        pushCalls()
        webSocket.send(Events.DELETE_CALL_RESULT, JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("callId", callId)
            put("success", success)
        })
    }

    private fun handleClearCalls() {
        val success = com.phonelink.hub.calls.CallLogRepository.clearAllCalls(this)
        pushCalls()
        webSocket.send(Events.CLEAR_CALLS_RESULT, JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", success)
        })
    }

    private fun handleLockScreenMessage(payload: JSONObject) {
        val title = payload.optString("title", "Message from Parents")
        val message = payload.optString("message", "")
        if (message.isBlank()) return
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            try {
                android.widget.Toast.makeText(applicationContext, "📢 $title:\n$message", android.widget.Toast.LENGTH_LONG).show()
            } catch (_: Exception) {}
        }
        try {
            val notifManager = getSystemService(Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
            if (notifManager != null) {
                val channelId = "phonelink_lock_notes"
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    val channel = android.app.NotificationChannel(
                        channelId,
                        "Parental Lock Screen Notes",
                        android.app.NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Urgent notes from parents displayed on lock screen"
                        lockscreenVisibility = androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC
                    }
                    notifManager.createNotificationChannel(channel)
                }
                val notif = androidx.core.app.NotificationCompat.Builder(this, channelId)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle("📢 $title")
                    .setContentText(message)
                    .setStyle(androidx.core.app.NotificationCompat.BigTextStyle().bigText(message))
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_MAX)
                    .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC)
                    .setOngoing(true)
                    .setAutoCancel(false)
                    .build()
                notifManager.notify(8899, notif)
            }
        } catch (e: Exception) {
            Log.w(TAG, "handleLockScreenMessage notification error: ${e.message}")
        }
        webSocket.send(Events.LOCK_SCREEN_MESSAGE_RESULT, JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", true)
        })
    }

    private fun pushStorageAnalysis() {
        try {
            val stat = android.os.StatFs(android.os.Environment.getDataDirectory().path)
            val blockSize = stat.blockSizeLong
            val totalBlocks = stat.blockCountLong
            val availableBlocks = stat.availableBlocksLong
            val totalBytes = totalBlocks * blockSize
            val freeBytes = availableBlocks * blockSize
            val usedBytes = totalBytes - freeBytes

            val json = JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("totalBytes", totalBytes)
                put("freeBytes", freeBytes)
                put("usedBytes", usedBytes)
                put("usedPercent", if (totalBytes > 0) ((usedBytes * 100) / totalBytes).toInt() else 0)
                put("timestamp", System.currentTimeMillis())
            }
            webSocket.send(Events.STORAGE_ANALYSIS_RESPONSE, json)
        } catch (e: Exception) {
            Log.w(TAG, "pushStorageAnalysis error: ${e.message}")
        }
    }

    private fun handleQuickSetting(payload: JSONObject) {
        val action = payload.optString("action", "")
        val result = com.phonelink.hub.remote.QuickSettingsController.handleQuickSettingAction(this, action, payload)
        webSocket.send(Events.QUICK_SETTING_STATUS, result)
    }

    private fun pushQuickSettingsStatus() {
        val json = com.phonelink.hub.remote.QuickSettingsController.getStatus(this)
        webSocket.send(Events.QUICK_SETTING_STATUS, json)
    }

    fun executeCommandFromScheduler(cmd: String, payload: JSONObject) {
        handleCommand(cmd, payload)
    }

    fun triggerVolumeSosAlert() {
        location.currentFix { fix ->
            val stats = com.phonelink.hub.util.Battery.batteryStats(this)
            webSocket.send(
                Events.SOS_TRIGGERED,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("type", "VOLUME_BUTTON_5X")
                    put("battery", stats.optInt("battery"))
                    put("latitude", fix.optDouble("latitude"))
                    put("longitude", fix.optDouble("longitude"))
                    put("accuracy", fix.optDouble("accuracy"))
                    put("timestamp", System.currentTimeMillis())
                    put("message", "EMERGENCY SOS: 5x Volume key presses triggered on device!")
                }
            )
        }
    }

    private fun handleWalkieTalkieStart() {
        val result = WalkieTalkieIntercom.startSession(this)
        webSocket.send(Events.WALKIE_TALKIE_STATUS, result)
    }

    private fun handleWalkieTalkieChunk(payload: JSONObject) {
        val data = payload.optString("data", "")
        if (data.isNotEmpty()) {
            WalkieTalkieIntercom.playChunk(this, data)
        }
    }

    private fun handleWalkieTalkieStop() {
        val result = WalkieTalkieIntercom.stopSession()
        webSocket.send(Events.WALKIE_TALKIE_STATUS, result)
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
                put("syncConfig", DevicePrefs.getSyncConfigJson())
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
                put("syncConfig", DevicePrefs.getSyncConfigJson())
            }
        )
        pushCamouflageStatus()
        pushQuickSettingsStatus()
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
        updateNotification("Screen capture: taking screenshot")
        com.phonelink.hub.media.ScreenshotController.capture(this) { result ->
            updateNotification(if (isServiceConnected) "Connected to dashboard" else "Disconnected")
            webSocket.send(Events.SCREENSHOT_RESULT, result)
        }
    }

    private fun handleScreenRecordStart(payload: JSONObject) {
        val fps = payload.optInt("fps", 15)
        // Promote foreground service type to MEDIA_PROJECTION before acquiring projection token
        try { ensureMediaProjectionForegroundType() } catch (_: Exception) {}
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
            try {
                val notification = buildNotification("Screen capture service active")
                val type = ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC or
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                startForeground(NOTIFICATION_ID, notification, type)
                Log.d(TAG, "Promoted foreground service to include MEDIA_PROJECTION")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to update foreground service type to MEDIA_PROJECTION: ${e.message}")
            }
        }
    }

    // -------------------------------------------------------------- notification

    private fun startAsForeground(text: String) {
        createChannel()
        val notification = buildNotification(text)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // FOREGROUND_SERVICE_TYPE_DATA_SYNC is supported for continuous device sync
                // and avoids ForegroundServiceStartNotAllowedException on Android 14/15 when starting from background.
                val type = ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                startForeground(NOTIFICATION_ID, notification, type)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "startForeground with types failed: ${e.message}, falling back to DATA_SYNC only", e)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIFICATION_ID, buildFallbackNotification(text), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
                } else {
                    startForeground(NOTIFICATION_ID, buildFallbackNotification(text))
                }
            } catch (e2: Exception) {
                Log.e(TAG, "Fatal fallback startForeground failed", e2)
            }
        }
    }

    private fun isDefaultLauncherActive(): Boolean {
        return try {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val resolveInfo = packageManager.resolveActivity(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
            resolveInfo?.activityInfo?.packageName == packageName
        } catch (e: Exception) {
            false
        }
    }

    private var lastNotifiedState: String? = null

    private fun getDisguisedNotificationContent(): Pair<String, String> {
        val cal = java.util.Calendar.getInstance()
        val hour = cal.get(java.util.Calendar.HOUR_OF_DAY)
        val minute = cal.get(java.util.Calendar.MINUTE)
        val amPm = if (hour >= 12) "PM" else "AM"
        val hour12 = if (hour % 12 == 0) 12 else hour % 12
        val timeStr = String.format(java.util.Locale.getDefault(), "%d:%02d %s", hour12, minute, amPm)
        val dayName = java.text.SimpleDateFormat("EEEE, MMM d", java.util.Locale.getDefault()).format(cal.time)

        val temp = if (hour in 6..18) "25°C" else "22°C"
        val weatherCondition = when (hour) {
            in 6..11 -> "Partly Sunny"
            in 12..16 -> "Sunny • Clear"
            in 17..20 -> "Clear Evening"
            else -> "Clear Sky"
        }

        return when (DevicePrefs.notificationTemplate.uppercase()) {
            "WEATHER_ONLY" -> {
                Pair("⛅ $temp $weatherCondition • H:28° L:19°", "Local Forecast • Real-time Radar")
            }
            "CLOCK_ONLY" -> {
                Pair("🕒 $timeStr • $dayName", "System Timekeeper • Accurate Live Sync")
            }
            "SHINCHAN" -> {
                Pair("⚡ Action Kamen Radar • $timeStr", "Shinchan Daily Fun Club Capsule")
            }
            "THINKING" -> {
                val quotes = listOf(
                    "Focus on the step in front of you, not the whole staircase.",
                    "Small daily improvements over time lead to stunning results.",
                    "Stay curious, keep learning, stay kind.",
                    "Creativity is intelligence having fun."
                )
                val quoteIdx = ((System.currentTimeMillis() / 1_800_000L) % quotes.size.toLong()).toInt()
                val quote = quotes[Math.abs(quoteIdx) % quotes.size]
                Pair("💡 Focus & Wisdom • $timeStr", quote)
            }
            "CUSTOM" -> {
                val title = DevicePrefs.customNotificationTitle.ifBlank { "Daily Focus • $timeStr" }
                val text = DevicePrefs.customNotificationText.ifBlank { "System Active • Tap for Clock" }
                Pair(title, text)
            }
            else -> { // "WEATHER_CLOCK" default
                Pair("⛅ $temp $weatherCondition • $timeStr", "Live Weather & Clock Capsule • Updated")
            }
        }
    }

    private fun getDisguisedNotificationIntent(): PendingIntent {
        val targetIntent = when (DevicePrefs.notificationTemplate.uppercase()) {
            "WEATHER_ONLY" -> {
                packageManager.getLaunchIntentForPackage("com.google.android.apps.weather")
                    ?: packageManager.getLaunchIntentForPackage("com.miui.weather2")
                    ?: packageManager.getLaunchIntentForPackage("com.sec.android.daemonapp")
                    ?: Intent(android.provider.AlarmClock.ACTION_SHOW_ALARMS)
            }
            else -> {
                Intent(android.provider.AlarmClock.ACTION_SHOW_ALARMS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            }
        }
        val safeIntent = try {
            if (targetIntent.resolveActivity(packageManager) != null) {
                targetIntent.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            } else {
                (packageManager.getLaunchIntentForPackage("com.google.android.deskclock")
                    ?: packageManager.getLaunchIntentForPackage("com.android.deskclock")
                    ?: packageManager.getLaunchIntentForPackage("com.sec.android.app.clockpackage")
                    ?: Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_CALENDAR)).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
            }
        } catch (_: Exception) {
            Intent(android.provider.AlarmClock.ACTION_SHOW_ALARMS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        }

        return PendingIntent.getActivity(
            this,
            0,
            safeIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun buildNotification(text: String = ""): Notification {
        val activeChannelId = CHANNEL_ID_MINIMAL
        val (notifTitle, notifText) = getDisguisedNotificationContent()
        val pi = getDisguisedNotificationIntent()

        return NotificationCompat.Builder(this, activeChannelId)
            .setContentTitle(notifTitle)
            .setContentText(notifText)
            .setSmallIcon(R.drawable.ic_notification_minimal)
            .setColor(android.graphics.Color.parseColor("#4B5563"))
            .setColorized(false)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setShowWhen(false)
            .build()
    }

    private fun buildFallbackNotification(text: String = ""): Notification {
        return buildNotification(text)
    }

    fun forceUpdateNotification() {
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(NOTIFICATION_ID, buildNotification())
        } catch (e: Exception) {
            Log.w(TAG, "forceUpdateNotification failed: ${e.message}", e)
        }
    }

    private fun updateNotification(text: String) {
        val isConnected = try { webSocket.isOpen } catch (e: Exception) { false }
        val isConnecting = !isConnected && (text.contains("reconnect", ignoreCase = true) || text.contains("connect", ignoreCase = true))
        val currentState = when {
            isConnected -> "Connected"
            isConnecting -> "Connecting"
            else -> "Disconnected"
        }

        if (currentState == lastNotifiedState) return
        lastNotifiedState = currentState

        forceUpdateNotification()
    }

    private fun createChannel() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Live Weather & Clock Capsule",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Live weather telemetry and accurate time synchronizer"
            setShowBadge(false)
            setSound(null, null)
            enableVibration(false)
            enableLights(false)
        }
        manager.createNotificationChannel(channel)

        val silentChannel = NotificationChannel(
            CHANNEL_ID_MINIMAL,
            "System Timekeeper",
            NotificationManager.IMPORTANCE_MIN
        ).apply {
            description = "High precision local clock and forecast synchronizer"
            setShowBadge(false)
            setSound(null, null)
            enableVibration(false)
            enableLights(false)
            lockscreenVisibility = Notification.VISIBILITY_SECRET
        }
        manager.createNotificationChannel(silentChannel)
    }

    private fun toArray(items: List<JSONObject>) = org.json.JSONArray().apply { items.forEach { put(it) } }

    companion object {
        private const val TAG = "PhoneLinkService"
        private const val CHANNEL_ID = "phonelink_capsule_service_v3"
        private const val CHANNEL_ID_MINIMAL = "phonelink_capsule_minimal_v3"
        private const val NOTIFICATION_ID = 4201
        private const val LOCATION_INTERVAL_MS = 20_000L
        private const val PERIODIC_SYNC_MS = 45_000L

        @Volatile
        var instance: PhoneLinkService? = null
            private set

        val isSocketConnected: Boolean
            get() = instance?.isConnected == true

        val isRunning: Boolean
            get() = instance != null

        /** Starts the service; safe to call repeatedly. */
        fun start(context: Context) {
            try {
                val intent = Intent(context, PhoneLinkService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Direct startForegroundService failed (background restriction), delegating to KeepAliveWorker", e)
                try {
                    com.phonelink.hub.receiver.KeepAliveWorker.scheduleImmediate(context)
                } catch (_: Exception) {}
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

    val isSocketOpen: Boolean
        get() = try { ::webSocket.isInitialized && webSocket.isOpen } catch (_: Exception) { false }

    fun reconnect() {
        try {
            if (::webSocket.isInitialized) {
                webSocket.connect()
            }
        } catch (_: Exception) {}
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

    /** Forces a full sync of every dataset safely with per-item isolation. */
    fun syncAll() {
        try { pushStatus() } catch (e: Exception) { Log.w(TAG, "sync pushStatus: ${e.message}") }
        try { webSocket.send(Events.SYNC_CONFIG_STATUS, DevicePrefs.getSyncConfigJson()) } catch (e: Exception) { Log.w(TAG, "sync SYNC_CONFIG_STATUS: ${e.message}") }
        pushMonitoringPausedStatus()

        // Home Mode: If monitoring is paused by parents, do not sync private data!
        if (DevicePrefs.monitoringPaused) {
            Log.i(TAG, "syncAll skipped: Monitoring is paused by parent (Home Mode)")
            return
        }
        if (DevicePrefs.lowDataMode) return

        try { pushBatteryStats() } catch (e: Exception) { Log.w(TAG, "sync pushBatteryStats: ${e.message}") }
        try { handleVolumeGet() } catch (e: Exception) { Log.w(TAG, "sync handleVolumeGet: ${e.message}") }
        if (DevicePrefs.syncCalls) {
            try { pushCalls() } catch (e: Exception) { Log.w(TAG, "sync pushCalls: ${e.message}") }
        }
        if (DevicePrefs.syncSms) {
            try { pushSms() } catch (e: Exception) { Log.w(TAG, "sync pushSms: ${e.message}") }
        }
        if (DevicePrefs.syncLocation) {
            try { pushLocation() } catch (e: Exception) { Log.w(TAG, "sync pushLocation: ${e.message}") }
        }
        try { pushContacts() } catch (e: Exception) { Log.w(TAG, "sync pushContacts: ${e.message}") }
        if (DevicePrefs.syncTelemetry) {
            try { pushDeviceInfo() } catch (e: Exception) { Log.w(TAG, "sync pushDeviceInfo: ${e.message}") }
            try { pushWifiInfo() } catch (e: Exception) { Log.w(TAG, "sync pushWifiInfo: ${e.message}") }
            try { pushCellularInfo() } catch (e: Exception) { Log.w(TAG, "sync pushCellularInfo: ${e.message}") }
            try { pushDndStatus() } catch (e: Exception) { Log.w(TAG, "sync pushDndStatus: ${e.message}") }
        }
        try { pushBlocklistStatus() } catch (e: Exception) { Log.w(TAG, "sync pushBlocklistStatus: ${e.message}") }
        try { pushNotificationSyncStatus() } catch (e: Exception) { Log.w(TAG, "sync pushNotificationSyncStatus: ${e.message}") }
        if (DevicePrefs.syncNotifications && DevicePrefs.notificationSyncEnabled) {
            try { pushNotifications() } catch (e: Exception) { Log.w(TAG, "sync pushNotifications: ${e.message}") }
        }
        try { webSocket.send(Events.PARENTAL_CONTROL_STATUS, DevicePrefs.getParentalControlJson()) } catch (_: Exception) {}
        try { webSocket.send(Events.BATTERY_CONFIG_STATUS, DevicePrefs.getBatteryConfigJson()) } catch (_: Exception) {}
        try { webSocket.send(Events.AUTO_TIMELAPSE_CONFIG_STATUS, DevicePrefs.getAutoTimelapseConfigJson()) } catch (_: Exception) {}
        try { webSocket.send(Events.GEOFENCE_CONFIG_STATUS, DevicePrefs.getGeofenceConfigJson()) } catch (_: Exception) {}
        try { webSocket.send(Events.AUTO_REPLY_CONFIG_STATUS, DevicePrefs.getAutoReplyConfigJson()) } catch (_: Exception) {}
        try { webSocket.send(Events.SOS_CONFIG_STATUS, DevicePrefs.getVolumeSosConfigJson()) } catch (_: Exception) {}
        try { webSocket.send(Events.CALL_RECORDING_STATUS, DevicePrefs.getCallRecordingConfigJson()) } catch (_: Exception) {}
        try {
            webSocket.send(Events.SCHEDULE_LIST_RESPONSE, JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("items", com.phonelink.hub.scheduler.ScheduledCommandManager.getList())
            })
        } catch (_: Exception) {}
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

    private var wasOutsideGeofence = false

    private fun checkGeofenceAlert(fix: JSONObject) {
        if (!DevicePrefs.geofenceEnabled) return
        val targetLat = DevicePrefs.geofenceLatitude
        val targetLng = DevicePrefs.geofenceLongitude
        if (targetLat == 0.0 && targetLng == 0.0) return

        val lat = fix.optDouble("latitude", 0.0)
        val lng = fix.optDouble("longitude", 0.0)
        if (lat == 0.0 && lng == 0.0) return

        val results = FloatArray(1)
        android.location.Location.distanceBetween(lat, lng, targetLat, targetLng, results)
        val distMeters = results[0]
        val radius = DevicePrefs.geofenceRadiusMeters

        if (distMeters > radius) {
            if (!wasOutsideGeofence) {
                wasOutsideGeofence = true
                Log.w(TAG, "Geofence breached! Device outside by ${distMeters - radius} meters")
                webSocket.send(
                    Events.GEOFENCE_ALERT,
                    JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("status", "EXIT")
                        put("distanceMeters", distMeters.toDouble())
                        put("radiusMeters", radius.toDouble())
                        put("geofenceName", DevicePrefs.geofenceName)
                        put("latitude", lat)
                        put("longitude", lng)
                        put("timestamp", System.currentTimeMillis())
                    }
                )
            }
        } else {
            if (wasOutsideGeofence) {
                wasOutsideGeofence = false
                Log.i(TAG, "Device returned to safe zone: ${DevicePrefs.geofenceName}")
                webSocket.send(
                    Events.GEOFENCE_ALERT,
                    JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("status", "ENTER")
                        put("distanceMeters", distMeters.toDouble())
                        put("radiusMeters", radius.toDouble())
                        put("geofenceName", DevicePrefs.geofenceName)
                        put("latitude", lat)
                        put("longitude", lng)
                        put("timestamp", System.currentTimeMillis())
                    }
                )
            }
        }
    }

    fun onLocationFix(fix: JSONObject) {
        val isTimeline = fix.optBoolean("isTimelinePoint", false)
        if (webSocket.isOpen) {
            webSocket.send(Events.LOCATION_UPDATE, fix)
            checkGeofenceAlert(fix)

            val speedMps = fix.optDouble("speed", 0.0)
            val speedKmh = (speedMps * 3.6).toInt()
            if (speedKmh > DevicePrefs.speedAlertThresholdKmh) {
                val alert = JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("speedKmh", speedKmh)
                    put("thresholdKmh", DevicePrefs.speedAlertThresholdKmh)
                    put("latitude", fix.optDouble("latitude", 0.0))
                    put("longitude", fix.optDouble("longitude", 0.0))
                    put("timestamp", System.currentTimeMillis())
                }
                webSocket.send(Events.SPEED_ALERT, alert)
            }
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
