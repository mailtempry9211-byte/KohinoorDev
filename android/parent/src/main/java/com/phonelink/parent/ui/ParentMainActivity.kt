package com.phonelink.parent.ui

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Typeface
import android.media.MediaScannerConnection
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.phonelink.parent.R
import com.phonelink.parent.server.ParentServerService
import com.phonelink.parent.tunnel.TunnelManager
import com.phonelink.parent.utils.NetworkUtils
import java.io.File

class ParentMainActivity : AppCompatActivity() {

    private val TAG = "ParentMainActivity"

    private lateinit var webView: WebView
    private lateinit var tvServerStatusDot: TextView
    private lateinit var tvServerAddress: TextView
    private lateinit var btnCopyAddress: Button
    private lateinit var btnTunnelSettings: Button
    private lateinit var btnModeSwitch: Button
    private lateinit var btnRefreshWeb: Button

    private lateinit var prefs: SharedPreferences
    private val PREF_MODE = "hub_mode" // "local" or "remote"
    private val PREF_REMOTE_URL = "remote_url"
    private val DEFAULT_LOCAL_URL = "http://127.0.0.1:5000"

    private val handler = Handler(Looper.getMainLooper())
    private var isLocalMode = true
    private var reloadRetryCount = 0

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_parent_main)

        prefs = getSharedPreferences("parent_hub_prefs", Context.MODE_PRIVATE)
        isLocalMode = prefs.getString(PREF_MODE, "local") == "local"

        initViews()
        requestPermissionsIfNeeded()
        setupBackHandler()

        // Ensure internal storage PhoneLink download directory exists
        ensurePhoneLinkFolder()

        // Ensure background server is started
        ParentServerService.start(this)

        setupWebView()
        updateHeaderInfo()

        // Listen for live tunnel status changes
        TunnelManager.onStatusListener = { isLive, url, detail ->
            handler.post {
                updateHeaderInfo()
            }
        }

        // Auto-start Ngrok tunnel if enabled
        if (TunnelManager.isAutoStart(this) && TunnelManager.getNgrokToken(this).isNotEmpty()) {
            TunnelManager.startTunnel(this, 5000) { _, _ ->
                handler.post {
                    updateHeaderInfo()
                }
            }
        }

        // Poll address & server status periodically
        handler.postDelayed(object : Runnable {
            override fun run() {
                updateHeaderInfo()
                handler.postDelayed(this, 3000)
            }
        }, 3000)
    }

    private fun ensurePhoneLinkFolder(): File {
        val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "PhoneLink")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    private fun initViews() {
        webView = findViewById(R.id.webView)
        tvServerStatusDot = findViewById(R.id.tvServerStatusDot)
        tvServerAddress = findViewById(R.id.tvServerAddress)
        btnCopyAddress = findViewById(R.id.btnCopyAddress)
        btnTunnelSettings = findViewById(R.id.btnTunnelSettings)
        btnModeSwitch = findViewById(R.id.btnModeSwitch)
        btnRefreshWeb = findViewById(R.id.btnRefreshWeb)

        btnCopyAddress.setOnClickListener {
            val address = tvServerAddress.text.toString()
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("PhoneLink Server Address", address)
            clipboard.setPrimaryClip(clip)

            val childDomain = address.removePrefix("https://").removePrefix("http://")
            Toast.makeText(this, "Copied! In child app, enter: $childDomain", Toast.LENGTH_LONG).show()
        }

        btnTunnelSettings.setOnClickListener {
            showTunnelSettingsDialog()
        }

        btnModeSwitch.setOnClickListener {
            showModeSwitchDialog()
        }

        tvServerAddress.setOnClickListener {
            showModeSwitchDialog()
        }

        tvServerStatusDot.setOnClickListener {
            showModeSwitchDialog()
        }

        btnRefreshWeb.setOnClickListener {
            webView.reload()
            Toast.makeText(this, "Reloading dashboard...", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateHeaderInfo() {
        val port = 5000
        val isTunnelLive = TunnelManager.isTunnelRunning()
        val tunnelUrl = TunnelManager.getActiveUrl()

        if (isTunnelLive && !tunnelUrl.isNullOrEmpty() && !tunnelUrl.startsWith("Connecting")) {
            tvServerStatusDot.text = "☁️"
            tvServerAddress.text = tunnelUrl
            btnTunnelSettings.text = "☁️ On"
            btnTunnelSettings.setTextColor(Color.parseColor("#10B981"))
        } else if (isTunnelLive && tunnelUrl != null && tunnelUrl.startsWith("Connecting")) {
            tvServerStatusDot.text = "🟡"
            tvServerAddress.text = "Connecting Tunnel..."
            btnTunnelSettings.text = "☁️ Wait"
            btnTunnelSettings.setTextColor(Color.parseColor("#F59E0B"))
        } else if (isLocalMode) {
            val ip = NetworkUtils.getLocalIpAddress(this)
            tvServerStatusDot.text = "🟢"
            tvServerAddress.text = "http://$ip:$port"
            btnTunnelSettings.text = "☁️ Tunnel"
            btnTunnelSettings.setTextColor(Color.parseColor("#06B6D4"))
        } else {
            val remoteUrl = prefs.getString(PREF_REMOTE_URL, "") ?: ""
            tvServerStatusDot.text = "🌐"
            tvServerAddress.text = remoteUrl.ifEmpty { "No remote URL set" }
            btnTunnelSettings.text = "☁️ Tunnel"
            btnTunnelSettings.setTextColor(Color.parseColor("#94A3B8"))
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val ws: WebSettings = webView.settings
        ws.javaScriptEnabled = true
        ws.domStorageEnabled = true
        ws.databaseEnabled = true
        ws.allowFileAccess = true
        ws.allowContentAccess = true
        ws.mediaPlaybackRequiresUserGesture = false
        ws.useWideViewPort = true
        ws.loadWithOverviewMode = true
        ws.cacheMode = WebSettings.LOAD_NO_CACHE

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            ws.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        webView.addJavascriptInterface(PhoneLinkJsBridge(), "AndroidPhoneLink")

        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, contentLength ->
            try {
                if (url.startsWith("blob:") || url.startsWith("data:")) {
                    return@setDownloadListener
                }
                val request = DownloadManager.Request(Uri.parse(url))
                val filename = URLUtil.guessFileName(url, contentDisposition, mimeType)
                request.setMimeType(mimeType)
                request.addRequestHeader("User-Agent", userAgent)
                request.setDescription("PhoneLink file download")
                request.setTitle(filename)
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "PhoneLink/$filename")

                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                Toast.makeText(this, "Downloading $filename to Downloads/PhoneLink...", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Log.e(TAG, "Download listener error: ${e.message}")
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(cm: ConsoleMessage?): Boolean {
                return super.onConsoleMessage(cm)
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                reloadRetryCount = 0

                val jsHook = """
                    (function() {
                        if (window.__phonelink_hook_installed) return;
                        window.__phonelink_hook_installed = true;
                        
                        const originalClick = HTMLAnchorElement.prototype.click;
                        HTMLAnchorElement.prototype.click = function() {
                            if (this.download && this.href && window.AndroidPhoneLink) {
                                try {
                                    if (this.href.startsWith('data:')) {
                                        window.AndroidPhoneLink.saveFile(this.download, this.href);
                                    } else if (this.href.startsWith('blob:')) {
                                        fetch(this.href).then(r => r.blob()).then(blob => {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                window.AndroidPhoneLink.saveFile(this.download, reader.result);
                                            };
                                            reader.readAsDataURL(blob);
                                        });
                                    }
                                } catch(e) {}
                            }
                            return originalClick.apply(this, arguments);
                        };
                    })();
                """.trimIndent()
                webView.evaluateJavascript(jsHook, null)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (isLocalMode && reloadRetryCount < 5) {
                    reloadRetryCount++
                    handler.postDelayed({
                        loadCurrentDashboard()
                    }, 1000)
                }
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                handler?.proceed()
            }
        }

        loadCurrentDashboard()
    }

    private fun loadCurrentDashboard() {
        if (isLocalMode) {
            handler.postDelayed({
                webView.loadUrl(DEFAULT_LOCAL_URL)
            }, 600)
        } else {
            val remoteUrl = prefs.getString(PREF_REMOTE_URL, "") ?: ""
            if (remoteUrl.isNotBlank()) {
                webView.loadUrl(remoteUrl)
            } else {
                Toast.makeText(this, "Please enter a valid Remote Server URL", Toast.LENGTH_SHORT).show()
                showModeSwitchDialog()
            }
        }
    }

    /**
     * Native JavaScript Bridge to save files and audio downloads into PhoneLink folder
     */
    inner class PhoneLinkJsBridge {
        @JavascriptInterface
        fun saveFile(filename: String, base64Data: String) {
            try {
                val clean = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
                val bytes = Base64.decode(clean, Base64.DEFAULT)
                val targetDir = ensurePhoneLinkFolder()
                val targetFile = File(targetDir, filename)
                targetFile.writeBytes(bytes)
                MediaScannerConnection.scanFile(this@ParentMainActivity, arrayOf(targetFile.absolutePath), null, null)

                runOnUiThread {
                    Toast.makeText(this@ParentMainActivity, "📁 Saved to PhoneLink/${targetFile.name}", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error saving file from bridge: ${e.message}")
            }
        }
    }

    /**
     * Rich Diagnostic Ngrok Tunnel Dialog with Live Terminal Log Console
     */
    private fun showTunnelSettingsDialog() {
        val currentToken = TunnelManager.getNgrokToken(this)
        val currentDomain = TunnelManager.getNgrokDomain(this)
        val currentPort = TunnelManager.getNgrokPort(this)
        val isAuto = TunnelManager.isAutoStart(this)

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(36, 24, 36, 16)
        }

        // Live Status Badge
        val statusText = TextView(this).apply {
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, 0, 0, 16)
        }
        layout.addView(statusText)

        fun refreshStatusView() {
            val running = TunnelManager.isTunnelRunning()
            val url = TunnelManager.getActiveUrl()
            val detail = TunnelManager.getDetailedStatus()

            if (running && !url.isNullOrEmpty() && !url.startsWith("Connecting")) {
                statusText.text = "🟢 Status: ACTIVE & ONLINE\n🔗 Public URL: $url"
                statusText.setTextColor(Color.parseColor("#10B981"))
            } else if (running) {
                statusText.text = "🟡 Status: CONNECTING...\nℹ️ $detail"
                statusText.setTextColor(Color.parseColor("#F59E0B"))
            } else {
                statusText.text = "⚪ Status: STOPPED\nℹ️ $detail"
                statusText.setTextColor(Color.parseColor("#94A3B8"))
            }
        }
        refreshStatusView()

        // Claimed Domain Input
        val lblDomain = TextView(this).apply {
            text = "Ngrok Claimed Domain (e.g. your-name.ngrok-free.app):"
            textSize = 12f
            setTextColor(Color.parseColor("#94A3B8"))
        }
        layout.addView(lblDomain)

        val etDomain = EditText(this).apply {
            hint = "talented-wolf-primarily.ngrok-free.app"
            setText(currentDomain)
            textSize = 13f
            setTextColor(Color.parseColor("#F1F5F9"))
            setHintTextColor(Color.parseColor("#64748B"))
        }
        layout.addView(etDomain)

        // Authtoken Input
        val lblToken = TextView(this).apply {
            text = "Ngrok Authtoken (from dashboard.ngrok.com):"
            textSize = 12f
            setTextColor(Color.parseColor("#94A3B8"))
            setPadding(0, 12, 0, 0)
        }
        layout.addView(lblToken)

        val etToken = EditText(this).apply {
            hint = "Paste your Ngrok authtoken"
            setText(currentToken)
            textSize = 13f
            setTextColor(Color.parseColor("#F1F5F9"))
            setHintTextColor(Color.parseColor("#64748B"))
        }
        layout.addView(etToken)

        // Target Local Port Input
        val lblPort = TextView(this).apply {
            text = "Target Local Port (Phone Server Port, default: 5000):"
            textSize = 12f
            setTextColor(Color.parseColor("#94A3B8"))
            setPadding(0, 12, 0, 0)
        }
        layout.addView(lblPort)

        val etPort = EditText(this).apply {
            hint = "5000"
            setText(currentPort.toString())
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            textSize = 13f
            setTextColor(Color.parseColor("#F1F5F9"))
            setHintTextColor(Color.parseColor("#64748B"))
        }
        layout.addView(etPort)

        // Auto-start Checkbox
        val cbAutoStart = CheckBox(this).apply {
            text = "Auto-start tunnel when Parent Hub opens"
            isChecked = isAuto
            setTextColor(Color.parseColor("#E2E8F0"))
            setPadding(0, 8, 0, 8)
        }
        layout.addView(cbAutoStart)

        // Live Log Terminal Header
        val logHeaderLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 16, 0, 6)
        }

        val lblLog = TextView(this).apply {
            text = "Live Ngrok Engine Logs:"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#38BDF8"))
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        logHeaderLayout.addView(lblLog)

        val btnCopyLogs = Button(this).apply {
            text = "📋 Copy Logs"
            textSize = 10f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#334155"))
            setPadding(16, 4, 16, 4)
            setOnClickListener {
                val logs = TunnelManager.getRecentLogs()
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("Ngrok Logs", logs))
                Toast.makeText(this@ParentMainActivity, "Copied full logs to clipboard!", Toast.LENGTH_SHORT).show()
            }
        }
        logHeaderLayout.addView(btnCopyLogs)

        val btnClearLogs = Button(this).apply {
            text = "Clear"
            textSize = 10f
            setTextColor(Color.parseColor("#94A3B8"))
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(12, 4, 12, 4)
            setOnClickListener {
                TunnelManager.clearLogs()
            }
        }
        logHeaderLayout.addView(btnClearLogs)
        layout.addView(logHeaderLayout)

        // Terminal Log Console View
        val logScrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                (resources.displayMetrics.density * 160).toInt()
            )
            setBackgroundColor(Color.parseColor("#090D16"))
            setPadding(12, 12, 12, 12)
        }

        val tvLogConsole = TextView(this).apply {
            text = TunnelManager.getRecentLogs().ifEmpty { "Waiting for engine events..." }
            textSize = 10.5f
            typeface = Typeface.MONOSPACE
            setTextColor(Color.parseColor("#4ADE80"))
            setLineSpacing(4f, 1f)
        }
        logScrollView.addView(tvLogConsole)
        layout.addView(logScrollView)

        val mainScrollView = ScrollView(this).apply {
            addView(layout)
        }

        // Live Log Stream Listener
        val logCallback: (String) -> Unit = { line ->
            handler.post {
                tvLogConsole.append("\n$line")
                logScrollView.post {
                    logScrollView.fullScroll(View.FOCUS_DOWN)
                }
                refreshStatusView()
            }
        }
        TunnelManager.onLogListener = logCallback

        val dialog = AlertDialog.Builder(this)
            .setTitle("☁️ Embedded Ngrok Port Forwarding")
            .setView(mainScrollView)
            .setPositiveButton(if (TunnelManager.isTunnelRunning()) "Restart Tunnel" else "Start Tunnel") { _, _ ->
                val domain = etDomain.text.toString().trim()
                val token = etToken.text.toString().trim()
                val targetPort = etPort.text.toString().trim().toIntOrNull() ?: 5000
                TunnelManager.saveConfig(this, token, domain, cbAutoStart.isChecked, targetPort)

                Toast.makeText(this, "Starting Ngrok tunnel on port $targetPort...", Toast.LENGTH_SHORT).show()
                TunnelManager.startTunnel(this, targetPort) { success, liveUrl ->
                    handler.post {
                        updateHeaderInfo()
                        refreshStatusView()
                        if (success && !liveUrl.isNullOrEmpty() && !liveUrl.startsWith("Connecting")) {
                            Toast.makeText(this, "Ngrok Live! In child app connect to: ${liveUrl.removePrefix("https://").removePrefix("http://")}", Toast.LENGTH_LONG).show()
                        } else if (!success) {
                            Toast.makeText(this, "Tunnel failed: $liveUrl", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
            .setNeutralButton("Stop Tunnel") { _, _ ->
                val domain = etDomain.text.toString().trim()
                val token = etToken.text.toString().trim()
                val targetPort = etPort.text.toString().trim().toIntOrNull() ?: 5000
                TunnelManager.saveConfig(this, token, domain, cbAutoStart.isChecked, targetPort)

                TunnelManager.stopTunnel(this) { _, _ ->
                    handler.post {
                        updateHeaderInfo()
                        refreshStatusView()
                        Toast.makeText(this, "Ngrok Tunnel Stopped", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Close", null)
            .setOnDismissListener {
                TunnelManager.onLogListener = null
            }
            .create()

        dialog.show()
    }

    private fun showModeSwitchDialog() {
        val currentRemoteUrl = prefs.getString(PREF_REMOTE_URL, "") ?: ""

        val input = EditText(this).apply {
            hint = "e.g. https://my-hub.onrender.com or http://192.168.1.50:5000"
            setText(currentRemoteUrl)
            setPadding(40, 30, 40, 30)
        }

        val title = if (isLocalMode) "Switch to Remote Server (Cloud / PC)" else "Remote Server Settings"

        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage("Enter the URL of your hosted Cloud Server, Cloudflare Tunnel, or PC server:")
            .setView(input)
            .setPositiveButton("Connect Remote") { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.startsWith("http://") || newUrl.startsWith("https://")) {
                    isLocalMode = false
                    prefs.edit()
                        .putString(PREF_MODE, "remote")
                        .putString(PREF_REMOTE_URL, newUrl)
                        .apply()
                    updateHeaderInfo()
                    webView.loadUrl(newUrl)
                } else {
                    Toast.makeText(this, "URL must start with http:// or https://", Toast.LENGTH_SHORT).show()
                }
            }
            .setNeutralButton("Use Local Phone Server") { _, _ ->
                isLocalMode = true
                prefs.edit().putString(PREF_MODE, "local").apply()
                updateHeaderInfo()
                loadCurrentDashboard()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun setupBackHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true)
                }
            }
        })
    }

    private fun requestPermissionsIfNeeded() {
        val permissions = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
        }

        if (permissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 101)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
    }
}
