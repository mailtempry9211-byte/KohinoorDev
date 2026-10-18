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
            try {
                if (com.phonelink.hub.service.PhoneLinkService.instance == null) {
                    com.phonelink.hub.service.PhoneLinkService.start(applicationContext)
                }
                com.phonelink.hub.service.PhoneLinkService.instance?.ensureMediaProjectionForegroundType()
            } catch (e: Exception) {
                Log.w(TAG, "ensureMediaProjectionForegroundType error", e)
            }

            // Immediately acquire projection while Activity is in foreground and token is fresh!
            val proj = MediaProjectionHolder.acquireProjectionFromConsent(this, code, data)
            com.phonelink.hub.data.DevicePrefs.screenMirrorFeatureEnabled = (proj != null || MediaProjectionHolder.hasConsent)

            try {
                MediaProjectionHolder.notifyConsentGranted(applicationContext)
            } catch (e: Exception) {
                Log.w(TAG, "notifyConsentGranted error", e)
            }
        } else {
            Log.w(TAG, "Screen capture permission denied by user (code=$code)")
            com.phonelink.hub.data.DevicePrefs.screenMirrorFeatureEnabled = false
            MediaProjectionHolder.notifyConsentDenied()
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
            com.phonelink.hub.accessibility.FindPhoneAccessibilityService.expectScreenCapturePrompt(15_000L)
            val captureIntent = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                mgr.createScreenCaptureIntent(android.media.projection.MediaProjectionConfig.createConfigForDefaultDisplay())
            } else {
                mgr.createScreenCaptureIntent()
            }
            captureLauncher.launch(captureIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch screen capture intent", e)
            ScreenshotController.onConsentDenied()
            finish()
        }
    }

    companion object {
        private const val TAG = "ScreenshotConsent"

        fun launch(context: Context) {
            com.phonelink.hub.accessibility.FindPhoneAccessibilityService.expectScreenCapturePrompt(15_000L)
            val intent = Intent(context, ScreenshotConsentActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            context.startActivity(intent)
        }
    }
}
