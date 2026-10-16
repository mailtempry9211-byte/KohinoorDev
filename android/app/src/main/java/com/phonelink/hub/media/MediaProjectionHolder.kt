package com.phonelink.hub.media

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.util.Log

/**
 * Manages the MediaProjection permission token and instance.
 * Maintains an active projection session across multiple screenshots and live streams
 * so the user only has to approve "Start now" once.
 */
object MediaProjectionHolder {
    private const val TAG = "MediaProjectionHolder"

    var resultCode: Int = Activity.RESULT_CANCELED
    var resultData: Intent? = null

    private var activeProjection: MediaProjection? = null

    val hasConsent: Boolean
        get() = (activeProjection != null) || (resultCode == Activity.RESULT_OK && resultData != null)

    val projection: MediaProjection?
        get() = activeProjection

    fun updateConsent(code: Int, data: Intent?) {
        resultCode = code
        resultData = data
        Log.d(TAG, "Consent updated: resultCode=$code, hasData=${data != null}")
    }

    fun notifyConsentGranted(appContext: Context) {
        ScreenshotController.onConsentGranted(appContext)
        ScreenRecorder.onConsentGranted(appContext)
    }

    fun notifyConsentDenied() {
        ScreenshotController.onConsentDenied()
        ScreenRecorder.onConsentDenied()
    }

    @Synchronized
    fun acquireProjectionFromConsent(context: Context, code: Int, data: Intent): MediaProjection? {
        resultCode = code
        resultData = data
        try {
            com.phonelink.hub.service.PhoneLinkService.instance?.ensureMediaProjectionForegroundType()
        } catch (_: Exception) {}

        val appContext = context.applicationContext ?: context
        val mgr = appContext.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager
            ?: return null

        return try {
            val proj = mgr.getMediaProjection(code, data)
            proj?.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() {
                    Log.d(TAG, "MediaProjection stopped by system")
                    activeProjection = null
                    resultCode = Activity.RESULT_CANCELED
                    resultData = null
                }
            }, null)
            activeProjection = proj
            Log.d(TAG, "MediaProjection successfully acquired and cached from consent activity!")
            proj
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire MediaProjection from consent: ${e.message}", e)
            null
        }
    }

    @Synchronized
    fun getOrCreateProjection(context: Context): MediaProjection? {
        if (activeProjection != null) return activeProjection
        val code = resultCode
        val data = resultData
        if (code != Activity.RESULT_OK || data == null) return null

        // Make sure foreground service type for MediaProjection is active on Android 14+
        try {
            com.phonelink.hub.service.PhoneLinkService.instance?.ensureMediaProjectionForegroundType()
        } catch (e: Exception) {
            Log.w(TAG, "Could not update foreground service type", e)
        }

        val appContext = context.applicationContext ?: context
        val mgr = appContext.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager
            ?: return null

        return try {
            val proj = mgr.getMediaProjection(code, data)
            proj?.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() {
                    Log.d(TAG, "MediaProjection stopped by system")
                    activeProjection = null
                    resultCode = Activity.RESULT_CANCELED
                    resultData = null
                }
            }, null)
            activeProjection = proj
            proj
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create MediaProjection: ${e.message}", e)
            null
        }
    }

    @Synchronized
    fun release() {
        try { activeProjection?.stop() } catch (_: Exception) {}
        activeProjection = null
        resultCode = Activity.RESULT_CANCELED
        resultData = null
    }

    /**
     * Clears only the stale resultCode/resultData (once-used token) without touching activeProjection.
     * Called when getOrCreateProjection returns null despite hasConsent=true — meaning the token
     * was already consumed or expired. After this the consent activity will get a fresh token.
     */
    @Synchronized
    fun resetStaleConsent() {
        resultCode = Activity.RESULT_CANCELED
        resultData = null
        // Do NOT stop activeProjection here — it may still be valid from a prior acquireProjectionFromConsent call.
    }
}
