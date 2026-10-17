import { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  MessageSquare,
  Folder,
  MapPin,
  Bell,
  Users,
  RefreshCw,
  Volume2,
  Sliders,
  Sun,
  Moon
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import CallLogs from './components/CallLogs';
import SmsManager from './components/SmsManager';
import FileManager from './components/FileManager';
import LocationMap from './components/LocationMap';
import Notifications from './components/Notifications';
import Contacts from './components/Contacts';
import Controls from './components/Controls';
import AlertBanner from './components/AlertBanner';
import ThinkingClock from './components/ThinkingClock';
import { useStore } from './store/StoreContext';

const TABS = [
  { id: 'calls', label: 'Calls', icon: PhoneCall },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'controls', label: 'Controls', icon: Sliders },
  { id: 'files', label: 'Files', icon: Folder },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'notifications', label: 'Notifications', icon: Bell }
];

export default function App() {
  const {
    activeDevice,
    connected,
    toasts,
    notifications,
    activeDeviceId,
    sendCommand,
    pushToast,
    currentTab,
    setCurrentTab
  } = useStore();

  const tab = currentTab;
  const setTab = setCurrentTab;
  const [refreshing, setRefreshing] = useState(false);

  // Theme Management (Dark / Light Mode)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('phonelink_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('phonelink_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const unreadAll = activeDeviceId
    ? notifications.filter((n) => n.deviceId === activeDeviceId && !n.read).length
    : notifications.filter((n) => !n.read).length;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden font-sans bg-slate-100 dark:bg-[#070913] text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Ambient Aurora Orbs for Authentic Glassmorphism Refraction */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
        <div className="animate-orb-a absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 dark:from-indigo-600/20 dark:to-purple-600/20 blur-[110px]" />
        <div className="animate-orb-b absolute top-1/4 -right-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-sky-400/20 to-blue-600/20 dark:from-cyan-500/15 dark:to-blue-600/15 blur-[130px]" />
        <div className="animate-orb-a absolute -bottom-32 left-1/3 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-violet-500/15 to-pink-500/15 dark:from-violet-600/15 dark:to-indigo-500/15 blur-[120px]" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex h-full w-full">
        <Sidebar theme={theme} />

        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Header */}
          <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-xs transition-colors">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-md shadow-indigo-500/30 shrink-0 border border-indigo-400/40">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {activeDevice ? activeDevice.deviceName : 'No Device Selected'}
                  </h1>
                  {activeDevice && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Device Ready" />
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tracking-wide">
                  Phone Link Hub • Operations Center
                </p>
              </div>
            </div>

            {/* Cartoon Thinking Clock */}
            <ThinkingClock compact={true} />

            <div className="flex items-center gap-2">
              {/* Connection Pill */}
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono font-medium border transition-all ${
                  connected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}
                />
                {connected ? 'Live Sync Active' : 'Offline'}
              </div>

              {/* Theme Toggle (Dark / Light) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-interactive shrink-0 rounded-xl p-2 text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-600" />
                )}
              </button>

              {/* Manual Telemetry Refresh */}
              <button
                onClick={async () => {
                  if (!activeDeviceId || refreshing) return;
                  setRefreshing(true);
                  await Promise.all([
                    sendCommand('request-calls', { deviceId: activeDeviceId }),
                    sendCommand('request-sms', { deviceId: activeDeviceId }),
                    sendCommand('request-location', { deviceId: activeDeviceId }),
                    sendCommand('request-contacts', { deviceId: activeDeviceId })
                  ]);
                  pushToast('Telemetry refreshed from phone', 'success');
                  setRefreshing(false);
                }}
                disabled={!activeDeviceId || refreshing}
                className="btn-interactive shrink-0 rounded-xl p-2 text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                title="Refresh calls, messages, location and contacts"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
              </button>

              {/* Find Phone Siren Button */}
              <button
                onClick={() => {
                  if (!activeDeviceId) return;
                  if (window.confirm('Ring this phone at full volume, even on silent?')) {
                    sendCommand('find-phone', { deviceId: activeDeviceId });
                  }
                }}
                disabled={!activeDeviceId}
                className="btn-interactive shrink-0 rounded-xl p-2 text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 shadow-xs disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                title="Find Phone (Loud Siren)"
              >
                <Volume2 className="h-4 w-4" />
              </button>

              {/* Notifications Button */}
              <button
                onClick={() => setTab('notifications')}
                className="btn-interactive relative shrink-0 rounded-xl p-2 text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadAll > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-md shadow-rose-500/50 animate-pulse">
                    {unreadAll}
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* Navigation Pill Tabs */}
          <nav className="flex items-center gap-1.5 px-6 pt-2.5 pb-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xl overflow-x-auto scrollbar-thin">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`btn-interactive flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/40'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{label}</span>
                  {id === 'notifications' && unreadAll > 0 && (
                    <span className="ml-1 rounded-full bg-white/20 text-white px-1.5 py-0.2 text-[10px] font-bold">
                      {unreadAll}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Main Dashboard Screen View */}
          <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <AlertBanner />
            <div key={tab} className="section-enter">
              {tab === 'calls' && <CallLogs />}
              {tab === 'messages' && <SmsManager />}
              {tab === 'contacts' && <Contacts />}
              {tab === 'controls' && <Controls theme={theme} />}
              {tab === 'files' && <FileManager />}
              {tab === 'location' && <LocationMap />}
              {tab === 'notifications' && <Notifications />}
            </div>
          </main>

          {/* Toast Notification Popups */}
          <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`pointer-events-auto rounded-xl px-4 py-2.5 text-xs font-medium shadow-2xl border backdrop-blur-xl animate-in slide-in-from-right transition-all ${
                  toast.kind === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                    : toast.kind === 'error'
                    ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                    : 'bg-slate-900/90 border-slate-700 text-slate-200'
                }`}
              >
                {toast.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}