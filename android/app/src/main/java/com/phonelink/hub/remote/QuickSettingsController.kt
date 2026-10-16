package com.phonelink.hub.remote

import android.accessibilityservice.AccessibilityService
import android.bluetooth.BluetoothAdapter
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.phonelink.hub.accessibility.FindPhoneAccessibilityService
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

/**
 * Controller for phone hardware button toggles and quick settings:
 * Wi-Fi, Bluetooth, Hotspot, Auto-Rotation, Flashlight/Torch, DND, Sound Profiles, and Notification/Quick Settings Shade.
 */
object QuickSettingsController {

    private const val TAG = "QuickSettingsCtrl"

    fun handleQuickSettingAction(context: Context, action: String, payload: JSONObject = JSONObject()): JSONObject {
        return when (action.lowercase()) {
            "auto_rotate", "autorotate", "rotation" -> toggleAutoRotate(context)
            "wifi" -> toggleWifi(context, payload.optBoolean("enable", false), payload.has("enable"))
            "bluetooth" -> toggleBluetooth(context, payload.optBoolean("enable", false), payload.has("enable"))
            "hotspot", "tethering" -> openHotspot(context)
            "torch", "flashlight" -> toggleTorch(context)
            "dnd" -> toggleDnd(context)
            "shade", "quick_settings", "panel" -> pullDownShade(context)
            "notifications_shade" -> pullDownNotifications(context)
            "ringer_normal" -> setRingerMode(context, "normal")
            "ringer_vibrate" -> setRingerMode(context, "vibrate")
            "ringer_silent" -> setRingerMode(context, "silent")
            "status", "get" -> getStatus(context)
            else -> {
                Log.w(TAG, "Unknown quick setting action: $action")
                getStatus(context).apply { put("error", "Unknown action: $action") }
            }
        }
    }

    fun toggleAutoRotate(context: Context): JSONObject {
        val current = try {
            Settings.System.getInt(context.contentResolver, Settings.System.ACCELEROMETER_ROTATION, 0) == 1
        } catch (ignored: Exception) {
            false
        }
        val target = !current
        var success = false
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.System.canWrite(context)) {
                Settings.System.putInt(context.contentResolver, Settings.System.ACCELEROMETER_ROTATION, if (target) 1 else 0)
                success = true
            } else {
                // Open display settings or toggle via accessibility quick settings
                val intent = Intent(Settings.ACTION_DISPLAY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                success = true
            }
        } catch (e: Exception) {
            Log.e(TAG, "toggleAutoRotate error", e)
        }
        return getStatus(context).apply {
            put("autoRotate", target)
            put("success", success)
            put("message", if (target) "Auto-rotate enabled" else "Portrait locked")
        }
    }

    fun toggleWifi(context: Context, enable: Boolean, hasExplicitValue: Boolean): JSONObject {
        var launched = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ restricts direct wifi toggles; launch the official connectivity panel
            try {
                val panelIntent = Intent(Settings.Panel.ACTION_WIFI).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(panelIntent)
                launched = true
            } catch (ignored: Exception) {
                try {
                    val settingsIntent = Intent(Settings.ACTION_WIFI_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(settingsIntent)
                    launched = true
                } catch (e2: Exception) {
                    Log.e(TAG, "Failed to launch wifi settings", e2)
                }
            }
        } else {
            @Suppress("DEPRECATION")
            val wifiMgr = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            if (wifiMgr != null) {
                @Suppress("DEPRECATION")
                val target = if (hasExplicitValue) enable else !wifiMgr.isWifiEnabled
                @Suppress("DEPRECATION")
                wifiMgr.isWifiEnabled = target
                launched = true
            }
        }
        return getStatus(context).apply {
            put("success", launched)
            put("message", "Wi-Fi control opened on device")
        }
    }

    fun toggleBluetooth(context: Context, enable: Boolean, hasExplicitValue: Boolean): JSONObject {
        var launched = false
        try {
            @Suppress("DEPRECATION")
            val adapter = BluetoothAdapter.getDefaultAdapter()
            if (adapter != null && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                val target = if (hasExplicitValue) enable else !adapter.isEnabled
                if (target) {
                    @Suppress("DEPRECATION")
                    adapter.enable()
                } else {
                    @Suppress("DEPRECATION")
                    adapter.disable()
                }
                launched = true
            } else {
                val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                launched = true
            }
        } catch (ignored: Exception) {
            try {
                val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                launched = true
            } catch (e2: Exception) {
                Log.e(TAG, "Failed to open bluetooth settings", e2)
            }
        }
        return getStatus(context).apply {
            put("success", launched)
            put("message", "Bluetooth control opened on device")
        }
    }

    fun openHotspot(context: Context): JSONObject {
        var launched = false
        val intents = listOf(
            Intent().setComponent(ComponentName("com.android.settings", "com.android.settings.TetherSettings")),
            Intent(Settings.ACTION_WIRELESS_SETTINGS),
            Intent(Settings.ACTION_SETTINGS)
        )
        for (it in intents) {
            try {
                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(it)
                launched = true
                break
            } catch (ignored: Exception) {}
        }
        return getStatus(context).apply {
            put("success", launched)
            put("message", "Hotspot / Tethering settings opened on phone")
        }
    }

    fun toggleTorch(context: Context): JSONObject {
        val result = TorchController.toggle(context)
        val isOn = result.optBoolean("torchOn", false)
        return getStatus(context).apply {
            put("torchOn", isOn)
            put("success", true)
            put("message", if (isOn) "Torch turned ON" else "Torch turned OFF")
        }
    }

    fun toggleDnd(context: Context): JSONObject {
        val status = DndController.getDndStatus(context)
        val isDnd = status.optBoolean("isDndActive", false)
        val target = !isDnd
        val mode = if (target) "PRIORITY" else "OFF"
        val result = DndController.setDndMode(context, mode)
        return getStatus(context).apply {
            put("dndActive", target)
            put("success", result.optBoolean("success", true))
            put("message", if (target) "Do Not Disturb turned ON" else "Do Not Disturb turned OFF")
        }
    }

    fun setRingerMode(context: Context, mode: String): JSONObject {
        val result = VolumeController.setRingerMode(context, mode)
        return getStatus(context).apply {
            put("ringerMode", mode)
            put("success", result.optBoolean("success", true))
        }
    }

    fun pullDownShade(context: Context): JSONObject {
        val service = FindPhoneAccessibilityService.instance
        val success = if (service != null) {
            service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_QUICK_SETTINGS)
        } else {
            false
        }
        return getStatus(context).apply {
            put("success", success)
            put("message", if (success) "Quick Settings shade pulled down" else "Accessibility required for Quick Settings")
        }
    }

    fun pullDownNotifications(context: Context): JSONObject {
        val service = FindPhoneAccessibilityService.instance
        val success = if (service != null) {
            service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS)
        } else {
            false
        }
        return getStatus(context).apply {
            put("success", success)
            put("message", if (success) "Notification shade pulled down" else "Accessibility required for notifications")
        }
    }

    fun getStatus(context: Context): JSONObject {
        val autoRotate = try {
            Settings.System.getInt(context.contentResolver, Settings.System.ACCELEROMETER_ROTATION, 0) == 1
        } catch (ignored: Exception) {
            false
        }

        val wifiMgr = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        val isWifi = try {
            @Suppress("DEPRECATION")
            wifiMgr?.isWifiEnabled ?: false
        } catch (ignored: Exception) {
            false
        }

        val isBt = try {
            @Suppress("DEPRECATION")
            BluetoothAdapter.getDefaultAdapter()?.isEnabled ?: false
        } catch (ignored: Exception) {
            false
        }

        val dndActive = DndController.getDndStatus(context).optBoolean("isDndActive", false)
        val torchOn = TorchController.isTorchOn
        val ringerMode = VolumeController.getVolumeInfo(context).optString("ringerMode", "normal")

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("autoRotate", autoRotate)
            put("wifiEnabled", isWifi)
            put("bluetoothEnabled", isBt)
            put("torchOn", torchOn)
            put("dndActive", dndActive)
            put("ringerMode", ringerMode)
        }
    }
}
