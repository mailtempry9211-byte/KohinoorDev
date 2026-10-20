import { execSync } from 'child_process';
import crypto from 'crypto';
import os from 'os';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://dhqqyinbtjttndxfeloa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRocXF5aW5idGp0dG5keGZlbG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzODI3ODAsImV4cCI6MjEwNzk1ODc4MH0.w4K9J9Qrn-IA1uAL_qXtbQ626-lKZpEke3GLu7s6exE';
const SUPPORT_PHONE = '8418944572';

const GOD_KEY_HASHES = new Set([
  '63920eb6fd71629013f1d79bb0097039f4fa87cdfd8f63ea5a01f62dfa6e2e4c', // Master Super Key 1
  '6948da67d7156743ebb323962589e1071f5293011b767b8cf2a013497dd61ebc', // Master Super Key 2
  'b68c867dcc06d00025bc11c13bb9b1be2dbb2b574d5dbb79516a9aca016cbd34'  // Master Super Key 3
]);

export function isMasterGodKey(key) {
  if (!key) return false;
  const hash = crypto.createHash('sha256').update(String(key).trim()).digest('hex');
  return GOD_KEY_HASHES.has(hash);
}

const dataDir = process.env.DATA_DIR || join(__dirname, '..', 'data');
const licenseFilePath = join(dataDir, 'license.json');

let cachedHwid = null;

/**
 * Generates a stable, tamper-proof Hardware ID (HWID) for this machine.
 */
export function getMachineHwid() {
  if (cachedHwid) return cachedHwid;

  let rawId = '';
  try {
    if (process.platform === 'win32') {
      try {
        // Try Windows Motherboard UUID
        rawId = execSync('powershell -NoProfile -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"', {
          encoding: 'utf8',
          timeout: 4000
        }).trim();
      } catch (_) {}

      if (!rawId || rawId.length < 5 || rawId.includes('FFFFFFF')) {
        // Fallback to MachineGuid
        try {
          rawId = execSync('powershell -NoProfile -Command "(Get-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Cryptography\').MachineGuid"', {
            encoding: 'utf8',
            timeout: 4000
          }).trim();
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('[license] HWID primary probe error:', err?.message);
  }

  // Final fallback to hostname + platform architecture
  if (!rawId || rawId.length < 5) {
    rawId = `${os.hostname()}-${os.platform()}-${os.arch()}`;
  }

  const hash = crypto.createHash('sha256').update(rawId + 'PhoneLinkHub2026').digest('hex').toUpperCase();
  cachedHwid = `PLH-WIN-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
  return cachedHwid;
}

export function getDeviceName() {
  return os.hostname() || 'Windows PC';
}

export function getWhatsAppSupportUrl(message) {
  const text = encodeURIComponent(message || `Hello Admin, I need support with Phone Link Hub License (HWID: ${getMachineHwid()})`);
  return `https://wa.me/91${SUPPORT_PHONE}?text=${text}`;
}

function loadLocalLicense() {
  try {
    if (existsSync(licenseFilePath)) {
      const content = readFileSync(licenseFilePath, 'utf8');
      const data = JSON.parse(content);
      // God Mode is in-memory only and never persists across app restarts
      if (data.isGodMode) {
        try { unlinkSync(licenseFilePath); } catch (_) {}
        return {
          activated: false,
          isGodMode: false,
          licenseKey: null,
          planType: null,
          validUntil: null,
          maxDevices: 1,
          activeDevices: 0,
          registeredDevices: [],
          lastValidated: 0
        };
      }
      return data;
    }
  } catch (e) {
    console.error('[license] Failed to read license.json:', e);
  }
  return {
    activated: false,
    isGodMode: false,
    licenseKey: null,
    planType: null,
    validUntil: null,
    maxDevices: 1,
    activeDevices: 0,
    registeredDevices: [],
    lastValidated: 0
  };
}

function saveLocalLicense(data) {
  try {
    // Never persist God Mode to disk
    if (data.isGodMode) return;
    writeFileSync(licenseFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[license] Failed to write license.json:', e);
  }
}

let licenseState = loadLocalLicense();

/**
 * Checks system clock for rollback tampering.
 */
function verifyClockTampering(serverTimestampMs) {
  // If God Mode is active, bypass clock tampering
  if (licenseState.isGodMode) return { tampered: false };

  const localNow = Date.now();
  if (licenseState.lastValidated && localNow < licenseState.lastValidated - 300000) {
    // Clock moved backwards by more than 5 minutes
    return {
      tampered: true,
      reason: 'SYSTEM_CLOCK_ROLLBACK_DETECTED',
      message: 'System clock has been set backwards. Please correct your computer date & time.'
    };
  }
  if (serverTimestampMs && Math.abs(localNow - serverTimestampMs) > 24 * 3600 * 1000) {
    return {
      tampered: true,
      reason: 'CLOCK_DESYNC',
      message: 'System date does not match server time. Please synchronize Windows Internet Time.'
    };
  }
  return { tampered: false };
}

/**
 * Validates or activates a license key on Supabase or unlocks God Mode.
 */
export async function activateLicense(licenseKey) {
  const hwid = getMachineHwid();
  const deviceName = getDeviceName();
  const trimmed = (licenseKey || '').trim();

  // 1. 👑 MASTER KEY GOD-MODE BYPASS (Owner Superuser)
  if (isMasterGodKey(trimmed)) {
    console.log('[license] 👑 GOD MODE UNLOCKED BY OWNER!');
    licenseState = {
      activated: true,
      isGodMode: true,
      licenseKey: 'OWNER-GOD-MODE-ACTIVE',
      planType: '👑 Owner God Mode (Unrestricted)',
      validUntil: new Date(Date.now() + 100 * 365 * 86400000).toISOString(),
      maxDevices: 9999,
      activeDevices: 1,
      registeredDevices: [
        {
          hwid: hwid,
          device_name: `${deviceName} (Owner Master Terminal)`,
          activated_at: new Date().toISOString()
        }
      ],
      lastValidated: Date.now()
    };
    // Note: NEVER saved to disk, so next restart requires re-entering master key
    return {
      success: true,
      code: 'GOD_MODE_ACTIVATED',
      message: 'License Activated! Full unrestricted access granted.',
      planType: licenseState.planType,
      maxDevices: 9999,
      activeDevices: 1,
      validUntil: licenseState.validUntil,
      isGodMode: true,
      registeredDevices: licenseState.registeredDevices
    };
  }

  const clockCheck = verifyClockTampering();
  if (clockCheck.tampered) {
    return {
      success: false,
      code: clockCheck.reason,
      message: clockCheck.message,
      supportWhatsApp: getWhatsAppSupportUrl(`Clock Error: ${clockCheck.reason} on HWID: ${hwid}`)
    };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_or_activate_license`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_license_key: licenseKey.trim(),
        p_hwid: hwid,
        p_device_name: deviceName
      })
    });

    const data = await res.json();
    console.log('[license] validate_or_activate_license response:', data);

    if (data.success && (data.code === 'ACTIVATED' || data.code === 'ALREADY_ACTIVE')) {
      licenseState = {
        activated: true,
        licenseKey: licenseKey.trim(),
        planType: data.plan_type,
        validUntil: data.valid_until,
        maxDevices: data.max_devices,
        activeDevices: data.active_devices,
        registeredDevices: data.registered_devices || [],
        lastValidated: Date.now()
      };
      saveLocalLicense(licenseState);

      return {
        success: true,
        code: data.code,
        message: data.message,
        planType: data.plan_type,
        maxDevices: data.max_devices,
        activeDevices: data.active_devices,
        validUntil: data.valid_until,
        registeredDevices: data.registered_devices || []
      };
    }

    // If device limit reached or strict hardware lock
    return {
      success: false,
      code: data.code || 'ACTIVATION_FAILED',
      message: data.message || 'Activation failed',
      maxDevices: data.max_devices,
      registeredDevices: data.registered_devices || [],
      supportWhatsApp: getWhatsAppSupportUrl(`License Activation Issue (${data.code}): Key ${licenseKey} HWID: ${hwid}`)
    };
  } catch (err) {
    console.error('[license] Supabase network error:', err);
    return {
      success: false,
      code: 'NETWORK_ERROR',
      message: 'Could not connect to license server. Please verify your internet connection.',
      supportWhatsApp: getWhatsAppSupportUrl(`Network error activating key ${licenseKey} on HWID: ${hwid}`)
    };
  }
}

/**
 * Terminates an old registered PC and replaces it with this PC.
 */
export async function replaceAndActivateDevice(licenseKey, oldHwid) {
  const hwid = getMachineHwid();
  const deviceName = getDeviceName();

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/terminate_and_replace_device`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_license_key: licenseKey.trim(),
        p_old_hwid: oldHwid,
        p_new_hwid: hwid,
        p_new_device_name: deviceName
      })
    });

    const data = await res.json();
    console.log('[license] terminate_and_replace_device response:', data);

    if (data.success && data.code === 'REPLACED_AND_ACTIVATED') {
      licenseState = {
        activated: true,
        licenseKey: licenseKey.trim(),
        planType: data.plan_type,
        validUntil: data.valid_until,
        maxDevices: data.max_devices,
        activeDevices: data.active_devices,
        registeredDevices: data.registered_devices || [],
        lastValidated: Date.now()
      };
      saveLocalLicense(licenseState);

      return {
        success: true,
        code: data.code,
        message: data.message,
        planType: data.plan_type,
        maxDevices: data.max_devices,
        activeDevices: data.active_devices,
        validUntil: data.valid_until,
        registeredDevices: data.registered_devices || []
      };
    }

    return {
      success: false,
      code: data.code || 'REPLACE_FAILED',
      message: data.message || 'Could not replace device',
      supportWhatsApp: getWhatsAppSupportUrl(`Device transfer failed for key ${licenseKey} on HWID: ${hwid}`)
    };
  } catch (err) {
    console.error('[license] Supabase replace error:', err);
    return {
      success: false,
      code: 'NETWORK_ERROR',
      message: 'Could not connect to license server.',
      supportWhatsApp: getWhatsAppSupportUrl(`Network error replacing device for key ${licenseKey}`)
    };
  }
}

/**
 * Returns current license status for dashboard.
 */
export function getLicenseStatus() {
  const hwid = getMachineHwid();
  const deviceName = getDeviceName();
  const localNow = Date.now();

  let daysRemaining = 0;
  let isExpired = false;

  if (licenseState.validUntil) {
    const expiry = new Date(licenseState.validUntil).getTime();
    const diffMs = expiry - localNow;
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (diffMs <= 0) {
      isExpired = true;
    }
  }

  const clockCheck = verifyClockTampering();

  return {
    activated: licenseState.activated && !isExpired && !clockCheck.tampered,
    isGodMode: !!licenseState.isGodMode,
    isExpired,
    clockTampered: clockCheck.tampered,
    clockMessage: clockCheck.message,
    licenseKey: licenseState.licenseKey,
    planType: licenseState.planType,
    validUntil: licenseState.validUntil,
    daysRemaining,
    maxDevices: licenseState.maxDevices || 1,
    activeDevices: licenseState.activeDevices || 0,
    registeredDevices: licenseState.registeredDevices || [],
    hwid,
    deviceName,
    supportPhone: SUPPORT_PHONE,
    supportWhatsApp: getWhatsAppSupportUrl(
      isExpired
        ? `Hello Admin, my license has expired. I want to renew it. Key: ${licenseState.licenseKey} HWID: ${hwid}`
        : `Hello Admin, I need help with Phone Link Hub license. HWID: ${hwid}`
    )
  };
}

/**
 * Logs out / deactivates the license session.
 * For God Mode, session is wiped instantly from memory.
 * For normal key, license.json is wiped so app locks back up.
 */
export function logoutLicense() {
  console.log('[license] Logging out and locking license session...');
  licenseState = {
    activated: false,
    isGodMode: false,
    licenseKey: null,
    planType: null,
    validUntil: null,
    maxDevices: 1,
    activeDevices: 0,
    registeredDevices: [],
    lastValidated: 0
  };
  try {
    if (existsSync(licenseFilePath)) {
      unlinkSync(licenseFilePath);
    }
  } catch (_) {}
  return { success: true, message: 'License deactivated. Hub is locked.' };
}

/**
 * Initializes and performs background re-validation on server start.
 */
export async function initLicenseManager() {
  const hwid = getMachineHwid();
  console.log(`[license] Initialized. Machine HWID: ${hwid} (${getDeviceName()})`);

  // Ensure God Mode is NEVER persisted across app startup
  if (licenseState.isGodMode) {
    licenseState = {
      activated: false,
      isGodMode: false,
      licenseKey: null,
      planType: null,
      validUntil: null,
      maxDevices: 1,
      activeDevices: 0,
      registeredDevices: [],
      lastValidated: 0
    };
  }

  if (licenseState.activated && licenseState.licenseKey && !licenseState.isGodMode) {
    // Re-validate in background
    setTimeout(async () => {
      try {
        console.log('[license] Performing background license validation with Supabase...');
        const result = await activateLicense(licenseState.licenseKey);
        if (!result.success) {
          console.warn('[license] Background validation failed:', result.code, result.message);
          if (result.code === 'KEY_REVOKED' || result.code === 'KEY_EXPIRED') {
            licenseState.activated = false;
            saveLocalLicense(licenseState);
          }
        } else {
          console.log('[license] Background validation successful. Active plan:', result.planType);
        }
      } catch (e) {
        console.warn('[license] Background check warning:', e.message);
      }
    }, 5000);

    // Schedule re-validation every 4 hours
    setInterval(async () => {
      if (licenseState.activated && licenseState.licenseKey && !licenseState.isGodMode) {
        try {
          await activateLicense(licenseState.licenseKey);
        } catch (_) {}
      }
    }, 4 * 3600 * 1000);
  }
}


