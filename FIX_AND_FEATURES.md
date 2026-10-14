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
- Fixes: 5/5. Features: 4/4 (+addendum).

## Notes (agle agent ke liye)
- search_codebase queries = array of STRINGS.
- read_files output truncate hota hai — badi files range me padho.
- NO git commands. No build (Android SDK nahi hai — Android Studio me build hoga).

