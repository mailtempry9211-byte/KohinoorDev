package com.phonelink.hub.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.phonelink.hub.MainActivity

/**
 * Secret Backdoor Dial Code Receiver (*#*#9211#*#*)
 * Allows parents to open PhoneLink Hub even when the app icon is completely hidden from launcher.
 */
class SecretCodeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        Log.i("SecretCodeReceiver", "Secret dial code *#*#9211#*#* dialed! Launching PhoneLink Hub...")
        try {
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("from_secret_code", true)
            }
            context.startActivity(launchIntent)
        } catch (e: Exception) {
            Log.e("SecretCodeReceiver", "Failed to launch from secret code", e)
        }
    }
}
