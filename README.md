# Personal Multi-Device Android Phone Link & Management Hub

Self-hosted dashboard for 3-4 Android phones. Works offline on your LAN — no cloud, no account, no data leaves your network.

```
┌──────────────┐      WebSocket (ws://)       ┌──────────────────────┐
│  Android APK │ ◄──────────────────────────► │  Node relay (:5000)  │
│  × 3-4 phones│      JSON events              └──────────┬───────────┘
└──────────────┘                                         │ REST + WS
                                                          ▼
                                                 ┌──────────────────────┐
                                                 │ React dashboard      │
                                                 │ http://localhost:3000│
                                                 └──────────────────────┘
```

## Features

| Feature | Status |
| --- | --- |
| Multi-device switcher | Done |
| Battery %, charging state, Wi-Fi name | Done |
| Call history (incoming / outgoing / missed) | Done |
| Live incoming-call alert | Done |
| SMS threads + send from browser | Done |
| File explorer (browse / download / upload) | Done |
| GPS location on OpenStreetMap (Leaflet) | Done |

## Layout

```
.
├── server/        Node.js + Express + WebSocket relay, lowdb storage
│   ├── src/index.js         relay server
│   ├── src/mock-device.js   fake phones, so the UI can be tested first
│   └── scripts/verify-pipeline.mjs   end-to-end smoke test
├── dashboard/     Vite + React + Tailwind + Leaflet
│   └── src/components/  Sidebar, CallLogs, SmsManager, FileManager, LocationMap
└── android/       Native Kotlin client (gradle-project, no SDK installed here)
```

## Quick start (local)

Three terminals, or just use the commands below.

```powershell
# 1. Server
npm install --prefix server
npm run dev --prefix server

# 2. Mock devices (skip once the APK is installed)
npm run mock --prefix server

# 3. Dashboard
npm install --prefix dashboard
npm run dev --prefix dashboard
```

Then open **http://localhost:3000**. Two mock phones should appear in the sidebar.

> **Windows note:** PowerShell may block `npm.ps1`. If you see an execution-policy error, run `npm.cmd` instead of `npm`, or set it once per shell with:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`

On startup the server prints the address the Android app must connect to:

```
Network:  http://192.168.1.42:5000
In the Android app connect to: 192.168.1.42
```

### Remote access (ngrok / any domain)

The app's server field accepts **an IP, a domain, or a full URL**:

- `192.168.1.42` → `ws://192.168.1.42:5000` (LAN, plain)
- `my-tunnel.ngrok-free.app` → `wss://my-tunnel.ngrok-free.app` (secure, port 443)
- `wss://…` / `ws://…` / `https://…` / `http://…` → used as typed (http(s) auto-converted)

To expose the relay from outside your LAN:

```powershell
ngrok http 5000
```

Put the printed `https://….ngrok-free.app` domain (or just the hostname) into the
app's server field and into the dashboard URL in the browser. The dashboard
auto-negotiates: an `https://` page uses `wss://` on 443, everything else falls
back to `ws://host:5000`. Offline commands are queued on the server and replayed
when the phone reconnects.

### Verify the pipeline

With the server and mock devices running:

```powershell
npm run verify --prefix server
```

This exercises registration, device status, call/SMS/location sync, the SMS relay and the file
listing — 18 checks, no browser needed.

```powershell
npm run verify:protocol --prefix server
```

Six checks confirming both protocol spellings work (see "Protocol naming" below).

## Ports

| Port | Service |
| --- | --- |
| 5000 | Relay (REST + WebSocket). The phone connects here. |
| 3000 | Dashboard (Vite dev server) |

## Protocol naming

The relay accepts **both** event spellings and rewrites them to one internal shape, so the
documented ARCHITECTURE.md names and the shorter ones used by this implementation are
interchangeable:

| Canonical (used by the dashboard) | ARCHITECTURE.md alias | Payload aliases |
| --- | --- | --- |
| `DEVICE_REGISTER` | — | `name` → `deviceName` |
| `SYNC_CALLS` | — | `type: "MISSED"` → `"missed"` |
| `SYNC_SMS` | — | `type: "INBOX"` → `1`, `"SENT"` → `2` |
| `LOCATION_UPDATE` | `LOCATION_REPORT` | `lat`/`lng` → `latitude`/`longitude`, `updatedAt` → `timestamp` |
| `SEND_SMS_COMMAND` | `CMD_SEND_SMS` | — |
| `FILE_LIST_REQUEST` | `CMD_BROWSE_STORAGE` | — |
| `LOCATION_REQUEST` | `CMD_FETCH_LOCATION` | — |
| `INCOMING_CALL_RING` | same (distinct event) | forwarder |

`INCOMING_CALL_RING` is deliberately separate from `SYNC_CALLS`. Folding a ring into a call
sync would make any recent incoming call look like a live ring; the dedicated event means a
ring banner only appears when the phone is actually ringing.

The tables below use the canonical names.

## Dashboard tabs

- **Calls** — filter by missed/incoming/outgoing, hover a row for callback. A new missed call raises a red banner.
- **Messages** — conversation list plus a chat pane; the send box relays to the phone's real SMS.
- **Files** — breadcrumb navigation into `/sdcard`, **Download** pulls a file to the PC, **Upload** pushes one to the phone.
- **Location** — Leaflet map with accuracy circle and the last-fix timestamp.

## Android app

The project in `android/` is a Kotlin app (min SDK 26 / Android 8.0, target 34).

### Build with Android Studio

1. Android Studio → **File → Open** → select `phone-managment/android`.
2. Let Gradle sync; it downloads the wrapper and declared dependencies (AGP 8.5.2, Kotlin 1.9.24).
3. **Run** with the phone attached over USB, or **Build → Build APK(s)**.
4. `app/build/outputs/apk/debug/app-debug.apk` is the sideloadable APK.

### Build on the command line

Once the SDK and a JDK 17 are installed and `local.properties` contains
`sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk`:

```powershell
cd android
gradle wrapper          # only if gradlew is missing
.\gradlew assembleDebug
```

### First run on the phone

The app opens on a settings screen. In order:

1. **Server IP** — the LAN address the server printed on startup (e.g. `192.168.1.42`). Port stays `5000`.
2. **Device name** — what you will see in the sidebar ("Pixel 8").
3. **Grant storage access** — opens the system screen for *All files access*. Required for the Files tab.
4. **Start service** — starts the persistent notification "Phone Link Active".
5. Allow the runtime permission prompts (location, SMS, phone, notifications).
6. **Allow background running** — exempts the app from Doze, otherwise Android eventually kills
   the socket with the screen off.

Repeat for each of your 3-4 phones, using a different name per device.

After the first start, disconnect USB; the service keeps the socket alive in the background.

### Disable battery optimisation

Android may kill the service while the screen is off.
Tap **Allow background running** in the app, or set it manually:
Settings → Apps → Phone Link Hub → Battery → **Unrestricted**.

### What the app does in the background

| Class | Role |
| --- | --- |
| `service/PhoneLinkService.kt` | Foreground service, owns the socket, location + status streaming |
| `net/WebSocketClient.kt` | OkHttp socket with exponential-backoff reconnect |
| `receiver/SmsReceiver.kt` | Instant push on `SMS_RECEIVED` |
| `receiver/PhoneStateReceiver.kt` | Live alert when the phone rings, sync on call end |
| `sms/SmsRepository.kt` | Inbox read (in + sent) and real SMS send |
| `calls/CallLogRepository.kt` | Call log read and type normalisation |
| `files/FileRepository.kt` | Storage listing, chunked base64 download/upload, path traversal guard |
| `location/LocationRepository.kt` | Balanced-power location every 20s |
| `MainActivity.kt` | Settings screen and permission requests |

## WebSocket protocol

All frames are `{"event": ..., "payload": {...}}`.

### Phone → server

| Event | Payload |
| --- | --- |
| `DEVICE_REGISTER` | `deviceId`, `deviceName`, `battery`, `isCharging`, `wifiName` |
| `DEVICE_STATUS` | `deviceId`, `battery`, `isCharging`, `wifiName` |
| `SYNC_CALLS` | `calls[{ id, number, name, type, duration, timestamp }]` |
| `SYNC_SMS` | `messages[{ id, address, body, date, type }]` (type 1 = in, 2 = out) |
| `LOCATION_UPDATE` | `latitude`, `longitude`, `accuracy`, `timestamp` |
| `FILE_LIST_RESPONSE` | `path`, `entries[{ name, path, isDirectory, size, lastModified, mimeType }]` |
| `FILE_DOWNLOAD_RESPONSE` | `path`, `name`, `mimeType`, `data` (base64), `isLastChunk` |
| `FILE_UPLOAD_STATUS` | `path`, `stored` |
| `SEND_SMS_RESULT` | `recipient`, `success`, `error?` |

Downloads arrive in chunks; the dashboard concatenates `data` until `isLastChunk` is `true`.

### Server → phone

| Event | Payload |
| --- | --- |
| `DEVICE_REGISTERED` | `deviceId` |
| `SEND_SMS_COMMAND` | `recipient`, `message` |
| `FILE_LIST_REQUEST` | `path` |
| `FILE_DOWNLOAD_REQUEST` | `path`, `name`, `mimeType` |
| `FILE_UPLOAD_CHUNK` | `path`, `data` (base64), `isLastChunk` |
| `LOCATION_REQUEST` | — |

REST commands live at `/api/command/:name` (`send-sms`, `file-list`,
`file-download`, `file-upload`, `request-location`) and return `409` when the
target phone is offline.

## Storage

The relay keeps `server/data/db.json` (devices, calls, messages, locations).
Delete that file to reset. Nothing is sent anywhere — the server binds
`0.0.0.0` so other devices on the same subnet can reach it.

## Deploying (Phase 2)

Already shaped for it: the protocol is stateless JSON over one socket, so the
same apps work against a hosted relay.

| Layer | Local | Production |
| --- | --- | --- |
| Frontend | Vite dev | Vercel |
| Relay | Node | Railway / Render (Docker) |
| Data | lowdb file | Supabase Postgres + Storage |

Three things to change first: move the socket origin out of
`dashboard/src/store/StoreContext.jsx` into an env var, persist the phone
registry in Postgres instead of memory, and replace the lowdb writes with
Supabase so multiple relays can share state.

## Troubleshooting

**Sidebar is empty** — is the mock running? Start the server first, then the
mock. The dashboard must also be open on `localhost:3000` so it fetches
`/api/devices` on load.

**Phone says "Device is offline"** — the phone registered before and its socket
dropped. The phone reconnects automatically within a few seconds; restart the
service from the app if not.

**Files tab shows "Storage permission not granted"** — the app never granted
*All files access*. Tap **Grant storage access**, then reload the Files tab.

**Map is blank** — Leaflet loads its tiles from OpenStreetMap over the internet.
The dashboard still needs internet for tiles even though everything else is local.

## Permissions & Privacy Architecture

Phone Link Hub follows the consent and privacy standards of KDE Connect and Microsoft Phone Link:
- **Zero Cloud**: Operates strictly peer-to-peer over your local network. No analytics, tracking, or cloud servers.
- **Opt-In by Default**: All sensitive features (SMS, Calls, Contacts, Camera, Microphone, Location, Files, Screen View, Remote Lock) are disabled by default. Permissions are requested lazily only when a feature is explicitly enabled by the user.
- **Real-Time Indicators**: Visible foreground notifications inform you whenever Camera, Microphone, or Screen sharing is active.
- For complete disclosures and revocation steps, see [PERMISSIONS.md](file:///c:/Users/Kohinoor/Desktop/phone%20managment/PERMISSIONS.md) and [PRIVACY.md](file:///c:/Users/Kohinoor/Desktop/phone%20managment/PRIVACY.md).
