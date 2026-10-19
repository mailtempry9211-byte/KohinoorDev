# 🌐 PhoneLink Hub - Remote Access & Port Forwarding Guide
### (Out-of-Network / Cellular 4G & 5G Connection Guide)

Yeh guide un users ke liye hai jo apne Android phone ko **ghar ke Wi-Fi se bahar** (Cellular 4G/5G ya kisi dusre network se) PhoneLink Hub se connect karna chahte hain.

---

## 📌 Summary: 4 Ways to Connect Your Phone

| Method | Speed & Latency | Setup Time | Difficulty | Best For |
|---|---|---|---|---|
| **1. Same Wi-Fi (Local)** | ⚡ Ultra-Fast (<5ms) | 0 Sec | Zero | Ghar/Office ke Wi-Fi par |
| **2. Cloudflare Tunnel** | 🚀 High Speed | 1 Minute | Bahut Aasan (No Account Needed) | Dunya me kahin se bhi free |
| **3. ngrok Manual CLI** | 🌐 Fast | 2 Minutes | Aasan | Quick Testing outside Wi-Fi |
| **4. Router Port Forward** | ⚡ Direct Line | 3 Minutes | Medium | Permanent 24/7 High-Performance |

---

## 📶 Method 1: Same Wi-Fi Network (Default - 0 Setup)
Agar aapka Computer aur Android Phone dono **ek hi Wi-Fi router ya mobile hotspot** se connected hain:

1. PhoneLink Hub kholen.
2. Saamne ya Sidebar me aapka Local IP dikhega:
   ```text
   http://192.168.x.x:5000
   ```
3. Android phone me PhoneLink app kholen aur yeh IP aur Port (`5000`) daal kar **Connect** daba dein.
4. **Done!** Telemetry, calls, SMS, camera sab turant live sync ho jayenge.

---

## ☁️ Method 2: Cloudflare Tunnel (100% Free & No Account Needed) - RECOMMENDED ⭐
Cloudflare ek permanent aur super fast secure tunnel deta hai jisme **koi account banana ya credit card dalna nahi padta**.

### Steps:
1. **Download Cloudflared**:
   - Windows ke liye yahan se download karein: [cloudflared-windows-amd64.exe](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe)
   - File ko kisi aasan jagah save karein (jaise `C:\cloudflared.exe`).

2. **Command Prompt (CMD) me ek line chalayein**:
   ```cmd
   cloudflared.exe tunnel --url http://localhost:5000
   ```

3. **Output me public URL milega**:
   Aapko terminal me ek link dikhegi jo aisi dikhti hai:
   ```text
   https://random-words-here.trycloudflare.com
   ```

4. **Phone me daalein**:
   PhoneLink Android app me Server Address me yahi `https://random-words-here.trycloudflare.com` paste karein aur Connect daba dein!

---

## 🚀 Method 3: Manual ngrok CLI
Agar aap ngrok pasand karte hain, toh standalone ngrok CLI se bhi direct tunnel chala sakte hain bina kisi background crash ke.

### Steps:
1. **Download ngrok**:
   - [ngrok.com/download](https://ngrok.com/download) se Windows ke liye ngrok download karein.
2. **Apna AuthToken add karein (Ek baar)**:
   ```cmd
   ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
   ```
3. **Tunnel Start Karein**:
   ```cmd
   ngrok http 5000
   ```
4. **Phone me daalein**:
   ngrok ke screen par `Forwarding` ke aage URL dikhega:
   ```text
   https://xxxx-xx-xx.ngrok-free.app
   ```
   Is URL ko Android phone ke app me Server URL ki jagah paste karein aur Connect daba dein.

---

## 🔌 Method 4: Home Wi-Fi Router Direct Port Forwarding (Direct P2P)
Agar aap bina kisi third-party tunnel service ke direct direct full-speed connection chahte hain:

1. **PC ka Local Static IP dekhein**:
   - `CMD` kholen aur `ipconfig` type karein (e.g., `192.168.1.5`).
2. **Router Admin Page Kholen**:
   - Browser me `192.168.1.1` ya `192.168.0.1` open karein.
   - **Port Forwarding / Virtual Server** settings me jaayein.
3. **Rule Add Karein**:
   - **Service Name**: `PhoneLink`
   - **Port Range / External Port**: `5000`
   - **Internal Port**: `5000`
   - **Protocol**: `TCP` (ya `Both TCP/UDP`)
   - **Internal IP**: Aapke PC ka IP (e.g. `192.168.1.5`)
   - Click **Save / Apply**.
4. **Apna Public IP Pata Karein**:
   - Google par search karein `"what is my ip"`. (e.g., `103.25.x.x`)
5. **Phone me daalein**:
   - Phone app me Server address daalein: `http://103.25.x.x:5000`

---

## 💡 Troubleshooting & FAQ

- **Q: Phone connect nahi ho raha?**
  - Make sure computer par Windows Firewall me Port 5000 allow ho:
    `netsh advfirewall firewall add rule name="PhoneLink 5000" dir=in action=allow protocol=TCP localport=5000`
- **Q: Kya app ko open rakhna zaroori hai?**
  - PhoneLink Hub `.exe` running honi chahiye taaki Android device live data sync kar sake.

