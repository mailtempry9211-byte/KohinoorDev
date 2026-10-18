package com.phonelink.hub.lock

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.GridLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.phonelink.hub.data.DevicePrefs
import java.util.concurrent.ConcurrentHashMap

/**
 * Overlay-based App Blocker & Anti-Tamper Lock Screen (SYSTEM_ALERT_WINDOW).
 * Provides an impassable visual lock screen requiring Parent PIN to unlock or redirecting to Home.
 */
object AppLockOverlayManager {

    private const val TAG = "AppLockOverlay"

    enum class OverlayMode {
        APP_LOCK,
        ANTI_TAMPER
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var currentMode: OverlayMode? = null
    private var currentPackage: String? = null

    // Package currently unlocked in active session
    @Volatile
    private var currentlyActiveUnlockedPkg: String? = null

    // Cache of packages temporarily unlocked by parents with timestamp until which they are unlocked
    private val temporaryUnlockedPackages = ConcurrentHashMap<String, Long>()
    private var antiTamperUnlockedUntil = 0L

    // Last known foreground package
    @Volatile
    private var lastForegroundPackage: String = ""

    fun canDrawOverlays(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }

    fun isTemporarilyUnlocked(packageName: String): Boolean {
        if (currentlyActiveUnlockedPkg == packageName) {
            return true
        }
        val expiry = temporaryUnlockedPackages[packageName] ?: return false
        if (System.currentTimeMillis() < expiry) {
            return true
        }
        temporaryUnlockedPackages.remove(packageName)
        return false
    }

    fun isAntiTamperTemporarilyUnlocked(): Boolean {
        return System.currentTimeMillis() < antiTamperUnlockedUntil
    }

    fun isTransientPackage(pkg: String): Boolean {
        if (pkg.isBlank()) return true
        val lower = pkg.lowercase()
        return lower == "android" ||
                lower == "com.phonelink.hub" ||
                lower.contains("inputmethod") ||
                lower.contains("keyboard") ||
                lower.contains("systemui") ||
                lower.contains("permissioncontroller")
    }

    fun onForegroundPackageChanged(context: Context, newPackage: String) {
        if (newPackage.isBlank() || isTransientPackage(newPackage)) {
            return
        }

        val previous = lastForegroundPackage
        if (newPackage == previous) {
            return
        }
        lastForegroundPackage = newPackage

        // Did user exit the currently active unlocked app?
        val active = currentlyActiveUnlockedPkg
        if (active != null && newPackage != active) {
            val timeout = DevicePrefs.overlayRelockTimeout
            if (timeout == 0) {
                // Immediately upon exit: re-lock right now!
                currentlyActiveUnlockedPkg = null
                temporaryUnlockedPackages.remove(active)
                Log.i(TAG, "User exited unlocked app '$active' -> Re-locking immediately.")
            } else if (timeout > 0) {
                // Timer starts from the moment they exit the app
                currentlyActiveUnlockedPkg = null
                temporaryUnlockedPackages[active] = System.currentTimeMillis() + (timeout * 1000L)
                Log.i(TAG, "User exited unlocked app '$active' -> Re-locking in ${timeout}s.")
            } else {
                // timeout < 0: keeps unlocked until screen off
                currentlyActiveUnlockedPkg = null
            }
        }

        // Now check if newPackage is locked and needs overlay
        if (DevicePrefs.overlayAppLockEnabled && DevicePrefs.overlayLockedPackages.contains(newPackage)) {
            if (!isTemporarilyUnlocked(newPackage)) {
                showOverlay(context, OverlayMode.APP_LOCK, newPackage)
            }
        }
    }

    fun onScreenOff() {
        Log.i(TAG, "Screen off received -> Resetting active unlocks")
        currentlyActiveUnlockedPkg = null
        val timeout = DevicePrefs.overlayRelockTimeout
        if (timeout <= 0) {
            temporaryUnlockedPackages.clear()
        }
        antiTamperUnlockedUntil = 0L
        dismissOverlay()
    }

    fun clearUnlockedCache() {
        currentlyActiveUnlockedPkg = null
        temporaryUnlockedPackages.clear()
        antiTamperUnlockedUntil = 0L
    }

    /**
     * Checks whether an overlay should be shown for the current foreground package.
     */
    fun checkAndShowOverlay(context: Context, packageName: String) {
        if (!canDrawOverlays(context)) return

        // 1. Check Anti-Tamper Shield (Settings / App Info / PackageInstaller)
        if (DevicePrefs.overlayAntiUninstallEnabled && !isAntiTamperTemporarilyUnlocked()) {
            val lower = packageName.lowercase()
            if (lower.contains("settings") || lower.contains("securitycenter") || lower.contains("packageinstaller")) {
                // If on Settings or App Info, check if tamper is detected
                // When triggered by accessibility or usage stats
                // Caller invokes showOverlay with MODE_ANTI_TAMPER
            }
        }

        // 2. Check Overlay App Lock on blocked/locked packages
        if (DevicePrefs.overlayAppLockEnabled) {
            val locked = DevicePrefs.overlayLockedPackages
            if (locked.contains(packageName) && !isTemporarilyUnlocked(packageName)) {
                showOverlay(context, OverlayMode.APP_LOCK, packageName)
            }
        }
    }

    /**
     * Shows the full-screen impassable lock overlay.
     */
    fun showOverlay(context: Context, mode: OverlayMode, targetPackage: String? = null) {
        if (!canDrawOverlays(context)) return

        mainHandler.post {
            try {
                if (overlayView != null) {
                    if (currentMode == mode && currentPackage == targetPackage) {
                        return@post // Already displaying this exact overlay
                    }
                    dismissOverlay()
                }

                val wm = context.applicationContext.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
                    ?: return@post
                windowManager = wm

                val view = createOverlayView(context.applicationContext, mode, targetPackage)
                val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }

                val params = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                            WindowManager.LayoutParams.FLAG_FULLSCREEN,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.CENTER
                }

                wm.addView(view, params)
                overlayView = view
                currentMode = mode
                currentPackage = targetPackage
                Log.i(TAG, "Displayed overlay lock screen for mode=$mode pkg=$targetPackage")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to show overlay: ${e.message}", e)
            }
        }
    }

    /**
     * Dismisses the currently visible overlay lock screen.
     */
    fun dismissOverlay() {
        mainHandler.post {
            try {
                overlayView?.let { v ->
                    windowManager?.removeViewImmediate(v)
                    Log.i(TAG, "Dismissed overlay lock screen")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error removing overlay: ${e.message}")
            } finally {
                overlayView = null
                currentMode = null
                currentPackage = null
            }
        }
    }

    private fun createOverlayView(context: Context, mode: OverlayMode, targetPackage: String?): View {
        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#F50B0F19")) // 96% opacity dark AMOLED
            isClickable = true
            isFocusable = true
            isFocusableInTouchMode = true
            setOnKeyListener { _, keyCode, event ->
                if (keyCode == android.view.KeyEvent.KEYCODE_BACK && event.action == android.view.KeyEvent.ACTION_UP) {
                    goToHome(context)
                    true
                } else {
                    false
                }
            }
        }

        // Card Container
        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val cardBg = GradientDrawable().apply {
                setColor(Color.parseColor("#111827"))
                cornerRadius = dpToPx(context, 20f)
                setStroke(dpToPx(context, 1.5f).toInt(), Color.parseColor("#1E293B"))
            }
            background = cardBg
            setPadding(
                dpToPx(context, 24f).toInt(),
                dpToPx(context, 24f).toInt(),
                dpToPx(context, 24f).toInt(),
                dpToPx(context, 24f).toInt()
            )
        }

        val cardParams = LinearLayout.LayoutParams(
            (context.resources.displayMetrics.widthPixels * 0.88f).toInt(),
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        card.layoutParams = cardParams

        // App Icon
        val iconView = ImageView(context).apply {
            layoutParams = LinearLayout.LayoutParams(dpToPx(context, 64f).toInt(), dpToPx(context, 64f).toInt()).apply {
                bottomMargin = dpToPx(context, 12f).toInt()
            }
        }

        var appLabel = "Application"
        if (targetPackage != null) {
            try {
                val pm = context.packageManager
                val appInfo = pm.getApplicationInfo(targetPackage, 0)
                iconView.setImageDrawable(pm.getApplicationIcon(appInfo))
                appLabel = pm.getApplicationLabel(appInfo).toString()
            } catch (_: Exception) {
                iconView.setImageResource(android.R.drawable.ic_lock_lock)
            }
        } else {
            iconView.setImageResource(android.R.drawable.ic_lock_lock)
        }

        // Title
        val titleView = TextView(context).apply {
            textSize = 20f
            setTextColor(Color.WHITE)
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            text = if (mode == OverlayMode.APP_LOCK) {
                "🔒 $appLabel Locked"
            } else {
                "🛡️ PhoneLink Hub Protected"
            }
        }

        // Subtitle / Reason
        val subView = TextView(context).apply {
            textSize = 13f
            setTextColor(Color.parseColor("#94A3B8"))
            gravity = Gravity.CENTER
            setPadding(0, dpToPx(context, 6f).toInt(), 0, dpToPx(context, 16f).toInt())
            text = if (mode == OverlayMode.APP_LOCK) {
                "This app is restricted by Parental Controls.\nEnter Parent PIN to unlock or return to home."
            } else {
                "Settings for PhoneLink Hub are locked against tampering and uninstallation. Enter Parent PIN to proceed."
            }
        }

        // PIN Display Dots
        val pinDots = TextView(context).apply {
            textSize = 28f
            setTextColor(Color.parseColor("#38BDF8")) // Cyan-400
            gravity = Gravity.CENTER
            text = "○ ○ ○ ○"
            setPadding(0, 0, 0, dpToPx(context, 16f).toInt())
        }

        val enteredPin = StringBuilder()

        fun updateDots() {
            val len = enteredPin.length
            val sb = StringBuilder()
            for (i in 0 until 4) {
                if (i < len) sb.append("● ") else sb.append("○ ")
            }
            pinDots.text = sb.toString().trim()
        }

        // Numeric Keypad
        val keypad = GridLayout(context).apply {
            columnCount = 3
            rowCount = 4
            alignmentMode = GridLayout.ALIGN_BOUNDS
            useDefaultMargins = false
        }

        val btnWidth = (cardParams.width - dpToPx(context, 48f).toInt()) / 3 - dpToPx(context, 8f).toInt()
        val btnHeight = dpToPx(context, 48f).toInt()

        val keys = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK")
        for (k in keys) {
            val btn = Button(context).apply {
                text = k
                textSize = 16f
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                setTextColor(Color.WHITE)
                val btnBg = GradientDrawable().apply {
                    setColor(if (k == "OK") Color.parseColor("#2563EB") else if (k == "C") Color.parseColor("#334155") else Color.parseColor("#1E293B"))
                    cornerRadius = dpToPx(context, 10f)
                }
                background = btnBg
                val glParams = GridLayout.LayoutParams().apply {
                    width = btnWidth
                    height = btnHeight
                    setMargins(dpToPx(context, 4f).toInt(), dpToPx(context, 4f).toInt(), dpToPx(context, 4f).toInt(), dpToPx(context, 4f).toInt())
                }
                layoutParams = glParams
            }

            btn.setOnClickListener {
                when (k) {
                    "C" -> {
                        enteredPin.clear()
                        updateDots()
                    }
                    "OK" -> {
                        verifyPinAndUnlock(context, enteredPin.toString(), mode, targetPackage, pinDots)
                    }
                    else -> {
                        if (enteredPin.length < 6) {
                            enteredPin.append(k)
                            updateDots()
                            if (enteredPin.length >= 4) {
                                // Auto-check if matches standard 4-digit PIN
                                if (DevicePrefs.verifyAppLockPin(enteredPin.toString())) {
                                    verifyPinAndUnlock(context, enteredPin.toString(), mode, targetPackage, pinDots)
                                }
                            }
                        }
                    }
                }
            }
            keypad.addView(btn)
        }

        // "Back to Home" Button
        val homeBtn = Button(context).apply {
            text = "← Return to Home Screen"
            textSize = 14f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#E2E8F0"))
            val bg = GradientDrawable().apply {
                setColor(Color.TRANSPARENT)
                cornerRadius = dpToPx(context, 10f)
                setStroke(dpToPx(context, 1f).toInt(), Color.parseColor("#475569"))
            }
            background = bg
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(context, 44f).toInt()
            ).apply {
                topMargin = dpToPx(context, 16f).toInt()
            }
            setOnClickListener {
                goToHome(context)
            }
        }

        card.addView(iconView)
        card.addView(titleView)
        card.addView(subView)
        card.addView(pinDots)
        card.addView(keypad)
        card.addView(homeBtn)

        root.addView(card)
        return root
    }

    private fun verifyPinAndUnlock(context: Context, pin: String, mode: OverlayMode, targetPackage: String?, pinDots: TextView) {
        if (DevicePrefs.verifyAppLockPin(pin)) {
            Log.i(TAG, "PIN verified successfully for mode=$mode pkg=$targetPackage")
            if (mode == OverlayMode.APP_LOCK && targetPackage != null) {
                currentlyActiveUnlockedPkg = targetPackage
                val timeout = DevicePrefs.overlayRelockTimeout
                when {
                    timeout == 0 -> {
                        // Immediately upon exit: Valid ONLY during active session
                        temporaryUnlockedPackages.remove(targetPackage)
                    }
                    timeout < 0 -> {
                        // Until screen turns off
                        temporaryUnlockedPackages[targetPackage] = Long.MAX_VALUE
                    }
                    else -> {
                        // After specified seconds (e.g. 60s, 300s, 900s)
                        temporaryUnlockedPackages[targetPackage] = System.currentTimeMillis() + (timeout * 1000L)
                    }
                }
            } else if (mode == OverlayMode.ANTI_TAMPER) {
                // Allow tampering/settings access for 5 minutes
                antiTamperUnlockedUntil = System.currentTimeMillis() + 5 * 60 * 1000L
            }
            dismissOverlay()
        } else {
            pinDots.text = "Incorrect PIN"
            pinDots.setTextColor(Color.parseColor("#EF4444")) // Red-500
            mainHandler.postDelayed({
                pinDots.text = "○ ○ ○ ○"
                pinDots.setTextColor(Color.parseColor("#38BDF8"))
            }, 1200L)
        }
    }

    private fun goToHome(context: Context) {
        try {
            val intent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.w(TAG, "Error redirecting to home: ${e.message}")
        }
        dismissOverlay()
    }

    private fun dpToPx(context: Context, dp: Float): Float {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, context.resources.displayMetrics)
    }
}

