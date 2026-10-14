package com.phonelink.hub.media

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts

/**
 * Transparent activity that requests system screen capture permission from the user.
 * Finishes immediately once the user accepts or declines.
 */
class ScreenshotConsentActivity : ComponentActivity() {

    private val captureLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val code = result.resultCode
        val data = result.data

        if (code == Activity.RESULT_OK && data != null) {
            Log.d(TAG, "Screen capture permission granted by user")
            MediaProjectionHolder.updateConsent(code, data)
            ScreenshotController.onConsentGranted(this)
        } else {
            Log.w(TAG, "Screen capture permission denied by user (code=$code)")
            ScreenshotController.onConsentDenied()
        }
        finish()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val mgr = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager
        if (mgr == null) {
            Log.e(TAG, "MediaProjectionManager not available")
            ScreenshotController.onConsentDenied()
            finish()
            return
        }

        try {
            captureLauncher.launch(mgr.createScreenCaptureIntent())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch screen capture intent", e)
            ScreenshotController.onConsentDenied()
            finish()
        }
    }

    companion object {
        private const val TAG = "ScreenshotConsent"

        fun launch(context: Context) {
            val intent = Intent(context, ScreenshotConsentActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            context.startActivity(intent)
        }
    }
}
