import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe,
  X,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Terminal,
  AlertCircle
} from 'lucide-react';

export default function NgrokTunnelModal({ isOpen, onClose }) {
  const [tunnelInfo, setTunnelInfo] = useState({
    isRunning: false,
    activeUrl: null,
    authtoken: '',
    domain: 'talented-wolf-primarily.ngrok-free.app',
    autoStart: true,
    error: null
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [domainInput, setDomainInput] = useState('talented-wolf-primarily.ngrok-free.app');
  const [tokenInput, setTokenInput] = useState('');
  const [portInput, setPortInput] = useState('5000');
  const [autoStartInput, setAutoStartInput] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/tunnel/status');
      const data = await res.json();
      if (data) {
        setTunnelInfo(data);
        if (data.domain) setDomainInput(data.domain);
        if (data.authtoken && !tokenInput) setTokenInput(data.authtoken);
        if (data.autoStart !== undefined) setAutoStartInput(data.autoStart);
      }
    } catch (err) {
      console.warn('Failed to fetch tunnel status:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleStart = async (e) => {
    e?.preventDefault();
    setActionError('');
    setLoading(true);

    try {
      const res = await fetch('/api/tunnel/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authtoken: tokenInput.trim(),
          domain: domainInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
          autoStart: autoStartInput
        })
      });

      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'Failed to start tunnel');
      } else {
        await fetchStatus();
      }
    } catch (err) {
      setActionError(err.message || 'Network error starting tunnel');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setActionError('');
    setLoading(true);
    try {
      await fetch('/api/tunnel/stop', { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      setActionError(err.message || 'Error stopping tunnel');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    const url = tunnelInfo.activeUrl || `https://${domainInput}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Glow Accent */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ngrok Cloud Tunnel Engine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Remote Out-of-Network Parental Monitoring (4G/5G Cellular)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="relative flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin">
          
          {/* Active Status Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            tunnelInfo.isRunning && tunnelInfo.activeUrl
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : loading
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
              : 'bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  tunnelInfo.isRunning && tunnelInfo.activeUrl
                    ? 'bg-emerald-500 animate-ping'
                    : loading
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-500'
                }`} />
                {tunnelInfo.isRunning && tunnelInfo.activeUrl
                  ? 'Active & Online'
                  : loading
                  ? 'Starting Tunnel...'
                  : 'Tunnel Disconnected'}
              </span>

              {tunnelInfo.isRunning && tunnelInfo.activeUrl && (
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy URL'}</span>
                </button>
              )}
            </div>

            {tunnelInfo.isRunning && tunnelInfo.activeUrl ? (
              <div className="flex items-center justify-between font-mono text-xs font-bold text-white bg-black/40 px-3 py-2 rounded-xl border border-emerald-500/30">
                <span className="truncate select-all">{tunnelInfo.activeUrl}</span>
                <a
                  href={tunnelInfo.activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-emerald-400 hover:text-emerald-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Start the cloud tunnel to enable monitoring outside home Wi-Fi over SIM data from anywhere.
              </p>
            )}
          </div>

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleStart} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Claimed Ngrok Domain
                </label>
                <button
                  type="button"
                  onClick={() => setDomainInput('talented-wolf-primarily.ngrok-free.app')}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  ⚡ Use Default Preset
                </button>
              </div>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. talented-wolf-primarily.ngrok-free.app"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ngrok Authtoken
                </label>
                <a
                  href="https://dashboard.ngrok.com/get-started/your-authtoken"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Get Free Token</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your 49-character authtoken here"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoStartInput}
                  onChange={(e) => setAutoStartInput(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Auto-start tunnel when Hub opens</span>
              </label>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Port:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {portInput}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2.5">
              {tunnelInfo.isRunning ? (
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={loading}
                  className="btn-interactive flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 transition cursor-pointer disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  <span>Stop Cloud Tunnel</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-interactive flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/40 transition cursor-pointer disabled:opacity-50"
                >
                  <Zap className="h-4 w-4 text-amber-300" />
                  <span>{loading ? 'Starting Tunnel…' : 'Start Cloud Tunnel'}</span>
                </button>
              )}
            </div>
          </form>

          {/* Child Phone Setup Tip */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
              📱 How to Connect Child Phone:
            </span>
            <p className="leading-relaxed">
              Child phone ke settings me Server Address me <b>{domainInput || 'talented-wolf-primarily.ngrok-free.app'}</b> dalein aur Port ko <b>empty</b> (blank) chhod dein. Child phone poori duniya me kahin se bhi 4G/5G SIM data par connect ho jayega!
            </p>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}

