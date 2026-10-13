# System Architecture & Technical Design

## 1. High-Level Architecture Diagram
```
+-------------------------------------------------------------+
|                     Android Devices                         |
|  [Phone 1: Pixel]   [Phone 2: Galaxy]   [Phone 3: OnePlus]  |
|  Background Kotlin Service + WebSocket Client               |
+------------------------------+------------------------------+
                               |
                   WebSocket (JSON Events)
                               |
                               v
+-------------------------------------------------------------+
|              Relay & State Server (Node.js)                 |
|  - WebSocket Dispatcher (`ws` / Socket.io)                  |
|  - Device Session Manager                                    |
|  - Local Dev: SQLite / In-Memory Cache                       |
|  - Production: Supabase PostgreSQL + Auth                   |
+------------------------------+------------------------------+
                               |
                   WebSocket / REST API
                               |
                               v
+-------------------------------------------------------------+
|             Web Dashboard (Vite + React)                    |
|  - Runs on any PC (Linux / Windows / ChromeOS)              |
|  - Device Switcher, SMS Chat, Call History, Files, Maps     |
+-------------------------------------------------------------+
```

---

## 2. Technology Stack

### Development & Testing Phase (Phase 1: Local First)
- **Android:** Native Kotlin or Flutter with Foreground Service.
- **Backend:** Node.js (Express + `ws`), zero external cloud dependencies.
- **Database:** SQLite (via `better-sqlite3` or Prisma) or local memory store.
- **Frontend:** React (Vite) + Tailwind CSS + Lucide Icons + Leaflet (OpenStreetMap).

### Production Deployment Phase (Phase 2: 100% Free Cloud Tier)
- **Frontend Hosting:** Vercel (Free tier, zero maintenance).
- **Backend Server:** Railway or Render (Free / low-cost worker with WebSocket support).
- **Database & Storage:** Supabase (Free tier: PostgreSQL for logs/credentials, Supabase Storage bucket for file relay).

---

## 3. WebSocket Event Protocol (JSON Schema)

### 3.1 Device to Server
- `DEVICE_REGISTER`:
  ```json
  { "event": "DEVICE_REGISTER", "payload": { "deviceId": "ph-01", "name": "Pixel 7", "battery": 88, "isCharging": true } }
  ```
- `SYNC_CALLS`:
  ```json
  { "event": "SYNC_CALLS", "payload": { "deviceId": "ph-01", "calls": [{ "number": "+91...", "name": "Ramesh", "type": "MISSED", "timestamp": 1776000000 }] } }
  ```
- `INCOMING_CALL_RING`:
  ```json
  { "event": "INCOMING_CALL_RING", "payload": { "deviceId": "ph-01", "number": "+91...", "name": "Boss" } }
  ```
- `SYNC_SMS`:
  ```json
  { "event": "SYNC_SMS", "payload": { "deviceId": "ph-01", "messages": [{ "address": "VK-HDFCBK", "body": "OTP is 543210", "date": 1776000000, "type": "INBOX" }] } }
  ```
- `LOCATION_REPORT`:
  ```json
  { "event": "LOCATION_REPORT", "payload": { "deviceId": "ph-01", "lat": 28.6139, "lng": 77.2090, "accuracy": 12.5, "updatedAt": 1776000000 } }
  ```

### 3.2 Dashboard to Device (Commands)

- `NOTIFICATION_POSTED`:
  ```json
  { "event": "NOTIFICATION_POSTED", "payload": { "deviceId": "ph-01", "notificationId": "notif_102", "packageName": "com.whatsapp", "appName": "WhatsApp", "title": "Rahul", "text": "Are you online?", "timestamp": 1776000000, "canReply": true } }
  ```
- `NOTIFICATION_REMOVED`:
  ```json
  { "event": "NOTIFICATION_REMOVED", "payload": { "deviceId": "ph-01", "notificationId": "notif_102" } }
  ```
- `CMD_DISMISS_NOTIFICATION`:
  ```json
  { "event": "CMD_DISMISS_NOTIFICATION", "targetDeviceId": "ph-01", "payload": { "notificationId": "notif_102" } }
  ```
- `CMD_REPLY_NOTIFICATION`:
  ```json
  { "event": "CMD_REPLY_NOTIFICATION", "targetDeviceId": "ph-01", "payload": { "notificationId": "notif_102", "replyText": "Yes, coding now" } }
  ```

- `CMD_SEND_SMS`:
  ```json
  { "event": "CMD_SEND_SMS", "targetDeviceId": "ph-01", "payload": { "recipient": "+91...", "message": "Will call in 10 mins" } }
  ```
- `CMD_FETCH_LOCATION`:
  ```json
  { "event": "CMD_FETCH_LOCATION", "targetDeviceId": "ph-01" }
  ```
- `CMD_BROWSE_STORAGE`:
  ```json
  { "event": "CMD_BROWSE_STORAGE", "targetDeviceId": "ph-01", "payload": { "path": "/sdcard/Download" } }
  ```
