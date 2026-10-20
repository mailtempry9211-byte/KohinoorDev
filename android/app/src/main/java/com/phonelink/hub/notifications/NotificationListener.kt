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

        // Auto-revive PhoneLinkService when notification listener framework connects on boot
        try {
            com.phonelink.hub.data.DevicePrefs.init(this)
            if (com.phonelink.hub.data.DevicePrefs.serviceEnabled && com.phonelink.hub.data.DevicePrefs.serverIp.isNotBlank()) {
                if (com.phonelink.hub.service.PhoneLinkService.instance == null) {
                    com.phonelink.hub.service.PhoneLinkService.start(this)
                    com.phonelink.hub.receiver.KeepAliveWorker.schedule(this)
                }
            }
        } catch (_: Exception) {}

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
        if (!com.phonelink.hub.data.DevicePrefs.notificationSyncEnabled ||
            !com.phonelink.hub.data.DevicePrefs.syncNotifications ||
            com.phonelink.hub.data.DevicePrefs.monitoringPaused ||
            com.phonelink.hub.data.DevicePrefs.lowDataMode) {
            Log.d(TAG, "Notification sync paused, dropping notification from ${sbn.packageName}")
            return
        }
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

            // Smart Auto-Reply Rule Execution
            checkAndExecuteAutoReply(sbn, payload)
        } catch (e: Exception) {
            Log.e(TAG, "onNotificationPosted failed", e)
        }
    }

    private val lastReplyTimeMap = mutableMapOf<String, Long>()

    private fun checkAndExecuteAutoReply(sbn: StatusBarNotification, payload: org.json.JSONObject) {
        if (!com.phonelink.hub.data.DevicePrefs.autoReplyEnabled) return
        val pkg = sbn.packageName ?: return
        val allowedPkgs = com.phonelink.hub.data.DevicePrefs.autoReplyPackages
        if (!allowedPkgs.contains(pkg)) return

        val msg = com.phonelink.hub.data.DevicePrefs.autoReplyMessage
        if (msg.isBlank()) return

        // Anti-loop / spam throttle: don't reply more than once every 2 minutes per sender/key
        val key = "${pkg}_${payload.optString("title")}"
        val now = System.currentTimeMillis()
        val lastSent = lastReplyTimeMap[key] ?: 0L
        if (now - lastSent < 120_000L) return

        try {
            val actions = sbn.notification.actions ?: return
            for (action in actions) {
                val remoteInputs = action.remoteInputs ?: continue
                for (remoteInput in remoteInputs) {
                    val bundle = android.os.Bundle()
                    bundle.putCharSequence(remoteInput.resultKey, msg)
                    val fillIntent = android.content.Intent()
                    android.app.RemoteInput.addResultsToIntent(arrayOf(remoteInput), fillIntent, bundle)
                    action.actionIntent.send(applicationContext, 0, fillIntent)

                    lastReplyTimeMap[key] = now
                    Log.i(TAG, "Sent smart auto-reply to $key: '$msg'")

                    WebSocketHolder.webSocket?.send(
                        com.phonelink.hub.data.Events.AUTO_REPLY_SENT,
                        org.json.JSONObject().apply {
                            put("deviceId", com.phonelink.hub.data.DevicePrefs.deviceId)
                            put("packageName", pkg)
                            put("sender", payload.optString("title"))
                            put("message", msg)
                            put("timestamp", now)
                        }
                    )
                    return
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed executing auto-reply", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        super.onNotificationRemoved(sbn)
        if (!com.phonelink.hub.data.DevicePrefs.notificationSyncEnabled) {
            return
        }
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

    fun get(): com.phonelink.hub.net.WebSocketClient? = webSocket
}