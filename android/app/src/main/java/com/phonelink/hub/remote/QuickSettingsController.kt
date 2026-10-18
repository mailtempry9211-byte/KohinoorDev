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
            "hotspot", "tethering" -> toggleHotspot(context, payload.optBoolean("enable", false), payload.has("enable"))
            "torch", "flashlight" -> toggleTorch(context)
            "dnd" -> toggleDnd(context)
            "shade", "quick_settings", "panel" -> pullDownShade(context)
            "notifications_shade" -> pullDownNotifications(context)
            "ringer_normal" -> setRingerMode(context, "normal")
            "ringer_vibrate" -> setRingerMode(context, "vibrate")
            "ringer_silent" -> setRingerMode(context, "silent")
            "usage_access", "usage_settings" -> openUsageSettings(context)
            "overlay_permission", "overlay_settings", "manage_overlay" -> openOverlaySettings(context)
            "pin_widget", "request_widget" -> requestPinWidget(context)
            "notification_settings", "hide_notification" -> openNotificationSettings(context)
            "home_settings", "launcher_settings" -> openHomeSettings(context)
            "status", "get" -> getStatus(context)
            else -> {
                Log.w(TAG, "Unknown quick setting action: $action")
                getStatus(context).apply { put("error", "Unknown action: $action") }
            }
        }
    }

    fun openHomeSettings(context: Context): JSONObject {
        var success = false
        try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Intent(Settings.ACTION_HOME_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            } else {
                Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            context.startActivity(intent)
            success = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open home launcher settings", e)
        }
        return getStatus(context).apply {
            put("success", success)
            put("message", if (success) "Opened Default Home Launcher settings on phone" else "Failed to open home settings")
        }
    }

    fun requestPinWidget(context: Context): JSONObject {
        val success = com.phonelink.hub.widget.ClockWidgetProvider.requestPinWidget(context)
        return getStatus(context).apply {
            put("success", success)
            put("message", if (success) "Requested Home Screen Clock Widget prompt" else "Widget pinning prompt not supported or launcher restricted")
        }
    }

    fun openNotificationSettings(context: Context): JSONObject {
        var success = false
        try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                    putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            } else {
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = android.net.Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            context.startActivity(intent)
            success = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open notification settings", e)
        }
        return getStatus(context).apply {
            put("success", success)
            put("message", if (success) "Opened Notification Settings on phone" else "Failed to open notification settings")
        }
    }

    fun openUsageSettings(context: Context): JSONObject {
        var success = false
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            success = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open usage settings", e)
        }
        return getStatus(context).apply {
            put("success", success)
            put("message", if (success) "Opened Usage Access settings on phone" else "Failed to open usage settings")
        }
    }

    fun openOverlaySettings(context: Context): JSONObject {
        var success = false
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    data = android.net.Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                success = true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open overlay settings", e)
        }
        return getStatus(context).apply {
            put("success", success)
            put("message", if (success) "Opened Display Over Other Apps settings on phone" else "Failed to open overlay settings")
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
                FindPhoneAccessibilityService.expectSettingToggle("autorotate", 8000L)
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
        val wifiMgr = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        @Suppress("DEPRECATION")
        val current = try { wifiMgr?.isWifiEnabled ?: false } catch (e: Exception) { false }
        val target = if (hasExplicitValue) enable else !current
        var success = false

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            @Suppress("DEPRECATION")
            if (wifiMgr != null) {
                @Suppress("DEPRECATION")
                wifiMgr.isWifiEnabled = target
                success = true
            }
        }

        if (!success) {
            FindPhoneAccessibilityService.expectSettingToggle("wifi")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    val panelIntent = Intent(Settings.Panel.ACTION_WIFI).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(panelIntent)
                    success = true
                } catch (ignored: Exception) {}
            }
            if (!success) {
                try {
                    val settingsIntent = Intent(Settings.ACTION_WIFI_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(settingsIntent)
                    success = true
                } catch (e2: Exception) {
                    Log.e(TAG, "Failed to launch wifi settings", e2)
                }
            }
        }

        return getStatus(context).apply {
            put("wifiEnabled", target)
            put("success", success)
            put("message", if (target) "Wi-Fi turned ON" else "Wi-Fi turned OFF")
        }
    }

    fun toggleBluetooth(context: Context, enable: Boolean, hasExplicitValue: Boolean): JSONObject {
        var success = false
        @Suppress("DEPRECATION")
        val adapter = BluetoothAdapter.getDefaultAdapter()
        val target = if (hasExplicitValue) enable else !(adapter?.isEnabled ?: false)
        try {
            if (adapter != null && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                success = if (target) {
                    @Suppress("DEPRECATION")
                    adapter.enable()
                } else {
                    @Suppress("DEPRECATION")
                    adapter.disable()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Direct bluetooth toggle exception: ${e.message}")
        }

        if (!success) {
            FindPhoneAccessibilityService.expectSettingToggle("bluetooth")
            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                context.startActivity(intent)
                success = true
            } catch (e2: Exception) {
                Log.e(TAG, "Failed to open bluetooth settings", e2)
            }
        }
        return getStatus(context).apply {
            put("bluetoothEnabled", target)
            put("success", success)
            put("message", if (target) "Bluetooth turned ON" else "Bluetooth turned OFF")
        }
    }

    fun isHotspotOn(context: Context): Boolean {
        return try {
            val wifiMgr = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val method = wifiMgr?.javaClass?.getDeclaredMethod("isWifiApEnabled")
            method?.isAccessible = true
            (method?.invoke(wifiMgr) as? Boolean) ?: false
        } catch (e: Exception) {
            false
        }
    }

    fun toggleHotspot(context: Context, enable: Boolean, hasExplicitValue: Boolean): JSONObject {
        val current = isHotspotOn(context)
        val target = if (hasExplicitValue) enable else !current
        var success = false

        try {
            val wifiMgr = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val method = wifiMgr?.javaClass?.getMethod("setWifiApEnabled", android.net.wifi.WifiConfiguration::class.java, java.lang.Boolean.TYPE)
            if (method != null) {
                method.isAccessible = true
                val res = method.invoke(wifiMgr, null, target) as? Boolean
                if (res == true) {
                    success = true
                }
            }
        } catch (ignored: Exception) {}

        if (!success) {
            FindPhoneAccessibilityService.expectSettingToggle("hotspot")
            openHotspot(context)
            success = true
        }

        return getStatus(context).apply {
            put("hotspotEnabled", target)
            put("success", success)
            put("message", if (target) "Hotspot turned ON" else "Hotspot turned OFF")
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
        val widgetPlaced = com.phonelink.hub.widget.ClockWidgetProvider.isWidgetPlaced(context)

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("autoRotate", autoRotate)
            put("wifiEnabled", isWifi)
            put("bluetoothEnabled", isBt)
            put("hotspotEnabled", isHotspotOn(context))
            put("torchOn", torchOn)
            put("dndActive", dndActive)
            put("ringerMode", ringerMode)
            put("widgetPlaced", widgetPlaced)
        }
    }
}
