import { useState, useEffect } from 'react';
import {
  Globe,
  Wifi,
  Terminal,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Router,
  Zap,
  Info
} from 'lucide-react';

export default function RemoteGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('wifi');
  const [serverInfo, setServerInfo] = useState({ localIp: '127.0.0.1', port: 5000, localUrl: 'http://127.0.0.1:5000' });
  const [copiedText, setCopiedText] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/server-info')
        .then((r) => r.json())
        .then((data) => {
          if (data.localIp) setServerInfo(data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2500);
  };

  if (!isOpen) return null;

  const localAddress = serverInfo.localUrl || `http://${serverInfo.localIp}:${serverInfo.port}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Remote Access &amp; Port Forwarding Guide
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How to connect your phone inside Wi-Fi or outside on 4G / 5G data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Local Server Address Banner */}
        <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <Wifi className="h-3.5 w-3.5" />
              <span>Current Local Server URL (Same Wi-Fi)</span>
            </div>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
              {localAddress}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(localAddress, 'local-url')}
            className="btn-interactive shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/60 hover:bg-indigo-200 dark:hover:bg-indigo-800/80 border border-indigo-300 dark:border-indigo-700/80 transition cursor-pointer"
          >
            {copiedText === 'local-url' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedText === 'local-url' ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {[
            { id: 'wifi', label: '1. Same Wi-Fi', icon: Wifi },
            { id: 'cloudflare', label: '2. Cloudflare (Free)', icon: Zap },
            { id: 'ngrok', label: '3. ngrok CLI', icon: Terminal },
            { id: 'router', label: '4. Router Forwarding', icon: Router }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                activeTab === id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs scrollbar-thin">
          
          {/* TAB 1: SAME WI-FI */}
          {activeTab === 'wifi' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Connect on Same Home or Office Wi-Fi (No Internet/Tunnel Required)
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Agar aapka computer aur mobile phone ek hi Wi-Fi network se jude hain, toh kisi third-party tunnel ya port forwarding ki bilkul zaroorat nahi hai.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  <li>Apne phone me PhoneLink Android app kholen.</li>
                  <li>Server IP address me daalein: <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1 py-0.5 rounded">{serverInfo.localIp}</code></li>
                  <li>Port me daalein: <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1 py-0.5 rounded">{serverInfo.port}</code></li>
                  <li><strong>Connect</strong> dabayein — aapka phone turant live connect ho jayega!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: CLOUDFLARE TUNNEL */}
          {activeTab === 'cloudflare' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold">
                  <Zap className="h-4 w-4" />
                  <span>Recommended: 100% Free &amp; No Account Needed</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Cloudflare Quick Tunnel se aap bina koi account banaye ek command chala kar worldwide secure link pa sakte hain.
                </p>

                <div className="space-y-2 pt-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Step 1: Download Cloudflared (Free tool)
                  </p>
                  <a
                    href="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 underline font-semibold"
                  >
                    <span>Download cloudflared-windows-amd64.exe</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <p className="font-semibold text-slate-800 dark:text-slate-200 pt-2">
                    Step 2: Run this single command in Command Prompt (CMD):
                  </p>
                  <div className="flex items-center gap-2 bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-[11px] border border-slate-700">
                    <code className="flex-1 truncate">cloudflared.exe tunnel --url http://localhost:5000</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('cloudflared.exe tunnel --url http://localhost:5000', 'cf-cmd')}
                      className="shrink-0 p-1 rounded hover:bg-slate-800 text-slate-300 transition"
                      title="Copy command"
                    >
                      {copiedText === 'cf-cmd' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <p className="font-semibold text-slate-800 dark:text-slate-200 pt-2">
                    Step 3: Copy the generated <code className="text-emerald-600 dark:text-emerald-400 font-mono">https://xxxx.trycloudflare.com</code> URL and paste it into the Android app.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NGROK MANUAL CLI */}
          {activeTab === 'ngrok' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Run ngrok CLI Manually (Clean &amp; Stable)
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Agar aap ngrok use karna chahte hain, toh standalone official ngrok CLI use karein taaki background me koi error ya disconnect na ho:
                </p>

                <div className="space-y-2 pt-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    1. Command Prompt (CMD) me ngrok chalu karein:
                  </p>
                  <div className="flex items-center gap-2 bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-[11px] border border-slate-700">
                    <code className="flex-1">ngrok http 5000</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('ngrok http 5000', 'ngrok-cmd')}
                      className="shrink-0 p-1 rounded hover:bg-slate-800 text-slate-300 transition"
                      title="Copy command"
                    >
                      {copiedText === 'ngrok-cmd' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 pt-1">
                    2. Terminal me jo Forwarding URL mile (e.g. <span className="font-mono text-indigo-500">https://xxxx.ngrok-free.app</span>), use phone app me Server address ki jagah daal dein.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ROUTER PORT FORWARDING */}
          {activeTab === 'router' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Direct Wi-Fi Router Port Forwarding (Permanent 24/7)
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Bina kisi software ke direct connection ke liye router me Port 5000 forward karein:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  <li>Router admin page kholen (e.g., <code className="font-mono text-indigo-500">192.168.1.1</code>).</li>
                  <li><strong>Port Forwarding</strong> settings me jayein.</li>
                  <li>Port <strong>5000</strong> ko aapke PC ke IP (<code className="font-mono text-indigo-500">{serverInfo.localIp}</code>) par forward karein (Protocol: TCP).</li>
                  <li>Apna public IP Google se check karein ("what is my ip") aur phone app me daalein: <code className="font-mono text-indigo-500">http://PUBLIC_IP:5000</code></li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            For full detailed offline guide, check <span className="font-mono text-indigo-500">PORT_FORWARDING_GUIDE.md</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
}

