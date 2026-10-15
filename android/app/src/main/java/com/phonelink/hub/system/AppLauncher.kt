package com.phonelink.hub.system

import android.content.Context
import android.content.Intent
import android.util.Log
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
            val intent = Intent(Intent.ACTION_DELETE).apply {
                data = android.net.Uri.parse("package:$packageName")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            Log.d(TAG, "Launched uninstall prompt for: $packageName")
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("packageName", packageName)
                put("success", true)
                put("message", "Uninstall confirmation opened on device")
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

