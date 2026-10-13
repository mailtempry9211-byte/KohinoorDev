import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Clock } from 'lucide-react';
import { useStore } from '../store/StoreContext';

const defaultIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="
    width:22px;height:22px;border-radius:50% 50% 50% 0;
    background:#6366f1;border:3px solid #fff;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,.5);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -18]
});

function Recenter({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, zoom, { animate: true });
  }, [position, zoom, map]);
  return null;
}

export default function LocationMap() {
  const { activeDeviceId, activeDevice, locations } = useStore();
  const [autoCenter, setAutoCenter] = useState(true);

  const location = activeDeviceId ? locations[activeDeviceId] : null;

  useEffect(() => {
    if (activeDeviceId) {
      // history endpoint returns last known point
      fetch(`/api/devices/${activeDeviceId}/location`)
        .then((r) => r.json())
        .then((loc) => {
          if (loc && !location) {
            setAutoCenter(true);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeviceId]);

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <Navigation className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-3 text-sm">Select a device to track location</p>
        </div>
      </div>
    );
  }

  const hasFix = location && location.latitude != null && location.longitude != null;

  return (
    <div className="mx-auto h-full max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Location</h2>
            <p className="text-xs text-gray-500">
              {activeDevice?.online ? 'Receiving live updates' : 'Last known position'}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={autoCenter}
            onChange={(e) => setAutoCenter(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 accent-indigo-500"
          />
          Auto-center on fix
        </label>
      </div>

      {hasFix ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Coordinates" value={`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`} />
            <Stat label="Accuracy" value={location.accuracy ? `± ${Math.round(location.accuracy)} m` : '—'} />
            <Stat
              label="Updated"
              value={location.timestamp ? new Date(location.timestamp).toLocaleTimeString() : '—'}
              icon={Clock}
            />
          </div>

          <div className="h-[420px] overflow-hidden rounded-lg border border-gray-800">
            <MapContainer
              center={[location.latitude, location.longitude]}
              zoom={16}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {autoCenter && <Recenter position={[location.latitude, location.longitude]} zoom={16} />}
              <Marker position={[location.latitude, location.longitude]} icon={defaultIcon}>
                <Popup>
                  {activeDevice?.deviceName}
                  <br />
                  {new Date(location.timestamp).toLocaleString()}
                  <br />
                  {describePlace(location.latitude, location.longitude)}
                </Popup>
              </Marker>
              {location.accuracy > 0 && (
                <Circle
                  center={[location.latitude, location.longitude]}
                  radius={location.accuracy}
                  pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.12, weight: 1 }}
                />
              )}
            </MapContainer>
          </div>
        </>
      ) : (
        <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-gray-700 text-sm text-gray-500">
          No location data yet. Waiting for the phone to report a fix…
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs text-gray-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-gray-200">{value}</p>
    </div>
  );
}

function describePlace(lat, lon) {
  return `Fix: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}