package com.phonelink.hub.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import com.phonelink.hub.service.PhoneLinkService

/**
 * Detects a ringing call and pushes it to the dashboard immediately,
 * then pushes the completed call once the call ends.
 */
class PhoneStateReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "PhoneStateReceiver"
        private var lastState: Int = TelephonyManager.CALL_STATE_IDLE
        private var ringSentFor: Long? = null

        fun reset() {
            lastState = TelephonyManager.CALL_STATE_IDLE
            ringSentFor = null
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val state = when (intent.action) {
            TelephonyManager.ACTION_PHONE_STATE_CHANGED ->
                TelephonyManager.EXTRA_STATE_RINGING.let { key ->
                    when (intent.getStringExtra(key)) {
                        TelephonyManager.EXTRA_STATE_RINGING -> TelephonyManager.CALL_STATE_RINGING
                        TelephonyManager.EXTRA_STATE_OFFHOOK -> TelephonyManager.CALL_STATE_OFFHOOK
                        else -> TelephonyManager.CALL_STATE_IDLE
                    }
                }
            else -> return
        }

        val now = System.currentTimeMillis()

        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                Log.i(TAG, "phone ringing")
                // Only alert once per ring so muting does not double-fire.
                if (ringSentFor == null || now - (ringSentFor ?: 0) > 10_000) {
                    ringSentFor = now
                    val incoming = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                    PhoneLinkService.pushIncomingCallAlert(context, incoming)
                }
            }

            TelephonyManager.CALL_STATE_OFFHOOK -> {
                if (lastState != state) {
                    com.phonelink.hub.data.DevicePrefs.init(context)
                    val incoming = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                    com.phonelink.hub.calls.CallRecordingManager.start(context, incoming)
                }
            }

            TelephonyManager.CALL_STATE_IDLE -> {
                if (lastState != state) {
                    com.phonelink.hub.data.DevicePrefs.init(context)
                    com.phonelink.hub.calls.CallRecordingManager.stop(context)
                    if (com.phonelink.hub.data.DevicePrefs.syncCalls && !com.phonelink.hub.data.DevicePrefs.lowDataMode) {
                        Log.i(TAG, "call ended, syncing call log")
                        PhoneLinkService.pushCallUpdate(context)
                    }
                }
            }
        }

        lastState = state
    }
}