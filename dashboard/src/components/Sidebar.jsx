import { Smartphone, Battery, BatteryCharging, Wifi, WifiOff, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function Sidebar() {
  const { devices, activeDeviceId, setActiveDeviceId, removeDevice } = useStore();
  const deviceList = Object.values(devices);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-900">
      <div className="px-4 py-5 border-b border-gray-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Devices</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {deviceList.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-700 p-4 text-center">
            <Smartphone className="mx-auto h-8 w-8 text-gray-600" />
            <p className="mt-2 text-xs text-gray-500">
              No devices connected yet.
              <br />
              Start the Android app to pair.
            </p>
          </div>
        )}

        {deviceList.map((device) => {
          const isActive = device.deviceId === activeDeviceId;
          const lowBattery = device.battery <= 20;

          return (
            <div
              key={device.deviceId}
              onClick={() => setActiveDeviceId(device.deviceId)}
              className={`w-full cursor-pointer rounded-lg p-3 text-left transition-colors ${
                isActive
                  ? 'bg-teal-600/20 border border-teal-500/40'
                  : 'bg-gray-800/50 border border-transparent hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone
                    className={`h-5 w-5 shrink-0 ${isActive ? 'text-teal-400' : 'text-gray-400'}`}
                  />
                  <span className="truncate text-sm font-medium">{device.deviceName}</span>
                </div>
                {device.online ? (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Online" />
                ) : (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-600" title="Offline" />
                )}
                {/* BUG 5: remove stale/duplicate devices. */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Remove "${device.deviceName}" from the hub? Its synced history will also be deleted.`)) {
                      removeDevice(device.deviceId);
                    }
                  }}
                  className="shrink-0 rounded p-1 text-gray-600 transition-colors hover:bg-red-600/20 hover:text-red-400"
                  title="Remove device"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {device.isCharging ? (
                    <BatteryCharging className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Battery className={`h-3.5 w-3.5 ${lowBattery ? 'text-red-400' : 'text-gray-400'}`} />
                  )}
                  <span className={lowBattery && !device.isCharging ? 'text-red-400' : ''}>
                    {device.battery}%
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        device.isCharging
                          ? 'bg-emerald-500'
                          : lowBattery
                          ? 'bg-red-500'
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${device.battery}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {device.wifiName ? (
                    <>
                      <Wifi className="h-3.5 w-3.5" />
                      <span className="truncate">{device.wifiName}</span>
                    </>
                  ) : device.online ? (
                    <WifiOff className="h-3.5 w-3.5" />
                  ) : null}
                  {device.last_seen && (
                    <span className="ml-auto shrink-0">{formatAgo(device.last_seen)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-800 p-3">
        <p className="text-[11px] leading-relaxed text-gray-600">
          Self-hosted hub · Single user
          <br />
          Data stays on your network
        </p>
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