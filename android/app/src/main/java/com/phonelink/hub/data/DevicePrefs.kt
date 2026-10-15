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

    fun isConfigured(): Boolean = serverIp.isNotBlank()

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
}