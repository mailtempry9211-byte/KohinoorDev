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
Update rule: har task complete hone par `[ ]` → `[x]` + date + files changed likho.
