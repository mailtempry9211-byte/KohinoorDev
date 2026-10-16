package com.phonelink.hub

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
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
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.materialswitch.MaterialSwitch
import com.google.android.material.textfield.TextInputEditText
import com.phonelink.hub.accessibility.FindPhoneAccessibilityService
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.files.FileRepository
import com.phonelink.hub.media.MediaProjectionHolder
import com.phonelink.hub.media.ScreenshotConsentActivity
import com.phonelink.hub.notifications.NotificationListener
import com.phonelink.hub.remote.LockController
import com.phonelink.hub.service.PhoneLinkService
import com.phonelink.hub.util.AutostartHelper

class MainActivity : AppCompatActivity() {

    private lateinit var ipInput: TextInputEditText
    private lateinit var portInput: TextInputEditText
    private lateinit var nameInput: TextInputEditText
    private lateinit var statusDot: View
    private lateinit var statusText: TextView

    // Feature switches
    private lateinit var smsSwitch: MaterialSwitch
    private lateinit var callsSwitch: MaterialSwitch
    private lateinit var contactsSwitch: MaterialSwitch
    private lateinit var locationSwitch: MaterialSwitch
    private lateinit var cameraSwitch: MaterialSwitch
    private lateinit var micSwitch: MaterialSwitch
    private lateinit var storageSwitch: MaterialSwitch
    private lateinit var screenSwitch: MaterialSwitch
    private lateinit var findPhoneSwitch: MaterialSwitch
    private lateinit var deviceAdminSwitch: MaterialSwitch
    private lateinit var callBlockerSwitch: MaterialSwitch
    private lateinit var notifSyncSwitch: MaterialSwitch

    // Kids Safety & Camouflage switches
    private lateinit var calculatorDisguiseSwitch: MaterialSwitch
    private lateinit var stealthNotifSwitch: MaterialSwitch
    private lateinit var antiTamperSwitch: MaterialSwitch

    private val statusHandler = Handler(Looper.getMainLooper())
    private var statusRefreshing = false

    // Lazy, one-by-one runtime permission launchers
    private val smsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val granted = results.values.any { it }
        DevicePrefs.smsFeatureEnabled = granted
        smsSwitch.isChecked = granted
        if (granted) {
            PhoneLinkService.instance?.pushSms()
        } else {
            Toast.makeText(this, "SMS permissions denied", Toast.LENGTH_SHORT).show()
        }
    }

    private val callsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val granted = results.values.any { it }
        DevicePrefs.callsFeatureEnabled = granted
        callsSwitch.isChecked = granted
        if (granted) {
            PhoneLinkService.instance?.pushCalls()
        } else {
            Toast.makeText(this, "Call permissions denied", Toast.LENGTH_SHORT).show()
        }
    }

    private val contactsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val granted = results.values.any { it }
        DevicePrefs.contactsFeatureEnabled = granted
        contactsSwitch.isChecked = granted
        if (granted) {
            PhoneLinkService.instance?.pushContacts()
        } else {
            Toast.makeText(this, "Contacts permissions denied", Toast.LENGTH_SHORT).show()
        }
    }

    private val locationLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val granted = results.values.any { it }
        DevicePrefs.locationFeatureEnabled = granted
        locationSwitch.isChecked = granted
        if (granted) {
            PhoneLinkService.instance?.pushLocation()
        } else {
            Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        DevicePrefs.cameraFeatureEnabled = granted
        cameraSwitch.isChecked = granted
        if (!granted) {
            Toast.makeText(this, "Camera permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    private val micLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        DevicePrefs.micFeatureEnabled = granted
        micSwitch.isChecked = granted
        if (!granted) {
            Toast.makeText(this, "Microphone permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    private val legacyStorageLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val granted = results.values.any { it }
        DevicePrefs.storageFeatureEnabled = granted
        storageSwitch.isChecked = granted
        if (!granted) {
            Toast.makeText(this, "Storage permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* Service foreground notification */ }

    private val roleLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        DevicePrefs.callBlockerFeatureEnabled = true
        callBlockerSwitch.isChecked = true
        Toast.makeText(this, "Call Screening & Blocker enabled", Toast.LENGTH_SHORT).show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DevicePrefs.init(this)

        val isParentAuth = intent.getBooleanExtra("EXTRA_PARENT_AUTHENTICATED", false)
        if (DevicePrefs.calculatorDisguiseEnabled && !isParentAuth) {
            val calcIntent = Intent(this, com.phonelink.hub.calculator.CalculatorActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(calcIntent)
            finish()
            return
        }

        setContentView(R.layout.activity_main)

        bindViews()
        setupListeners()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val isParentAuth = intent.getBooleanExtra("EXTRA_PARENT_AUTHENTICATED", false)
        if (isParentAuth) {
            loadConfig()
            refreshFeatureSwitches()
        }
    }

    private fun bindViews() {
        ipInput = findViewById(R.id.serverIpInput)
        portInput = findViewById(R.id.serverPortInput)
        nameInput = findViewById(R.id.deviceNameInput)
        statusDot = findViewById(R.id.statusDot)
        statusText = findViewById(R.id.statusText)

        smsSwitch = findViewById(R.id.smsSwitch)
        callsSwitch = findViewById(R.id.callsSwitch)
        contactsSwitch = findViewById(R.id.contactsSwitch)
        locationSwitch = findViewById(R.id.locationSwitch)
        cameraSwitch = findViewById(R.id.cameraSwitch)
        micSwitch = findViewById(R.id.micSwitch)
        storageSwitch = findViewById(R.id.storageSwitch)
        screenSwitch = findViewById(R.id.screenSwitch)
        findPhoneSwitch = findViewById(R.id.findPhoneSwitch)
        deviceAdminSwitch = findViewById(R.id.deviceAdminSwitch)
        callBlockerSwitch = findViewById(R.id.callBlockerSwitch)
        notifSyncSwitch = findViewById(R.id.notifSyncSwitch)

        calculatorDisguiseSwitch = findViewById(R.id.calculatorDisguiseSwitch)
        stealthNotifSwitch = findViewById(R.id.stealthNotifSwitch)
        antiTamperSwitch = findViewById(R.id.antiTamperSwitch)
    }

    private fun setupListeners() {
        findViewById<Button>(R.id.batteryBtn).setOnClickListener { requestBatteryExemption() }
        findViewById<Button>(R.id.autostartBtn).setOnClickListener {
            AutostartHelper.openAutostartSettings(this)
        }
        findViewById<Button>(R.id.startBtn).setOnClickListener { startService() }
        findViewById<Button>(R.id.stopBtn).setOnClickListener {
            if (DevicePrefs.hasOwnerPin()) {
                showPinPrompt(
                    title = "Confirm Stop Service",
                    message = "Enter Owner PIN to authorize stopping the Phone Link monitoring service."
                ) {
                    stopService()
                }
            } else {
                stopService()
            }
        }
        findViewById<Button>(R.id.syncNowBtn).setOnClickListener { PhoneLinkService.instance?.syncAll() }
        findViewById<Button>(R.id.pinSettingsBtn).setOnClickListener { openPinManager() }
        findViewById<Button>(R.id.pinClockWidgetBtn).setOnClickListener {
            val success = com.phonelink.hub.widget.ClockWidgetProvider.requestPinWidget(this)
            if (!success) {
                Toast.makeText(this, "Long-press your home screen -> Widgets -> select 'Digital Clock'", Toast.LENGTH_LONG).show()
            }
        }
        findViewById<Button>(R.id.hideNotifSettingsBtn).setOnClickListener {
            com.phonelink.hub.remote.QuickSettingsController.openNotificationSettings(this)
        }

        calculatorDisguiseSwitch.isChecked = DevicePrefs.calculatorDisguiseEnabled
        calculatorDisguiseSwitch.setOnCheckedChangeListener { _, isChecked ->
            DevicePrefs.calculatorDisguiseEnabled = isChecked
            DevicePrefs.updateCalculatorAlias(this, isChecked)
            val msg = if (isChecked) {
                "Camouflage active! App icon changed to 'Calculator'. Enter PIN in calculator to access settings."
            } else {
                "Camouflage disabled. Default PhoneLink launcher icon restored."
            }
            Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
        }

        stealthNotifSwitch.isChecked = DevicePrefs.stealthNotificationEnabled
        stealthNotifSwitch.setOnCheckedChangeListener { _, isChecked ->
            DevicePrefs.stealthNotificationEnabled = isChecked
            val msg = if (isChecked) "Invisible notification enabled" else "Standard notification enabled"
            Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
        }

        antiTamperSwitch.isChecked = DevicePrefs.antiUninstallShieldEnabled
        antiTamperSwitch.setOnCheckedChangeListener { _, isChecked ->
            DevicePrefs.antiUninstallShieldEnabled = isChecked
            val msg = if (isChecked) "Anti-Uninstall & Settings Shield active" else "Anti-Uninstall shield paused"
            Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
        }

        // Feature 1: SMS
        smsSwitch.setOnClickListener {
            if (smsSwitch.isChecked) {
                smsSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable SMS Relay?",
                    message = "SMS Relay allows you to read and send SMS from your self-hosted PC dashboard.\n\n" +
                            "Privacy Guarantee: Messages stay strictly on your local network between your phone and your private dashboard. No data is sent to external servers."
                ) {
                    smsLauncher.launch(
                        arrayOf(
                            Manifest.permission.READ_SMS,
                            Manifest.permission.RECEIVE_SMS,
                            Manifest.permission.SEND_SMS
                        )
                    )
                }
            } else {
                DevicePrefs.smsFeatureEnabled = false
            }
        }

        // Feature 2: Calls
        callsSwitch.setOnClickListener {
            if (callsSwitch.isChecked) {
                callsSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable Calls & Remote Dialer?",
                    message = "Displays recent calls, alerts PC in real-time when ringing, and enables direct outgoing call placing and remote answering from your dashboard.\n\n" +
                            "Privacy Guarantee: Call data stays on your local WiFi network."
                ) {
                    val perms = mutableListOf(
                        Manifest.permission.READ_CALL_LOG,
                        Manifest.permission.READ_PHONE_STATE,
                        Manifest.permission.CALL_PHONE
                    )
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        perms.add(Manifest.permission.ANSWER_PHONE_CALLS)
                    }
                    callsLauncher.launch(perms.toTypedArray())
                }
            } else {
                DevicePrefs.callsFeatureEnabled = false
            }
        }

        // Feature 3: Contacts
        contactsSwitch.setOnClickListener {
            if (contactsSwitch.isChecked) {
                contactsSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable Contacts Sync?",
                    message = "Allows you to view phone contacts on your desktop dashboard and add new contacts remotely.\n\n" +
                            "Privacy Guarantee: Contact details are shared exclusively with your self-hosted dashboard."
                ) {
                    contactsLauncher.launch(
                        arrayOf(
                            Manifest.permission.READ_CONTACTS,
                            Manifest.permission.WRITE_CONTACTS
                        )
                    )
                }
            } else {
                DevicePrefs.contactsFeatureEnabled = false
            }
        }

        // Feature 4: Location
        locationSwitch.setOnClickListener {
            if (locationSwitch.isChecked) {
                locationSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable Device Location?",
                    message = "Shares your device GPS and network coordinates with your PC dashboard map.\n\n" +
                            "Privacy Guarantee: Location data is sent only to your own LAN dashboard while the service is running. No background tracking servers exist."
                ) {
                    locationLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )
                }
            } else {
                DevicePrefs.locationFeatureEnabled = false
            }
        }

        // Feature 5: Camera
        cameraSwitch.setOnClickListener {
            if (cameraSwitch.isChecked) {
                cameraSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable Camera Live Stream?",
                    message = "Allows capturing one-shot photos or streaming live video (pet/room monitor) to your private dashboard.\n\n" +
                            "Privacy Guarantee: Camera streams are rendered directly to your local computer. A persistent notification is shown whenever the camera is actively transmitting."
                ) {
                    cameraLauncher.launch(Manifest.permission.CAMERA)
                }
            } else {
                DevicePrefs.cameraFeatureEnabled = false
            }
        }

        // Feature 6: Microphone
        micSwitch.setOnClickListener {
            if (micSwitch.isChecked) {
                micSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable Microphone Recording?",
                    message = "Records short audio clips on request to help locate your device or listen nearby.\n\n" +
                            "Privacy Guarantee: Audio recordings remain strictly on your local PC. An active notification is visible whenever recording is in progress."
                ) {
                    micLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            } else {
                DevicePrefs.micFeatureEnabled = false
            }
        }

        // Feature 7: Storage
        storageSwitch.setOnClickListener {
            val hasStorage = FileRepository.hasPermission(this)
            if (storageSwitch.isChecked) {
                if (hasStorage) {
                    DevicePrefs.storageFeatureEnabled = true
                } else {
                    storageSwitch.isChecked = false
                    showRationaleDialog(
                        title = "Enable File Explorer?",
                        message = "Grants access to internal storage so you can download, browse, and upload files from your desktop browser over local WiFi."
                    ) {
                        DevicePrefs.storageFeatureEnabled = true
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            try {
                                startActivity(FileRepository.storageSettingsIntent(this))
                            } catch (e: Exception) {
                                Toast.makeText(this, "Could not open storage settings", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            legacyStorageLauncher.launch(
                                arrayOf(
                                    Manifest.permission.READ_EXTERNAL_STORAGE,
                                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                                )
                            )
                        }
                    }
                }
            } else {
                DevicePrefs.storageFeatureEnabled = false
            }
        }

        // Feature 8: Screen Mirror
        screenSwitch.setOnClickListener {
            if (screenSwitch.isChecked) {
                screenSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable Screen View & Screenshot?",
                    message = "Streams your phone screen or takes screenshots for your private PC dashboard.\n\n" +
                            "For your protection, Android will present a system authorization prompt ('Start now') every session."
                ) {
                    ScreenshotConsentActivity.launch(this)
                }
            } else {
                DevicePrefs.screenMirrorFeatureEnabled = false
                MediaProjectionHolder.release()
            }
        }

        // Feature 9: Find Phone
        findPhoneSwitch.setOnClickListener {
            if (findPhoneSwitch.isChecked) {
                findPhoneSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable Find My Phone?",
                    message = "Uses a minimal Accessibility Service solely to allow the ring alarm to sound at full volume even when the phone is on silent or DND.\n\n" +
                            "Disclosure: This service does NOT read your screen text, inspect touch inputs, or perform automated gestures."
                ) {
                    openAccessibilitySettings()
                }
            } else {
                DevicePrefs.findPhoneFeatureEnabled = false
            }
        }

        // Feature 10: Remote Lock
        deviceAdminSwitch.setOnClickListener {
            if (deviceAdminSwitch.isChecked) {
                deviceAdminSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable Remote Screen Lock?",
                    message = "Uses Android Device Administrator privileges solely to turn off and lock your screen when you click 'Lock Phone' from your PC dashboard.\n\n" +
                            "Disclosure: It cannot wipe data or change device passwords."
                ) {
                    if (!LockController.isAdminActive(this)) {
                        startActivity(LockController.getAdminIntent(this))
                    }
                }
            } else {
                DevicePrefs.remoteLockFeatureEnabled = false
            }
        }

        // Feature 11: Call Blocker
        callBlockerSwitch.setOnClickListener {
            if (callBlockerSwitch.isChecked) {
                callBlockerSwitch.isChecked = false
                showRationaleDialog(
                    title = "Enable Call Screening & Blocker?",
                    message = "Allows Phone Link Hub to evaluate incoming numbers against your custom blocklist configured on the dashboard and silence unwanted callers."
                ) {
                    DevicePrefs.callBlockerFeatureEnabled = true
                    callBlockerSwitch.isChecked = true
                    requestCallScreeningRole()
                }
            } else {
                DevicePrefs.callBlockerFeatureEnabled = false
                callBlockerSwitch.isChecked = false
            }
        }

        // Feature 12: Notification Mirroring
        notifSyncSwitch.setOnClickListener {
            if (notifSyncSwitch.isChecked) {
                if (!isNotificationListenerEnabled()) {
                    notifSyncSwitch.isChecked = false
                    showRationaleDialog(
                        title = "Enable Notification Mirroring?",
                        message = "Mirrors incoming notifications to your desktop dashboard in real time over your local network.\n\n" +
                                "Privacy Guarantee: Notification contents are sent directly to your self-hosted PC. You can dismiss notifications remotely."
                    ) {
                        openNotificationAccessSettings()
                    }
                } else {
                    DevicePrefs.notificationSyncEnabled = true
                    PhoneLinkService.instance?.pushNotificationSyncStatus()
                    PhoneLinkService.instance?.pushNotifications()
                }
            } else {
                DevicePrefs.notificationSyncEnabled = false
                PhoneLinkService.instance?.pushNotificationSyncStatus()
            }
        }
    }

    private fun showRationaleDialog(
        title: String,
        message: String,
        onAccept: () -> Unit
    ) {
        MaterialAlertDialogBuilder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("Allow & Proceed") { _, _ -> onAccept() }
            .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
            .show()
    }

    override fun onResume() {
        super.onResume()
        loadConfig()
        refreshFeatureSwitches()
        startStatusRefresh()
    }

    override fun onPause() {
        super.onPause()
        statusRefreshing = false
        statusHandler.removeCallbacksAndMessages(null)
    }

    private fun refreshFeatureSwitches() {
        // SMS
        val hasSms = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
        smsSwitch.isChecked = hasSms && DevicePrefs.smsFeatureEnabled

        // Calls
        val hasCalls = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
        callsSwitch.isChecked = hasCalls && DevicePrefs.callsFeatureEnabled

        // Contacts
        val hasContacts = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
        contactsSwitch.isChecked = hasContacts && DevicePrefs.contactsFeatureEnabled

        // Location
        val hasLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        locationSwitch.isChecked = hasLocation && DevicePrefs.locationFeatureEnabled

        // Camera
        val hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        cameraSwitch.isChecked = hasCamera && DevicePrefs.cameraFeatureEnabled

        // Mic
        val hasMic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        micSwitch.isChecked = hasMic && DevicePrefs.micFeatureEnabled

        // Storage
        val hasStorage = FileRepository.hasPermission(this)
        if (hasStorage) {
            DevicePrefs.storageFeatureEnabled = true
        }
        storageSwitch.isChecked = hasStorage && DevicePrefs.storageFeatureEnabled

        // Screen
        screenSwitch.isChecked = MediaProjectionHolder.hasConsent

        // Find Phone
        val hasAcc = FindPhoneAccessibilityService.instance != null
        findPhoneSwitch.isChecked = hasAcc

        // Device Admin
        val hasAdmin = LockController.isAdminActive(this)
        deviceAdminSwitch.isChecked = hasAdmin

        // Call Blocker
        callBlockerSwitch.isChecked = DevicePrefs.callBlockerFeatureEnabled

        // Notification Mirroring
        val hasNotif = isNotificationListenerEnabled()
        notifSyncSwitch.isChecked = hasNotif && DevicePrefs.notificationSyncEnabled
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

        // Request POST_NOTIFICATIONS on Android 13+ so the foreground service notification shows
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        PhoneLinkService.resetReceiverState()
        PhoneLinkService.start(this)
        statusText.text = "Starting…"
    }

    private fun stopService() {
        PhoneLinkService.stop(this)
        statusText.text = "Disconnected"
    }

    private fun requestBatteryExemption() {
        val power = getSystemService(android.os.PowerManager::class.java)
        if (power?.isIgnoringBatteryOptimizations(packageName) == true) {
            Toast.makeText(this, "Battery optimization is already disabled", Toast.LENGTH_SHORT).show()
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                startActivity(
                    Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        android.net.Uri.fromParts("package", packageName, null)
                    )
                )
            } catch (e: Exception) {
                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }
        }
    }

    private fun openNotificationAccessSettings() {
        try {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        } catch (e: Exception) {
            Toast.makeText(this, "Could not open notification settings", Toast.LENGTH_SHORT).show()
        }
    }

    private fun openAccessibilitySettings() {
        try {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        } catch (e: Exception) {
            Toast.makeText(this, "Could not open accessibility settings", Toast.LENGTH_SHORT).show()
        }
    }

    private fun requestCallScreeningRole() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val rm = getSystemService(android.app.role.RoleManager::class.java)
                if (rm != null && rm.isRoleAvailable(android.app.role.RoleManager.ROLE_CALL_SCREENING)) {
                    if (!rm.isRoleHeld(android.app.role.RoleManager.ROLE_CALL_SCREENING)) {
                        try {
                            roleLauncher.launch(rm.createRequestRoleIntent(android.app.role.RoleManager.ROLE_CALL_SCREENING))
                        } catch (e: Exception) {
                            try {
                                startActivity(Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS))
                            } catch (ignored: Exception) {
                                startActivity(Intent(Settings.ACTION_SETTINGS))
                            }
                        }
                    } else {
                        Toast.makeText(this, "Call Screening role is active", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    try {
                        startActivity(Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS))
                        Toast.makeText(this, "Select Phone Link Hub as Default Caller ID & Spam app", Toast.LENGTH_LONG).show()
                    } catch (ignored: Exception) {
                        startActivity(Intent(Settings.ACTION_SETTINGS))
                    }
                }
            } else {
                Toast.makeText(this, "Call Screening is enabled on this Android version", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Could not open screening settings: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val listener = ComponentName(this, NotificationListener::class.java)
        val enabled = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: ""
        return TextUtils.split(enabled, ":").any { ComponentName.unflattenFromString(it) == listener }
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

    // -------------------------------------------------------------
    // In-App Owner PIN Management & Verification
    // -------------------------------------------------------------
    private fun openPinManager() {
        if (!DevicePrefs.hasOwnerPin()) {
            showSetPinDialog()
        } else {
            showPinOptionsDialog()
        }
    }

    private fun showSetPinDialog() {
        val input = android.widget.EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "Enter 4 to 8 digit numeric PIN"
            setPadding(40, 30, 40, 30)
        }
        MaterialAlertDialogBuilder(this)
            .setTitle("Set In-App Owner PIN")
            .setMessage("Set a numeric PIN to protect application settings and prevent unauthorized service shutdown from the phone's UI.\n\nNotice: This protects in-app settings only. By Android security design, it cannot prevent users with device access from uninstalling or force-stopping the app in Android Settings.")
            .setView(input)
            .setPositiveButton("Save PIN") { _, _ ->
                val pin = input.text.toString().trim()
                if (pin.length < 4) {
                    Toast.makeText(this, "PIN must be at least 4 digits", Toast.LENGTH_SHORT).show()
                } else {
                    DevicePrefs.setOwnerPin(pin)
                    Toast.makeText(this, "Owner PIN enabled successfully", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showPinOptionsDialog() {
        val options = arrayOf("Change PIN", "Remove PIN")
        MaterialAlertDialogBuilder(this)
            .setTitle("Owner PIN Protection (Active)")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> {
                        showPinPrompt("Verify Current PIN", "Enter your current PIN to change it:") {
                            showSetPinDialog()
                        }
                    }
                    1 -> {
                        showPinPrompt("Verify Current PIN", "Enter your current PIN to remove protection:") {
                            DevicePrefs.clearOwnerPin()
                            Toast.makeText(this, "PIN protection removed", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun showPinPrompt(title: String, message: String, onSuccess: () -> Unit) {
        val input = android.widget.EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "Owner PIN"
            setPadding(40, 30, 40, 30)
        }
        MaterialAlertDialogBuilder(this)
            .setTitle(title)
            .setMessage(message)
            .setView(input)
            .setPositiveButton("Verify") { _, _ ->
                val pin = input.text.toString().trim()
                if (DevicePrefs.verifyOwnerPin(pin)) {
                    onSuccess()
                } else {
                    Toast.makeText(this, "Incorrect PIN", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}