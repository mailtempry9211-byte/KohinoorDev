package com.phonelink.hub.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.phonelink.hub.service.PhoneLinkService

/**
 * Fires the moment an SMS arrives so the dashboard shows it without polling.
 * The receiver reads the SMS provider so a duplicate sync is impossible.
 */
class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        Log.i(TAG, "SMS received broadcast")

        // Read the provider (rather than parsing PDUs) so the dashboard value
        // matches what the user sees in the messaging app.
        PhoneLinkService.pushSmsUpdate(context)
    }

    companion object {
        private const val TAG = "SmsReceiver"
    }
}