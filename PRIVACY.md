# Privacy Policy & Architecture Statement

Last Updated: October 2026

## 1. Core Principle: 100% Self-Hosted & Local-First

**Phone Link Hub** is built with a strict "privacy-by-design" architecture. It is an open-source, self-hosted device companion designed for personal single-user management over your local network.

- **Zero Cloud Infrastructure**: There are no company servers, cloud relays, or centralized databases. All software runs exclusively on your own phone and your own computer.
- **Zero Analytics & Trackers**: Phone Link Hub contains no telemetry libraries, no Google Firebase/Crashlytics, no Facebook SDK, no advertising identifiers, and no behavioral tracking code.
- **Zero Third-Party Data Sharing**: Your personal data (messages, call logs, photos, location, notifications, files) is never transmitted to, sold to, or processed by any third party.

---

## 2. How Data Moves

1. **Local Wi-Fi / LAN Traffic**:
   - Communication between the Android app and the dashboard occurs via a direct WebSocket connection over your local area network (e.g. `ws://192.168.1.x:5000/ws`).
   - Data does not leave your local network router under default operation.
2. **Remote Access via Private Tunnel (Optional)**:
   - If you configure an ngrok subdomain or reverse proxy to access your dashboard away from home, data travels securely through your configured endpoint directly to your self-hosted server. No intermediate services analyze or store your content.

---

## 3. Real-Time Transparency & Indicators

Whenever high-sensitivity features are engaged, the app enforces visible system feedback:

- **Microphone**: While recording an audio sample, the persistent notification explicitly updates to display:  
  `Microphone active: recording audio clip`
- **Camera**: While streaming live camera feed or taking a photo, the notification displays:  
  `Camera active: streaming live feed to dashboard`
- **Screen View**: While screen mirroring is engaged, Android displays the native recording badge in the system status bar, and Phone Link Hub displays:  
  `Screen live streaming to dashboard`
- **Accessibility**: Used exclusively to ring the audible alarm on Find My Phone. Screen scraping and gesture automation are strictly disabled at the manifest and code level.

---

## 4. User Consent & Opt-In Controls

- All sensitive features (SMS, Calls, Contacts, Camera, Microphone, Location, Files, Screen View, Remote Lock) are **turned OFF by default**.
- Before any sensitive permission is requested, an in-app disclosure dialog is shown explaining why the feature is needed and confirming that data remains on your local network.
- You can revoke individual features at any time directly within the app's settings screen or via standard Android system settings.

---

## 5. Data Storage and Deletion

All synchronized records (recent calls, messages, contacts cache) reside in your local dashboard session or database on your PC. You retain complete custody of this data:
- To purge all synced information, delete your device from the dashboard sidebar or stop the local server.
- Uninstalling the Android application immediately terminates all listeners and removes all local preferences.

