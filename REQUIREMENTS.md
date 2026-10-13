# Technical Requirements Specification

## 1. Functional Requirements

### 1.1 Android Client (APK)
- **FR-AND-01:** Background foreground service with sticky notification to ensure Android OS does not kill the process.
- **FR-AND-02:** Auto-reconnect WebSocket client to keep connection alive across Wi-Fi/cellular transitions.
- **FR-AND-03:** Read call logs using `CallLog.Calls` and broadcast updates on change.
- **FR-AND-04:** Listen for incoming calls using `TelephonyManager` / `PhoneStateListener` and push instant ring alerts.
- **FR-AND-05:** Read SMS inbox/sent using `Telephony.Sms` content provider.
- **FR-AND-06:** Send SMS programmatically using `SmsManager` triggered by WebSocket command.
- **FR-AND-07:** Retrieve GPS/network location using `FusedLocationProviderClient` periodically or on-demand.
- **FR-AND-08:** Expose storage directory listing and stream file chunks over WebSocket or local HTTP server for file transfers.
- **FR-AND-09:** Configurable server host URL / IP input screen with pairing token.

### 1.2 Relay Server (Backend)
- **FR-SRV-01:** Dual-protocol server: HTTP REST API for queries + WebSockets for persistent two-way communication.
- **FR-SRV-02:** Device registry keeping track of active socket IDs mapped to unique `deviceId`.
- **FR-SRV-03:** Local IP auto-discovery announcement on startup for hassle-free local pairing.
- **FR-SRV-04:** Command dispatch queue (Browser -> Server -> Target Phone WebSocket).
- **FR-SRV-05:** Caching layer for offline call logs and SMS history.

### 1.3 Web Dashboard (Frontend)
- **FR-WEB-01:** Responsive SPA compatible with Desktop browsers (Windows, Linux, ChromeOS).
- **FR-WEB-02:** Sidebar listing all paired devices with live status badges.
- **FR-WEB-03:** Dedicated views: Calls, SMS, Files, Location, and Device Info.
- **FR-WEB-04:** In-app audio/toast notifications for incoming calls and new messages.

- **FR-AND-10:** Implement Android `NotificationListenerService` (`onNotificationPosted`, `onNotificationRemoved`) to intercept active system notifications.
- **FR-AND-11:** Extract app package name, title, text, subtext, timestamp, and action intents (Dismiss / Inline Reply).
- **FR-AND-12:** Handle `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` and guide user to Notification Access Settings.
- **FR-WEB-06:** Notification Center tab & badge in Web Dashboard + Native Browser `Notification` API toasts with dismiss capability.

- **FR-WEB-05:** Interactive map renderer using Leaflet / OpenStreetMap tiles (no paid Google Maps API key required).

---

## 2. Non-Functional & Security Requirements
- **Local Network Privacy:** No data sent to commercial third parties.
- **Android Permissions Required:**
  - `READ_CALL_LOG`
  - `READ_SMS`, `SEND_SMS`, `RECEIVE_SMS`
  - `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
  - `READ_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE` (Android 11+)
  - `FOREGROUND_SERVICE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`
  - `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
- **Portability:** Containerized server (Dockerfile ready for local Docker or free cloud host).
