package com.phonelink.hub.findphone

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Stops the find-phone alarm when the user taps STOP on its notification. */
class FindPhoneStopReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        FindPhoneManager.stop(context)
    }
}
