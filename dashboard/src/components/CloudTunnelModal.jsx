import { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Wifi,
  Smartphone,
  Shield,
  X,
  Zap,
  Info
} from 'lucide-react';

export default function CloudTunnelModal({ isOpen, onClose }) {
  const [tunnelState, setTunnelState] = useState({ active: false, url: null, error: null });
  const [tunnelConfig, setTunnelConfig] = useState({ authtoken: '', domain: '', autoStart: false });
  const [serverInfo, setServerInfo] = useState({ localIp: '127.0.0.1', port: 5000, localUrl: '' });
  const [loading, setLoading] = useState(false);
  const [copiedTunnelUrl, setCopiedTunnelUrl] = useState(false);
  const [copiedLocalUrl, setCopiedLocalUrl] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/server-info');
      const data = await res.json();
      if (data.localIp) setServerInfo(data);
      if (data.tunnel) setTunnelState(data.tunnel);
      if (data.tunnelConfig) setTunnelConfig(data.tunnelConfig);
    } catch (_) {
      try {
        const res2 = await fetch('/api/tunnel');
        const data2 = await res2.json();
        if (data2.status) setTunnelState(data2.status);
        if (data2.config) setTunnelConfig(data2.config);
      } catch (_) {}
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleStartTunnel = async () => {
    if (!tunnelConfig.authtoken || !tunnelConfig.authtoken.trim()) {
      showToast('⚠️ Please paste your ngrok AuthToken first!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/tunnel/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tunnelConfig)
      });
      const data = await res.json();
      if (data.success) {
        setTunnelState(data.status);
        showToast('🌐 Cloud Tunnel Started! Phone can now connect from anywhere.');
      } else {
        showToast('❌ ' + (data.error || 'Failed to start tunnel'));
      }
    } catch (e) {
      showToast('❌ Network error connecting to tunnel API');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTunnel = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tunnel/stop', { method: 'POST' });
      const data = await res.json();
      setTunnelState(data.status || { active: false });
      showToast('🛑 Cloud Tunnel stopped.');
    } catch (e) {
      showToast('❌ Failed to stop tunnel');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-[#0B0F19] text-white shadow-2xl shadow-indigo-500/10 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-600/15 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/15 blur-[80px]" />

        {/* Modal Header */}
        <div className="relative p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Cloud Tunnel &amp; Phone Pairing Setup</h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  tunnelState?.active
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tunnelState?.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                  {tunnelState?.active ? 'WORLDWIDE ONLINE' : 'LOCAL ONLY'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connect your Android phone over 4G/5G mobile data or local Wi-Fi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative p-6 space-y-5 max-h-[80vh] overflow-y-auto scrollbar-thin">
          
          {/* Toast Msg */}
          {toastMsg && (
            <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 text-xs font-semibold animate-pop">
              {toastMsg}
            </div>
          )}

          {/* ACTIVE TUNNEL URL BANNER (If Active) */}
          {tunnelState?.active && tunnelState?.url && (
            <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                  <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span>Public Cloud Tunnel Active (Worldwide 4G/5G)</span>
                </div>
                <a
                  href={tunnelState.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                >
                  Test in Browser <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/30">
                <code className="text-xs font-mono text-cyan-300 flex-1 truncate select-all">
                  {tunnelState.url}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tunnelState.url);
                    setCopiedTunnelUrl(true);
                    setTimeout(() => setCopiedTunnelUrl(false), 2000);
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedTunnelUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedTunnelUrl ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                  Phone Me Kaise Connect Karein:
                </p>
                <p className="text-slate-400">
                  1. Apne Android phone me PhoneLink Hub app open karein.<br />
                  2. <b>Server URL</b> wale box me ye upar wala URL paste karein.<br />
                  3. <b>Connect</b> dabayein — phone chahe 4G/5G par ho ya kisi dusre shahar me ho, turant connect ho jayega!
                </p>
              </div>
            </div>
          )}

          {/* TUNNEL ERROR */}
          {tunnelState?.error && !tunnelState?.active && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">Tunnel Connection Failed</p>
                <p className="text-[11px] text-rose-300/80">{tunnelState.error}</p>
              </div>
            </div>
          )}

          {/* NGROK CONFIGURATION FORM */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-slate-200">ngrok Cloud Credentials</span>
              </div>
              <a
                href="https://dashboard.ngrok.com/get-started/your-authtoken"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
              >
                Get Free ngrok Token <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ngrok AuthToken <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                value={tunnelConfig.authtoken || ''}
                onChange={(e) => setTunnelConfig({ ...tunnelConfig, authtoken: e.target.value })}
                placeholder="Paste your ngrok AuthToken here (e.g. 2tXYZ...)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Custom Domain / Subdomain <span className="text-[10px] text-slate-500 font-normal">(Optional free static domain)</span>
              </label>
              <input
                type="text"
                value={tunnelConfig.domain || ''}
                onChange={(e) => setTunnelConfig({ ...tunnelConfig, domain: e.target.value })}
                placeholder="e.g. my-phonelink.ngrok-free.app (or leave blank)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={!!tunnelConfig.autoStart}
                  onChange={(e) => setTunnelConfig({ ...tunnelConfig, autoStart: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Auto-start Cloud Tunnel whenever this application starts</span>
              </label>
            </div>

            <div className="pt-2 flex gap-3">
              {tunnelState?.active ? (
                <button
                  type="button"
                  onClick={handleStopTunnel}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                  <span>Disconnect Cloud Tunnel</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartTunnel}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  <span>Start Cloud Tunnel (Worldwide 4G/5G)</span>
                </button>
              )}
            </div>
          </div>

          {/* LOCAL WI-FI CONNECTION BOX */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Wifi className="h-4 w-4 text-indigo-400" />
                <span>Same Wi-Fi / Local Network Connection</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">No ngrok needed</span>
            </div>

            <p className="text-[11px] text-slate-400">
              Agar phone aur PC dono ghar ke same Wi-Fi router par hain, to phone me direct ye local address daal sakte hain:
            </p>

            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <code className="text-xs font-mono text-cyan-300 flex-1 truncate select-all">
                {serverInfo.localUrl || `http://${serverInfo.localIp}:${serverInfo.port}`}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(serverInfo.localUrl || `http://${serverInfo.localIp}:${serverInfo.port}`);
                  setCopiedLocalUrl(true);
                  setTimeout(() => setCopiedLocalUrl(false), 2000);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedLocalUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedLocalUrl ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

