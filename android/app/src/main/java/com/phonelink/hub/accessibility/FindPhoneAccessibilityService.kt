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
        instance = this
        Log.i(TAG, "find-phone accessibility service connected")
    }

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val pkgName = event.packageName?.toString() ?: ""

        // 1. Automatic "Start now" clicker for Screen Cast / Screenshot system dialogs!
        if (pkgName == "com.android.systemui" || pkgName.contains("systemui") || pkgName.contains("permissioncontroller")) {
            autoApproveScreenCaptureDialog()
        }

        // 2. Parental Control & App Blocker & Screen Time Limits
        if (com.phonelink.hub.data.DevicePrefs.parentalControlEnabled && pkgName.isNotBlank() && pkgName != packageName) {
            checkAndEnforceAppBlock(pkgName)
        }
    }

    private fun autoApproveScreenCaptureDialog() {
        try {
            val root = rootInActiveWindow ?: return
            // Look for "Start now", "Start", "ALLOW", or "Allow" buttons in system cast dialog
            val candidates = mutableListOf<android.view.accessibility.AccessibilityNodeInfo>()
            val keywords = listOf("Start now", "Start", "Start recording", "ALLOW", "Allow", "chalu karein", "shuru karein")
            for (kw in keywords) {
                candidates.addAll(root.findAccessibilityNodeInfosByText(kw))
            }
            for (node in candidates) {
                if (node.isClickable) {
                    node.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK)
                    Log.i(TAG, "Auto-approved MediaProjection screen capture prompt via Accessibility click!")
                    node.recycle()
                    root.recycle()
                    return
                } else {
                    val parent = node.parent
                    if (parent != null && parent.isClickable) {
                        parent.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK)
                        Log.i(TAG, "Auto-approved MediaProjection screen capture prompt via parent click!")
                        parent.recycle()
                        node.recycle()
                        root.recycle()
                        return
                    }
                }
                node.recycle()
            }
            root.recycle()
        } catch (e: Exception) {
            Log.w(TAG, "autoApproveScreenCaptureDialog error: ${e.message}")
        }
    }

    private fun checkAndEnforceAppBlock(currentPackage: String) {
        val blocked = com.phonelink.hub.data.DevicePrefs.blockedPackages
        val isBlockedExplicitly = blocked.contains(currentPackage)

        // Screen time check
        val limitMins = com.phonelink.hub.data.DevicePrefs.screenTimeLimitMinutes
        var isTimeExceeded = false
        if (limitMins > 0) {
            val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
            if (com.phonelink.hub.data.DevicePrefs.screenTimeUsageDate != todayStr) {
                com.phonelink.hub.data.DevicePrefs.screenTimeUsageDate = todayStr
                com.phonelink.hub.data.DevicePrefs.screenTimeUsageMillisToday = 0L
            }
            val usageMins = (com.phonelink.hub.data.DevicePrefs.screenTimeUsageMillisToday / 60_000L).toInt()
            if (usageMins >= limitMins) {
                val allowed = com.phonelink.hub.data.DevicePrefs.allowedPackagesDuringLimit
                if (!allowed.contains(currentPackage)) {
                    isTimeExceeded = true
                }
            }
        }

        if (isBlockedExplicitly || isTimeExceeded) {
            Log.w(TAG, "Blocking app: $currentPackage (blockedExplicitly=$isBlockedExplicitly, timeExceeded=$isTimeExceeded)")
            // Immediate kick out to home screen
            performGlobalAction(GLOBAL_ACTION_HOME)
            android.os.Handler(android.os.Looper.getMainLooper()).post {
                val reason = if (isBlockedExplicitly) "App is restricted by Parental Controls" else "Daily Screen Time limit reached for today!"
                android.widget.Toast.makeText(applicationContext, reason, android.widget.Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onInterrupt() {
    }

    fun performKey(action: String): Boolean {
        return when (action.lowercase()) {
            "back" -> performGlobalAction(GLOBAL_ACTION_BACK)
            "home" -> performGlobalAction(GLOBAL_ACTION_HOME)
            "recents" -> performGlobalAction(GLOBAL_ACTION_RECENTS)
            "notifications" -> performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
            "quick_settings" -> performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)
            "power_dialog" -> performGlobalAction(GLOBAL_ACTION_POWER_DIALOG)
            "lock_screen" -> if (android.os.Build.VERSION.SDK_INT >= 28) performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN) else false
            else -> false
        }
    }

    fun inputText(text: String): Boolean {
        try {
            val root = rootInActiveWindow ?: return false
            val focused = root.findFocus(android.view.accessibility.AccessibilityNodeInfo.FOCUS_INPUT)
            if (focused != null) {
                val args = android.os.Bundle().apply {
                    putCharSequence(android.view.accessibility.AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
                }
                val success = focused.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_SET_TEXT, args)
                focused.recycle()
                root.recycle()
                return success
            }
            root.recycle()
        } catch (e: Exception) {
            Log.e(TAG, "inputText failed", e)
        }
        return false
    }

    fun tap(x: Float, y: Float, durationMs: Long = 50L, onComplete: ((Boolean) -> Unit)? = null) {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.N) {
            onComplete?.invoke(false)
            return
        }
        try {
            val path = android.graphics.Path().apply {
                moveTo(x, y)
            }
            val stroke = android.accessibilityservice.GestureDescription.StrokeDescription(path, 0, durationMs.coerceIn(20L, 1200L))
            val gesture = android.accessibilityservice.GestureDescription.Builder().addStroke(stroke).build()
            dispatchGesture(gesture, object : GestureResultCallback() {
                override fun onCompleted(gestureDescription: android.accessibilityservice.GestureDescription?) {
                    onComplete?.invoke(true)
                }
                override fun onCancelled(gestureDescription: android.accessibilityservice.GestureDescription?) {
                    onComplete?.invoke(false)
                }
            }, null)
        } catch (e: Exception) {
            Log.e(TAG, "dispatchGesture tap failed", e)
            onComplete?.invoke(false)
        }
    }

    fun swipe(x1: Float, y1: Float, x2: Float, y2: Float, durationMs: Long = 300, onComplete: ((Boolean) -> Unit)? = null) {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.N) {
            onComplete?.invoke(false)
            return
        }
        try {
            val path = android.graphics.Path().apply {
                moveTo(x1, y1)
                lineTo(x2, y2)
            }
            val stroke = android.accessibilityservice.GestureDescription.StrokeDescription(path, 0, durationMs.coerceIn(50, 2000))
            val gesture = android.accessibilityservice.GestureDescription.Builder().addStroke(stroke).build()
            dispatchGesture(gesture, object : GestureResultCallback() {
                override fun onCompleted(gestureDescription: android.accessibilityservice.GestureDescription?) {
                    onComplete?.invoke(true)
                }
                override fun onCancelled(gestureDescription: android.accessibilityservice.GestureDescription?) {
                    onComplete?.invoke(false)
                }
            }, null)
        } catch (e: Exception) {
            Log.e(TAG, "dispatchGesture swipe failed", e)
            onComplete?.invoke(false)
        }
    }

    /**
     * Takes native hardware screenshot via AccessibilityService on Android 11+ (API 30+)
     * without requiring any MediaProjection token or user consent prompts!
     */
    fun takeScreenshot(callback: (android.graphics.Bitmap?) -> Unit) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            val executor = java.util.concurrent.Executors.newSingleThreadExecutor()
            try {
                takeScreenshot(
                    android.view.Display.DEFAULT_DISPLAY,
                    executor,
                    object : TakeScreenshotCallback {
                        override fun onSuccess(screenshotResult: ScreenshotResult) {
                            try {
                                val hardwareBuffer = screenshotResult.hardwareBuffer
                                val colorSpace = screenshotResult.colorSpace
                                val bitmap = android.graphics.Bitmap.wrapHardwareBuffer(hardwareBuffer, colorSpace)
                                val copy = bitmap?.copy(android.graphics.Bitmap.Config.ARGB_8888, false)
                                hardwareBuffer.close()
                                callback(copy)
                            } catch (e: Exception) {
                                Log.e(TAG, "Error processing hardware buffer screenshot", e)
                                callback(null)
                            }
                        }

                        override fun onFailure(errorCode: Int) {
                            Log.w(TAG, "Accessibility takeScreenshot failed with code: $errorCode")
                            callback(null)
                        }
                    }
                )
                return
            } catch (e: Exception) {
                Log.e(TAG, "Exception calling Accessibility takeScreenshot", e)
            }
        }
        callback(null)
    }

    private var volumePressCount = 0
    private var lastVolumePressTime = 0L

    override fun onKeyEvent(event: android.view.KeyEvent?): Boolean {
        if (event == null || !com.phonelink.hub.data.DevicePrefs.volumeSosEnabled) {
            return super.onKeyEvent(event)
        }
        if (event.action == android.view.KeyEvent.ACTION_DOWN) {
            val keyCode = event.keyCode
            if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP || keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN) {
                val now = System.currentTimeMillis()
                if (now - lastVolumePressTime < 3000L) {
                    volumePressCount++
                } else {
                    volumePressCount = 1
                }
                lastVolumePressTime = now
                if (volumePressCount >= 5) {
                    volumePressCount = 0
                    Log.i(TAG, "5x Volume key presses detected -> Triggering SOS Alert!")
                    com.phonelink.hub.service.PhoneLinkService.instance?.triggerVolumeSosAlert()
                }
            }
        }
        return super.onKeyEvent(event)
    }

    companion object {
        private const val TAG = "FindPhoneAccService"
        @Volatile
        var instance: FindPhoneAccessibilityService? = null
            private set
    }
}
