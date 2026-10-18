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
        val intents = mutableListOf<Intent>()

        // Xiaomi / Redmi / Poco (MIUI & HyperOS)
        intents.add(Intent("miui.intent.action.APP_PERM_EDITOR").apply {
            setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity")
            putExtra("extra_pkgname", context.packageName)
        })
        intents.add(Intent().apply {
            setClassName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.miui.securitycenter", "com.miui.securitycenter.MainActivity")
        })

        // OPPO & Realme (ColorOS / Realme UI)
        intents.add(Intent().apply {
            setClassName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.oplus.battery", "com.oplus.powermanager.fuelgaue.PowerUsageModelActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.coloros.safecenter", "com.coloros.privacypermissionsentry.PermissionTopActivity")
        })

        // VIVO & iQOO (Funtouch OS & OriginOS)
        intents.add(Intent().apply {
            setClassName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")
        })
        intents.add(Intent().apply {
            setClassName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.vivo.abe", "com.vivo.applicationbehaviorengine.ui.ExcessivePowerManagerActivity")
        })

        // Samsung (One UI Device Care)
        intents.add(Intent().apply {
            setClassName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity")
        })

        // Tecno / Infinix / Itel (HiOS & XOS - Transsion)
        intents.add(Intent().apply {
            setClassName("com.transsion.phonemaster", "com.cyin.himgr.autostart.AutoStartActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.transsion.phonemaster", "com.transsion.phonemaster.autostart.AutoStartManagementActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.transsion.phonemaster", "com.transsion.phonemaster.security.AutoStartManagementActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.transsion.phonemaster", "com.transsion.phonemaster.MainActivity")
        })

        // OnePlus (OxygenOS)
        intents.add(Intent().apply {
            setClassName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity")
        })

        // Huawei / Honor
        intents.add(Intent().apply {
            setClassName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
        })
        intents.add(Intent().apply {
            setClassName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.bootstart.BootStartActivity")
        })

        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (intent.resolveActivity(context.packageManager) != null) {
                    context.startActivity(intent)
                    return
                }
            } catch (_: Exception) {
                // try next OEM intent
            }
        }

        // Standard Android battery optimization ignore fallback
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            try {
                val batteryIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (batteryIntent.resolveActivity(context.packageManager) != null) {
                    context.startActivity(batteryIntent)
                    return
                }
            } catch (_: Exception) {}
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
