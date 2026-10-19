import { useState, useEffect } from 'react';
import {
  Globe,
  Smartphone,
  Wifi,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Info
} from 'lucide-react';

export default function DevicePairingHub({ onOpenGuideModal }) {
  const [serverInfo, setServerInfo] = useState({ localIp: '127.0.0.1', port: 5000, localUrl: '' });
  const [copiedLocal, setCopiedLocal] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/server-info');
      const data = await res.json();
      if (data.localIp) setServerInfo(data);
    } catch (_) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const localAddress = serverInfo.localUrl || `http://${serverInfo.localIp}:${serverInfo.port}`;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6 animate-pop select-none">
      
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-900/30 via-slate-900/80 to-slate-950 border border-indigo-500/30 text-white shadow-2xl overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
              <Smartphone className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
              <span>Step 1: Link Your Android Phone</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              No Devices Connected Yet
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              PhoneLink Hub is running locally on this computer. To monitor calls, SMS, live location, and device status, link your phone using the address below.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onOpenGuideModal}
              className="btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-400/50 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Globe className="h-4 w-4 text-cyan-300" />
              <span>Remote Access Guide</span>
            </button>
            <span className="text-[10px] text-slate-400">For 4G/5G Cellular &amp; Port Forwarding</span>
          </div>
        </div>
      </div>

      {/* Main Connection Card (Same Wi-Fi) */}
      <div className="rounded-3xl p-6 sm:p-7 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Local Wi-Fi Network Connection
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">
                  Fastest &amp; Instant
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect your Android phone while on the same home or office Wi-Fi network.
              </p>
            </div>
          </div>
        </div>

        {/* Address Display Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Server Address to Enter in Phone App:
            </span>
            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
              Port: {serverInfo.port}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <code className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 flex-1 truncate select-all">
              {localAddress}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(localAddress);
                setCopiedLocal(true);
                setTimeout(() => setCopiedLocal(false), 2000);
              }}
              className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
            >
              {copiedLocal ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLocal ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Server IP</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{serverInfo.localIp}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Port Number</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{serverInfo.port}</span>
            </div>
          </div>
        </div>

        {/* 3 Steps Guide */}
        <div className="pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Quick Pairing Steps:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  1
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Open Android App</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Launch PhoneLink app on your target Android phone.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  2
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Enter Address</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Type <code className="font-mono text-indigo-500">{serverInfo.localIp}</code> and Port <code className="font-mono text-indigo-500">{serverInfo.port}</code>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  3
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tap Connect</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                App connects instantly and live dashboard activates!
              </p>
            </div>
          </div>
        </div>

        {/* Small Discreet Remote Access Note */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-indigo-400" />
            <span>Need to connect over 4G/5G cellular data or from outside home?</span>
          </div>
          <button
            type="button"
            onClick={onOpenGuideModal}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Open Remote Guide →
          </button>
        </div>

      </div>

    </div>
  );
}
