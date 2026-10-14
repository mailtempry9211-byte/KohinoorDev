package com.phonelink.hub.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log

/**
 * FEATURE D (addendum): deep-links into MIUI's Autostart screen.
 * Never throws — falls through to the generic app-details screen.
 */
object AutostartHelper {

    private const val TAG = "AutostartHelper"

    fun openAutostartSettings(context: Context) {
        val intents = listOf(
            // MIUI 8-12 permission editor, direct to this app's autostart toggle
            Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                setClassName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.permissions.PermissionsEditorActivity"
                )
                putExtra("extra_pkgname", context.packageName)
            },
            // Newer MIUI/HyperOS autostart manager screen
            Intent().apply {
                setClassName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity"
                )
            },
            // Generic "MIUI Security" app main screen, as a looser fallback
            Intent().apply {
                setClassName("com.miui.securitycenter", "com.miui.securitycenter.MainActivity")
            }
        )

        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (intent.resolveActivity(context.packageManager) != null) {
                    context.startActivity(intent)
                    return
                }
            } catch (_: Exception) {
                // try the next one
            }
        }

        // Final fallback: generic Android app details screen.
        try {
            val fallback = Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:${context.packageName}")
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(fallback)
        } catch (e: Exception) {
            Log.e(TAG, "could not open any settings screen", e)
        }
    }
}
