import { Smartphone, Battery, BatteryCharging, Wifi, WifiOff, Trash2, ShieldCheck, Radio } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function Sidebar() {
  const { devices, activeDeviceId, setActiveDeviceId, removeDevice } = useStore();
  const deviceList = Object.values(devices);
  const onlineCount = deviceList.filter((d) => d.online).length;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl select-none">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-teal-400 animate-pulse" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
            Connected Devices
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400">
          <span className="text-emerald-400 font-semibold">{onlineCount}</span> / {deviceList.length}
        </span>
      </div>

      {/* Devices List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
        {deviceList.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center bg-slate-900/20 backdrop-blur-sm">
            <Smartphone className="mx-auto h-9 w-9 text-slate-600 animate-pulse" />
            <p className="mt-3 text-xs font-medium text-slate-400">
              No devices paired yet
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Launch Phone Link on Android to pair automatically.
            </p>
          </div>
        )}

        {deviceList.map((device) => {
          const isActive = device.deviceId === activeDeviceId;
          const lowBattery = (device.battery ?? 100) <= 20;

          return (
            <div
              key={device.deviceId}
              onClick={() => setActiveDeviceId(device.deviceId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveDeviceId(device.deviceId);
                }
              }}
              className={`group relative w-full cursor-pointer rounded-xl p-3.5 text-left transition-all duration-200 outline-none ${
                isActive
                  ? 'bg-gradient-to-br from-teal-500/15 via-teal-950/30 to-slate-900/90 border border-teal-500/50 shadow-lg shadow-teal-500/10'
                  : 'bg-slate-900/40 border border-slate-800/70 hover:bg-slate-900/80 hover:border-slate-700/80'
              }`}
            >
              {/* Active Indicator Accent Bar */}
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-teal-400 shadow-sm shadow-teal-400/80" />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-teal-500/20 text-teal-300'
                        : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100 tracking-tight">
                      {device.deviceName || 'Android Device'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 truncate">
                      {device.deviceId ? device.deviceId.slice(0, 16) : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {device.online ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400 px-1.5 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                      Offline
                    </span>
                  )}

                  {/* Remove Device Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Remove "${device.deviceName || 'device'}" from the hub? Synced history will be cleared.`
                        )
                      ) {
                        removeDevice(device.deviceId);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-md p-1.5 text-slate-500 transition-all hover:bg-rose-500/20 hover:text-rose-300"
                    title="Remove device"
                    aria-label="Remove device"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Row: Battery & Network */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  {device.isCharging ? (
                    <BatteryCharging className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Battery
                      className={`h-3.5 w-3.5 shrink-0 ${
                        lowBattery ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    />
                  )}
                  <span
                    className={`font-mono text-[11px] font-medium ${
                      lowBattery && !device.isCharging
                        ? 'text-rose-400 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    {device.battery ?? '--'}%
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        device.isCharging
                          ? 'bg-emerald-400'
                          : lowBattery
                          ? 'bg-rose-500'
                          : 'bg-teal-400'
                      }`}
                      style={{ width: `${Math.max(4, Math.min(100, device.battery ?? 0))}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    {device.wifiName ? (
                      <>
                        <Wifi className="h-3 w-3 text-teal-400 shrink-0" />
                        <span className="truncate">{device.wifiName}</span>
                      </>
                    ) : device.online ? (
                      <>
                        <WifiOff className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="truncate">Cellular / Direct</span>
                      </>
                    ) : (
                      <span className="text-slate-600">Disconnected</span>
                    )}
                  </div>
                  {device.last_seen && (
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {formatAgo(device.last_seen)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="border-t border-slate-800/80 p-3.5 bg-slate-950/80">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-slate-300">Local Encrypted Hub</p>
            <p className="text-[10px] text-slate-500 truncate">Direct P2P & WebSocket</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function formatAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}