import { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  MessageCircle,
  Laptop,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Lock,
  Crown,
  X
} from 'lucide-react';

export default function LicenseModal({ isOpen, onClose, onLicenseUpdated }) {
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyInput, setKeyInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [slotLimitData, setSlotLimitData] = useState(null);
  const [replacingHwid, setReplacingHwid] = useState(null);

  const handleLogout = async () => {
    try {
      await fetch('/api/license/logout', { method: 'POST' });
      setKeyInput('');
      setSlotLimitData(null);
      await fetchStatus();
    } catch (_) {}
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/license/status');
      const data = await res.json();
      setLicenseStatus(data);
      if (data.activated && onLicenseUpdated) {
        onLicenseUpdated(data);
      }
    } catch (err) {
      console.error('Failed to fetch license status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopyHwid = () => {
    if (licenseStatus?.hwid) {
      navigator.clipboard.writeText(licenseStatus.hwid);
      setCopiedHwid(true);
      setTimeout(() => setCopiedHwid(false), 2500);
    }
  };

  const handleActivate = async (e) => {
    e?.preventDefault();
    if (!keyInput.trim()) return;

    setActivating(true);
    setErrorMsg('');
    setSlotLimitData(null);

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: keyInput.trim() })
      });
      const data = await res.json();

      if (data.success) {
        setKeyInput('');
        await fetchStatus();
      } else {
        if (data.code === 'DEVICE_LIMIT_REACHED') {
          setSlotLimitData(data);
        } else {
          setErrorMsg(data.message || 'Activation failed. Please check your license key.');
        }
      }
    } catch (err) {
      setErrorMsg('Network error connecting to license server.');
    } finally {
      setActivating(false);
    }
  };

  const handleReplaceDevice = async (oldHwid) => {
    setReplacingHwid(oldHwid);
    setErrorMsg('');

    try {
      const res = await fetch('/api/license/replace-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: keyInput.trim() || licenseStatus?.licenseKey,
          oldHwid
        })
      });
      const data = await res.json();

      if (data.success) {
        setSlotLimitData(null);
        await fetchStatus();
      } else {
        setErrorMsg(data.message || 'Failed to replace device.');
      }
    } catch (err) {
      setErrorMsg('Network error replacing device.');
    } finally {
      setReplacingHwid(null);
    }
  };

  // If already activated and modal is not explicitly requested, don't show
  const isRequired = !loading && !licenseStatus?.activated;
  if (!isOpen && !isRequired) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/60 bg-[#0B0F19] text-white shadow-2xl shadow-indigo-500/10 overflow-hidden">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-600/15 blur-[80px]" />

        {/* Modal Header */}
        <div className="relative p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {licenseStatus?.activated ? 'Commercial License Details' : 'PhoneLink Hub — License Activation'}
              </h2>
              <p className="text-xs text-slate-400">
                {licenseStatus?.activated ? 'Active & Bound to this machine' : 'Enter your product key to unlock full dashboard access'}
              </p>
            </div>
          </div>

          {!isRequired && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="relative p-6 space-y-5">
          {/* Machine HWID Box */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                This Machine ID (Auto Detected)
              </span>
              <button
                type="button"
                onClick={handleCopyHwid}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
              >
                {copiedHwid ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400 font-sans font-semibold">HWID Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span className="font-sans font-semibold">Copy HWID</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
              <span className="font-semibold text-cyan-300 tracking-wide select-all">
                {licenseStatus?.hwid || 'Detecting machine...'}
              </span>
              <span className="text-[10px] text-slate-500">{licenseStatus?.deviceName}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              💡 License lene ke liye upar wala <b>Copy HWID</b> daba kar WhatsApp par Admin ko bhejein.
            </p>
          </div>

          {/* If Active: Show Status & Plan */}
          {licenseStatus?.activated && (
            <div className={`p-4 rounded-2xl border ${licenseStatus.isGodMode ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-lg shadow-amber-500/10' : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'} space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {licenseStatus.isGodMode ? (
                    <>
                      <Crown className="h-5 w-5 text-amber-400" />
                      <div>
                        <span className="font-bold text-sm text-amber-300">👑 GOD MODE ACTIVE</span>
                        <p className="text-[10px] text-amber-400/80 font-mono">Running as Application Owner</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      <span className="font-bold text-sm text-emerald-300">License Activated &amp; Verified</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="h-3 w-3" />
                  <span>Lock &amp; Logout</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
                <div>
                  <span className="text-slate-400 block text-[10px]">PLAN TYPE</span>
                  <span className="font-semibold text-white">{licenseStatus.planType || 'Pro Plan'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ACCESS LEVEL</span>
                  <span className="font-semibold text-white">{licenseStatus.isGodMode ? 'Permanent Owner Access' : `${licenseStatus.daysRemaining} days left`}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ACTIVE PC SLOTS</span>
                  <span className="font-semibold text-white">{licenseStatus.isGodMode ? 'Unrestricted (9999)' : `${licenseStatus.activeDevices} / ${licenseStatus.maxDevices} PCs`}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">VALID UNTIL</span>
                  <span className="font-semibold text-white">
                    {licenseStatus.isGodMode ? 'Lifetime Permanent' : (licenseStatus.validUntil ? new Date(licenseStatus.validUntil).toLocaleDateString() : 'Lifetime')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Clock Tamper Warning */}
          {licenseStatus?.clockTampered && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">Clock Tampering Detected</p>
                <p className="text-[11px] text-rose-300/90">{licenseStatus.clockMessage}</p>
              </div>
            </div>
          )}

          {/* Device Limit Reached (Slot Full) Selection UI */}
          {slotLimitData && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-amber-200">
                    Device Limit Reached ({slotLimitData.max_devices}/{slotLimitData.max_devices} PCs Active)
                  </p>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    Your plan allows max {slotLimitData.max_devices} computer(s). Choose one of your existing PCs to disconnect and activate this machine:
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {(slotLimitData.registered_devices || []).map((dev, idx) => (
                  <div
                    key={dev.hwid || idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/20 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Laptop className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">{dev.device_name || 'Windows PC'}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">{dev.hwid}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={replacingHwid === dev.hwid}
                      onClick={() => handleReplaceDevice(dev.hwid)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-sm disabled:opacity-50"
                    >
                      {replacingHwid === dev.hwid ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Disconnect & Replace'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activation Form (if not active or changing key) */}
          {(!licenseStatus?.activated || isOpen) && (
            <form onSubmit={handleActivate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter License Key
                </label>
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Enter License Key"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 font-mono text-sm tracking-wider text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={activating || !keyInput.trim()}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {activating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying License...</span>
                  </>
                ) : (
                  <>
                    <span>Activate License</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Official WhatsApp Support Direct Link */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-col items-center gap-2">
            <p className="text-[11px] text-slate-400 text-center">
              Need a license key, quota upgrade, or custom multi-device plan?
            </p>
            <a
              href={licenseStatus?.supportWhatsApp || 'https://wa.me/918418944572'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
            >
              <MessageCircle className="h-4 w-4" />
              <span>💬 Contact WhatsApp Support (+91 8418944572)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

