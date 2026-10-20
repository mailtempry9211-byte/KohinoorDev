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
  VolumeX,
  Sliders,
  Sun,
  Moon,
  Globe,
  Smartphone,
  ChevronDown,
  Menu
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
import LicenseModal from './components/LicenseModal';
import RemoteGuideModal from './components/RemoteGuideModal';
import NgrokTunnelModal from './components/NgrokTunnelModal';
import DevicePairingHub from './components/DevicePairingHub';
import PhoneSimulatorFrame from './components/PhoneSimulatorFrame';
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
    setCurrentTab,
    isFindingPhone,
    triggerFindPhone,
    stopFindPhone
  } = useStore();

  const tab = currentTab;
  const setTab = setCurrentTab;
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isNativeApp = typeof window !== 'undefined' && (
    Boolean(window.AndroidPhoneLink) ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );

  // Phone Mockup Simulator Mode (Only for desktop browser testing)
  const [simulatorMode, setSimulatorMode] = useState(() => {
    if (isNativeApp || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      return false; // Physical mobile / Android APK renders 100% native mobile UI
    }
    const saved = localStorage.getItem('phonelink_simulator_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const isMobileLayout = isNativeApp || simulatorMode || (typeof window !== 'undefined' && window.innerWidth < 1024);

  const toggleSimulatorMode = () => {
    if (isNativeApp) return;
    setSimulatorMode((prev) => {
      const next = !prev;
      localStorage.setItem('phonelink_simulator_mode', String(next));
      return next;
    });
  };

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

  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showTunnelModal, setShowTunnelModal] = useState(false);
  const [tunnelStatus, setTunnelStatus] = useState(null);

  const fetchTunnel = () => {
    fetch('/api/tunnel/status')
      .then((r) => r.json())
      .then(setTunnelStatus)
      .catch(() => {});
  };

  useEffect(() => {
    fetchTunnel();
    const interval = setInterval(fetchTunnel, 4000);
    const licenseHandler = () => setShowLicenseModal(true);
    const tunnelHandler = () => setShowTunnelModal(true);
    window.addEventListener('open-license-modal', licenseHandler);
    window.addEventListener('open-tunnel-modal', tunnelHandler);
    return () => {
      clearInterval(interval);
      window.removeEventListener('open-license-modal', licenseHandler);
      window.removeEventListener('open-tunnel-modal', tunnelHandler);
    };
  }, []);

  useEffect(() => {
    const handler = () => setShowGuideModal(true);
    window.addEventListener('open-remote-guide-modal', handler);
    return () => window.removeEventListener('open-remote-guide-modal', handler);
  }, []);

  const unreadAll = activeDeviceId
    ? notifications.filter((n) => n.deviceId === activeDeviceId && !n.read).length
    : notifications.filter((n) => !n.read).length;

  const dashboardContent = (
    <div className={`relative flex h-full w-full overflow-hidden font-sans bg-slate-100 dark:bg-[#070913] text-slate-800 dark:text-slate-100 transition-colors duration-300 ${simulatorMode ? 'h-full' : 'h-screen w-screen'}`}>
      {/* Ambient Aurora Orbs for Authentic Glassmorphism Refraction */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
        <div className="animate-orb-a absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 dark:from-indigo-600/20 dark:to-purple-600/20 blur-[110px]" />
        <div className="animate-orb-b absolute top-1/4 -right-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-sky-400/20 to-blue-600/20 dark:from-cyan-500/15 dark:to-blue-600/15 blur-[130px]" />
        <div className="animate-orb-a absolute -bottom-32 left-1/3 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-violet-500/15 to-pink-500/15 dark:from-violet-600/15 dark:to-indigo-500/15 blur-[120px]" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex h-full w-full overflow-hidden">
        <Sidebar theme={theme} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} forceMobile={isMobileLayout} />

        <div className="flex-1 flex flex-col min-w-0 bg-transparent h-full overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-xs transition-colors shrink-0">
            {/* Mobile Device Selector Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={`btn-interactive items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer shrink-0 ${
                isMobileLayout ? 'flex' : 'flex lg:hidden'
              }`}
              title="Select or Switch Device"
              aria-label="Open Device Selector"
            >
              <Smartphone className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <span className="max-w-[110px] xs:max-w-[150px] truncate text-xs font-bold">
                {activeDevice ? activeDevice.deviceName : 'Select Device'}
              </span>
              {activeDevice?.online && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
            </button>

            {/* Desktop Device Branding Header */}
            <div className={`items-center gap-3.5 min-w-0 ${isMobileLayout ? 'hidden' : 'hidden lg:flex'}`}>
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

            {/* Cartoon Thinking Clock (Hidden on Mobile) */}
            <div className={isMobileLayout ? 'hidden' : 'hidden md:flex'}>
              <ThinkingClock compact={true} />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Ngrok Cloud Tunnel Setup Button (Always Accessible) */}
              <button
                type="button"
                onClick={() => setShowTunnelModal(true)}
                className={`btn-interactive shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold border shadow-xs cursor-pointer transition-all ${
                  tunnelStatus?.isRunning && tunnelStatus?.activeUrl
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20'
                }`}
                title="Configure Embedded Ngrok Cloud Tunnel"
              >
                <Globe className={`h-3.5 w-3.5 ${tunnelStatus?.isRunning ? 'text-emerald-500 animate-pulse' : 'text-indigo-500 dark:text-indigo-400'}`} />
                <span className="font-bold text-[11px]">
                  {tunnelStatus?.isRunning ? 'Ngrok Active' : 'Ngrok Setup'}
                </span>
                {tunnelStatus?.isRunning && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                )}
              </button>

              {/* Remote Access Guide Button (Compact on Small Screens) */}
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="btn-interactive shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
                title="Remote Access & Port Forwarding Guide (4G/5G Cellular)"
                aria-label="Remote Access Guide"
              >
                <Globe className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="hidden sm:inline font-medium text-[11px]">Remote Guide</span>
              </button>

              {/* Connection Pill */}
              <div
                className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono font-medium border transition-all ${
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

              {/* Phone Frame Simulator Mode Toggle (Desktop browser only) */}
              {!isNativeApp && (
                <button
                  type="button"
                  onClick={toggleSimulatorMode}
                  className={`btn-interactive shrink-0 hidden sm:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs border shadow-xs cursor-pointer transition-all ${
                    simulatorMode
                      ? 'bg-indigo-600 text-white border-indigo-400/50 shadow-indigo-600/30'
                      : 'bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={simulatorMode ? 'Switch to Fullscreen Browser View' : 'Wrap inside Realistic Mobile Phone Mockup'}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="font-semibold text-[11px]">
                    {simulatorMode ? 'Full Screen' : 'Phone View'}
                  </span>
                </button>
              )}

              {/* Theme Toggle (Dark / Light) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-interactive shrink-0 rounded-xl p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
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
                className="btn-interactive shrink-0 rounded-xl p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                title="Refresh calls, messages, location and contacts"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
              </button>

              {/* Find Phone Siren / Stop Alarm Button */}
              {isFindingPhone ? (
                <button
                  type="button"
                  onClick={() => stopFindPhone(activeDeviceId)}
                  disabled={!activeDeviceId}
                  className="btn-interactive shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 border border-rose-400 shadow-md shadow-rose-600/40 animate-pulse cursor-pointer transition-all"
                  title="Stop Alarm / Silence Phone Siren Now"
                  aria-label="Silence alarm"
                >
                  <VolumeX className="h-4 w-4 text-white animate-bounce" />
                  <span className="hidden sm:inline font-bold">Stop Siren</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!activeDeviceId) return;
                    if (window.confirm('Ring this phone at full volume, even on silent?')) {
                      triggerFindPhone(activeDeviceId);
                    }
                  }}
                  disabled={!activeDeviceId}
                  className="btn-interactive shrink-0 rounded-xl p-1.5 sm:p-2 text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 shadow-xs disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  title="Find Phone (Loud Siren)"
                  aria-label="Find phone siren"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}

              {/* Notifications Button */}
              <button
                onClick={() => setTab('notifications')}
                className="btn-interactive relative shrink-0 rounded-xl p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
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

          {/* Desktop Navigation Pill Tabs (Hidden on Mobile) */}
          <nav className={`items-center gap-1.5 px-6 pt-2.5 pb-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xl overflow-x-auto scrollbar-thin shrink-0 ${
            isMobileLayout ? 'hidden' : 'hidden lg:flex'
          }`}>
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
          <main className={`flex-1 overflow-y-auto scrollbar-thin ${
            isMobileLayout ? 'p-2 sm:p-2.5 pb-20' : 'p-2.5 sm:p-4 md:p-6 pb-20 lg:pb-6'
          }`}>
            <AlertBanner />
            {!activeDeviceId ? (
              <DevicePairingHub onOpenGuideModal={() => setShowGuideModal(true)} />
            ) : (
              <div key={tab} className="section-enter">
                {tab === 'calls' && <CallLogs />}
                {tab === 'messages' && (
                  <SmsManager
                    isMobile={isMobileLayout}
                  />
                )}
                {tab === 'contacts' && <Contacts />}
                {tab === 'controls' && (
                  <Controls
                    theme={theme}
                    isMobile={isMobileLayout}
                  />
                )}
                {tab === 'files' && <FileManager />}
                {tab === 'location' && <LocationMap />}
                {tab === 'notifications' && <Notifications />}
              </div>
            )}
          </main>

          {/* Single Top Flash Message Banner (Auto-dismiss, unobtrusive, doesn't block controls or nav) */}
          <div className="pointer-events-none fixed top-4 inset-x-0 z-50 flex justify-center px-4">
            {toasts.slice(0, 1).map((toast) => (
              <div
                key={toast.id}
                className={`pointer-events-auto max-w-md rounded-2xl px-5 py-2.5 text-xs font-semibold shadow-2xl border backdrop-blur-2xl animate-in slide-in-from-top-3 fade-in duration-200 transition-all text-center ${
                  toast.kind === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/40'
                    : toast.kind === 'error'
                    ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-950/40'
                    : toast.kind === 'warning'
                    ? 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-amber-950/40'
                    : 'bg-slate-900/90 border-indigo-500/40 text-slate-100 shadow-indigo-950/40'
                }`}
              >
                {toast.text}
              </div>
            ))}
          </div>

          {/* Mobile Glassmorphic Bottom Navigation Bar */}
          <nav className={`fixed bottom-0 left-0 right-0 z-40 items-center justify-around bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 px-1 py-1 shadow-[0_-4px_25px_rgba(0,0,0,0.2)] select-none ${
            isMobileLayout ? 'flex' : 'flex lg:hidden'
          }`}>
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`relative flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 cursor-pointer min-w-0 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <div className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-xs' : ''
                  }`}>
                    <Icon className="h-4 w-4 shrink-0" />
                  </div>
                  <span className="text-[9px] tracking-tight mt-0.5 leading-none truncate max-w-full">
                    {label}
                  </span>
                  {id === 'notifications' && unreadAll > 0 && (
                    <span className="absolute top-0.5 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow-xs animate-pulse">
                      {unreadAll}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Commercial Licensing Modal */}
          <LicenseModal isOpen={showLicenseModal} onClose={() => setShowLicenseModal(false)} />

          {/* Remote Access & Port Forwarding Guide Modal */}
          <RemoteGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />

          {/* Ngrok Cloud Tunnel Engine Modal */}
          <NgrokTunnelModal isOpen={showTunnelModal} onClose={() => setShowTunnelModal(false)} />
        </div>
      </div>
    </div>
  );

  if (simulatorMode) {
    return (
      <PhoneSimulatorFrame onExitSimulator={() => setSimulatorMode(false)}>
        {dashboardContent}
      </PhoneSimulatorFrame>
    );
  }

  return dashboardContent;
}