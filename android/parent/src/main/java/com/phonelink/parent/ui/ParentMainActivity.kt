package com.phonelink.parent.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.phonelink.parent.R
import com.phonelink.parent.server.ParentServerService
import com.phonelink.parent.utils.NetworkUtils

class ParentMainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var tvServerStatus: TextView
    private lateinit var tvServerAddress: TextView
    private lateinit var btnCopyAddress: Button
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

        // Ensure background server is started
        ParentServerService.start(this)

        setupWebView()
        updateHeaderInfo()

        // Poll address & server status periodically
        handler.postDelayed(object : Runnable {
            override fun run() {
                updateHeaderInfo()
                handler.postDelayed(this, 3000)
            }
        }, 3000)
    }

    private fun initViews() {
        webView = findViewById(R.id.webView)
        tvServerStatus = findViewById(R.id.tvServerStatus)
        tvServerAddress = findViewById(R.id.tvServerAddress)
        btnCopyAddress = findViewById(R.id.btnCopyAddress)
        btnModeSwitch = findViewById(R.id.btnModeSwitch)
        btnRefreshWeb = findViewById(R.id.btnRefreshWeb)

        btnCopyAddress.setOnClickListener {
            val address = tvServerAddress.text.toString()
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("PhoneLink Server Address", address)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "Copied! In child app, connect to: $address", Toast.LENGTH_LONG).show()
        }

        btnModeSwitch.setOnClickListener {
            showModeSwitchDialog()
        }

        btnRefreshWeb.setOnClickListener {
            webView.reload()
            Toast.makeText(this, "Reloading dashboard...", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateHeaderInfo() {
        val ip = NetworkUtils.getLocalIpAddress(this)
        val port = 5000
        val isWifi = NetworkUtils.isWifiConnected(this)
        val connectedDevices = ParentServerService.instance?.getServer()?.getConnectedDeviceCount() ?: 0

        if (isLocalMode) {
            val netType = if (isWifi) "Wi-Fi" else "Hotspot/Mobile"
            tvServerStatus.text = "🟢 Server Active • $connectedDevices Device(s) Live • $netType"
            tvServerAddress.text = "http://$ip:$port"
            btnModeSwitch.text = "Remote URL"
        } else {
            val remoteUrl = prefs.getString(PREF_REMOTE_URL, "") ?: ""
            tvServerStatus.text = "🌐 Connected to Cloud/Remote Hub"
            tvServerAddress.text = remoteUrl.ifEmpty { "No remote URL set" }
            btnModeSwitch.text = "Local Hub"
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
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                reloadRetryCount = 0
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
                handler?.proceed() // Allow self-signed or internal IP certs if needed
            }
        }

        loadCurrentDashboard()
    }

    private fun loadCurrentDashboard() {
        if (isLocalMode) {
            // Give server 500ms to initialize on first launch if needed
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
                    // Minimize to background instead of stopping server
                    moveTaskToBack(true)
                }
            }
        })
    }

    private fun requestPermissionsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    101
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
    }
}
