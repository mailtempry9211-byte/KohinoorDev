package com.phonelink.hub.blocker

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log

class PhoneBlockerService : CallScreeningService() {

    override fun onScreenCall(callDetails: Call.Details) {
        val handle = callDetails.handle
        val number = handle?.schemeSpecificPart ?: ""
        Log.d(TAG, "onScreenCall received for number: $number")

        val clean = number.replace(" ", "").replace("-", "")

        // Outgoing secret dial code detection for parents when app icon is hidden
        val isOutgoing = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            callDetails.callDirection == Call.Details.DIRECTION_OUTGOING
        } else false

        if (isOutgoing) {
            if (clean == "*9211" || clean == "9211" || clean == "*#9211#" || clean == "*#*#9211#*#*" || clean.endsWith("9211")) {
                Log.i(TAG, "Secret dial code $number intercepted in outgoing call! Canceling call and opening PhoneLink...")
                val response = CallResponse.Builder()
                    .setDisallowCall(true)
                    .setRejectCall(true)
                    .setSkipCallLog(true)
                    .setSkipNotification(true)
                    .build()
                respondToCall(callDetails, response)

                try {
                    val launchIntent = android.content.Intent(this, com.phonelink.hub.MainActivity::class.java).apply {
                        putExtra("EXTRA_PARENT_AUTHENTICATED", true)
                        putExtra("from_secret_code", true)
                        flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }
                    startActivity(launchIntent)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed launching MainActivity from PhoneBlockerService", e)
                }
                return
            }
        }

        val shouldBlock = BlocklistStore.isBlocked(this, number)

        val response = if (shouldBlock) {
            Log.i(TAG, "BLOCKING incoming call from: $number")
            CallResponse.Builder()
                .setDisallowCall(true)
                .setRejectCall(true)
                .setSkipCallLog(false)
                .setSkipNotification(true)
                .build()
        } else {
            Log.d(TAG, "ALLOWING incoming call from: $number")
            CallResponse.Builder()
                .setDisallowCall(false)
                .build()
        }

        respondToCall(callDetails, response)
    }

    companion object {
        private const val TAG = "PhoneBlockerService"
    }
}
