package com.phonelink.hub.remote

import android.app.Activity
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowManager

/**
 * Transparent, transient activity that acquires window focus to legally read
 * the primary clip on Android 10+ (API 29+), where background services are blocked.
 */
class ClipboardFocusActivity : Activity() {

    private var hasRead = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        overridePendingTransition(0, 0)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
    }

    override fun onResume() {
        super.onResume()
        tryReadClipboard()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            tryReadClipboard()
        }
    }

    private fun tryReadClipboard() {
        if (hasRead) return
        try {
            val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
            val clip = cm?.primaryClip
            if (clip != null && clip.itemCount > 0) {
                val text = clip.getItemAt(0)?.coerceToText(this)?.toString() ?: ""
                hasRead = true
                Log.d(TAG, "Acquired focus, clipboard length: ${text.length}")
                ClipboardReader.onFocusReadComplete(text)
                finish()
                overridePendingTransition(0, 0)
            } else if (hasWindowFocus()) {
                hasRead = true
                Log.d(TAG, "Window focused but clipboard is empty")
                ClipboardReader.onFocusReadComplete("")
                finish()
                overridePendingTransition(0, 0)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading clipboard in focus activity", e)
            hasRead = true
            ClipboardReader.onFocusReadComplete("")
            finish()
            overridePendingTransition(0, 0)
        }
    }

    override fun onPause() {
        super.onPause()
        overridePendingTransition(0, 0)
    }

    companion object {
        private const val TAG = "ClipboardFocusActivity"
    }
}
