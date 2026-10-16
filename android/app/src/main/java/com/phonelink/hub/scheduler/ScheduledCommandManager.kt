package com.phonelink.hub.scheduler

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.data.Events
import com.phonelink.hub.notifications.WebSocketHolder
import org.json.JSONArray
import org.json.JSONObject

object ScheduledCommandManager {
    private const val TAG = "ScheduledCmdMgr"
    private val handler = Handler(Looper.getMainLooper())
    private var isCheckRunning = false

    private val checkRunnable = object : Runnable {
        override fun run() {
            checkAndExecuteDue()
            handler.postDelayed(this, 30_000L) // Check every 30 seconds
        }
    }

    fun start() {
        if (!isCheckRunning) {
            isCheckRunning = true
            handler.post(checkRunnable)
        }
    }

    fun stop() {
        isCheckRunning = false
        handler.removeCallbacks(checkRunnable)
    }

    @Synchronized
    fun schedule(id: String, triggerTimeMs: Long, commandEvent: String, payload: JSONObject?): JSONObject {
        val list = getList()
        val item = JSONObject().apply {
            put("id", id)
            put("triggerTimeMs", triggerTimeMs)
            put("commandEvent", commandEvent)
            put("payload", payload ?: JSONObject())
            put("createdAt", System.currentTimeMillis())
        }
        list.put(item)
        DevicePrefs.scheduledCommandsJson = list.toString()
        Log.i(TAG, "Scheduled command $commandEvent for $triggerTimeMs (id: $id)")
        start()

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", true)
            put("scheduledItem", item)
        }
    }

    @Synchronized
    fun cancel(id: String): JSONObject {
        val list = getList()
        val fresh = JSONArray()
        var found = false
        for (i in 0 until list.length()) {
            val item = list.getJSONObject(i)
            if (item.optString("id") == id) {
                found = true
            } else {
                fresh.put(item)
            }
        }
        DevicePrefs.scheduledCommandsJson = fresh.toString()
        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", found)
            put("id", id)
        }
    }

    @Synchronized
    fun getList(): JSONArray {
        val raw = DevicePrefs.scheduledCommandsJson
        return try {
            if (raw.isBlank() || raw == "[]") JSONArray() else JSONArray(raw)
        } catch (_: Exception) {
            JSONArray()
        }
    }

    @Synchronized
    fun checkAndExecuteDue() {
        val list = getList()
        if (list.length() == 0) return

        val now = System.currentTimeMillis()
        val remaining = JSONArray()
        val service = com.phonelink.hub.service.PhoneLinkService.instance

        for (i in 0 until list.length()) {
            val item = list.getJSONObject(i)
            val triggerTimeMs = item.optLong("triggerTimeMs", 0L)
            val id = item.optString("id")
            val cmd = item.optString("commandEvent")
            val payload = item.optJSONObject("payload") ?: JSONObject()

            if (now >= triggerTimeMs) {
                Log.i(TAG, "Executing due scheduled command: $cmd (id: $id)")
                if (service != null) {
                    service.executeCommandFromScheduler(cmd, payload)
                }
                WebSocketHolder.webSocket?.send(
                    Events.SCHEDULE_RESULT,
                    JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("id", id)
                        put("commandEvent", cmd)
                        put("executedAt", now)
                        put("success", true)
                    }
                )
            } else {
                remaining.put(item)
            }
        }

        DevicePrefs.scheduledCommandsJson = remaining.toString()
    }
}
