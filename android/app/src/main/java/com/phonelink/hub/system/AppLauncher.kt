package com.phonelink.hub.system

import android.content.Context
import android.content.Intent
import android.util.Log
import com.phonelink.hub.accessibility.FindPhoneAccessibilityService
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

object AppLauncher {
    private const val TAG = "AppLauncher"

    fun launchApp(context: Context, packageName: String): JSONObject {
        return try {
            val pm = context.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.d(TAG, "Successfully launched app: $packageName")
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("packageName", packageName)
                    put("success", true)
                }
            } else {
                Log.w(TAG, "No launch intent found for $packageName")
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("packageName", packageName)
                    put("success", false)
                    put("error", "No launcher activity found for app")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error launching app: $packageName", e)
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("packageName", packageName)
                put("success", false)
                put("error", e.message ?: "Failed to launch app")
            }
        }
    }

    fun uninstallApp(context: Context, packageName: String): JSONObject {
        return try {
            FindPhoneAccessibilityService.expectUninstallConfirmation(packageName, 30_000L)

            // Wake up screen so dialog is immediately visible and actionable
            try {
                val pm = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
                @Suppress("DEPRECATION")
                val wl = pm?.newWakeLock(
                    android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK or android.os.PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "phonelink:uninstall_wake"
                )
                wl?.acquire(3000L)
            } catch (ignored: Exception) {}

            val accService = FindPhoneAccessibilityService.instance
            val launchContext = accService ?: context

            var directLaunched = false
            // 1. Direct ACTION_DELETE via launchContext (AccessibilityService or context)
            try {
                val deleteIntent = Intent(Intent.ACTION_DELETE).apply {
                    data = android.net.Uri.parse("package:$packageName")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    putExtra(Intent.EXTRA_RETURN_RESULT, true)
                }
                launchContext.startActivity(deleteIntent)
                directLaunched = true
                Log.d(TAG, "Launched direct ACTION_DELETE for: $packageName")
            } catch (e: Exception) {
                Log.w(TAG, "Direct ACTION_DELETE failed: ${e.message}")
            }

            // 2. Direct Framework PackageInstaller session uninstall fallback
            if (!directLaunched) {
                try {
                    val packageInstaller = context.packageManager.packageInstaller
                    val callbackIntent = Intent("com.phonelink.hub.UNINSTALL_CALLBACK")
                    val flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT or (if (android.os.Build.VERSION.SDK_INT >= 31) android.app.PendingIntent.FLAG_MUTABLE else 0)
                    val sender = android.app.PendingIntent.getBroadcast(context, 0, callbackIntent, flags).intentSender
                    packageInstaller.uninstall(packageName, sender)
                    Log.i(TAG, "Triggered framework PackageInstaller.uninstall for: $packageName")
                } catch (e: Exception) {
                    Log.w(TAG, "PackageInstaller.uninstall call failed: ${e.message}")
                    // 3. Last-resort Foreground Trampoline Activity
                    try {
                        UninstallTrampolineActivity.launch(context, packageName)
                    } catch (e2: Exception) {
                        Log.w(TAG, "UninstallTrampolineActivity launch failed: ${e2.message}")
                    }
                }
            }

            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("packageName", packageName)
                put("success", true)
                put("message", "Uninstall confirmation opened and auto-confirming via Accessibility")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error launching uninstall for $packageName", e)
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("packageName", packageName)
                put("success", false)
                put("error", e.message ?: "Failed to prompt uninstall")
            }
        }
    }
}

