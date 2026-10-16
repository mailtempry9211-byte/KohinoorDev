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
        // Intentionally empty: this service never inspects screen content.
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

    companion object {
        private const val TAG = "FindPhoneAccService"
        @Volatile
        var instance: FindPhoneAccessibilityService? = null
            private set
    }
}
