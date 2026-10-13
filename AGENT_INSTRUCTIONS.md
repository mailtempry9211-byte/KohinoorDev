# Instructions for AI Coding Agents (Cline / Kilo / Roo Code / Cursor)

Welcome, AI Agent! You are building and maintaining the **Personal Multi-Device Android Phone Link & Hub**.
Follow these strict operating principles:

---

## 1. Context & Purpose
- The user uses multiple computers (Linux, Windows, ChromeOS) and wants to control 3-4 personal Android phones from a web browser.
- **NEVER** lock the project to a single OS or a paid platform.
- **Always prioritize Phase 1 (Local Testing First)** before trying to deploy to cloud providers.

---

## 2. Rules of Engagement

### Rule 1: Local First, Zero-Cost Philosophy
- Do NOT introduce paid APIs. (Use Leaflet/OpenStreetMap instead of Google Maps API; use free Supabase/Railway/Vercel tiers).
- The local development server must be runnable with standard `npm install` and `npm run dev`.

### Rule 2: Multi-Device First
- Everything in the database, WebSocket protocol, and UI state must include a `deviceId` tag. Never assume there is only one phone connected.

### Rule 3: Android Stability & Power
- Android client must use a Foreground Service with `NotificationCompat` and `START_STICKY`.
- Always request battery optimization exemption (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) so Android does not kill the WebSocket connection.

### Rule 4: Incremental Testing
- Step 1: Run the backend and frontend locally. Verify with mock data.
- Step 2: Test sending an SMS command from frontend -> backend.
- Step 3: Connect real Android APK to backend local IP (`http://192.168.x.x:5000`).
- Step 4: Verify Call logs, SMS, Storage, and Location end-to-end.

---

## 3. How to Pick Up the Project
1. Check `PROGRESS.md` to see what is already built and what milestone is next.
2. Check `ARCHITECTURE.md` to ensure your code follows the agreed WebSocket schemas and folder patterns.
3. Update `PROGRESS.md` after completing your turn so subsequent agents know where to continue without confusion.
