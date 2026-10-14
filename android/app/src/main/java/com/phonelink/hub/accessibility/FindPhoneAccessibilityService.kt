package com.phonelink.hub.accessibility

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * FEATURE C: minimal accessibility service for Find-My-Phone.
 * Holds a privileged process alive so the alarm keeps playing; it does NOT
 * read the screen (canRetrieveWindowContent=false) and performs NO gestures.
 */
class FindPhoneAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "find-phone accessibility service connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Intentionally empty: this service never inspects screen content.
    }

    override fun onInterrupt() {
    }

    companion object {
        private const val TAG = "FindPhoneAccService"
    }
}
