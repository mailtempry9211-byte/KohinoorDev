package com.phonelink.hub.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.phonelink.hub.service.PhoneLinkService

/** FEATURE D: restart the foreground service after a phone reboot. */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        Log.i(TAG, "boot completed — restarting service")
        try {
            PhoneLinkService.start(context)
            KeepAliveWorker.schedule(context)
        } catch (e: Exception) {
            Log.w(TAG, "could not restart service on boot", e)
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
