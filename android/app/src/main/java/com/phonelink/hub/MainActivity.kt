package com.phonelink.hub

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.TextUtils
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.textfield.TextInputEditText
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.files.FileRepository
import com.phonelink.hub.service.PhoneLinkService

class MainActivity : AppCompatActivity() {

    private lateinit var ipInput: TextInputEditText
    private lateinit var portInput: TextInputEditText
    private lateinit var nameInput: TextInputEditText
    private lateinit var statusDot: View
    private lateinit var statusText: TextView
    private lateinit var notifyText: TextView

    private val statusHandler = Handler(Looper.getMainLooper())
    private var statusRefreshing = false

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { /* granted or not, the service adapts */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DevicePrefs.init(this)
        setContentView(R.layout.activity_main)

        ipInput = findViewById<TextInputEditText>(R.id.serverIpInput)
        portInput = findViewById<TextInputEditText>(R.id.serverPortInput)
        nameInput = findViewById<TextInputEditText>(R.id.deviceNameInput)
        statusDot = findViewById<View>(R.id.statusDot)
        statusText = findViewById<TextView>(R.id.statusText)
        notifyText = findViewById<TextView>(R.id.notifyAccessText)

        findViewById<Button>(R.id.grantStorageBtn).setOnClickListener { requestStorage() }
        findViewById<Button>(R.id.batteryBtn).setOnClickListener { requestBatteryExemption() }
        findViewById<Button>(R.id.notifyAccessBtn).setOnClickListener { openNotificationAccessSettings() }
        findViewById<Button>(R.id.startBtn).setOnClickListener { startService() }
        findViewById<Button>(R.id.stopBtn).setOnClickListener { stopService() }
        findViewById<Button>(R.id.syncNowBtn).setOnClickListener { PhoneLinkService.instance?.syncAll() }

        requestAppPermissions()
    }

    override fun onResume() {
        super.onResume()
        loadConfig()
        refreshNotificationAccess()
        startStatusRefresh()
    }

    override fun onPause() {
        super.onPause()
        statusRefreshing = false
        statusHandler.removeCallbacksAndMessages(null)
    }

    private fun loadConfig() {
        if (ipInput.text.isNullOrEmpty()) ipInput.setText(DevicePrefs.serverIp)
        if (portInput.text.isNullOrEmpty()) portInput.setText(DevicePrefs.serverPort.toString())
        if (nameInput.text.isNullOrEmpty()) nameInput.setText(DevicePrefs.deviceName)
    }

    private fun saveConfig() {
        DevicePrefs.serverIp = ipInput.text?.toString()?.trim().orEmpty()
        DevicePrefs.serverPort = portInput.text?.toString()?.trim()?.toIntOrNull() ?: 5000
        DevicePrefs.deviceName = nameInput.text?.toString()?.trim().orEmpty().ifEmpty { DevicePrefs.deviceName }
    }

    private fun startService() {
        saveConfig()
        PhoneLinkService.resetReceiverState()
        PhoneLinkService.start(this)
        statusText.text = "Starting…"
    }

    private fun stopService() {
        PhoneLinkService.stop(this)
        statusText.text = "Disconnected"
    }

    private fun requestStorage() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!FileRepository.hasFullStorageAccess()) {
                startActivity(FileRepository.storageSettingsIntent(this))
            }
        }
    }

    private fun requestBatteryExemption() {
        val power = getSystemService(android.os.PowerManager::class.java)
        if (power?.isIgnoringBatteryOptimizations(packageName) == true) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                startActivity(
                    android.content.Intent(
                        android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        android.net.Uri.fromParts("package", packageName, null)
                    )
                )
            } catch (e: Exception) {
                startActivity(android.content.Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }
        }
    }

    private fun openNotificationAccessSettings() {
        startActivity(android.content.Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
    }

    private fun refreshNotificationAccess() {
        val enabled = isNotificationListenerEnabled()
        notifyText.text = if (enabled) "Notification access: Enabled (mirroring active)" else "Notification access: Not enabled — tap the button above"
        val color = if (enabled) R.color.emerald else R.color.red
        notifyText.setTextColor(ContextCompat.getColor(this, color))
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val listener = ComponentName(this, com.phonelink.hub.notifications.NotificationListener::class.java)
        val enabled = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: ""
        return TextUtils.split(enabled, ":").any { ComponentName.unflattenFromString(it) == listener }
    }

    private fun requestAppPermissions() {
        val wanted = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.READ_CALL_LOG,
            Manifest.permission.READ_SMS,
            Manifest.permission.SEND_SMS,
            Manifest.permission.RECEIVE_SMS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            wanted += Manifest.permission.POST_NOTIFICATIONS
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            wanted += Manifest.permission.READ_EXTERNAL_STORAGE
            wanted += Manifest.permission.WRITE_EXTERNAL_STORAGE
        }

        val missing = wanted.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }

    private fun startStatusRefresh() {
        statusRefreshing = true
        statusHandler.post(object : Runnable {
            override fun run() {
                if (!statusRefreshing) return
                val service = PhoneLinkService.instance
                updateStatus(service?.isServiceConnected == true)
                statusHandler.postDelayed(this, 1500)
            }
        })
    }

    private fun updateStatus(connected: Boolean) {
        statusText.text = if (connected) "Connected to dashboard" else "Disconnected"
        val color = if (connected) R.color.emerald else R.color.red
        statusDot.background?.setTint(ContextCompat.getColor(this, color))
    }
}