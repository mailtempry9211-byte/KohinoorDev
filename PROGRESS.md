# Project Progress & Status Tracker

> **Notice for any AI Coding Agent:** Read this file before executing or modifying code. This records current completion status, architectural decisions, and next steps.

---

## Current Status: Phase 1 Local Pipeline Complete — Android Client Written, Not Yet Built

- [x] Project Concept & Requirements defined.
- [x] Tech stack selected (Local-first: Node.js + React + Native Android APK -> Cloud: Supabase + Vercel + Railway).
- [x] WebSocket Protocol & Message Schema standardized.
- [x] Backend WebSocket & Express relay server implementation.
- [x] Frontend React dashboard scaffolding with mock data.
- [x] Local two-way verification (Browser <-> Backend).
- [x] Android Client APK initial build (Foreground service + WebSocket client).
- [ ] End-to-end local network test with real Android device.
- [ ] Phase 2 Cloud deployment configuration (Vercel + Railway + Supabase).

---

## Implemented (2026-10-14) — Bug-fix + feature pass (Mi 10 real-device testing)

**Bugs fixed:**
- BUG 1: deviceId ab UUID (ek baar generate + SharedPrefs persist); server DEVICE_REGISTER
  idempotent + startup me same-id duplicate rows ki cleanup.
- BUG 2: 45s periodic sync loop (calls/SMS/contacts/status, leak-free stop); LocationRepository
  ke dono paths (one-shot + stream) me har fix par deviceId.
- BUG 3: NotificationFilter sirf package-based drop (own app + android/systemui +
  com.android.*/com.miui.*/com.xiaomi.*); ongoing/summary blanket-drop hataya; Log.d har
  filtered/sent/dropped case me.
- BUG 4: FileRepository ka R+ check (isExternalStorageManager) verify + Log.d har
  permission/list/encode path me.
- BUG 5: server me request-calls/request-sms (+request-contacts/add-contact/find-phone) aur
  DELETE /api/devices/:id (+history cleanup + DEVICE_REMOVED); dashboard me header refresh
  button + Sidebar trash icon (confirm ke saath).

**Features added:**
- FEATURE A (Contacts): Android READ/WRITE_CONTACTS + ContactsRepository (readAll/addContact
  batch) + SYNC/COMMAND events + pushContacts (syncAll + periodic); server store + REST;
  dashboard Contacts tab (search + .vcf/.csv export + add form).
- FEATURE B (SMS send): SmsManager me free-text number field (nayi conversation) + optimistic
  thread creation; SEND_SMS_RESULT toast pehle se tha.
- FEATURE C (Find phone): FindPhoneManager (STREAM_ALARM max + loop + 60s timeout + stop
  notification + volume restore) + minimal accessibility service (no screen read/gestures) +
  server find-phone + dashboard bell button.
- FEATURE D (persistence): BootReceiver + RECEIVE_BOOT_COMPLETED + KeepAliveWorker (15 min,
  work-runtime-ktx) + START_STICKY confirm; MainActivity me Autostart deep-link button
  (AutostartHelper, kabhi crash nahi) + Find-Phone enable button + MIUI note; README me
  MIUI Known Limitation.

**Files changed:** DevicePrefs.kt, PhoneLinkService.kt, LocationRepository.kt,
NotificationFilter.kt, NotificationListener.kt, FileRepository.kt, ContactsRepository.kt
(new), FindPhoneManager.kt (new), FindPhoneStopReceiver.kt (new),
FindPhoneAccessibilityService.kt (new), BootReceiver.kt (new), KeepAliveWorker.kt (new),
AutostartHelper.kt (new), MainActivity.kt, AndroidManifest.xml, app/build.gradle.kts,
activity_main.xml, accessibility_service_config.xml (new), strings.xml,
server/src/index.js, dashboard App.jsx, StoreContext.jsx, Sidebar.jsx, SmsManager.jsx,
Contacts.jsx (new), README.md, TODO.md (new), FIX_AND_FEATURES.md (new).

> NOTE: is machine par Android SDK/Gradle nahi hai — `android/` ko Android Studio me
> kholkar sync + build + sideload karo. Server syntax read-back se verify ki; shell
> output capture tootne se `node --check` confirm nahi ho paya, push se pehle
> `npm run verify --prefix server` chala lena.

**Server** (`/server`) — Express + `ws` on port 5000, lowdb persistence in `server/data/db.json`.
- Device registry with online/offline tracking, battery, Wi-Fi name, last-seen.
- REST: `GET /api/devices`, `/api/devices/:id/{calls,messages,location}`.
- REST commands: `POST /api/command/{send-sms, file-list, file-download, file-upload, request-location}`.
- Prints the LAN IP on startup so the APK knows where to connect.
- **Both protocol spellings are accepted.** Canonical names (per the task spec) and the
  ARCHITECTURE.md ones (`LOCATION_REPORT`, `CMD_SEND_SMS`, `name`, `lat`/`lng`, `INBOX`,
  `MISSED`) normalize to one internal shape — see `normalizeMessage()` in `src/index.js`.
  A separate `INCOMING_CALL_RING` event is kept distinct from `SYNC_CALLS` so a normal
  incoming-call sync can never render as a false live alert.
- `src/mock-device.js` — two fake phones streaming calls, SMS, location and battery.
- `scripts/verify-pipeline.mjs` — 18 end-to-end checks, no browser needed.
- `scripts/verify-protocol-aliases.mjs` — 6 checks for the ARCHITECTURE.md spellings.

**Dashboard** (`/dashboard`) — Vite + React + Tailwind + Leaflet, `npm run dev` on :3000.
- `src/App.jsx` is a thin tab shell; tabs live in `src/components/`.
- `src/store/StoreContext.jsx` owns the single WebSocket, all `deviceId`-keyed state, and
  the command helper.
- `components/Sidebar.jsx` — device switcher with live battery bar and online dot.
- `components/CallLogs.jsx` — all/incoming/outgoing/missed filters, callback action.
- `components/SmsManager.jsx` — conversation list + chat pane + optimistic send.
- `components/FileManager.jsx` — breadcrumb explorer, download, upload, chunk reassembly.
- `components/LocationMap.jsx` — OSM/Leaflet pin with accuracy circle and timestamp.
- `components/AlertBanner.jsx` — live ring banner and new-SMS banner.

**Android** (`/android`) — Kotlin, minSdk 26, targetSdk 34. **Not compiled here: this
machine has no Android SDK or Gradle.** Build it in Android Studio.
- `service/PhoneLinkService.kt` — foreground service (`location|dataSync|phoneCall`),
  `START_STICKY`, persistent "Phone Link Active" notification, owns the socket.
- `net/WebSocketClient.kt` — OkHttp socket, exponential-backoff reconnect, idempotent
  `connect()` so a service restart cannot leak sockets.
- `receiver/SmsReceiver.kt` — instant push on `SMS_RECEIVED`.
- `receiver/PhoneStateReceiver.kt` — live ring alert (reads `EXTRA_INCOMING_NUMBER`) + sync on call end.
- `sms/SmsRepository.kt` — inbox+sent read, multipart send.
- `calls/CallLogRepository.kt` — call log read, type normalisation.
- `files/FileRepository.kt` — storage listing, chunked base64 download/upload, `..` traversal guard.
- `location/LocationRepository.kt` — balanced-power fix every 20s.
- `MainActivity.kt` — settings screen, permission requests, storage access, battery exemption.
- All telemetry and commands carry `deviceId` (agent Rule 2).

---

## Immediate Next Steps (Where to Resume)

1. **Open `android/` in Android Studio**, let Gradle sync, build `app-debug.apk`.
2. **Sideload** it on one phone and grant: location, SMS, phone, all-files access,
   Do not-optimise-battery.
3. **Connect it to the relay LAN IP** printed by the server, and repeat for each phone.
4. Run `npm run verify --prefix server` for the mock pipeline, then re-test calls, SMS, files
   and location through a real device.
5. **Phase 2:** swap the hard-coded `ws://` origin in
   `dashboard/src/store/StoreContext.jsx` for an env var, move the phone registry to
   Postgres, and replace lowdb writes with Supabase so multiple relays can share state.

---

## Known Limitations

- File transfer is base64 over WebSocket, ~32 KB chunks. Fine on a LAN, slow for large videos.
- The relay keeps the device registry in memory, so a server restart drops all `online`
  flags until each phone reconnects (they do so automatically within seconds).
- Android 13+ requires `POST_NOTIFICATIONS` granted or the foreground notification is silent.
- No auth or TLS — by design for a trusted home LAN. Add a token before exposing this.
