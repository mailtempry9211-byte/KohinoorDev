package com.phonelink.hub.remote

import android.app.Activity
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.util.Log

/**
 * Transparent, transient activity that acquires window focus to legally read
 * the primary clip on Android 10+ (API 29+), where background services are blocked.
 */
class ClipboardFocusActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        overridePendingTransition(0, 0)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            try {
                val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                val clip = cm?.primaryClip
                val text = if (clip != null && clip.itemCount > 0) {
                    clip.getItemAt(0)?.coerceToText(this)?.toString() ?: ""
                } else {
                    ""
                }
                Log.d(TAG, "Acquired focus, clipboard length: ${text.length}")
                ClipboardReader.onFocusReadComplete(text)
            } catch (e: Exception) {
                Log.e(TAG, "Error reading clipboard in focus activity", e)
                ClipboardReader.onFocusReadComplete("")
            } finally {
                finish()
                overridePendingTransition(0, 0)
            }
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

