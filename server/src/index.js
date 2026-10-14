import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { JSONFilePreset } from 'lowdb/node';
import { randomUUID } from 'crypto';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const defaultData = { devices: [], calls: [], messages: [], locations: [], notifications: [], contacts: [] };
const db = await JSONFilePreset(join(dataDir, 'db.json'), defaultData);
await db.read();

// defaultData only applies when db.json doesn't exist yet — an existing file
// from before a field was added (e.g. "notifications") keeps its old shape
// forever otherwise, and every route touching the missing key throws
// "Cannot read properties of undefined". Backfill anything missing so this
// can't silently break again as the schema grows.
for (const key of Object.keys(defaultData)) {
  if (!Array.isArray(db.data[key])) db.data[key] = [];
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
        wifiName: wifiName || null,
        lastSeen: Date.now(),
        last_seen: Date.now(),
        online: true,
        wsClientId: ws.clientId
      };
      devices.set(deviceId, device);
      persistDevice(device);
      ws.send(JSON.stringify({ event: 'DEVICE_REGISTERED', payload: { deviceId } }));
      broadcastToDashboard('DEVICE_UPDATE', device);
      console.log(`[device] registered ${deviceId} (${device.deviceName}) @${battery}%`);
      break;
    }

    case 'DEVICE_STATUS': {
      const { deviceId, battery, isCharging, wifiName } = payload;
      const device = devices.get(deviceId);
      if (!device) return;
      device.battery = Number.isFinite(battery) ? battery : device.battery;
      device.isCharging = !!isCharging;
      if (wifiName) device.wifiName = wifiName;
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
      const { deviceId, latitude, longitude, accuracy, timestamp } = payload;
      db.data.locations.push({ id: randomUUID(), deviceId, latitude, longitude, accuracy, timestamp: timestamp || Date.now() });
      db.write();
      broadcastToDashboard('LOCATION_UPDATE', { deviceId, latitude, longitude, accuracy, timestamp: timestamp || Date.now() });
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
  res.json(latest ? { latitude: latest.latitude, longitude: latest.longitude, accuracy: latest.accuracy, timestamp: latest.timestamp } : null);
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
  devices.delete(id);
  await db.write();
  broadcastToDashboard('DEVICE_REMOVED', { deviceId: id });
  console.log(`[device] removed ${id} (${before - db.data.devices.length} record(s))`);
  res.json({ success: true, removed: before - db.data.devices.length });
});

app.post('/api/command/:name', (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ success: false, error: 'deviceId is required' });
  if (!devices.get(deviceId)?.wsClientId) {
    return res.status(409).json({ success: false, error: 'Device is offline' });
  }

  switch (req.params.name) {
    case 'send-sms':
      sendToDevice(deviceId, 'SEND_SMS_COMMAND', { recipient: req.body.recipient, message: req.body.message });
      break;
    case 'file-list':
      sendToDevice(deviceId, 'FILE_LIST_REQUEST', { path: req.body.path || '/' });
      break;
    case 'file-download':
      sendToDevice(deviceId, 'FILE_DOWNLOAD_REQUEST', { path: req.body.path, name: req.body.name, mimeType: req.body.mimeType });
      break;
    case 'file-upload':
      sendToDevice(deviceId, 'FILE_UPLOAD_CHUNK', { path: req.body.path, data: req.body.data, isLastChunk: req.body.isLastChunk });
      break;
    case 'request-location':
      sendToDevice(deviceId, 'LOCATION_REQUEST', {});
      break;
    // BUG 5: manual refresh targets (same pattern as request-location).
    case 'request-calls':
      sendToDevice(deviceId, 'CALLS_REQUEST', {});
      break;
    case 'request-sms':
      sendToDevice(deviceId, 'SMS_REQUEST', {});
      break;
    case 'request-contacts':
      sendToDevice(deviceId, 'CONTACTS_REQUEST', {});
      break;
    case 'add-contact':
      sendToDevice(deviceId, 'ADD_CONTACT_COMMAND', { name: req.body.name, number: req.body.number });
      break;
    case 'find-phone':
      sendToDevice(deviceId, 'FIND_PHONE_COMMAND', {});
      break;
    case 'notification-dismiss':
      sendToDevice(deviceId, 'NOTIFICATION_DISMISS_COMMAND', { key: req.body.key });
      break;
    case 'notification-clear-all':
      sendToDevice(deviceId, 'NOTIFICATION_CLEAR_ALL_COMMAND', {});
      break;
    default:
      return res.status(404).json({ success: false, error: `Unknown command: ${req.params.name}` });
  }
  res.json({ success: true });
});

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
