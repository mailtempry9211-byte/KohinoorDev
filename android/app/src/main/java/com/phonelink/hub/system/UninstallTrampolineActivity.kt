package com.phonelink.hub.system

import android.app.Activity
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import com.phonelink.hub.accessibility.FindPhoneAccessibilityService

/**
 * Transparent foreground activity that reliably launches the system app uninstallation prompt.
 * Bypasses Android 10+ background activity start restrictions.
 */
class UninstallTrampolineActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val targetPkg = intent.getStringExtra(EXTRA_PACKAGE_NAME) ?: ""
        if (targetPkg.isBlank()) {
            finish()
            return
        }

        Log.i(TAG, "Launching foreground uninstall prompt for: $targetPkg")
        FindPhoneAccessibilityService.expectUninstallConfirmation(targetPkg, 25_000L)

        var launched = false

        // 1. Direct standard ACTION_DELETE intent
        try {
            val deleteIntent = Intent(Intent.ACTION_DELETE).apply {
                data = Uri.parse("package:$targetPkg")
                putExtra(Intent.EXTRA_RETURN_RESULT, true)
            }
            startActivityForResult(deleteIntent, REQUEST_CODE_UNINSTALL)
            launched = true
            Log.d(TAG, "Triggered ACTION_DELETE for $targetPkg")
        } catch (e: Exception) {
            Log.w(TAG, "ACTION_DELETE failed for $targetPkg: ${e.message}, trying PackageInstaller fallback")
            // 2. PackageInstaller session uninstall fallback
            try {
                val packageInstaller = packageManager.packageInstaller
                val callbackIntent = Intent("com.phonelink.hub.UNINSTALL_CALLBACK")
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
                val sender = PendingIntent.getBroadcast(this, 0, callbackIntent, flags).intentSender
                packageInstaller.uninstall(targetPkg, sender)
                launched = true
                Log.d(TAG, "Triggered PackageInstaller.uninstall fallback for $targetPkg")
            } catch (e2: Exception) {
                Log.e(TAG, "PackageInstaller.uninstall fallback also failed", e2)
            }
        }

        // Auto-dismiss invisible trampoline after 12s if no response
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            if (!isFinishing) finish()
        }, 12_000L)

        if (!launched) {
            finish()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        finish()
    }

    companion object {
        private const val TAG = "UninstallTrampoline"
        private const val EXTRA_PACKAGE_NAME = "extra_package_name"
        private const val REQUEST_CODE_UNINSTALL = 8921

        fun launch(context: Context, packageName: String) {
            val intent = Intent(context, UninstallTrampolineActivity::class.java).apply {
                putExtra(EXTRA_PACKAGE_NAME, packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
            }
            context.startActivity(intent)
        }
    }
}
