package com.phonelink.hub.disguise

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log

/**
 * Camouflage entry point: Presents as "Files" with folder icon.
 * When tapped by kid/anyone, immediately forwards to the real file manager app on the device.
 */
class FilesDisguiseActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Attempt launching real Files app
        var launched = false
        val fileManagerPackages = listOf(
            "com.google.android.apps.nbu.files",      // Google Files
            "com.sec.android.app.myfiles",            // Samsung My Files
            "com.mi.android.globalFileexplorer",      // Xiaomi File Manager
            "com.coloros.filemanager",                // Oppo / Realme File Manager
            "com.oneplus.filemanager",                // OnePlus File Manager
            "com.transsion.filemanager",              // Tecno / Infinix File Manager
            "com.motorola.filemanager",               // Motorola File Manager
            "com.android.documentsui"                 // AOSP Documents / Files
        )

        for (pkg in fileManagerPackages) {
            try {
                val launchIntent = packageManager.getLaunchIntentForPackage(pkg)
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    startActivity(launchIntent)
                    launched = true
                    Log.i("FilesDisguise", "Disguise redirected seamlessly to: $pkg")
                    break
                }
            } catch (_: Exception) {}
        }

        if (!launched) {
            // Generic file intent fallback
            try {
                val genericIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse("content://media/external/file"), "*/*")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(genericIntent)
                launched = true
            } catch (_: Exception) {
                try {
                    val pickIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "*/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(pickIntent)
                    launched = true
                } catch (_: Exception) {}
            }
        }

        // Finish immediately so PhoneLink does not remain in foreground recents
        finish()
    }
}

