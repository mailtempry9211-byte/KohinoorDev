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
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 shrink-0">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">
                {activeDevice ? activeDevice.deviceName : 'No device selected'}
              </h1>
              <p className="text-xs text-gray-500">Personal Phone Link Hub</p>
            </div>
          </div>

          {/* Animated Cartoon Thinking Clock */}
          <ThinkingClock compact={true} />

          <div className="flex items-center gap-3">
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {connected ? 'Server connected' : 'Offline'}
            </span>

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
                pushToast('Refresh requested', 'success');
                setRefreshing(false);
              }}
              disabled={!activeDeviceId || refreshing}
              className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Refresh calls, messages, location and contacts"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
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
              className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Find phone — play loud alert"
            >
              <Volume2 className="h-5 w-5" />
            </button>

            <button
              onClick={() => setTab('notifications')}
              className="relative shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadAll > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-semibold text-white">
                  {unreadAll}
                </span>
              )}
            </button>
          </div>
        </header>

        <nav className="flex gap-1 px-4 pt-3 border-b border-gray-800 bg-gray-900/50 overflow-x-auto scrollbar-thin">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-gray-950 text-white border-b-2 border-teal-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === 'notifications' && unreadAll > 0 && (
                <span className="ml-1 rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unreadAll}
                </span>
              )}
            </button>
          ))}
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