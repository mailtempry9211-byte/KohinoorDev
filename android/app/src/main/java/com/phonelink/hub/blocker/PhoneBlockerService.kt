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
