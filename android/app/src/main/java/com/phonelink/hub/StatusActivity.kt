package com.phonelink.hub

import android.app.Activity
import android.app.KeyguardManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.receiver.PhoneDeviceAdminReceiver
import com.phonelink.hub.service.PhoneLinkService

/**
 * Minimal, transparent connection-status screen opened by tapping the persistent notification.
 * Accurately displays service and network state without acting as a bloated dashboard.
 * Requires PIN verification before opening app configuration if a PIN was set by the device owner.
 */
class StatusActivity : AppCompatActivity() {

    private lateinit var statusIndicatorDot: View
    private lateinit var statusTitleText: TextView
    private lateinit var statusServiceText: TextView
    private lateinit var statusTargetText: TextView
    private lateinit var statusSensorsText: TextView
    private lateinit var statusDeviceModeText: TextView

    private val refreshHandler = Handler(Looper.getMainLooper())
    private val refreshRunnable = object : Runnable {
        override fun run() {
            updateStatusUi()
            refreshHandler.postDelayed(this, 2000L)
        }
    }

    private val credentialRecoveryLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            DevicePrefs.clearOwnerPin()
            Toast.makeText(this, "PIN reset successfully with device credentials", Toast.LENGTH_SHORT).show()
            navigateToSettings()
        } else {
            Toast.makeText(this, "Device authentication canceled", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DevicePrefs.init(this)
        setContentView(R.layout.activity_status)

        statusIndicatorDot = findViewById(R.id.statusIndicatorDot)
        statusTitleText = findViewById(R.id.statusTitleText)
        statusServiceText = findViewById(R.id.statusServiceText)
        statusTargetText = findViewById(R.id.statusTargetText)
        statusSensorsText = findViewById(R.id.statusSensorsText)
        statusDeviceModeText = findViewById(R.id.statusDeviceModeText)

        findViewById<Button>(R.id.statusOpenSettingsBtn).setOnClickListener {
            checkPinAndOpenSettings()
        }

        findViewById<Button>(R.id.statusReconnectBtn).setOnClickListener {
            val service = PhoneLinkService.instance
            if (service != null) {
                service.reconnect()
                Toast.makeText(this, "Reconnecting relay…", Toast.LENGTH_SHORT).show()
            } else {
                PhoneLinkService.start(this)
                Toast.makeText(this, "Starting Phone Link service…", Toast.LENGTH_SHORT).show()
            }
            updateStatusUi()
        }
    }

    override fun onResume() {
        super.onResume()
        updateStatusUi()
        refreshHandler.postDelayed(refreshRunnable, 2000L)
    }

    override fun onPause() {
        super.onPause()
        refreshHandler.removeCallbacks(refreshRunnable)
    }

    private fun updateStatusUi() {
        val service = PhoneLinkService.instance
        val isServiceRunning = service != null
        val isSocketOpen = service?.isSocketOpen == true
        val isConfigured = DevicePrefs.isConfigured()

        // 1. Connection status dot & title
        if (isSocketOpen) {
            statusIndicatorDot.setBackgroundResource(R.drawable.shape_dot_green)
            statusTitleText.text = "Connected"
            statusTitleText.setTextColor(getColor(R.color.emerald))
        } else if (isServiceRunning) {
            statusIndicatorDot.setBackgroundResource(R.drawable.shape_dot_yellow)
            statusTitleText.text = if (isConfigured) "Connecting…" else "Unconfigured Server"
            statusTitleText.setTextColor(getColor(R.color.indigo))
        } else {
            statusIndicatorDot.setBackgroundResource(R.drawable.shape_dot_red)
            statusTitleText.text = "Disconnected"
            statusTitleText.setTextColor(getColor(R.color.red))
        }

        // 2. Service text
        statusServiceText.text = if (isServiceRunning) "Running (Foreground)" else "Stopped"
        statusServiceText.setTextColor(if (isServiceRunning) getColor(R.color.emerald) else getColor(R.color.text_secondary))

        // 3. Target endpoint text
        val ip = DevicePrefs.serverIp
        val port = DevicePrefs.serverPort
        statusTargetText.text = if (ip.isNotBlank()) "$ip:$port" else "Not set"

        // 4. Active sensors transparency
        val sensors = mutableListOf<String>()
        if (com.phonelink.hub.media.ScreenRecorder.isActive) sensors.add("Screen Cast")
        if (com.phonelink.hub.remote.WalkieTalkieIntercom.isSpeaking) sensors.add("Speakerphone")
        if (com.phonelink.hub.remote.TheftMotionAlarm.isArmed) sensors.add("Motion Guard")
        statusSensorsText.text = if (sensors.isNotEmpty()) sensors.joinToString(", ") else "Standby (Idle)"

        // 5. Managed device mode
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
        val adminComponent = ComponentName(this, PhoneDeviceAdminReceiver::class.java)
        val mode = when {
            dpm?.isDeviceOwnerApp(packageName) == true -> "Device Owner (Managed Mode)"
            dpm?.isAdminActive(adminComponent) == true -> "Device Admin Active (Lock screen only)"
            else -> "Standard (Unmanaged)"
        }
        statusDeviceModeText.text = mode
    }

    private fun checkPinAndOpenSettings() {
        if (!DevicePrefs.hasOwnerPin()) {
            navigateToSettings()
            return
        }

        showPinDialog()
    }

    private fun showPinDialog() {
        val input = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "Enter Owner PIN"
            setPadding(40, 30, 40, 30)
            setTextColor(getColor(R.color.text_primary))
            setHintTextColor(getColor(R.color.text_secondary))
        }

        MaterialAlertDialogBuilder(this)
            .setTitle("Protected Settings")
            .setMessage("Enter the device owner PIN to open application configuration.")
            .setView(input)
            .setPositiveButton("Unlock") { dialog, _ ->
                val entered = input.text.toString().trim()
                if (DevicePrefs.verifyOwnerPin(entered)) {
                    dialog.dismiss()
                    navigateToSettings()
                } else {
                    Toast.makeText(this, "Incorrect PIN", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .setNeutralButton("Forgot PIN?") { _, _ ->
                promptPinRecovery()
            }
            .show()
    }

    private fun promptPinRecovery() {
        val km = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        if (km != null && km.isDeviceSecure) {
            val intent = km.createConfirmDeviceCredentialIntent(
                "Reset Phone Link PIN",
                "Verify your device owner credentials to reset the application PIN."
            )
            if (intent != null) {
                credentialRecoveryLauncher.launch(intent)
                return
            }
        }

        MaterialAlertDialogBuilder(this)
            .setTitle("Reset Owner PIN")
            .setMessage("No device lockscreen security was detected.\n\nTo reset your PIN without device credentials, you can clear app storage:\nAndroid Settings > Apps > Phone Link Hub > Storage > Clear Data.\n\nNote: App PIN protects only this app's settings and cannot prevent device owners from managing apps in Android Settings.")
            .setPositiveButton("OK", null)
            .show()
    }

    private fun navigateToSettings() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
    }
}

