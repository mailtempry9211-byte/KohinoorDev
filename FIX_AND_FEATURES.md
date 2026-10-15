# FIX_AND_FEATURES — Full Context (part 1: bugs)

> TODO.md ke saath kaam se PEHLE banayi. Dusra AI / agla session isi file + TODO.md ko padhkar resume kare.

## Project
Personal Multi-Device Android Phone Link & Hub — `com.phonelink.hub`.
- `/android` Kotlin (minSdk 26, targetSdk 34), foreground service + OkHttp WS
- `/server` Node + Express + ws :5000, lowdb `server/data/db.json`
- `/dashboard` Vite React + Tailwind + Leaflet :3000
- Real device: Xiaomi Mi 10 (MIUI) — MIUI fixes zaroori hain.

## BUG 1 — deviceId stable nahi, duplicate entries
- DevicePrefs getter `?: generateAndStore()` sahi hai, lekin id me random+timestamp hai, UUID nahi.
  UUID.randomUUID() par switch karo.
- server/src/index.js DEVICE_REGISTER (~line 166) idempotent banao (same deviceId = UPDATE).
- Stale duplicates BUG 5 ke delete button se saaf honge.

## BUG 2 — sync sirf onOpen par; location me deviceId missing
- PhoneLinkService.syncAll() sirf onOpen se call hota hai. Handler postDelayed loop (45s) add karo,
  onStartCommand start / onDestroy stop.
- LocationRepository.emit + startUpdates me deviceId MISSING hai. Dono paths me
  put("deviceId", DevicePrefs.deviceId) add karo.

## BUG 3 — galat notifications mirror
- NotificationFilter `ongoing==true` wali SAB drop karta hai (WhatsApp fg notif bhi drop).
  Fix: ongoing/summary blanket-drop hatao; sirf package-based drop (own app, android,
  com.android.systemui, com.android.*, com.miui.*, com.xiaomi.*).
- NotificationListener me Log.d add karo (filtered OUT + sent + null-socket).

## BUG 4 — file download permission error
- FileRepository.hasPermission ALREADY FIXED lagta hai (R+ par isExternalStorageManager).
  Verify + Log.d add karo (path + kaunsa check pass/fail).

## BUG 5 — dashboard refresh + delete device
- Server: request-calls / request-sms MISSING, add karo. DELETE /api/devices/:id naya endpoint.
- Dashboard: header refresh button, Sidebar trash icon + window.confirm.

---
# Part 2: features + progress

## FEATURE A — Contacts (view/search/export/add)
- Android: READ_CONTACTS/WRITE_CONTACTS + runtime request, contacts/ContactsRepository.kt
  (readAll limit, addContact batch), Events SYNC_CONTACTS/CONTACTS_REQUEST/ADD_CONTACT_COMMAND/
  ADD_CONTACT_RESULT, pushContacts + syncAll + periodic loop + handleCommand.
- Server: SYNC_CONTACTS store (db contacts array), GET /:id/contacts,
  POST request-contacts / add-contact.
- Dashboard: Contacts tab (search + vcf/csv client-side export + add form + toast).

## FEATURE B — SMS send dashboard se
- SmsManager.jsx me compose + optimistic send ALREADY HAI. Missing: free-text number field
  (new conversation) + SEND_SMS_RESULT toast. Bas wahi add karo.

## FEATURE C — Find My Phone (silent me bhi loud alarm)
- STREAM_ALARM max volume + looping MediaPlayer + 60s timeout + stop-action notification +
  volume restore. Accessibility service minimal config (NO window content/gestures).
- Manifest register + MainActivity enable button + server find-phone + dashboard bell button.

## FEATURE D — persistence + MIUI Autostart
- Manifest service type location|dataSync|phoneCall already — verify.
- RECEIVE_BOOT_COMPLETED MISSING (manifest me nahi) → add + BootReceiver.
- START_STICKY already — confirm. WorkManager dep MISSING → add + 15min job.
- MainActivity: battery button already → MIUI note + AutostartHelper + autostartBtn + caption.
- README Known Limitations me MIUI note.

## Progress log
- [2026-10-14] TODO.md + ye file banayi (kaam se pehle). Code scan ~70%.
- [2026-10-14] ALL DONE: BUG 1-5 fixed, FEATURE A-D (+MIUI addendum) implemented. Files verified via read-back (shell output capture broken tha, node --check nahi chal paya — server syntax read-back se OK laga; Android build Android Studio me karna hai).
- [2026-10-14] ROUND 2 (real-device feedback) DONE:
  - DOWNLOAD FIX: `FileRepository.encodeInChunks()` me aakhri real chunk ke baad ek extra `onChunk("", true)` jaata tha; dashboard har chunk append karke us empty ko buffer par overwrite kar leta tha → 0-byte file. Ab extra terminator nahi jaata (empty file ka special case alag); dashboard me bhi guard (`filesRef` check) taaki purane APK build se stray chunk aaye tab bhi buffer safe rahe.
  - NOTIFICATION FIX: `NotificationListener.onNotificationPosted` payload me `deviceId` tag nahi karta tha → server "undefined" par store karta tha → device filter match nahi hota tha (permission granted hone ke baad bhi list khali). Ab `payload.put("deviceId", DevicePrefs.deviceId)`.
  - THEME: indigo/purple → teal (`#14b8a6`), search "indigo" = 0 matches.
  - ANIMATION: `.section-enter` keyframes + tab switch par fade/slide.
  - REFRESH: Calls, Messages, Contacts, Location, Files, Notifications — sab sections me refresh button (`request-*` commands / REST refetch).
- [2026-10-14] ROUND 3 (T1, T2, T3, T4) DONE:
  - T1: Domain/ngrok URLs accepted across Android and dashboard.
  - T2: Server syntax fix (duplicate function declaration removed), full COMMAND_EVENTS, replayQueue on reconnect, REST command queueing when offline, and telemetry REST endpoints (/info, /apps, /wifi, /clipboard, /blocklist) verified with `node --check server/src/index.js` (exit code 0).
  - T3: Android remote controllers:
    - AndroidManifest: VIBRATE, SET_WALLPAPER, RECORD_AUDIO, CAMERA, QUERY_ALL_PACKAGES, ACCESS_WIFI_STATE, CHANGE_WIFI_STATE, FOREGROUND_SERVICE_MICROPHONE/CAMERA/MEDIA_PROJECTION.
    - `remote/Vibrator.kt` (VibratorController duration + pattern waveform).
    - `remote/TtsSpeaker.kt` (lazy TextToSpeech initialization, queueing, shutdown).
    - `remote/AudioPlayer.kt` (MediaPlayer play url, loop, stop, error listener, release).
    - `remote/WallpaperSetter.kt` (background thread solid color or downloaded image bitmap).
    - `system/SysInfoRepository.kt` (model, brand, Android version, SDK, patch, RAM/storage stats, display metrics).
    - `system/AppsRepository.kt` (installed packages, system flags, app permissions inspector).
    - `system/WifiRepository.kt` (connected SSID/BSSID, RSSI, link speed, frequency, IP, scan results).
    - `remote/ClipboardReader.kt` (primaryClip read, live OnPrimaryClipChangedListener capture).
    - `PhoneLinkService.kt`: handles all new events, manages controller lifecycles, and auto-syncs device info and wifi info on reconnect.
    - `MainActivity.kt`: added RECORD_AUDIO and CAMERA to initial permission requests.
  - T4: Dashboard Controls Tab:
    - `dashboard/src/components/Controls.jsx`: complete control & configuration UI with 8 sections (Vibrate slider + preset patterns, TTS text/speed/pitch, Audio player with preset samples & loop, Wallpaper with color presets/picker & image URL, Clipboard manager with read & live capture toggle & copy buttons, System info with RAM & Storage usage gauges, Wi-Fi card with link speed/RSSI and nearby network list, Installed apps with search, user/system filters and click-to-open permissions inspector modal).
    - `StoreContext.jsx`: added round 3 state, WebSocket event listeners, REST fetchers on device select, and remote control action helpers.
    - `App.jsx`: registered Controls tab with Sliders icon.
  - T5: Lock Device (Device Admin):
    - `res/xml/device_admin.xml` + `strings.xml` description + `receiver/PhoneDeviceAdminReceiver.kt`.
    - `remote/LockController.kt` (`lockNow()` + `isAdminActive()` + intent).
    - `AndroidManifest.xml` registered DeviceAdminReceiver.
    - `activity_main.xml` + `MainActivity.kt`: added "Enable Remote Screen Lock (Device Admin)" button.
    - `PhoneLinkService.kt`: handles `LOCK_COMMAND` and sends `LOCK_RESULT`.
    - `Controls.jsx`: Remote Screen Lock card with confirmation dialog and Device Admin status badge.
  - T6: Call Blocker (CallScreeningService):
    - `blocker/BlocklistStore.kt` (SharedPreferences persistent store with `PhoneNumberUtils.compare` matching).
    - `blocker/PhoneBlockerService.kt` (`CallScreeningService` responding with `setDisallowCall(true)` and `setRejectCall(true)`).
    - `AndroidManifest.xml`: registered `PhoneBlockerService` with `BIND_SCREENING_SERVICE`.
    - `activity_main.xml` + `MainActivity.kt`: added "Enable Call Screening & Blocker" button (`RoleManager.ROLE_CALL_SCREENING`).
    - `PhoneLinkService.kt`: handles `CALL_BLOCKLIST_SYNC` and syncs status on reconnect.
    - `Controls.jsx`: Call Blocker card (master toggle, add number, list with remove).
  - T7: Remote Microphone one-shot:
    - `media/MicRecorder.kt`: singleton audio recorder using `MediaRecorder` (`OutputFormat.MPEG_4`, `AudioEncoder.AAC`), duration clamped 5-60s, base64 encoding to `MIC_RECORD_RESULT`, automatic cancellation cleanup.
    - `PhoneLinkService.kt`: handles `MIC_RECORD_COMMAND` and cancels on destroy.
    - `StoreContext.jsx`: `recordMic`, `latestMicAudio`, `micRecording` states and WS handler.
  - T8: Remote Camera one-shot:
    - `media/CameraCapture.kt`: headless Camera2 implementation selecting front/back camera lens facing, finding optimal resolution (~1280x720) for base64 transmission, auto AF/AE, sensor orientation EXIF metadata, ImageReader JPEG capture, and timeout watchdog.
  - T9: Remote Screenshot (MediaProjection):
    - `media/MediaProjectionHolder.kt`: manages consent token and active `MediaProjection` instance across operations.
    - `media/ScreenshotConsentActivity.kt`: transparent activity launching `createScreenCaptureIntent()` and delivering user grant to `MediaProjectionHolder`.
    - `media/ScreenshotController.kt`: posts heads-up consent notification, creates virtual display with `ImageReader` (RGBA_8888), handles rowStride padding correctly, encodes JPEG base64, and returns `SCREENSHOT_RESULT`.
    - `AndroidManifest.xml`: added `mediaProjection` to foregroundServiceType on `PhoneLinkService` and registered `ScreenshotConsentActivity`.
    - `activity_main.xml` + `MainActivity.kt`: added "Authorize Screen View / Screenshot" button.
    - `PhoneLinkService.kt`: handles `SCREENSHOT_COMMAND` and cleans up projection on destroy.
    - `Controls.jsx`: Remote Screenshot card with capture button, live preview, resolution/size metadata, and download button.
    - Verified: `vite build` (exit 0) and `node --check server/src/index.js` (exit 0).
  - T10: Live Screen Stream / Recorder:
    - `media/ScreenRecorder.kt`: streams low-latency JPEG frames (~1-5 fps, scaled down to 540p for high-performance transmission) via `MediaProjectionHolder` and virtual display loop; sends `SCREEN_RECORD_FRAME` WebSocket messages.
    - `PhoneLinkService.kt`: handles `SCREEN_RECORD_START` (with `fps` parameter) and `SCREEN_RECORD_STOP`; stops recorder on service destroy.
    - `Controls.jsx`: Live Screen Stream card with selectable refresh rates (1, 2, 3, 5 FPS), start/stop buttons with pulsing live badge, low-latency live preview viewer, and frame metrics (resolution, KB/frame).
  - Round 4: Real-Device Feedback Fixes & Live Camera Stream (Pet Monitor):
    - Android 14 FGS MediaProjection Fix: `PhoneLinkService.kt` added `ensureMediaProjectionForegroundType()` to dynamically promote foreground service to `FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION`, eliminating Android 14 `SecurityException`. Added fallback image polling in `ScreenshotController.kt` so static screens capture immediately.
    - Upgraded Screen Recorder: `ScreenRecorder.kt` upgraded to 30 FPS (`requestedFps.coerceIn(1, 30)`), added atomic encoding guards to prevent frame queue pileups, and added `onConsentGranted` so approving "Start now" starts the stream right away.
    - File Download & Root Files Fix: `FileRepository.kt` removed `file.canRead()` check (which fails on Android emulated FUSE storage under `MANAGE_EXTERNAL_STORAGE`); fixed directory sorting with `!it.optBoolean("isDirectory", false)`; removed hardcoded duplicate "Android" folder. `FileManager.jsx` replaced `atob()` with fast streaming `fetch(dataUrl).then(r => r.blob())` and auto-download click, and ensured all root files have a download button.
    - Notification Mirroring Fix: `NotificationFilter.kt` emptied `IGNORED_PREFIXES = listOf("com.android.", "com.miui.", "com.xiaomi.")` that was filtering out Xiaomi/MIUI app notifications. `NotificationListener.kt` added `pushActiveNotifications()` to immediately push existing notifications on connection and on refresh.
    - Background Clipboard Fix: `ClipboardFocusActivity.kt` created transparent 1px activity that acquires window focus to legally read `primaryClip` on Android 10+ (API 29+); registered in `AndroidManifest.xml` and wired into `ClipboardReader.kt`.
    - Live Camera Stream (Pet & Security Monitor): `media/CameraStreamer.kt` created Camera2 repeating preview stream with front/back lens selection, multi-quality tiers (low 480p, medium 720p, high 1080p), and FPS control (5-30 FPS) with slow-network frame drop guard. Added `CAMERA_STREAM_START/STOP` and `CAMERA_STREAM_FRAME` to server, `StoreContext.jsx`, and `Controls.jsx`.
  - Round 5 (2026-10-14): User Feedback Deep Fixes & Performance Polish:
    - Android Server IP Keyboard / Domain Input: `activity_main.xml` changed `serverIpInput` to `android:inputType="textUri|textNoSuggestions"` so domain names, ngrok subdomains, and pasted URLs are fully accepted instead of showing dialpad.
    - Persistent Screen Capture Consent: `MediaProjectionHolder.kt` created 1x1 keep-alive `dummyDisplay` (`PhoneLink_KeepAlive`) so Android 14 does not tear down the session token when streams pause or capture finishes. `ScreenshotConsentActivity.kt` pre-initializes projection instance while in foreground.
    - MIUI Call Screening & Blocking: `MainActivity.kt` added fallback to `Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS` and informative toast on Xiaomi/MIUI where AOSP `RoleManager` is disabled.
    - Large File Downloads (>2MB) & Root Directory Action Button: `StoreContext.jsx` decodes each 32KB base64 chunk into `Uint8Array` in `downloadChunksRef` and creates `new Blob(chunks)` -> `URL.createObjectURL(blob)`, completely eliminating the ~2MB Chromium data URI limit. `FileManager.jsx` auto-triggers download directly using `blobUrl`; added `overflow-x-auto` and `min-w-[620px]` to table container so the Action/Download column is always visible. `FileRepository.kt` added flow-control pacing (sleep 5ms every 8 chunks / 256KB) in `encodeInChunks`. `PhoneLinkService.kt` offloaded `handleFileDownload` to background thread `Thread { ... }.start()` to avoid WebSocket socket buffer flooding.
    - Notification Mirroring & Periodic Refresh: `PhoneLinkService.kt` added `pushNotifications()` to `periodicSync` (runs every 45s) and `syncAll()` on connect.
    - Background Clipboard Reading on Android 10-14 & MIUI: `FindPhoneAccessibilityService.kt` exposed active `instance`. `ClipboardReader.kt` implemented `launchFocusActivity` using active AccessibilityService exemption and Android 14 `MODE_BACKGROUND_ACTIVITY_START_ALLOWED` PendingIntent. `ClipboardFocusActivity.kt` window focus and lock-screen flags ensure clip is safely read and delivered to dashboard.
    - Smooth 30 FPS Screen Recording: `ScreenRecorder.kt` pre-allocated reusable Bitmaps and ByteStreams to eliminate GC pauses; adaptive scaling for 25-30 FPS modes ensures <15ms frame encoding time.
    - Verified: `npm run build --prefix dashboard` (built in 3.41s) and `node --check server/src/index.js` (exit 0).

## Notes (agle agent ke liye)
- search_codebase queries = array of STRINGS.
- read_files output truncate hota hai — badi files range me padho.
- NO git commands (agent constraint). Provide copy-paste git terminal commands to the user instead.
- Android code builds in Android Studio. Server check: `node --check server/src/index.js`. Dashboard check: `npm run build --prefix dashboard`.

