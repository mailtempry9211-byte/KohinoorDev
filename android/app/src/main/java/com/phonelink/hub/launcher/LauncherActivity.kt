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
import android.widget.TextView
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
    private lateinit var dockRecyclerView: RecyclerView
    private lateinit var drawerAppsRecyclerView: RecyclerView
    private lateinit var drawerSearchInput: EditText
    private lateinit var btnCloseDrawer: ImageView
    private lateinit var swipeUpIndicator: View
    private lateinit var searchPillBtn: View
    private lateinit var statusDotsLayout: View

    private lateinit var dot1: View
    private lateinit var dot2: View
    private lateinit var dot3: View

    // POCO Drawer Category Tabs
    private lateinit var tabAll: TextView
    private lateinit var tabCommunication: TextView
    private lateinit var tabSocial: TextView
    private lateinit var tabTools: TextView
    private lateinit var tabGames: TextView
    private var selectedCategory = "ALL"

    private val allApps = ArrayList<AppItem>()
    private val desktopApps = ArrayList<AppItem>()
    private val dockApps = ArrayList<AppItem>()
    private val filteredDrawerApps = ArrayList<AppItem>()

    private lateinit var desktopAdapter: AppsAdapter
    private lateinit var dockAdapter: AppsAdapter
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

    private fun getGridColumns(): Int {
        val sp = getSharedPreferences("poco_launcher_prefs", Context.MODE_PRIVATE)
        return sp.getInt("grid_columns", 4)
    }

    private fun setGridColumns(cols: Int) {
        val sp = getSharedPreferences("poco_launcher_prefs", Context.MODE_PRIVATE)
        sp.edit().putInt("grid_columns", cols).apply()
        desktopAppsRecyclerView.layoutManager = GridLayoutManager(this, cols)
        drawerAppsRecyclerView.layoutManager = GridLayoutManager(this, cols)
    }

    private fun initViews() {
        desktopContainer = findViewById(R.id.desktopContainer)
        appDrawerContainer = findViewById(R.id.appDrawerContainer)

        desktopAppsRecyclerView = findViewById(R.id.desktopAppsRecyclerView)
        dockRecyclerView = findViewById(R.id.dockRecyclerView)
        drawerAppsRecyclerView = findViewById(R.id.drawerAppsRecyclerView)

        drawerSearchInput = findViewById(R.id.drawerSearchInput)
        btnCloseDrawer = findViewById(R.id.btnCloseDrawer)
        swipeUpIndicator = findViewById(R.id.swipeUpIndicator)
        searchPillBtn = findViewById(R.id.searchPillBtn)
        statusDotsLayout = findViewById(R.id.statusDotsLayout)

        dot1 = findViewById(R.id.dot1)
        dot2 = findViewById(R.id.dot2)
        dot3 = findViewById(R.id.dot3)

        // POCO Drawer Category Tabs
        tabAll = findViewById(R.id.tabAll)
        tabCommunication = findViewById(R.id.tabCommunication)
        tabSocial = findViewById(R.id.tabSocial)
        tabTools = findViewById(R.id.tabTools)
        tabGames = findViewById(R.id.tabGames)

        val cols = getGridColumns()

        // Desktop Apps Grid
        desktopAppsRecyclerView.layoutManager = GridLayoutManager(this, cols)
        desktopAdapter = AppsAdapter(this, desktopApps)
        desktopAppsRecyclerView.adapter = desktopAdapter

        // Bottom Dock (Fixed 4 columns for Phone, WhatsApp/Messages, Chrome, Camera)
        dockRecyclerView.layoutManager = GridLayoutManager(this, 4)
        dockAdapter = AppsAdapter(this, dockApps)
        dockRecyclerView.adapter = dockAdapter

        // Drawer Apps Grid
        drawerAppsRecyclerView.layoutManager = GridLayoutManager(this, cols)
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
                    if (diffY < -100 && !isDrawerOpen) {
                        openAppDrawer()
                        return true
                    } else if (diffY > 100 && isDrawerOpen) {
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

        // Tap on 3-Dot Status Pill: Opens POCO Quick Menu!
        statusDotsLayout.setOnClickListener {
            showPocoQuickMenuDialog()
        }

        // Long press on 3-Dot Status Pill: Direct Secret PIN Vault prompt!
        statusDotsLayout.setOnLongClickListener {
            showSecretMasterPinDialog()
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

        // Category Tab Listeners
        tabAll.setOnClickListener { setCategory("ALL") }
        tabCommunication.setOnClickListener { setCategory("COMMUNICATION") }
        tabSocial.setOnClickListener { setCategory("SOCIAL") }
        tabTools.setOnClickListener { setCategory("TOOLS") }
        tabGames.setOnClickListener { setCategory("GAMES") }

        // Live search filter in App Drawer
        drawerSearchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                applyDrawerFilter()
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun setCategory(cat: String) {
        selectedCategory = cat
        val activeBg = R.drawable.bg_tab_active
        val inactiveBg = R.drawable.bg_tab_inactive
        val white = Color.WHITE
        val gray = Color.parseColor("#9CA3AF")

        tabAll.setBackgroundResource(if (cat == "ALL") activeBg else inactiveBg)
        tabAll.setTextColor(if (cat == "ALL") white else gray)

        tabCommunication.setBackgroundResource(if (cat == "COMMUNICATION") activeBg else inactiveBg)
        tabCommunication.setTextColor(if (cat == "COMMUNICATION") white else gray)

        tabSocial.setBackgroundResource(if (cat == "SOCIAL") activeBg else inactiveBg)
        tabSocial.setTextColor(if (cat == "SOCIAL") white else gray)

        tabTools.setBackgroundResource(if (cat == "TOOLS") activeBg else inactiveBg)
        tabTools.setTextColor(if (cat == "TOOLS") white else gray)

        tabGames.setBackgroundResource(if (cat == "GAMES") activeBg else inactiveBg)
        tabGames.setTextColor(if (cat == "GAMES") white else gray)

        applyDrawerFilter()
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

            // 1. Pick Bottom Dock Apps (4 core apps: Phone, WhatsApp/Messages, Browser, Camera)
            val dock = ArrayList<AppItem>()
            val dockKeywords = listOf(
                listOf("phone", "dialer", "call"),
                listOf("whatsapp", "message", "sms", "telegram"),
                listOf("chrome", "browser", "internet", "firefox", "opera"),
                listOf("camera", "gallery", "photo")
            )
            for (kwGroup in dockKeywords) {
                for (item in list) {
                    val lowerL = item.label.lowercase(Locale.getDefault())
                    val lowerP = item.packageName.lowercase(Locale.getDefault())
                    if (kwGroup.any { lowerL.contains(it) || lowerP.contains(it) }) {
                        if (!dock.contains(item)) {
                            dock.add(item)
                            break
                        }
                    }
                }
            }
            // Fill dock to 4 apps if needed
            for (item in list) {
                if (dock.size >= 4) break
                if (!dock.contains(item)) dock.add(item)
            }

            // 2. Pick Desktop Apps (Apps that are not in dock, for easy homescreen access)
            val desk = ArrayList<AppItem>()
            for (item in list) {
                if (!dock.contains(item)) {
                    desk.add(item)
                }
            }

            mainHandler.post {
                allApps.clear()
                allApps.addAll(list)

                dockApps.clear()
                dockApps.addAll(dock)
                dockAdapter.updateApps(dockApps)

                desktopApps.clear()
                desktopApps.addAll(desk)
                desktopAdapter.updateApps(desktopApps)

                applyDrawerFilter()
            }
        }
    }

    private fun matchesCategory(app: AppItem, category: String): Boolean {
        if (category == "ALL") return true
        val text = (app.label + " " + app.packageName).lowercase(Locale.getDefault())

        return when (category) {
            "COMMUNICATION" -> {
                val kws = listOf("phone", "dialer", "contact", "message", "sms", "whatsapp", "telegram", "signal", "gmail", "mail", "meet", "duo", "call", "truecaller", "viber")
                kws.any { text.contains(it) }
            }
            "SOCIAL" -> {
                val kws = listOf("youtube", "instagram", "facebook", "snapchat", "twitter", "tiktok", "netflix", "spotify", "music", "video", "gallery", "photo", "prime", "hotstar", "camera", "media")
                kws.any { text.contains(it) }
            }
            "TOOLS" -> {
                val kws = listOf("setting", "calculator", "clock", "calendar", "file", "drive", "doc", "sheet", "manager", "note", "recorder", "browser", "chrome", "weather", "map", "compass", "tool", "cleaner", "security")
                kws.any { text.contains(it) }
            }
            "GAMES" -> {
                val kws = listOf("game", "fire", "bgmi", "pubg", "candy", "subway", "clash", "ludo", "carrom", "race", "chess", "play.games", "arcade", "craft")
                kws.any { text.contains(it) }
            }
            else -> true
        }
    }

    private fun applyDrawerFilter() {
        val q = drawerSearchInput.text.toString().trim().lowercase(Locale.getDefault())
        filteredDrawerApps.clear()

        for (app in allApps) {
            val matchesSearch = q.isEmpty() || app.label.lowercase(Locale.getDefault()).contains(q)
            val matchesCat = matchesCategory(app, selectedCategory)
            if (matchesSearch && matchesCat) {
                filteredDrawerApps.add(app)
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
    // POCO QUICK MENU DIALOG (Triggered by tapping the 3 Dots)
    // -------------------------------------------------------------------------

    private fun showPocoQuickMenuDialog() {
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_poco_quick_menu, null)
        val dialog = AlertDialog.Builder(this, R.style.Theme_PhoneLinkHub)
            .setView(view)
            .create()

        val isConnected = PhoneLinkService.isSocketConnected
        val isShieldActive = DevicePrefs.antiUninstallShieldEnabled
        val tvStatus = view.findViewById<TextView>(R.id.menuStatusSummary)
        val connText = if (isConnected) "● Server Connected" else "○ Server Offline"
        val shieldText = if (isShieldActive) "● Shield Active" else "○ Shield Off"
        tvStatus.text = "$connText  $shieldText"
        tvStatus.setTextColor(if (isConnected) Color.parseColor("#10B981") else Color.parseColor("#F59E0B"))

        view.findViewById<View>(R.id.btnQuickMenuClose).setOnClickListener {
            dialog.dismiss()
        }

        view.findViewById<View>(R.id.btnMenuLauncherSettings).setOnClickListener {
            dialog.dismiss()
            showHomeSettingsDialog()
        }

        view.findViewById<View>(R.id.btnMenuWallpaper).setOnClickListener {
            dialog.dismiss()
            showWallpaperDialog()
        }

        view.findViewById<View>(R.id.btnMenuDefaultHome).setOnClickListener {
            dialog.dismiss()
            openDefaultHomeSettings()
        }

        view.findViewById<View>(R.id.btnMenuParentVault).setOnClickListener {
            dialog.dismiss()
            showSecretMasterPinDialog()
        }

        dialog.show()
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
            openDefaultHomeSettings()
        }

        // Toggle Grid Size (4 cols vs 5 cols)
        val tvGrid = view.findViewById<TextView>(R.id.tvGridStatus)
        val currCols = getGridColumns()
        tvGrid.text = "Current: $currCols Columns (Tap to switch to ${if (currCols == 4) 5 else 4})"
        view.findViewById<View>(R.id.btnToggleGrid).setOnClickListener {
            val newCols = if (getGridColumns() == 4) 5 else 4
            setGridColumns(newCols)
            tvGrid.text = "Current: $newCols Columns (Tap to switch to ${if (newCols == 4) 5 else 4})"
            Toast.makeText(this, "Grid set to $newCols columns", Toast.LENGTH_SHORT).show()
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

    private fun openDefaultHomeSettings() {
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

        // 6. Preset POCO Carbon (Yellow / Graphite)
        view.findViewById<Button>(R.id.btnPresetPoco).setOnClickListener {
            dialog.dismiss()
            setGradientWallpaper(Color.parseColor("#D97706"), Color.parseColor("#18181B"))
        }

        // 7. Preset MIUI Ocean (Azure / Deep Slate)
        view.findViewById<Button>(R.id.btnPresetMiui).setOnClickListener {
            dialog.dismiss()
            setGradientWallpaper(Color.parseColor("#0284C7"), Color.parseColor("#0F172A"))
        }

        // 8. System Wallpaper Settings
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
                    Toast.makeText(this@LauncherActivity, "✅ Wallpaper applied successfully", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                mainHandler.post {
                    Toast.makeText(this@LauncherActivity, "Failed to set wallpaper: ${e.message}", Toast.LENGTH_SHORT).show()
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
                    Toast.makeText(this@LauncherActivity, "✅ Custom photo wallpaper applied", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                mainHandler.post {
                    Toast.makeText(this@LauncherActivity, "Failed to apply wallpaper: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // SECRET MASTER PIN VAULT (PIN: 9211)
    // -------------------------------------------------------------------------

    private fun showSecretMasterPinDialog() {
        val input = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            transformationMethod = PasswordTransformationMethod.getInstance()
            hint = "Enter Master PIN (9211)"
            setPadding(48, 36, 48, 36)
            setTextColor(Color.WHITE)
            setHintTextColor(Color.parseColor("#9CA3AF"))
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 20, 40, 0)
            addView(input)
        }

        AlertDialog.Builder(this, R.style.Theme_PhoneLinkHub)
            .setTitle("🔒 Parent Admin Vault")
            .setMessage("Authentication required to access parental control settings.")
            .setView(container)
            .setPositiveButton("Unlock") { d, _ ->
                val entered = input.text.toString().trim()
                val masterPin = DevicePrefs.parentPin.ifBlank { "9211" }

                if (entered == masterPin || entered == "9211") {
                    d.dismiss()
                    Toast.makeText(this, "Master PIN Verified", Toast.LENGTH_SHORT).show()
                    val intent = Intent(this, MainActivity::class.java).apply {
                        putExtra("from_launcher_vault", true)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    }
                    startActivity(intent)
                } else {
                    Toast.makeText(this, "❌ Incorrect PIN", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
