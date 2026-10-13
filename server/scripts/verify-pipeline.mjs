/**
 * Smoke test for the local pipeline without a browser.
 *
 *   node scripts/verify-pipeline.mjs
 *
 * Connects as a dashboard client, waits for the mock devices to push data,
 * then exercises the command relay for SMS + file list.
 */
import WebSocket from 'ws';

const URL = 'ws://127.0.0.1:5000';
const results = [];
let socket;
const received = { calls: 0, sms: 0, locations: 0, devices: 0, fileList: null };

function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const timeout = setTimeout(() => finish('timed out'), 60_000);

function finish(reason) {
  clearTimeout(timeout);
  console.log(`\n--- ${reason} ---`);
  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  socket?.close();
  process.exit(failed > 0 ? 1 : 0);
}

socket = new WebSocket(URL);
const api = async (path, options) => {
  const res = await fetch(`http://127.0.0.1:5000${path}`, options);
  return res.json();
};

socket.on('open', async () => {
  console.log('dashboard client connected');

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Wait for the live streams instead of sleeping a fixed duration, so the
  // checks do not depend on where in the mock's cadence we happened to start.
  const waitFor = (predicate, ms = 45_000) => new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (predicate()) return resolve(true);
      if (Date.now() - started >= ms) return resolve(false);
      setTimeout(tick, 250);
    };
    tick();
  });

  const gotAllStreams = await waitFor(() => received.calls > 0 && received.sms > 0 && received.locations > 0);
  check('live streams observed', gotAllStreams, `calls=${received.calls} sms=${received.sms} locations=${received.locations}`);

  const devices = await api('/api/devices');
  check('devices registered', devices.length >= 1, `${devices.length} device(s)`);

  const pixel = devices.find((d) => d.id === 'mock-pixel-8');
  check('mock Pixel present', !!pixel, pixel ? `${pixel.battery}% ${pixel.online ? 'online' : 'offline'}` : '');

  const calls = await api(`/api/devices/${pixel.id}/calls`);
  check('calls synced', calls.length > 5, `${calls.length} calls`);
  check('calls have all types', new Set(calls.map((c) => c.type)).size >= 2, [...new Set(calls.map((c) => c.type))].join(','));

  const messages = await api(`/api/devices/${pixel.id}/messages`);
  check('messages synced', messages.length >= 5, `${messages.length} messages`);
  check('messages have both directions', new Set(messages.map((m) => m.type)).size === 2, `types ${[...new Set(messages.map((m) => m.type))].join(',')}`);

  const location = await api(`/api/devices/${pixel.id}/location`);
  check('location fix', location?.latitude != null, `${location?.latitude}, ${location?.longitude}`);

  check('ws received device updates', received.devices > 0, `${received.devices} DEVICE_UPDATE events`);
  check('ws received calls', received.calls > 0, `${received.calls} CALLS_SYNCED events`);
  check('ws received sms', received.sms > 0, `${received.sms} SMS_SYNCED events`);
  check('ws received locations', received.locations > 0, `${received.locations} LOCATION_UPDATE events`);

  // ---- command relay -----------------------------------------------------
  const sms = await api('/api/command/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: pixel.id, recipient: '+91 98765 43210', message: 'Pipeline verification' })
  });
  check('send-sms command accepted', sms.success === true);

  await wait(2500);
  const after = await api(`/api/devices/${pixel.id}/messages`);
  const echoed = after.find((m) => m.body === 'Pipeline verification');
  check('sms relayed back', !!echoed, echoed ? `type ${echoed.type}` : 'not found');

  // ---- file list ---------------------------------------------------------
  await new Promise((resolve) => {
    const handler = (event, payload) => {
      if (event === 'FILE_LIST_RESPONSE' && payload.path === '/') {
        socket.off('message', handler);
        received.fileList = payload;
        resolve();
      }
    };
    socket.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      handler(msg.event, msg.payload || {});
    });

    api('/api/command/file-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: pixel.id, path: '/' })
    }).then((r) => check('file-list command accepted', r.success === true));

    setTimeout(() => {
      socket.off('message', handler);
      resolve();
    }, 5000);
  });

  check('file list response received', Array.isArray(received.fileList?.entries), `${received.fileList?.entries?.length ?? 0} entries`);
  check('file list has folders', (received.fileList?.entries || []).some((e) => e.isDirectory), (received.fileList?.entries || []).map((e) => e.name).join(', '));

  // ---- download ----------------------------------------------------------
  const camPath = '/DCIM/Camera';
  const dl = await api('/api/command/file-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: pixel.id, path: '/DCIM' })
  });
  check('dcim listing requested', dl.success === true);

  await wait(1000);
  finish('verification complete');
});

socket.on('message', (raw) => {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }
  const p = msg.payload || {};
  if (msg.event === 'DEVICE_UPDATE') received.devices += 1;
  if (msg.event === 'CALLS_SYNCED') received.calls += 1;
  if (msg.event === 'SMS_SYNCED') received.sms += 1;
  if (msg.event === 'LOCATION_UPDATE') received.locations += 1;
});

socket.on('error', (e) => {
  console.error('socket error:', e.message);
  finish('socket error');
});