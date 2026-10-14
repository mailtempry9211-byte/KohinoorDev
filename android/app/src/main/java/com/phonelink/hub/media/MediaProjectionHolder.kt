package com.phonelink.hub.media

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.util.Log

/**
 * Manages the MediaProjection permission token and instance.
 * Allows ScreenshotController and ScreenRecorder to reuse an active projection session.
 */
object MediaProjectionHolder {
    private const val TAG = "MediaProjectionHolder"

    var resultCode: Int = Activity.RESULT_CANCELED
    var resultData: Intent? = null

    private var activeProjection: MediaProjection? = null

    val hasConsent: Boolean
        get() = resultCode == Activity.RESULT_OK && resultData != null

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
    fun getOrCreateProjection(context: Context): MediaProjection? {
        if (activeProjection != null) return activeProjection
        if (!hasConsent) return null

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
            val proj = mgr.getMediaProjection(resultCode, resultData!!.clone() as Intent)
            proj.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() {
                    Log.d(TAG, "MediaProjection stopped by system")
                    activeProjection = null
                }
            }, null)
            activeProjection = proj
            proj
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create MediaProjection", e)
            null
        }
    }

    @Synchronized
    fun release() {
        try {
            activeProjection?.stop()
        } catch (_: Exception) {}
        activeProjection = null
    }
}
