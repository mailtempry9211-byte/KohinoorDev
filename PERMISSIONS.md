# Permissions Reference & Transparency Guide

**Phone Link Hub** (`com.phonelink.hub`) is an open-source, self-hosted device management tool designed for single-user personal use over your local Wi-Fi network (similar to KDE Connect and Microsoft Phone Link).

To respect user autonomy and align with Android privacy standards, **all sensitive features and permissions are completely opt-in and disabled by default**. No sensitive permission is requested upon launching the app. Instead, permissions are requested lazily, one by one, only when you explicitly toggle a specific feature ON in the app.

---

## Permission Summary Table

| Permission | Feature Area | Why It Is Needed | Default State | How to Revoke |
| :--- | :--- | :--- | :--- | :--- |
| `POST_NOTIFICATIONS` | Foreground Service | Displays the ongoing connection status notification so Android keeps the local relay active. | Prompted on start (API 33+) | App Settings &rarr; Notifications |
| `READ_SMS`, `RECEIVE_SMS`, `SEND_SMS` | SMS Relay | Allows reading received SMS and sending SMS replies directly from your PC dashboard over local WiFi. | **OFF** | App Settings &rarr; Permissions &rarr; SMS |
| `READ_CALL_LOG`, `READ_PHONE_STATE` | Call Logs & Ring Alerts | Displays recent call history and notifies your PC when an incoming call is ringing. | **OFF** | App Settings &rarr; Permissions &rarr; Phone / Call logs |
| `READ_CONTACTS`, `WRITE_CONTACTS` | Contacts Sync | Syncs contacts with your dashboard and allows adding new contacts remotely. | **OFF** | App Settings &rarr; Permissions &rarr; Contacts |
| `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | Device Location | Shows device location on your personal dashboard map while connected. | **OFF** | App Settings &rarr; Permissions &rarr; Location |
| `CAMERA` | Camera Live Stream | Allows taking snapshots or streaming live camera feed (e.g., room/pet monitor) to your private PC. | **OFF** | App Settings &rarr; Permissions &rarr; Camera |
| `RECORD_AUDIO` | Microphone Audio | Records short audio clips upon request to help locate your device or listen nearby. | **OFF** | App Settings &rarr; Permissions &rarr; Microphone |
| `MANAGE_EXTERNAL_STORAGE` | File Explorer | Provides access to browse, download, and upload files to device internal storage from your computer. | **OFF** | App Settings &rarr; Special App Access &rarr; All Files Access |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Background Reliability | Prevents OEM battery savers (Doze) from killing the local WebSocket connection while the phone screen is off. | **OFF** | App Settings &rarr; Battery &rarr; Unrestricted |
| `VIBRATE` | Device Controls | Allows vibrating the phone upon request from the dashboard. | Granted at install | Toggle off in dashboard |
| `SET_WALLPAPER` | Device Controls | Allows updating phone wallpaper remotely from the dashboard controls. | Granted at install | Toggle off in dashboard |
| `QUERY_ALL_PACKAGES` | Installed Apps | Displays installed applications in the dashboard management tab. | Granted at install | Toggle off in dashboard |
| `RECEIVE_BOOT_COMPLETED` | Autostart | Restarts the background relay service when the phone is rebooted. | Granted at install | Disable Autostart in system settings |
| `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` | Network Connection | Connects to your local PC server over Wi-Fi / LAN or your designated private ngrok tunnel. | Granted at install | N/A (Core network requirement) |

---

## Special System Privileges (Explicit System Prompts)

### 1. Notification Mirroring (`BIND_NOTIFICATION_LISTENER_SERVICE`)
- **Purpose**: Captures incoming notification headers and forwards them over your local network so you can read and dismiss them from your PC.
- **Privacy**: Does not forward notification content to any third-party server.
- **How to Revoke**: Settings &rarr; Apps &rarr; Special app access &rarr; Notification access &rarr; Toggle off **Phone Link Hub**.

### 2. Find My Phone (`BIND_ACCESSIBILITY_SERVICE`)
- **Purpose**: Bypasses system silent mode and Do Not Disturb (DND) so an audible alarm sounds at maximum volume when you trigger "Find My Phone" from your dashboard.
- **Privacy Scope**: `canRetrieveWindowContent` and `canPerformGestures` are strictly set to `false`. It does **NOT** read screen content, record keystrokes, or simulate touches.
- **How to Revoke**: Settings &rarr; Accessibility &rarr; Phone Link Hub &rarr; Toggle OFF.

### 3. Remote Screen Lock (`BIND_DEVICE_ADMIN`)
- **Purpose**: Executes immediate screen locking if you click "Lock Phone" from your PC dashboard when the device is unattended.
- **Scope**: Limited strictly to `lock()` authority. It has no permission to wipe data, change device passcodes, or inspect phone usage.
- **How to Revoke**: Settings &rarr; Security &rarr; Device admin apps &rarr; Deactivate **Phone Link Hub**.

### 4. Call Screening & Blocker (`ROLE_CALL_SCREENING`)
- **Purpose**: Checks incoming call phone numbers against your custom blocklist stored on your self-hosted dashboard and rejects unwanted callers.
- **Privacy**: No call recordings or call metadata are ever uploaded to cloud databases.
- **How to Revoke**: Settings &rarr; Apps &rarr; Default apps &rarr; Caller ID & spam app &rarr; Select None or system default.

### 5. Screen View & Screenshot (Media Projection)
- **Purpose**: Streams phone display frames to your desktop browser.
- **Consent**: Android displays a system security dialog (*"Phone Link Hub will start capturing everything that's displayed on your screen"*) each time a capture session is initiated. You must tap "Start now" for screen data to be accessed.

---

## Permissions Explicitly Excluded
- **No `ACCESS_BACKGROUND_LOCATION`**: Background location access has been completely removed. The app only accesses location in the foreground while the service is active and only when the user explicitly turns on the Location toggle.
- **No `CHANGE_WIFI_STATE`**: Removed as unnecessary.
- **No Dynamic Code Loading (DCL)**: The app contains no secondary DEX loading, remote class downloading, or hidden payloads.

