# TODO — Bugs + Features Tracker

> Ye file kaam shuru karne se PEHLE banayi gayi hai. Har task ke baad status update hoga.
> Dusra AI / agla session isi file ko padhkar resume karega.

## BUG 1 — Device identity stable nahi (duplicate entries)
- [x] Android: `data/DevicePrefs.kt` — UUID.randomUUID() + SharedPreferences persist (2026-10-14)
- [x] Server: `server/src/index.js` DEVICE_REGISTER idempotent (devices.set + persistDevice filter by id) + startup dedupe migration (2026-10-14)
- Status: DONE (code) — stale different-id rows cleaned via BUG 5 delete button

## BUG 2 — Calls/SMS/Location sirf connect par sync
- [x] `PhoneLinkService.kt` me periodic sync loop (30-60s) — onStartCommand start, onDestroy stop (2026-10-14, 45s Handler loop + pushStatus)
- [x] `location/LocationRepository.kt` — har fix me `deviceId` include (startUpdates + currentFix dono) (2026-10-14, emit() + onLocationResult dono me deviceId)
- Status: DONE

## BUG 3 — Notification mirroring galat notifications
- [x] `notifications/NotificationFilter.kt` — package-based filter (own app + android/systemui + com.android.*/com.miui.*/com.xiaomi.* prefixes), ongoing/summary blanket-drop removed (2026-10-14)
- [x] `notifications/NotificationListener.kt` — Log.d on ignored/filtered/dropped(sent (2026-10-14)
- Status: DONE

## BUG 4 — File download "Grant storage access" error
- [x] `files/FileRepository.kt` — R+ par isExternalStorageManager() (already correct tha), Log.d added: hasPermission/list/encodeInChunks (2026-10-14)
- Status: DONE

## BUG 5 — Dashboard: refresh button + delete device
- [x] Server: `request-calls`, `request-sms`, `request-contacts`, `add-contact`, `find-phone` commands + `DELETE /api/devices/:id` (+history cleanup + DEVICE_REMOVED broadcast) (2026-10-14)
- [x] Dashboard: header refresh button (calls+sms+location+contacts) + find-phone bell w/ confirm; Sidebar trash icon + window.confirm (2026-10-14)
- Status: DONE

## FEATURE A — Contacts (view/search/export/add)
- [x] Android: Manifest READ/WRITE_CONTACTS + runtime request + `contacts/ContactsRepository.kt` (readAll/addContact batch) + Events + pushContacts + syncAll/periodic + handleCommand (2026-10-14)
- [x] Server: SYNC_CONTACTS store (contacts array + backfill) + GET contacts + request-contacts + add-contact (2026-10-14)
- [x] Dashboard: Contacts tab + search + vcf/csv download + add form + result toast (2026-10-14)
- Status: DONE

## FEATURE B — Dashboard se SMS bhejna
- [x] `SmsManager.jsx` compose + optimistic send already tha — free-text number field (new conversation) added; SEND_SMS_RESULT toast store me already tha (2026-10-14)
- Status: DONE

## FEATURE C — Find My Phone (silent me bhi loud alarm)
- [x] `findphone/FindPhoneManager.kt` (STREAM_ALARM max + loop + 60s timeout + stop notification + volume restore + FIND_PHONE_STOPPED) + `FindPhoneStopReceiver` (2026-10-14)
- [x] `accessibility/FindPhoneAccessibilityService.kt` + `res/xml/accessibility_service_config.xml` (minimal, no content/gestures) + strings desc (2026-10-14)
- [x] Manifest register (service + stop receiver) + MainActivity "Enable Find Phone" button (2026-10-14)
- [x] Server `/api/command/find-phone` + Dashboard bell button w/ confirm (2026-10-14)
- Status: DONE

## FEATURE D — Service maximally persistent
- [x] Manifest foregroundServiceType already location|dataSync|phoneCall — verified, no change needed (2026-10-14)
- [x] `receiver/BootReceiver.kt` + RECEIVE_BOOT_COMPLETED + Manifest register (2026-10-14)
- [x] START_STICKY confirmed (still returned) + `receiver/KeepAliveWorker.kt` 15min + work-runtime-ktx dep + schedule in onStartCommand (2026-10-14)
- [x] MainActivity MIUI note + README Known Limitations (2026-10-14)
- Status: DONE

## FEATURE D (addendum) — MIUI Autostart button
- [x] `util/AutostartHelper.kt` (3 MIUI intents + app-details fallback, never throws) (2026-10-14)
- [x] activity_main.xml `autostartBtn` + caption + MainActivity wiring (2026-10-14)
- Status: DONE

---
## ROUND 2 (2026-10-14) — Real-device test feedback

### Storage: download nahi ho raha tha (upload theek tha)
- Root cause: `FileRepository.encodeInChunks()` aakhri real chunk ke baad ek extra
  `onChunk("", true)` bhejta tha. Dashboard `FILE_DOWNLOAD_RESPONSE` handler har chunk ko
  buffer me append karta tha — isliye aakhri empty chunk poore buffer ko overwrite kar
  deta tha → file download HOTA tha lekin khali (0 byte) milti thi.
- Fix (android): extra terminator hata diya; aakhri real chunk khud `isLast=true` bhejta hai.
  Empty (0-byte) file ke liye alag se ek hi empty last chunk.
- Fix (dashboard): guard — agar buffer/complete download pehle se maujood hai to stray
  empty last-chunk ignore. `filesRef` se state check (side-effect free).
- Notifications bhi nahi dikh rahe the (permission ke baad bhi): `NotificationListener`
  payload me `deviceId` kabhi tag nahi karta tha → server par entry `undefined` deviceId
  se store hoti thi → device filter (`n.deviceId === activeDeviceId`) kabhi match nahi
  karta. Fix: `onNotificationPosted` me `payload.put("deviceId", DevicePrefs.deviceId)`.
  NOTIFICATION_REMOVED ke liye bhi deviceId ab bheji jaati hai.

### Dashboard polish
- Purple/indigo hata ke teal (`teal-500/600/...`, map pin `#14b8a6`) — poore dashboard me
  replace, koi `indigo-*` class abhi bhi nahi (verify: search "indigo" → 0 matches,
  sirf index.css comment).
- Animations: `index.css` me `.section-enter` keyframes; App.jsx tab switch par
  `key={tab}` se har section fade+slide-in.
- Refresh button har section me: Calls (`request-calls`), Messages (`request-sms`),
  Contacts (`request-contacts`, pehle se tha), Location (`request-location`),
  Files (folder re-list), Notifications (store me `refreshNotifications` REST helper).
- FileManager me download state (`Fetching…` + animate-bounce) add kiya.

### Status: sab DONE. Files: FileRepository.kt, NotificationListener.kt,
StoreContext.jsx, FileManager.jsx, App.jsx, index.css, AlertBanner.jsx, Sidebar.jsx,
CallLogs.jsx, Contacts.jsx, SmsManager.jsx, LocationMap.jsx, Notifications.jsx.

---
## ROUND 3 (2026-10-14) — Feature expansion + domain support — IN PROGRESS

> User kehti hai: har feature ka dashboard control + configuration hona chahiye
> (aisa na ho ki feature ho par dashboard me uska control/config na ho).
> Notification reading PRIORITY hai (done + fixed, bas maintain karna hai).
> Server address field domain (ngrok) support kare — IP bhi, full URL bhi.

### T1 — Domain/ngrok support (Android + dashboard) ✅ DONE
- [x] Android: `WebSocketClient.buildUrl()` — IP (ws://ip:port), bare domain (wss://domain), host:port, full ws://|wss://|http://|https:// URLs sab accept. MainActivity hint update (2026-10-14)
- [x] Dashboard: `StoreContext` WS_URL — https → wss://hostname, localhost → ws://localhost:5000, else ws://hostname:5000 (2026-10-14)
- [x] README: ngrok usage section added (2026-10-14)
- Status: DONE

### T2 — Server: naye events + command queueing + REST ✅ DONE (2026-10-14)
- [x] defaultData me deviceInfo{}, installedApps{}, wifi{}, clipboardHistory[], callBlocklist{}, commandQueue[] + backfill (2026-10-14)
- [x] COMMAND_EVENTS map (command → phone event) live dispatch + replay dono use karta hai (2026-10-14)
- [x] Offline par command queue me jata hai {success:true, queued:true}, DEVICE_REGISTER par replayQueue() clear hota hai (2026-10-14)
- [x] Saare REST cases target — device-info, installed-apps, app-perms, wifi-info, clipboard-read/enable/disable, vibrate, tts, play-audio, play-audio-stop, wallpaper, lock, screenshot, screen-record, mic-record, camera-capture, call-blocklist-sync (2026-10-14)
- [x] handleMessage cases broadcast/store — DEVICE_INFO/INSTALLED_APPS/WIFI response, CLIPBOARD_UPDATE, PLAY_AUDIO/LOCK/SCREENSHOT/MIC/CAMERA results (2026-10-14)
- Status: DONE

### T3 — Android: remote controllers + handleCommand cases ✅ DONE (2026-10-14)
- [x] Manifest: VIBRATE, SET_WALLPAPER, RECORD_AUDIO, CAMERA, QUERY_ALL_PACKAGES, FOREGROUND_SERVICE_MICROPHONE/CAMERA/MEDIA_PROJECTION permissions (2026-10-14)
- [x] `remote/Vibrator.kt` — VIBRATE_COMMAND (duration/pattern), VIBRATE_RESULT (2026-10-14)
- [x] `remote/TtsSpeaker.kt` — TTS_COMMAND (text, speed, pitch), TTS_RESULT; lazy TextToSpeech, destroy on service destroy (2026-10-14)
- [x] `remote/AudioPlayer.kt` — PLAY_AUDIO_COMMAND (url, loop) MediaPlayer; PLAY_AUDIO_STOP; PLAY_AUDIO_RESULT (2026-10-14)
- [x] `remote/WallpaperSetter.kt` — WALLPAPER_COMMAND (url ya solid color); WALLPAPER_RESULT (2026-10-14)
- [x] `system/SysInfoRepository.kt` — DEVICE_INFO_REQUEST → DEVICE_INFO_RESPONSE (model, sdk, ram, storage, battery…) (2026-10-14)
- [x] `system/AppsRepository.kt` — INSTALLED_APPS_REQUEST → response (pkg, name, version, isSystem); APP_PERMS_REQUEST(pkg) → granted/requested perms (2026-10-14)
- [x] `system/WifiRepository.kt` — WIFI_REQUEST → current ssid/bssi/rssi/ip + scan results (2026-10-14)
- [x] `remote/ClipboardReader.kt` — CLIPBOARD_READ_REQUEST → text; CLIPBOARD_CAPTURE_ENABLE/DISABLE → primary clip listener → CLIPBOARD_UPDATE push (2026-10-14)
- [x] PhoneLinkService handleCommand cases sabke + Log.d + lifecycle release (2026-10-14)
- Status: DONE

### T4 — Dashboard: Controls tab (sabka control + config) ✅ DONE (2026-10-14)
- [x] `components/Controls.jsx` — cards: Vibrate (slider + preset patterns), TTS (text + speed + pitch), Play audio (URL + samples + loop + stop), Wallpaper (presets + picker + URL), Clipboard (read + history + live capture switch), System info (specs + RAM & storage usage bars), Installed apps (search + user/system filters + click-to-inspect permissions drawer), WiFi (connected stats + scan list) (2026-10-14)
- [x] App.jsx me "Controls" tab + Sliders icon add; StoreContext me round 3 event handlers + REST loaders + control action helpers (2026-10-14)
- [x] index.css invalid property syntax fix + production build verified (2026-10-14)
- Status: DONE

### T5 — Lock Device (Device Admin) ✅ DONE (2026-10-14)
- [x] `remote/LockController.kt` + PhoneDeviceAdminReceiver + xml/device_admin.xml + manifest; MainActivity "Enable Remote Screen Lock (Device Admin)" button; LOCK_COMMAND → lockNow() ya admin-required error; dashboard card + config (2026-10-14)
- Status: DONE

### T6 — Call Blocker (CallScreeningService) ✅ DONE (2026-10-14)
- [x] `blocker/BlocklistStore.kt` (prefs + phone number comparison) + `blocker/PhoneBlockerService.kt` (CallScreeningService); ROLE_CALL_SCREENING request in MainActivity (API 29+); CALL_BLOCKLIST_SYNC command; dashboard panel in Controls.jsx (add/remove/toggle + status) (2026-10-14)
- Status: DONE

### T7 — Mic one-shot (billi locator 🐱) ✅ DONE (2026-10-14)
- [x] `media/MicRecorder.kt` — MediaRecorder (.m4a AAC, 128kbps, 44.1kHz), durationSec clamp (5-60), base64 → MIC_RECORD_RESULT; PhoneLinkService MIC_RECORD_COMMAND integration; dashboard card in Controls.jsx (duration slider + record button + HTML5 audio player + download .m4a button) (2026-10-14)
- Status: DONE

### T8 — Camera one-shot ✅ DONE (2026-10-14)
- [x] `media/CameraCapture.kt` — Camera2 headless still capture (no Activity/view needed), front/back facing selection, auto AF/AE, sensor orientation EXIF, JPEG base64 → CAMERA_CAPTURE_RESULT; PhoneLinkService CAMERA_CAPTURE_COMMAND; dashboard card in Controls.jsx (facing selector + capture button + full preview + JPEG download) (2026-10-14)
- Status: DONE

### T9 — Screenshot (MediaProjection approve flow) ✅ DONE (2026-10-14)
- [x] `media/MediaProjectionHolder.kt` + `media/ScreenshotConsentActivity.kt` + `media/ScreenshotController.kt` — heads-up approval notification + MediaProjection consent activity + virtual display frame capture with rowStride padding calculation + JPEG Base64 → SCREENSHOT_RESULT; AndroidManifest FGS mediaProjection type; MainActivity authorize button; PhoneLinkService SCREENSHOT_COMMAND; dashboard card in Controls.jsx (capture button + image preview + size/resolution metadata + download) (2026-10-14)
- Status: DONE

### T10 — Screen recorder (frames) ✅ DONE (2026-10-14)
- [x] `media/ScreenRecorder.kt` — SCREEN_RECORD_START/STOP; ~1-5fps JPEG frame stream (default 2fps, clamped & scaled to 540p for low latency) → SCREEN_RECORD_FRAME broadcast; PhoneLinkService SCREEN_RECORD_START/STOP; dashboard card in Controls.jsx (live video view + FPS selector + start/stop controls + frame info) (2026-10-14)
- Status: DONE

---
## ROUND 4 (2026-10-14) — Real-Device Feedback Fixes & Live Camera Stream ✅ DONE

1. **Screenshot & Screen Record Android 14 FGS MediaProjection Fix:**
   - [x] `PhoneLinkService.kt`: Added `ensureMediaProjectionForegroundType()` to dynamically promote service foreground type to `FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION` when screen capture starts, preventing Android 14 SecurityException.
   - [x] `ScreenshotConsentActivity.kt`: Connected consent callbacks to `MediaProjectionHolder.notifyConsentGranted/Denied`.
   - [x] `ScreenshotController.kt`: Added frame fallback polling (250ms/750ms) so static screens without display refresh events produce screenshots immediately.
   - [x] `ScreenRecorder.kt`: Upgraded FPS support up to 30 FPS (`requestedFps.coerceIn(1, 30)`), added atomic encoding guards to prevent frame queue pileups, and hooked up `onConsentGranted` so "Start now" approval immediately starts the live feed.

2. **File Downloads & Root Directory Files Fix:**
   - [x] `FileRepository.kt`: Removed `file.canRead()` check which fails on Android FUSE/FAT32 storage under `MANAGE_EXTERNAL_STORAGE`; fixed `resolve()` path handling for root files; fixed boolean sorting bug with `!it.optBoolean("isDirectory", false)`; removed hardcoded duplicate "Android" folder.
   - [x] `FileManager.jsx`: Replaced memory-heavy char-by-char `atob()` decoding with native streaming `fetch(dataUrl).then(r => r.blob())` and automatic browser download triggering; ensured root directory files display a download button and folders display an open button.

3. **Notification Shade Mirroring Fix:**
   - [x] `NotificationFilter.kt`: Emptied broad `IGNORED_PREFIXES = listOf("com.android.", "com.miui.", "com.xiaomi.")` that was filtering out Xiaomi/MIUI SMS, dialer, and system apps on the Mi 10.
   - [x] `NotificationListener.kt`: Added `pushActiveNotifications()` that immediately pushes existing notifications when connected or when manually refreshed.
   - [x] `PhoneLinkService.kt`: Added `Events.NOTIFICATIONS_REQUEST -> pushNotifications()` and added `pushNotifications()` to `syncAll()`.

4. **Background Clipboard Reading on Android 10+ (API 29+):**
   - [x] `ClipboardFocusActivity.kt`: Created transparent, transient 1px activity that acquires focus to legally read `primaryClip` in background.
   - [x] `AndroidManifest.xml`: Registered `ClipboardFocusActivity`.
   - [x] `ClipboardReader.kt`: Wired focus activity launch for `readCurrentText` and clip change notifications.

5. **Live Camera Stream (Pet & Security Monitor):**
   - [x] `media/CameraStreamer.kt`: Created Camera2 continuous live streaming with Front/Back lens switching, quality tiers (Low 480p, Med 720p, High 1080p), and FPS control (5-30 FPS) with slow-network frame drop guard.
   - [x] `PhoneLinkService.kt`: Wired `CAMERA_STREAM_START`, `CAMERA_STREAM_STOP`, and frame dispatch.
   - [x] `server/src/index.js`: Supported `camera-stream-start`, `camera-stream-stop`, and `CAMERA_STREAM_FRAME` broadcast.
   - [x] `StoreContext.jsx` & `Controls.jsx`: Added Live Camera Stream card with lens selector, quality selector, FPS selector, live video player, and "Save Current Frame" button.

---
Update rule: har task complete hone par `[ ]` → `[x]` + date + files changed likho.
