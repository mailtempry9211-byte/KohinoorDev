package com.phonelink.hub.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.service.PhoneLinkService

/** FEATURE D: restart the foreground service after a phone reboot, unlock, or system event. */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: "UNKNOWN"
        Log.i(TAG, "system broadcast received: $action — reviving PhoneLinkService")
        try {
            DevicePrefs.init(context)
            if (DevicePrefs.serviceEnabled && DevicePrefs.serverIp.isNotBlank()) {
                PhoneLinkService.start(context)
                KeepAliveWorker.schedule(context)
                scheduleNextAlarm(context)
            } else {
                Log.d(TAG, "service not enabled or IP blank, skipping auto-start")
            }
        } catch (e: Exception) {
            Log.w(TAG, "could not restart service on $action", e)
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
        const val ACTION_HEARTBEAT = "com.phonelink.hub.HEARTBEAT"

        fun scheduleNextAlarm(context: Context) {
            try {
                val am = context.getSystemService(Context.ALARM_SERVICE) as? android.app.AlarmManager ?: return
                val intent = Intent(context, BootReceiver::class.java).apply { action = ACTION_HEARTBEAT }
                val pi = android.app.PendingIntent.getBroadcast(
                    context,
                    9211,
                    intent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
                )
                val triggerAt = System.currentTimeMillis() + 15 * 60 * 1000L
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, triggerAt, pi)
                } else {
                    am.set(android.app.AlarmManager.RTC_WAKEUP, triggerAt, pi)
                }
            } catch (e: Exception) {
                Log.w(TAG, "scheduleNextAlarm error: ${e.message}")
            }
        }
    }
}
