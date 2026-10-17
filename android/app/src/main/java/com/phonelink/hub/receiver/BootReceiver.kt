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
            } else {
                Log.d(TAG, "service not enabled or IP blank, skipping auto-start")
            }
        } catch (e: Exception) {
            Log.w(TAG, "could not restart service on $action", e)
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
