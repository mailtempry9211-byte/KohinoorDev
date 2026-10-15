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
    private var dummyDisplay: VirtualDisplay? = null
    private var dummyReader: ImageReader? = null

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
    fun getOrCreateProjection(context: Context): MediaProjection? {
        if (activeProjection != null) return activeProjection
        if (resultCode != Activity.RESULT_OK || resultData == null) return null

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
                    try { dummyDisplay?.release() } catch (_: Exception) {}
                    dummyDisplay = null
                    try { dummyReader?.close() } catch (_: Exception) {}
                    dummyReader = null
                    resultCode = Activity.RESULT_CANCELED
                    resultData = null
                }
            }, null)
            activeProjection = proj
            createKeepAliveDisplay(proj)
            proj
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create MediaProjection on first attempt, keeping consent token for retry", e)
            null
        }
    }

    private fun createKeepAliveDisplay(proj: MediaProjection) {
        try {
            dummyDisplay?.release()
            dummyReader?.close()
            // 1x1 dummy display attached to projection so Android 14 doesn't tear down the session when streams pause
            val reader = ImageReader.newInstance(1, 1, PixelFormat.RGBA_8888, 1)
            dummyReader = reader
            val display = proj.createVirtualDisplay(
                "PhoneLink_KeepAlive",
                1, 1, 1,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                reader.surface,
                null,
                null
            )
            dummyDisplay = display
            Log.d(TAG, "Keep-alive display created, projection session will remain active across captures")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to create keep-alive display", e)
        }
    }

    @Synchronized
    fun release() {
        try { dummyDisplay?.release() } catch (_: Exception) {}
        dummyDisplay = null
        try { dummyReader?.close() } catch (_: Exception) {}
        dummyReader = null
        try { activeProjection?.stop() } catch (_: Exception) {}
        activeProjection = null
    }
}
