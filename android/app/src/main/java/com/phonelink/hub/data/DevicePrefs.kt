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

    var serverPort: Int
        get() = prefs.getInt(KEY_PORT, 5000)
        set(value) = prefs.edit().putInt(KEY_PORT, value).apply()

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
}