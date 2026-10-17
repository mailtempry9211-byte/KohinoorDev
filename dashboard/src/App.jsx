import { useState } from 'react';
import { Phone, PhoneCall, MessageSquare, Folder, MapPin, Bell, Users, RefreshCw, Volume2, Sliders } from 'lucide-react';
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
  const { activeDevice, connected, toasts, notifications, activeDeviceId, sendCommand, pushToast, currentTab, setCurrentTab } = useStore();
  const tab = currentTab;
  const setTab = setCurrentTab;
  const [refreshing, setRefreshing] = useState(false);

  const unreadAll = activeDeviceId
    ? notifications.filter((n) => n.deviceId === activeDeviceId && !n.read).length
    : notifications.filter((n) => !n.read).length;

  return (
    <div className="flex h-screen bg-[#090D16] text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-[#090D16] via-[#0B0F19] to-[#080B12]">
        <header className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 shadow-lg shadow-teal-500/20 shrink-0 border border-teal-400/30">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white truncate">
                  {activeDevice ? activeDevice.deviceName : 'No Device Selected'}
                </h1>
                {activeDevice && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Device Ready" />
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400 tracking-wide">Phone Link Hub • Operations Center</p>
            </div>
          </div>

          {/* Animated Cartoon Thinking Clock */}
          <ThinkingClock compact={true} />

          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono font-medium border transition-colors ${
                connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
              {connected ? 'Live Sync Active' : 'Offline'}
            </div>

            {/* BUG 5: manual refresh for the selected device. */}
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
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-800/80 hover:text-teal-300 border border-transparent hover:border-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
              title="Refresh calls, messages, location and contacts"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
            </button>

            {/* FEATURE C: find-my-phone alarm. */}
            <button
              onClick={() => {
                if (!activeDeviceId) return;
                if (window.confirm('Ring this phone at full volume, even on silent?')) {
                  sendCommand('find-phone', { deviceId: activeDeviceId });
                }
              }}
              disabled={!activeDeviceId}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-all hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/30 border border-transparent disabled:cursor-not-allowed disabled:opacity-40"
              title="Find Phone (Loud Siren)"
            >
              <Volume2 className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setTab('notifications')}
              className="relative shrink-0 rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-800/80 hover:text-slate-100 border border-transparent hover:border-slate-700/60"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadAll > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-slate-950 shadow-md shadow-teal-500/40 animate-pulse">
                  {unreadAll}
                </span>
              )}
            </button>
          </div>
        </header>

        <nav className="flex items-center gap-1.5 px-6 pt-2.5 border-b border-slate-800/70 bg-slate-900/30 backdrop-blur-sm overflow-x-auto scrollbar-thin">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-slate-800/90 text-teal-300 border border-teal-500/40 shadow-sm shadow-teal-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                {label}
                {id === 'notifications' && unreadAll > 0 && (
                  <span className="ml-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 px-1.5 py-0.2 text-[10px] font-bold">
                    {unreadAll}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <AlertBanner />
          <div key={tab} className="section-enter">
            {tab === 'calls' && <CallLogs />}
            {tab === 'messages' && <SmsManager />}
            {tab === 'contacts' && <Contacts />}
            {tab === 'controls' && <Controls />}
            {tab === 'files' && <FileManager />}
            {tab === 'location' && <LocationMap />}
            {tab === 'notifications' && <Notifications />}
          </div>
        </main>

        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-lg px-4 py-2.5 text-sm shadow-xl border animate-in slide-in-from-right ${
                toast.kind === 'success'
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
                  : toast.kind === 'error'
                  ? 'bg-red-950 border-red-700 text-red-200'
                  : 'bg-gray-900 border-gray-700 text-gray-200'
              }`}
            >
              {toast.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}