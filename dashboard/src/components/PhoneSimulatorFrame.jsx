import { useState, useEffect } from 'react';
import { Smartphone, Monitor, RotateCw, ZoomIn, ZoomOut, Wifi, BatteryCharging, Signal } from 'lucide-react';

const DEVICE_PRESETS = [
  { id: 'galaxy', name: 'Samsung Galaxy S24', width: 412, height: 890, radius: '46px' },
  { id: 'pixel', name: 'Google Pixel 8', width: 392, height: 850, radius: '44px' },
  { id: 'iphone', name: 'iPhone 15 Pro', width: 393, height: 852, radius: '48px' },
  { id: 'compact', name: 'Compact Android (360w)', width: 360, height: 780, radius: '38px' }
];

export default function PhoneSimulatorFrame({ children, onExitSimulator }) {
  const [selectedDevice, setSelectedDevice] = useState(DEVICE_PRESETS[0]);
  const [currentTime, setCurrentTime] = useState('');
  const [scale, setScale] = useState(0.9);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-center bg-slate-950 p-4 sm:p-6 overflow-x-hidden font-sans select-none">
      {/* Studio Ambient Gradient Lights */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-cyan-600/10 blur-[130px]" />
      </div>

      {/* Top Floating Simulator Control Bar */}
      <div className="relative z-30 mb-4 flex flex-wrap items-center justify-between gap-3 w-full max-w-3xl rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-2.5 px-4 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">Mobile Screen Preview Mode</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Verify touch layout before building APK</p>
          </div>
        </div>

        {/* Device Model Selector & Scale Controls */}
        <div className="flex items-center gap-2">
          {/* Device Model Dropdown */}
          <select
            value={selectedDevice.id}
            onChange={(e) => {
              const dev = DEVICE_PRESETS.find((d) => d.id === e.target.value);
              if (dev) setSelectedDevice(dev);
            }}
            className="rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 outline-none hover:border-slate-600 cursor-pointer"
          >
            {DEVICE_PRESETS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.width}×{d.height})
              </option>
            ))}
          </select>

          {/* Scale Buttons */}
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.65, s - 0.05))}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-slate-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(1.1, s + 0.05))}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Exit / Fullscreen Toggle */}
          <button
            type="button"
            onClick={onExitSimulator}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-md shadow-indigo-600/30 border border-indigo-400/30 cursor-pointer transition-all"
            title="Switch to Fullscreen Browser View"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Normal Fullscreen</span>
          </button>
        </div>
      </div>

      {/* The 3D Realistic Phone Chassis */}
      <div
        className="relative z-20 flex flex-col transition-all duration-300 origin-top shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_0_12px_#1e2230,0_0_0_14px_#2d3245,0_0_0_16px_rgba(0,0,0,0.6)]"
        style={{
          width: `${selectedDevice.width}px`,
          height: `${selectedDevice.height}px`,
          borderRadius: selectedDevice.radius,
          transform: `scale(${scale})`,
          backgroundColor: '#070913',
          overflow: 'hidden'
        }}
      >
        {/* Top Punch Hole Camera & Speaker Grill */}
        <div className="absolute top-2 left-0 right-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 rounded-full bg-black border border-slate-700/60 flex items-center justify-center shadow-inner">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/40" />
            </div>
          </div>
        </div>

        {/* Realistic Mobile Status Bar */}
        <div className="relative z-40 flex h-7 w-full items-center justify-between px-6 pt-1 text-[11px] font-semibold text-slate-200 select-none pointer-events-none bg-slate-950/70 backdrop-blur-md">
          <span>{currentTime || '9:41'}</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Signal className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <div className="flex items-center gap-0.5 font-mono text-[10px]">
              <span>98%</span>
              <BatteryCharging className="h-3 w-3 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Live Mobile Screen Content Area */}
        <div className="relative flex-1 w-full overflow-hidden flex flex-col mobile-viewport">
          {children}
        </div>

        {/* Bottom Android / iOS Gesture Navigation Bar */}
        <div className="relative z-40 flex h-4 w-full items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-none">
          <div className="h-1 w-32 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  );
}
