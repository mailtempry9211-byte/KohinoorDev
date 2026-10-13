/**
 * Checks that the ARCHITECTURE.md event/payload spellings normalize to the
 * canonical protocol, so both naming conventions drive one server.
 *
 *   node scripts/verify-protocol-aliases.mjs
 */
import WebSocket from 'ws';

const results = [];
const seen = [];
let socket;

function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

socket = new WebSocket('ws://127.0.0.1:5000');
const timeout = setTimeout(() => finish('timed out'), 15_000);

function finish(reason) {
  clearTimeout(timeout);
  console.log(`\n--- ${reason} ---`);
  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  socket?.close();
  process.exit(failed > 0 ? 1 : 0);
}

socket.on('open', () => {
  // ARCHITECTURE.md spellings: name (not deviceName), lat/lng, INBOX, CMD_*.
  socket.send(JSON.stringify({
    event: 'DEVICE_REGISTER',
    payload: { deviceId: 'alias-phone', name: 'Alias Pixel', battery: 91, isCharging: true }
  }));

  socket.send(JSON.stringify({
    event: 'SYNC_CALLS',
    payload: {
      deviceId: 'alias-phone',
      calls: [{ number: '+91 90000 00001', name: 'Boss', type: 'MISSED', timestamp: Date.now() }]
    }
  }));

  socket.send(JSON.stringify({
    event: 'SYNC_SMS',
    payload: {
      deviceId: 'alias-phone',
      messages: [{ address: 'VK-HDFCBK', body: 'OTP is 543210', date: Date.now(), type: 'INBOX' }]
    }
  }));

  socket.send(JSON.stringify({
    event: 'LOCATION_REPORT',
    payload: { deviceId: 'alias-phone', lat: 28.6139, lng: 77.209, accuracy: 12.5, updatedAt: Date.now() }
  }));

  socket.send(JSON.stringify({
    event: 'INCOMING_CALL_RING',
    payload: { deviceId: 'alias-phone', number: '+91 90000 00002', name: 'Mom', timestamp: Date.now() }
  }));

  setTimeout(() => {
    const device = seen.find((e) => e.event === 'DEVICE_UPDATE' && e.payload.deviceId === 'alias-phone')?.payload;
    check('name -> deviceName normalized', device?.deviceName === 'Alias Pixel', device?.deviceName);

    const call = seen.find((e) => e.event === 'CALLS_SYNCED' && e.payload.deviceId === 'alias-phone')?.payload.calls?.[0];
    check('MISSED -> missed', call?.type === 'missed', call?.type);

    const sms = seen.find((e) => e.event === 'SMS_SYNCED' && e.payload.deviceId === 'alias-phone')?.payload.messages?.[0];
    check('INBOX -> type 1', sms?.type === 1, String(sms?.type));

    const loc = seen.find((e) => e.event === 'LOCATION_UPDATE' && e.payload.deviceId === 'alias-phone')?.payload;
    check('lat/lng -> latitude/longitude', loc?.latitude === 28.6139 && loc?.longitude === 77.209, `${loc?.latitude}, ${loc?.longitude}`);
    check('updatedAt -> timestamp', Number.isFinite(loc?.timestamp), String(loc?.timestamp));

    const ring = seen.find((e) => e.event === 'INCOMING_CALL_RING' && e.payload.deviceId === 'alias-phone')?.payload;
    check('INCOMING_CALL_RING forwarded verbatim', ring?.number === '+91 90000 00002', ring?.number);

    finish('alias verification complete');
  }, 1500);
});

socket.on('message', (raw) => {
  try {
    const msg = JSON.parse(raw.toString());
    if (msg.event !== 'DEVICE_REGISTERED') seen.push(msg);
  } catch {
    /* ignore */
  }
});

socket.on('error', (e) => {
  console.error('socket error:', e.message);
  finish('socket error');
});