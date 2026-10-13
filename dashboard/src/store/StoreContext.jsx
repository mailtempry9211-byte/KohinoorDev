import { useState, useCallback, useEffect, useMemo, createContext, useContext, useRef } from 'react';

const WS_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'ws://localhost:5000'
  : `ws://${location.hostname}:5000`;

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [devices, setDevices] = useState({});
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [calls, setCalls] = useState({});
  const [messages, setMessages] = useState({});
  const [locations, setLocations] = useState({});
  const [files, setFiles] = useState({ path: '/', entries: [], downloadBuffer: '' });
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const [incomingCallAlert, setIncomingCallAlert] = useState(null);
  const [smsAlert, setSmsAlert] = useState(null);
  const [toasts, setToasts] = useState([]);
  const ws = useRef(null);
  const alertTimers = useRef({});

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
          setFiles({ path: p.path || '/', entries: p.entries || [], error: p.error });
          break;
        }

        case 'FILE_DOWNLOAD_RESPONSE': {
          if (p.error) {
            setFiles((f) => ({ ...f, download: { error: p.error }, downloadBuffer: '' }));
            pushToast(`Download failed: ${p.error}`, 'error');
            break;
          }
          setFiles((f) => {
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
      markNotificationRead: (key) => setNotifications((prev) => prev.map((n) => n.key === key ? { ...n, read: true } : n)),
      dismissNotification: (key) => {
        setNotifications((prev) => prev.filter((n) => n.key !== key));
        sendCommand('notification-dismiss', { deviceId: activeDeviceId, key });
      },
      dismissAllNotifications: () => {
        setNotifications([]);
        if (activeDeviceId) sendCommand('notification-clear-all', { deviceId: activeDeviceId });
      }
    }),
    [devices, activeDeviceId, calls, messages, locations, files, notifications, connected, incomingCallAlert, smsAlert, toasts, sendCommand, dismissAlert, dismissSmsAlert, pushToast]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}