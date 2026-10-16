package com.phonelink.hub.launcher

import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.text.method.PasswordTransformationMethod
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.phonelink.hub.MainActivity
import com.phonelink.hub.R
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.service.PhoneLinkService
import java.util.Locale
import java.util.concurrent.Executors

class LauncherActivity : AppCompatActivity() {

    private lateinit var appsRecyclerView: RecyclerView
    private lateinit var searchBarInput: EditText
    private lateinit var launcherRoot: View
    private lateinit var dot1: View
    private lateinit var dot2: View
    private lateinit var dot3: View

    private val allApps = ArrayList<AppItem>()
    private val filteredApps = ArrayList<AppItem>()
    private lateinit var adapter: AppsAdapter

    private val mainHandler = Handler(Looper.getMainLooper())
    private val backgroundExecutor = Executors.newSingleThreadExecutor()

    private val statusPollRunnable = object : Runnable {
        override fun run() {
            updateStatusDots()
            mainHandler.postDelayed(this, 3000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_launcher)

        initViews()
        setupListeners()
        loadInstalledApps()
        ensureBackgroundService()
    }

    override fun onResume() {
        super.onResume()
        updateStatusDots()
        mainHandler.post(statusPollRunnable)
        ensureBackgroundService()
    }

    override fun onPause() {
        super.onPause()
        mainHandler.removeCallbacks(statusPollRunnable)
    }

    override fun onBackPressed() {
        // As a Home launcher, back button simply clears search or does nothing
        if (searchBarInput.text.isNotEmpty()) {
            searchBarInput.text.clear()
        }
    }

    private fun initViews() {
        launcherRoot = findViewById(R.id.launcherRoot)
        appsRecyclerView = findViewById(R.id.appsRecyclerView)
        searchBarInput = findViewById(R.id.searchBarInput)

        dot1 = findViewById(R.id.dot1)
        dot2 = findViewById(R.id.dot2)
        dot3 = findViewById(R.id.dot3)

        appsRecyclerView.layoutManager = GridLayoutManager(this, 4)
        adapter = AppsAdapter(this, filteredApps)
        appsRecyclerView.adapter = adapter
    }

    private fun setupListeners() {
        launcherRoot.setOnLongClickListener {
            showHomeSettingsDialog()
            true
        }

        searchBarInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterApps(s.toString())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun loadInstalledApps() {
        backgroundExecutor.execute {
            val pm = packageManager
            val intent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val resolveInfos = pm.queryIntentActivities(intent, 0)
            val list = ArrayList<AppItem>()

            for (info in resolveInfos) {
                val pkgName = info.activityInfo.packageName
                // NEVER show our own app in the Launcher! Completely invisible.
                if (pkgName == packageName) continue

                val label = info.loadLabel(pm).toString()
                val icon = info.loadIcon(pm)
                list.add(AppItem(label, pkgName, icon))
            }

            list.sortBy { it.label.lowercase(Locale.getDefault()) }

            mainHandler.post {
                allApps.clear()
                allApps.addAll(list)
                filterApps(searchBarInput.text.toString())
            }
        }
    }

    private fun filterApps(query: String) {
        val q = query.trim().lowercase(Locale.getDefault())
        filteredApps.clear()
        if (q.isEmpty()) {
            filteredApps.addAll(allApps)
        } else {
            for (app in allApps) {
                if (app.label.lowercase(Locale.getDefault()).contains(q)) {
                    filteredApps.add(app)
                }
            }
        }
        adapter.updateApps(filteredApps)
    }

    private fun ensureBackgroundService() {
        try {
            val serviceIntent = Intent(this, PhoneLinkService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (ignored: Exception) {}
    }

    private fun updateStatusDots() {
        val isConnected = PhoneLinkService.isSocketConnected

        val isServiceRunning = PhoneLinkService.instance != null
        val isShieldActive = DevicePrefs.antiUninstallShieldEnabled

        // Dot 1: WebSocket connection
        dot1.setBackgroundResource(
            if (isConnected) R.drawable.shape_dot_green else R.drawable.shape_dot_dim
        )

        // Dot 2: Foreground keepalive service
        dot2.setBackgroundResource(
            if (isServiceRunning) R.drawable.shape_dot_green else R.drawable.shape_dot_yellow
        )

        // Dot 3: Child safety shield
        dot3.setBackgroundResource(
            if (isShieldActive) R.drawable.shape_dot_green else R.drawable.shape_dot_dim
        )
    }

    private fun showHomeSettingsDialog() {
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_home_settings, null)
        val dialog = AlertDialog.Builder(this, R.style.Theme_PhoneLinkHub)
            .setView(view)
            .create()

        view.findViewById<View>(R.id.btnChangeWallpaper).setOnClickListener {
            dialog.dismiss()
            try {
                startActivity(Intent(Intent.ACTION_SET_WALLPAPER))
            } catch (e: Exception) {
                Toast.makeText(this, "Wallpaper chooser not available", Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<View>(R.id.btnSetDefaultLauncher).setOnClickListener {
            dialog.dismiss()
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    startActivity(Intent(Settings.ACTION_HOME_SETTINGS))
                } else {
                    startActivity(Intent(Settings.ACTION_SETTINGS))
                }
            } catch (e: Exception) {
                Toast.makeText(this, "Unable to open Home Settings", Toast.LENGTH_SHORT).show()
            }
        }

        // SECRET 5-TAP MASTER VAULT ACCESS ON ABOUT ROW
        var tapCount = 0
        var firstTapTime = 0L
        view.findViewById<View>(R.id.btnAboutLauncher).setOnClickListener {
            val now = System.currentTimeMillis()
            if (now - firstTapTime > 3500) {
                tapCount = 1
                firstTapTime = now
            } else {
                tapCount++
            }

            if (tapCount >= 5) {
                tapCount = 0
                dialog.dismiss()
                showSecretMasterPinDialog()
            }
        }

        dialog.show()
    }

    private fun showSecretMasterPinDialog() {
        val input = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            transformationMethod = PasswordTransformationMethod.getInstance()
            hint = "Enter Master Key (Default: 9211)"
            setTextColor(Color.WHITE)
            setHintTextColor(Color.GRAY)
            setPadding(40, 30, 40, 30)
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(50, 20, 50, 10)
            addView(input)
        }

        AlertDialog.Builder(this, R.style.Theme_PhoneLinkHub)
            .setTitle("Parent Control Vault")
            .setMessage("Enter your secret Master PIN to open Device Management & Settings.")
            .setView(container)
            .setPositiveButton("Unlock") { _, _ ->
                val enteredPin = input.text.toString().trim()
                if (DevicePrefs.verifyOwnerPin(enteredPin)) {
                    Toast.makeText(this, "Parent Controls Unlocked", Toast.LENGTH_SHORT).show()
                    val intent = Intent(this, MainActivity::class.java).apply {
                        putExtra("EXTRA_PARENT_AUTHENTICATED", true)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    }
                    startActivity(intent)
                } else {
                    Toast.makeText(this, "Invalid Master Key!", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
