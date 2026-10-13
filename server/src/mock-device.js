/**
 * Mock Android device for testing the dashboard without the APK.
 *
 *   node src/mock-device.js
 *
 * Registers two fake phones (Pixel 8, Galaxy S24), streams call logs,
 * SMS threads, a periodic location fix and battery updates.
 * Delete db.json to reset persisted state.
 */
import WebSocket from 'ws';

const URL = 'ws://127.0.0.1:5000';

const DEVICES = [
  {
    deviceId: 'mock-pixel-8',
    deviceName: 'Pixel 8 (Mock)',
    battery: 78,
    isCharging: false,
    wifiName: 'Home Wi-Fi',
    baseLat: 12.9716,
    baseLon: 77.5946
  },
  {
    deviceId: 'mock-galaxy-s24',
    deviceName: 'Galaxy S24 (Mock)',
    battery: 42,
    isCharging: true,
    wifiName: 'Office-5G',
    baseLat: 12.9784,
    baseLon: 77.6408
  }
];

const CALL_NAMES = [null, 'Mom', 'Riya', 'Pizza Place', null, 'Sharma Sir', 'Delivery Agent'];
const NUMBER_POOL = ['+91 98765 43210', '+91 90080 11223', '+91 99887 76655', '+91 70102 33445', '+91 88990 55667'];

const SMS_POOL = [
  { address: '+91 98765 43210', body: 'Reached home. Call me when you get time.', type: 1 },
  { address: '+91 90080 11223', body: 'Your order #4821 has been shipped and is arriving tomorrow.', type: 1 },
  { address: '+91 99887 76655', body: 'Meeting moved to 5 PM. Please confirm.', type: 1 },
  { address: '+91 70102 33445', body: 'Sure, I will send the files tonight.', type: 2 },
  { address: 'HDFCBK', body: 'Rs. 1,250 debited from a/c **4471 on 13-10 at Starbucks.', type: 1 }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connectDevice(config) {
  let ws;
  let idCounter = Date.now();

  const send = (event, payload) => {
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ event, payload: { deviceId: config.deviceId, ...payload } }));
  };

  const open = () => {
    ws = new WebSocket(URL);

    ws.on('open', () => {
      console.log(`[mock] ${config.deviceName} connected`);
      send('DEVICE_REGISTER', {
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        battery: config.battery,
        isCharging: config.isCharging,
        wifiName: config.wifiName
      });

      seedBacklog();
      startStreams();

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.event === 'SEND_SMS_COMMAND') {
          setTimeout(() => {
            send('SYNC_SMS', {
              messages: [{
                id: `mock-sms-${++idCounter}`,
                address: msg.payload.recipient,
                body: msg.payload.message,
                date: Date.now(),
                type: 2
              }]
            });
            send('SEND_SMS_RESULT', { success: true, recipient: msg.payload.recipient });
          }, 700);
        }

        if (msg.event === 'FILE_LIST_REQUEST') {
          const path = msg.payload.path || '/';
          const entries = ['Documents', 'DCIM', 'Download', 'Music', 'Pictures'].map((name) => ({
            name,
            path: `${path === '/' ? '' : path}/${name}`,
            isDirectory: true,
            size: null,
            lastModified: Date.now() - Math.floor(Math.random() * 9e9),
            mimeType: null
          }));
          if (path.includes('DCIM')) entries.push({
            name: 'IMG_20261012_101530.jpg',
            path: `${path}/IMG_20261012_101530.jpg`,
            isDirectory: false,
            size: 2_412_064,
            lastModified: Date.now() - 400000,
            mimeType: 'image/jpeg'
          });
          send('FILE_LIST_RESPONSE', { path, entries });
        }

        if (msg.event === 'FILE_DOWNLOAD_REQUEST') {
          // ~64 KB payload split the way the real app streams chunks.
          const total = 65536;
          const full = Buffer.alloc(total);
          for (let i = 0; i < total; i += 1) full[i] = Math.floor(Math.random() * 256);
          const chunks = [full.slice(0, 32768).toString('base64'), full.slice(32768).toString('base64')];
          chunks.forEach((chunk, index) => {
            send('FILE_DOWNLOAD_RESPONSE', {
              path: msg.payload.path,
              name: msg.payload.name || 'mock-file.bin',
              mimeType: msg.payload.mimeType || 'application/octet-stream',
              data: chunk,
              isLastChunk: index === chunks.length - 1
            });
          });
        }

        if (msg.event === 'FILE_UPLOAD_CHUNK') {
          send('FILE_UPLOAD_STATUS', { path: msg.payload.path, stored: !!msg.payload.isLastChunk });
        }
      });
    });

    ws.on('close', () => {
      console.log(`[mock] ${config.deviceName} disconnected, retrying in 3s`);
      setTimeout(open, 3000);
    });

    ws.on('error', () => {});
  };

  const seedBacklog = () => {
    const calls = [];
    const now = Date.now();
    for (let i = 0; i < 26; i += 1) {
      const number = NUMBER_POOL[Math.floor(Math.random() * NUMBER_POOL.length)];
      const roll = Math.random();
      calls.push({
        id: `mock-call-seed-${config.deviceId}-${i}`,
        number,
        name: CALL_NAMES[Math.floor(Math.random() * CALL_NAMES.length)],
        type: roll < 0.28 ? 'missed' : roll < 0.64 ? 'incoming' : 'outgoing',
        duration: Math.floor(Math.random() * 1400),
        timestamp: now - i * 47 * 60 * 1000
      });
    }
    send('SYNC_CALLS', { calls });

    const messages = SMS_POOL.map((sms, index) => ({
      id: `mock-sms-seed-${config.deviceId}-${index}`,
      address: sms.address,
      body: sms.body,
      date: now - index * 55 * 60 * 1000,
      type: sms.type
    }));
    send('SYNC_SMS', { messages });

    send('LOCATION_UPDATE', {
      latitude: config.baseLat + (Math.random() - 0.5) * 0.01,
      longitude: config.baseLon + (Math.random() - 0.5) * 0.01,
      accuracy: 8 + Math.random() * 20,
      timestamp: Date.now()
    });
  };

  const startStreams = () => {
    setInterval(() => {
      const roll = Math.random();
      const number = NUMBER_POOL[Math.floor(Math.random() * NUMBER_POOL.length)];
      const type = roll < 0.22 ? 'missed' : roll < 0.55 ? 'incoming' : 'outgoing';
      send('SYNC_CALLS', {
        calls: [{
          id: `mock-call-live-${++idCounter}`,
          number,
          name: CALL_NAMES[Math.floor(Math.random() * CALL_NAMES.length)],
          type,
          duration: type === 'missed' ? 0 : Math.floor(Math.random() * 900),
          timestamp: Date.now()
        }]
      });
      if (type === 'missed') console.log(`[mock] ${config.deviceName}: missed call from ${number}`);
    }, 25_000);

    setInterval(() => {
      const sms = SMS_POOL[Math.floor(Math.random() * SMS_POOL.length)];
      send('SYNC_SMS', {
        messages: [{
          id: `mock-sms-live-${++idCounter}`,
          address: sms.address,
          body: sms.body,
          date: Date.now(),
          type: sms.type
        }]
      });
    }, 35_000);

    setInterval(() => {
      send('LOCATION_UPDATE', {
        latitude: config.baseLat + (Math.random() - 0.5) * 0.012,
        longitude: config.baseLon + (Math.random() - 0.5) * 0.012,
        accuracy: 5 + Math.random() * 25,
        timestamp: Date.now()
      });
    }, 20_000);

    setInterval(() => {
      const drain = config.isCharging ? 0.4 : 0.05;
      config.battery = Math.min(100, Math.max(3, config.battery - drain));
      send('DEVICE_STATUS', { battery: Math.round(config.battery), isCharging: config.isCharging, wifiName: config.wifiName });
    }, 30_000);
  };

  open();
}

DEVICES.forEach(connectDevice);
console.log('[mock] starting mock devices…');