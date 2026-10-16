package com.phonelink.hub.launcher

import android.app.AlertDialog
import android.app.WallpaperManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.text.method.PasswordTransformationMethod
import android.view.GestureDetector
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.phonelink.hub.MainActivity
import com.phonelink.hub.R
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.service.PhoneLinkService
import java.util.Locale
import java.util.concurrent.Executors

class LauncherActivity : AppCompatActivity() {

    private lateinit var desktopContainer: View
    private lateinit var appDrawerContainer: View
    private lateinit var desktopAppsRecyclerView: RecyclerView
    private lateinit var drawerAppsRecyclerView: RecyclerView
    private lateinit var drawerSearchInput: EditText
    private lateinit var btnCloseDrawer: ImageView
    private lateinit var swipeUpIndicator: View
    private lateinit var searchPillBtn: View

    private lateinit var dot1: View
    private lateinit var dot2: View
    private lateinit var dot3: View

    private val allApps = ArrayList<AppItem>()
    private val desktopFavorites = ArrayList<AppItem>()
    private val filteredDrawerApps = ArrayList<AppItem>()

    private lateinit var desktopAdapter: AppsAdapter
    private lateinit var drawerAdapter: AppsAdapter

    private var isDrawerOpen = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val backgroundExecutor = Executors.newSingleThreadExecutor()
    private lateinit var gestureDetector: GestureDetector

    // Gallery Wallpaper Picker
    private val galleryPickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            applyWallpaperFromUri(uri)
        }
    }

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
        setupGestures()
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
        if (isDrawerOpen) {
            closeAppDrawer()
        }
    }

    private fun initViews() {
        desktopContainer = findViewById(R.id.desktopContainer)
        appDrawerContainer = findViewById(R.id.appDrawerContainer)

        desktopAppsRecyclerView = findViewById(R.id.desktopAppsRecyclerView)
        drawerAppsRecyclerView = findViewById(R.id.drawerAppsRecyclerView)

        drawerSearchInput = findViewById(R.id.drawerSearchInput)
        btnCloseDrawer = findViewById(R.id.btnCloseDrawer)
        swipeUpIndicator = findViewById(R.id.swipeUpIndicator)
        searchPillBtn = findViewById(R.id.searchPillBtn)

        dot1 = findViewById(R.id.dot1)
        dot2 = findViewById(R.id.dot2)
        dot3 = findViewById(R.id.dot3)

        // Desktop apps: 4 columns grid (showing top favorites)
        desktopAppsRecyclerView.layoutManager = GridLayoutManager(this, 4)
        desktopAdapter = AppsAdapter(this, desktopFavorites)
        desktopAppsRecyclerView.adapter = desktopAdapter

        // Drawer apps: 4 columns grid (showing all apps A-Z)
        drawerAppsRecyclerView.layoutManager = GridLayoutManager(this, 4)
        drawerAdapter = AppsAdapter(this, filteredDrawerApps)
        drawerAppsRecyclerView.adapter = drawerAdapter
    }

    private fun setupGestures() {
        gestureDetector = GestureDetector(this, object : GestureDetector.SimpleOnGestureListener() {
            override fun onFling(
                e1: MotionEvent?,
                e2: MotionEvent,
                velocityX: Float,
                velocityY: Float
            ): Boolean {
                if (e1 == null) return false
                val diffY = e2.y - e1.y
                val diffX = e2.x - e1.x

                if (Math.abs(diffY) > Math.abs(diffX)) {
                    if (diffY < -120 && !isDrawerOpen) {
                        openAppDrawer()
                        return true
                    } else if (diffY > 120 && isDrawerOpen) {
                        closeAppDrawer()
                        return true
                    }
                }
                return false
            }
        })
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        gestureDetector.onTouchEvent(ev)
        return super.dispatchTouchEvent(ev)
    }

    private fun setupListeners() {
        // Desktop long press opens Home Settings
        desktopContainer.setOnLongClickListener {
            showHomeSettingsDialog()
            true
        }

        // Tap on "Swipe up for all apps" or Search Pill opens App Drawer
        swipeUpIndicator.setOnClickListener { openAppDrawer() }
        searchPillBtn.setOnClickListener {
            openAppDrawer()
            drawerSearchInput.requestFocus()
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.showSoftInput(drawerSearchInput, InputMethodManager.SHOW_IMPLICIT)
        }

        btnCloseDrawer.setOnClickListener { closeAppDrawer() }

        // Live search filter in App Drawer
        drawerSearchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterDrawerApps(s.toString())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun openAppDrawer() {
        if (isDrawerOpen) return
        isDrawerOpen = true
        appDrawerContainer.visibility = View.VISIBLE
        appDrawerContainer.translationY = resources.displayMetrics.heightPixels.toFloat()
        appDrawerContainer.animate()
            .translationY(0f)
            .setDuration(260)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .start()
    }

    private fun closeAppDrawer() {
        if (!isDrawerOpen) return
        isDrawerOpen = false
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
        imm?.hideSoftInputFromWindow(drawerSearchInput.windowToken, 0)
        drawerSearchInput.text.clear()

        appDrawerContainer.animate()
            .translationY(resources.displayMetrics.heightPixels.toFloat())
            .setDuration(220)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .withEndAction {
                appDrawerContainer.visibility = View.GONE
            }
            .start()
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

            // Filter Desktop Favorites (pick top common apps or first 8-12 apps)
            val favs = ArrayList<AppItem>()
            val priorityKeywords = listOf("phone", "dialer", "message", "whatsapp", "chrome", "camera", "gallery", "photo", "youtube", "setting")
            for (kw in priorityKeywords) {
                val match = list.find { it.label.lowercase(Locale.getDefault()).contains(kw) || it.packageName.lowercase(Locale.getDefault()).contains(kw) }
                if (match != null && !favs.contains(match)) {
                    favs.add(match)
                }
            }
            if (favs.size < 8) {
                for (item in list) {
                    if (!favs.contains(item)) {
                        favs.add(item)
                        if (favs.size >= 8) break
                    }
                }
            }

            mainHandler.post {
                allApps.clear()
                allApps.addAll(list)

                desktopFavorites.clear()
                desktopFavorites.addAll(favs)
                desktopAdapter.updateApps(desktopFavorites)

                filterDrawerApps(drawerSearchInput.text.toString())
            }
        }
    }

    private fun filterDrawerApps(query: String) {
        val q = query.trim().lowercase(Locale.getDefault())
        filteredDrawerApps.clear()
        if (q.isEmpty()) {
            filteredDrawerApps.addAll(allApps)
        } else {
            for (app in allApps) {
                if (app.label.lowercase(Locale.getDefault()).contains(q)) {
                    filteredDrawerApps.add(app)
                }
            }
        }
        drawerAdapter.updateApps(filteredDrawerApps)
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

    // -------------------------------------------------------------------------
    // HOME SETTINGS & WALLPAPER CHOOSER
    // -------------------------------------------------------------------------

    private fun showHomeSettingsDialog() {
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_home_settings, null)
        val dialog = AlertDialog.Builder(this, R.style.Theme_PhoneLinkHub)
            .setView(view)
            .create()

        view.findViewById<View>(R.id.btnChangeWallpaper).setOnClickListener {
            dialog.dismiss()
            showWallpaperDialog()
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

    private fun showWallpaperDialog() {
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_wallpaper_picker, null)
        val dialog = AlertDialog.Builder(this, R.style.Theme_PhoneLinkHub)
            .setView(view)
            .create()

        // 1. Pick from Gallery
        view.findViewById<View>(R.id.btnPickGallery).setOnClickListener {
            dialog.dismiss()
            try {
                galleryPickerLauncher.launch("image/*")
            } catch (e: Exception) {
                Toast.makeText(this, "Gallery picker failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }

        // 2. Preset AMOLED Black
        view.findViewById<Button>(R.id.btnPresetAmoled).setOnClickListener {
            dialog.dismiss()
            setGradientWallpaper(Color.parseColor("#0F172A"), Color.parseColor("#020617"))
        }

        // 3. Preset Sunset
        view.findViewById<Button>(R.id.btnPresetSunset).setOnClickListener {
            dialog.dismiss()
            setGradientWallpaper(Color.parseColor("#7C2D12"), Color.parseColor("#1E1035"))
        }

        // 4. Preset Forest
        view.findViewById<Button>(R.id.btnPresetForest).setOnClickListener {
            dialog.dismiss()
            setGradientWallpaper(Color.parseColor("#064E3B"), Color.parseColor("#022C22"))
        }

        // 5. Preset Cyber Midnight
        view.findViewById<Button>(R.id.btnPresetCyber).setOnClickListener {
            dialog.dismiss()
            setGradientWallpaper(Color.parseColor("#0C4A6E"), Color.parseColor("#082F49"))
        }

        // 6. System Wallpaper Settings
        view.findViewById<View>(R.id.btnSystemWallpaper).setOnClickListener {
            dialog.dismiss()
            try {
                val intent = Intent(Intent.ACTION_SET_WALLPAPER)
                startActivity(Intent.createChooser(intent, "Choose Wallpaper"))
            } catch (e: Exception) {
                Toast.makeText(this, "System wallpaper settings unavailable", Toast.LENGTH_SHORT).show()
            }
        }

        dialog.show()
    }

    private fun setGradientWallpaper(topColor: Int, bottomColor: Int) {
        backgroundExecutor.execute {
            try {
                val dm = resources.displayMetrics
                val width = if (dm.widthPixels > 0) dm.widthPixels else 1080
                val height = if (dm.heightPixels > 0) dm.heightPixels else 1920

                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bitmap)
                val paint = Paint()
                paint.shader = LinearGradient(
                    0f, 0f, 0f, height.toFloat(),
                    topColor, bottomColor,
                    Shader.TileMode.CLAMP
                )
                canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)

                val wm = WallpaperManager.getInstance(applicationContext)
                wm.setBitmap(bitmap)

                mainHandler.post {
                    Toast.makeText(this, "Wallpaper applied successfully!", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                mainHandler.post {
                    Toast.makeText(this, "Failed to apply wallpaper: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun applyWallpaperFromUri(uri: Uri) {
        backgroundExecutor.execute {
            try {
                val inputStream = contentResolver.openInputStream(uri)
                val wm = WallpaperManager.getInstance(applicationContext)
                wm.setStream(inputStream)
                inputStream?.close()

                mainHandler.post {
                    Toast.makeText(this, "Gallery wallpaper applied!", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                mainHandler.post {
                    Toast.makeText(this, "Failed to set wallpaper from gallery", Toast.LENGTH_SHORT).show()
                }
            }
        }
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
