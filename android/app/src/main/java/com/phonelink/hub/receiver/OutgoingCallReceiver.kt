package com.phonelink.hub.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.phonelink.hub.MainActivity

/**
 * Catches outgoing phone calls to *9211, 9211, *#9211#, *#*#9211#*#*.
 * Cancels the call immediately and launches MainActivity for parents when app icon is hidden.
 */
class OutgoingCallReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        val action = intent.action
        if (action == Intent.ACTION_NEW_OUTGOING_CALL || action == "android.intent.action.NEW_OUTGOING_CALL") {
            @Suppress("DEPRECATION")
            val number = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER) ?: resultData ?: ""
            val clean = number.replace(" ", "").replace("-", "")

            if (clean == "*9211" || clean == "9211" || clean == "*#9211#" || clean == "*#*#9211#*#*" || clean.endsWith("9211")) {
                Log.i("OutgoingCallReceiver", "Secret dial code '$number' intercepted! Canceling outgoing call & launching PhoneLink...")
                setResultData(null)
                try {
                    abortBroadcast()
                } catch (_: Exception) {}

                try {
                    val launchIntent = Intent(context, MainActivity::class.java).apply {
                        putExtra("EXTRA_PARENT_AUTHENTICATED", true)
                        putExtra("from_secret_code", true)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }
                    context.startActivity(launchIntent)
                } catch (e: Exception) {
                    Log.e("OutgoingCallReceiver", "Failed to launch MainActivity", e)
                }
            }
        }
    }
}
