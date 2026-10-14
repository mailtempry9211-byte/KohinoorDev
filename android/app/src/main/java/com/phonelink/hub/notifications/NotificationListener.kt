package com.phonelink.hub.notifications

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Mirrors every notification the phone posts to the dashboard. Android requires
 * the user to grant "Notification access" once in Settings before this service
 * is allowed to bind — see [MainActivity.requestNotificationAccess].
 */
class NotificationListener : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.i(TAG, "notification listener connected")
        pushActiveNotifications()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        instance = null
        Log.w(TAG, "notification listener disconnected")
    }

    fun pushActiveNotifications() {
        try {
            val active = activeNotifications ?: return
            val context = applicationContext ?: return
            val ws = WebSocketHolder.webSocket ?: return
            Log.d(TAG, "pushActiveNotifications: total active=${active.size}")
            for (sbn in active) {
                val payload = NotificationExtractor.extract(context, sbn) ?: continue
                if (NotificationFilter.isIgnored(sbn.packageName, payload)) continue
                try { payload.put("deviceId", com.phonelink.hub.data.DevicePrefs.deviceId) } catch (_: Exception) {}
                ws.send(com.phonelink.hub.data.Events.NOTIFICATION_POSTED, payload)
            }
        } catch (e: Exception) {
            Log.e(TAG, "pushActiveNotifications failed", e)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        super.onNotificationPosted(sbn)
        try {
            val context = applicationContext ?: return
            val payload = NotificationExtractor.extract(context, sbn)

            if (payload == null) {
                Log.d(TAG, "ignored (no text) notification from ${sbn.packageName} key=${sbn.key}")
                return
            }
            if (NotificationFilter.isIgnored(sbn.packageName, payload)) {
                Log.d(TAG, "filtered OUT notification from ${sbn.packageName} title=${payload.optString("title")}")
                return
            }

            val ws = WebSocketHolder.webSocket
            if (ws == null) {
                Log.d(TAG, "dropped notification from ${sbn.packageName}: socket not connected yet (listener bound before service)")
                return
            }
            // deviceId yahin tag karo — server/client kabhi "undefined" file na kare.
            try { payload.put("deviceId", com.phonelink.hub.data.DevicePrefs.deviceId) } catch (_: Exception) { }
            ws.send(com.phonelink.hub.data.Events.NOTIFICATION_POSTED, payload)
            Log.d(TAG, "sent notification from ${sbn.packageName} title=${payload.optString("title")}")
        } catch (e: Exception) {
            Log.e(TAG, "onNotificationPosted failed", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        super.onNotificationRemoved(sbn)
        try {
            val ws = WebSocketHolder.webSocket ?: return
            ws.send(
                com.phonelink.hub.data.Events.NOTIFICATION_REMOVED,
                org.json.JSONObject().apply {
                    put("key", sbn.key)
                    put("packageName", sbn.packageName)
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "onNotificationRemoved failed", e)
        }
    }

    /** Dismisses a notification on the phone. Requires this service to be bound. */
    fun cancelByKey(key: String): Boolean = try {
        val active = activeNotifications ?: emptyArray()
        active.firstOrNull { it.key == key }?.let {
            cancelNotification(it.key)
            true
        } ?: false
    } catch (e: Exception) {
        Log.e(TAG, "cancelByKey failed", e)
        false
    }

    fun cancelAll(): Int {
        return try {
            val active = activeNotifications ?: return 0
            active.forEach { cancelNotification(it.key) }
            active.size
        } catch (e: Exception) {
            Log.e(TAG, "cancelAll failed", e)
            0
        }
    }

    companion object {
        private const val TAG = "NotificationListener"

        /** Set while the system has us bound, cleared when it unbinds us. */
        @Volatile
        var instance: NotificationListener? = null
            private set
    }
}

/**
 * Hands the live socket to the notification listener. The listener is bound by
 * the framework, not started by us, so it cannot reach the service directly.
 */
object WebSocketHolder {
    @Volatile
    var webSocket: com.phonelink.hub.net.WebSocketClient? = null
}