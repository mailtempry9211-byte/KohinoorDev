# Product Requirements Document (PRD)

## 1. Executive Summary & Problem Statement
The user frequently works across multiple PC operating systems (Linux, Windows, ChromeOS) and owns 3 to 4 personal Android smartphones. Currently, switching between computers makes handling basic phone utilities (viewing call history, incoming call alerts, reading and sending SMS messages, browsing device storage, and checking phone location) cumbersome. 

Existing proprietary solutions like Windows Phone Link are restricted to Windows, do not support seamless multi-PC switching across Linux/ChromeOS, and have poor multi-device simultaneous management.

**Solution:** A lightweight, self-hosted, multi-device Android web management system ("PhoneLink Web / Personal Device Hub"). A sideloaded background client APK on each phone communicates with a centralized WebSocket relay server and displays an interactive, responsive browser-based dashboard on any device/OS.

---

## 2. Target User & Use Cases
- **User Persona:** Tech-savvy power user working on varied machines (Linux desktop, office PC, ChromeOS laptop).
- **Core Scenarios:**
  - Phone is charging in another room or left at home; user checks battery status, location, missed calls, and incoming SMS from the PC browser.
  - User receives an OTP or urgent SMS on Phone 2 while coding on Linux; reads and replies directly from the dashboard.
  - User needs a photo or file from Phone 3; browses phone storage from PC and downloads it without cables.
  - User transfers a document from PC to phone wirelessly.

---

## 3. Key Feature Scope

### 3.1 Device Switcher & Status
- Real-time online/offline presence for 3-4 connected Android devices.
- Battery level indicator, charging state, and Wi-Fi/network signal.

### 3.2 Call Management
- Synchronized call logs (Incoming, Outgoing, Missed, Rejected).
- Real-time pop-up notifications on browser when a phone rings.

### 3.3 SMS Management
- Thread-based conversation viewer.
- Full SMS history search and real-time incoming SMS toast.
- Direct SMS sending from the browser via the selected phone.

### 3.4 File Manager (Storage Explorer)
- Tree/Folder view of internal storage (`/sdcard/` or selected folders).
- File download (phone -> PC).
- File upload (PC -> phone).

### 3.5 Location Tracker
- Live/last known GPS coordinates displayed on an OpenStreetMap/Leaflet map.
- Quick verification: "Did I bring this phone with me or leave it at home/office?"

### 3.6 Real-Time Notification Mirroring (Crucial)
- Live synchronization of all Android app notifications (WhatsApp, Telegram, Slack, Banking apps, Gmail, Swiggy/Zomato, etc.) to the PC browser.
- Browser desktop notification pop-ups (Web Notification API) + sound chime.
- Notification Action Support: Dismiss notification remotely from PC (sync dismiss to phone).
- Quick Reply support for apps that provide RemoteInput (e.g., WhatsApp/Telegram reply from PC).

- Live/last known GPS coordinates displayed on an OpenStreetMap/Leaflet map.
- Quick verification: "Did I bring this phone with me or leave it at home/office?"

---

## 4. Success Metrics
- Zero-installation browser access (works on Chrome, Firefox, Safari on any OS).
- Latency for real-time alerts (calls/SMS) < 1.5 seconds on local/cloud network.
- Battery drain on Android client < 3-5% per day in background idle.
- Zero paid third-party dependencies (strictly built for free tiers: local first, then Supabase, Vercel, Railway/Render).
