import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation,
  Clock,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Route,
  Trash2,
  Download,
  MapPin,
  ChevronDown,
  ChevronUp,
  Activity,
  Gauge,
  Locate,
  Compass,
  Car,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { useStore } from '../store/StoreContext';

// In-memory geocoding cache to avoid duplicate API requests
const addressCache = new Map();

async function fetchAddressForCoord(lat, lng) {
  if (lat == null || lng == null) return null;
  const key = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  if (addressCache.has(key)) return addressCache.get(key);

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const d = await res.json();
      const parts = [
        d.locality || d.city,
        d.principalSubdivision,
        d.countryName
      ].filter(Boolean);
      const name = parts.join(', ');
      if (name) {
        addressCache.set(key, name);
        return name;
      }
    }
  } catch (_) {}

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const d = await res.json();
      const road = d.address?.road || d.address?.suburb || d.address?.neighbourhood;
      const city = d.address?.city || d.address?.town || d.address?.county;
      const name = [road, city].filter(Boolean).join(', ') || d.display_name?.split(',').slice(0, 3).join(',');
      if (name) {
        addressCache.set(key, name);
        return name;
      }
    }
  } catch (_) {}

  return null;
}

// Custom device marker (teal teardrop)
const deviceIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="
    width:24px;height:24px;border-radius:50% 50% 50% 0;
    background:#14b8a6;border:3px solid #fff;
    transform:rotate(-45deg);
    box-shadow:0 3px 10px rgba(0,0,0,.6);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -20]
});

// Custom safe zone center marker (amber flag/dot)
const safeZoneCenterIcon = L.divIcon({
  className: 'custom-pin-safe',
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#f59e0b;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,.5);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10]
});

// Start marker for route (emerald circle)
const routeStartIcon = L.divIcon({
  className: 'custom-pin-start',
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#10b981;border:2.5px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,.5);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

function Recenter({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position && Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      map.setView(position, zoom, { animate: true });
    }
  }, [position, zoom, map]);
  return null;
}

function FlyToFocus({ focus }) {
  const map = useMap();
  useEffect(() => {
    if (focus && focus.position && Number.isFinite(focus.position[0]) && Number.isFinite(focus.position[1])) {
      map.flyTo(focus.position, focus.zoom || 17, { duration: 1.0 });
    }
  }, [focus, map]);
  return null;
}

// Haversine formula to compute distance in meters between two lat/lng points
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function LocationMap() {
  const { activeDeviceId, activeDevice, locations, sendCommand, pushToast, setTimelineTracking, clearLocationHistory } = useStore();
  const [autoCenter, setAutoCenter] = useState(true);
  const [locRefreshing, setLocRefreshing] = useState(false);

  // --- Safe Zone (Geofencing) state ---
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [safeZoneRadius, setSafeZoneRadius] = useState(250); // meters
  const [safeZoneCenter, setSafeZoneCenter] = useState(null); // { lat, lng }
  const [isInsideGeofence, setIsInsideGeofence] = useState(true);
  const [geofenceBreachCount, setGeofenceBreachCount] = useState(0);
  const prevInsideStateRef = useRef(null);

  // --- Route Mapping / Breadcrumbs state ---
  // Default to FALSE (OFF) unless user explicitly turned it ON in localStorage
  const [routeTrackingEnabled, setRouteTrackingEnabled] = useState(() => {
    try {
      return localStorage.getItem('phonelink_route_tracking') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [idleRadius, setIdleRadius] = useState(() => {
    try {
      return Number(localStorage.getItem('phonelink_route_radius')) || 200;
    } catch (_) {
      return 200;
    }
  });
  const [dwellMinutes, setDwellMinutes] = useState(() => {
    try {
      return Number(localStorage.getItem('phonelink_route_dwell')) || 5;
    } catch (_) {
      return 5;
    }
  });
  const [routePoints, setRoutePoints] = useState([]);
  const [showRouteTimeline, setShowRouteTimeline] = useState(true);
  const [timelineViewMode, setTimelineViewMode] = useState('grouped'); // 'grouped' (Stops & Trips) or 'raw'
  const [addressMap, setAddressMap] = useState({});
  const [currentAddress, setCurrentAddress] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const [showTripSettings, setShowTripSettings] = useState(false);

  const handleToggleRouteTracking = (checked, radius = idleRadius, dwell = dwellMinutes) => {
    setRouteTrackingEnabled(checked);
    try {
      localStorage.setItem('phonelink_route_tracking', checked ? 'true' : 'false');
    } catch (_) {}
    if (setTimelineTracking) {
      setTimelineTracking(checked, radius, dwell);
    }
    pushToast(
      checked
        ? `Trip tracking active on phone (Idle Filter: ${radius}m / ${dwell}m)`
        : 'Trip tracking paused on phone (Live GPS only)',
      checked ? 'success' : 'info'
    );
  };

  const handleUpdateRadius = (radius) => {
    setIdleRadius(radius);
    try {
      localStorage.setItem('phonelink_route_radius', String(radius));
    } catch (_) {}
    if (routeTrackingEnabled && setTimelineTracking) {
      setTimelineTracking(true, radius, dwellMinutes);
    }
    pushToast(`Stationary radius filter set to ${radius}m`, 'info');
  };

  const handleUpdateDwell = (dwell) => {
    setDwellMinutes(dwell);
    try {
      localStorage.setItem('phonelink_route_dwell', String(dwell));
    } catch (_) {}
    if (routeTrackingEnabled && setTimelineTracking) {
      setTimelineTracking(true, idleRadius, dwell);
    }
    pushToast(`Stationary dwell time set to ${dwell} min`, 'info');
  };

  const handleClearTrip = async () => {
    if (window.confirm('Clear all recorded trip points and breadcrumbs for this device?')) {
      setRoutePoints([]);
      setAddressMap({});
      if (clearLocationHistory) await clearLocationHistory();
    }
  };

  const location = activeDeviceId ? locations[activeDeviceId] : null;

  // Load persisted Safe Zone & Route config for the active device
  useEffect(() => {
    if (!activeDeviceId) return;

    // Load Safe Zone from localStorage
    try {
      const savedZone = localStorage.getItem(`phonelink_safezone_${activeDeviceId}`);
      if (savedZone) {
        const parsed = JSON.parse(savedZone);
        if (parsed.center) setSafeZoneCenter(parsed.center);
        if (parsed.radius) setSafeZoneRadius(parsed.radius);
        if (typeof parsed.enabled === 'boolean') setGeofenceEnabled(parsed.enabled);
      }
    } catch (_) {}

    // Load initial Location & History from server
    fetch(`/api/devices/${activeDeviceId}/location/history?limit=300`)
      .then((r) => r.json())
      .then((history) => {
        if (Array.isArray(history) && history.length > 0) {
          const valid = history
            .filter((p) => p.latitude != null && p.longitude != null)
            .map((p) => ({
              lat: p.latitude,
              lng: p.longitude,
              accuracy: p.accuracy,
              speed: p.speed,
              altitude: p.altitude,
              timestamp: p.timestamp
            }));
          setRoutePoints(valid);
        }
      })
      .catch(() => {});
  }, [activeDeviceId]);

  // Persist Safe Zone changes to localStorage
  useEffect(() => {
    if (!activeDeviceId || !safeZoneCenter) return;
    try {
      localStorage.setItem(
        `phonelink_safezone_${activeDeviceId}`,
        JSON.stringify({
          center: safeZoneCenter,
          radius: safeZoneRadius,
          enabled: geofenceEnabled
        })
      );
    } catch (_) {}
  }, [activeDeviceId, safeZoneCenter, safeZoneRadius, geofenceEnabled]);

  // Process new incoming location fixes: update route & evaluate geofence
  useEffect(() => {
    if (!location || location.latitude == null || location.longitude == null) return;

    const currentLat = location.latitude;
    const currentLng = location.longitude;

    // If no safe zone center has been set yet, set it to the first fix
    if (!safeZoneCenter) {
      setSafeZoneCenter({ lat: currentLat, lng: currentLng });
    }

    // 1. Evaluate Geofence boundary
    if (geofenceEnabled && safeZoneCenter) {
      const dist = haversineDistanceMeters(
        safeZoneCenter.lat,
        safeZoneCenter.lng,
        currentLat,
        currentLng
      );
      const inside = dist <= safeZoneRadius;
      setIsInsideGeofence(inside);

      // Trigger notification if state changed
      if (prevInsideStateRef.current !== null && prevInsideStateRef.current !== inside) {
        if (!inside) {
          setGeofenceBreachCount((c) => c + 1);
          const msg = `⚠️ GEOFENCE BREACH: ${activeDevice?.deviceName || 'Phone'} exited the ${safeZoneRadius}m Safe Zone! (Distance: ${Math.round(dist)}m)`;
          pushToast(msg, 'error');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⚠️ Safe Zone Exit Alert', { body: msg, tag: 'geofence' });
          }
        } else {
          const msg = `✅ Safe Zone Return: ${activeDevice?.deviceName || 'Phone'} is back inside Safe Zone (Distance: ${Math.round(dist)}m)`;
          pushToast(msg, 'success');
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('✅ Safe Zone Return Alert', { body: msg, tag: 'geofence' });
          }
        }
      }
      prevInsideStateRef.current = inside;
    }

    // 2. Append to Route if route tracking is enabled
    if (routeTrackingEnabled) {
      setRoutePoints((prev) => {
        const last = prev[prev.length - 1];
        if (last) {
          const moved = haversineDistanceMeters(last.lat, last.lng, currentLat, currentLng);
          if (!location.isTimelinePoint && moved < idleRadius) {
            return prev;
          }
        }
        const updated = [
          ...prev,
          {
            lat: currentLat,
            lng: currentLng,
            accuracy: location.accuracy,
            speed: location.speed,
            altitude: location.altitude,
            timestamp: location.timestamp || Date.now()
          }
        ];
        return updated.slice(-1000); // keep last 1000 points
      });
    }
  }, [location, geofenceEnabled, safeZoneCenter, safeZoneRadius, routeTrackingEnabled, idleRadius, activeDevice, pushToast]);

  // Calculate total route distance in km
  const totalDistanceKm = useMemo(() => {
    if (routePoints.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < routePoints.length; i++) {
      dist += haversineDistanceMeters(
        routePoints[i - 1].lat,
        routePoints[i - 1].lng,
        routePoints[i].lat,
        routePoints[i].lng
      );
    }
    return dist / 1000;
  }, [routePoints]);

  // Current distance to safe zone center
  const distanceToSafeZoneCenter = useMemo(() => {
    if (!safeZoneCenter || !location || location.latitude == null) return null;
    return haversineDistanceMeters(
      safeZoneCenter.lat,
      safeZoneCenter.lng,
      location.latitude,
      location.longitude
    );
  }, [safeZoneCenter, location]);

  const handleExportRouteJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(routePoints, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `route_${activeDeviceId || 'device'}_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  // 1. Reverse geocode current location fix
  useEffect(() => {
    if (!location || location.latitude == null || location.longitude == null) return;
    fetchAddressForCoord(location.latitude, location.longitude).then((addr) => {
      if (addr) {
        setCurrentAddress(addr);
        const key = `${Number(location.latitude).toFixed(4)},${Number(location.longitude).toFixed(4)}`;
        setAddressMap((prev) => ({ ...prev, [key]: addr }));
      }
    });
  }, [location?.latitude, location?.longitude]);

  // 2. Reverse geocode route points in background
  useEffect(() => {
    if (!routePoints || routePoints.length === 0) return;
    const uniqueCoords = [];
    const seen = new Set();
    routePoints.slice().reverse().slice(0, 35).forEach((p) => {
      const key = `${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCoords.push({ lat: p.lat, lng: p.lng, key });
      }
    });

    uniqueCoords.forEach(({ lat, lng, key }) => {
      if (!addressMap[key]) {
        fetchAddressForCoord(lat, lng).then((addr) => {
          if (addr) {
            setAddressMap((prev) => ({ ...prev, [key]: addr }));
          }
        });
      }
    });
  }, [routePoints]);

  // 3. Compute smart grouped Stops & Trips
  const timelineSegments = useMemo(() => {
    if (!routePoints || routePoints.length === 0) return [];

    const segments = [];
    let currentSegment = null;

    for (let i = 0; i < routePoints.length; i++) {
      const p = routePoints[i];
      const speedKmH = p.speed != null ? p.speed * 3.6 : 0;
      const key = `${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`;
      const addr = addressMap[key] || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
      const isMoving = speedKmH >= 3;

      if (!currentSegment) {
        currentSegment = {
          type: isMoving ? 'moving' : 'stay',
          startTime: p.timestamp,
          endTime: p.timestamp,
          lat: p.lat,
          lng: p.lng,
          address: addr,
          key,
          speed: speedKmH,
          maxSpeed: speedKmH,
          accuracy: p.accuracy || 15,
          pointCount: 1
        };
      } else {
        const dist = haversineDistanceMeters(currentSegment.lat, currentSegment.lng, p.lat, p.lng);
        const staySameSpot = dist < 30 && !isMoving && currentSegment.type === 'stay';

        if (staySameSpot) {
          currentSegment.endTime = p.timestamp;
          currentSegment.pointCount += 1;
          if (addr && !currentSegment.address.includes(',')) currentSegment.address = addr;
        } else {
          segments.push(currentSegment);
          currentSegment = {
            type: isMoving ? 'moving' : 'stay',
            startTime: p.timestamp,
            endTime: p.timestamp,
            lat: p.lat,
            lng: p.lng,
            address: addr,
            key,
            speed: speedKmH,
            maxSpeed: speedKmH,
            accuracy: p.accuracy || 15,
            pointCount: 1
          };
        }
      }
    }
    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments.reverse(); // Newest first
  }, [routePoints, addressMap]);

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="text-center">
          <Navigation className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-3 text-sm">Select a device to track location</p>
        </div>
      </div>
    );
  }

  const hasFix = location && location.latitude != null && location.longitude != null;
  const polylinePositions = routePoints.map((p) => [p.lat, p.lng]);

  return (
    <div className="mx-auto h-full max-w-5xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Location & Route Tracker</h2>
              {activeDevice?.online && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-950 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live GPS
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeDevice?.online ? 'Real-time GPS updates & route history' : 'Last known position'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              if (!activeDeviceId || locRefreshing) return;
              setLocRefreshing(true);
              try {
                await sendCommand('request-location', { deviceId: activeDeviceId });
                pushToast('GPS fix requested from phone…', 'info');
              } catch (_) {
                pushToast('Failed to request location', 'error');
              } finally {
                setTimeout(() => setLocRefreshing(false), 1500);
              }
            }}
            disabled={!activeDeviceId || locRefreshing}
            className="flex items-center gap-1.5 rounded-lg btn-interactive bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs rounded-xl cursor-pointer disabled:opacity-40"
            title="Request fresh GPS fix from the phone"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${locRefreshing ? 'animate-spin' : ''}`} />
            Refresh GPS
          </button>

          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCenter}
              onChange={(e) => setAutoCenter(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-600 bg-slate-100 dark:bg-slate-800 accent-teal-500"
            />
            Auto-center
          </label>
        </div>
      </div>

      {/* Geofence Alert Banner if breached */}
      {geofenceEnabled && !isInsideGeofence && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2.5 text-xs text-red-200">
          <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <span className="font-semibold text-red-300">SAFE ZONE BREACH:</span> Device has exited the designated Safe Zone! Distance: {distanceToSafeZoneCenter ? `${Math.round(distanceToSafeZoneCenter)} m` : 'outside'}.
          </div>
        </div>
      )}

      {/* Geofence & Route Tracking Control Bar */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Geofence / Safe Zone Box */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Shield className="h-4 w-4 text-amber-400" />
              <span>Safe Zone Geofence</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={geofenceEnabled}
                onChange={(e) => {
                  setGeofenceEnabled(e.target.checked);
                  if (e.target.checked && hasFix && !safeZoneCenter) {
                    setSafeZoneCenter({ lat: location.latitude, lng: location.longitude });
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="mt-2.5 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>Radius: <strong className="text-slate-800 dark:text-slate-200">{safeZoneRadius} meters</strong></span>
              {distanceToSafeZoneCenter != null && (
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${isInsideGeofence ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800 animate-pulse'}`}>
                  {isInsideGeofence ? 'Inside Safe Zone' : 'Outside Safe Zone!'}
                </span>
              )}
            </div>
            <input
              type="range"
              min="50"
              max="3000"
              step="50"
              value={safeZoneRadius}
              onChange={(e) => setSafeZoneRadius(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  if (hasFix) {
                    setSafeZoneCenter({ lat: location.latitude, lng: location.longitude });
                    pushToast('Safe Zone center updated to current position', 'success');
                  }
                }}
                disabled={!hasFix}
                className="flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-gray-700 disabled:opacity-40"
              >
                <MapPin className="h-3 w-3 text-amber-400" />
                Set Center at Current Fix
              </button>
              {safeZoneCenter && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Center: {safeZoneCenter.lat.toFixed(4)}, {safeZoneCenter.lng.toFixed(4)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Route Tracking Box */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Route className="h-4 w-4 text-blue-400" />
              <span>Route Mapping & History</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportRouteJSON}
                disabled={routePoints.length === 0}
                className="flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-gray-700 disabled:opacity-40"
                title="Download route data (JSON)"
              >
                <Download className="h-3 w-3" />
                Export
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear route breadcrumb history?')) {
                    setRoutePoints([]);
                    pushToast('Route history cleared', 'info');
                  }
                }}
                disabled={routePoints.length === 0}
                className="rounded bg-slate-100 dark:bg-slate-800 p-1 text-slate-500 dark:text-slate-400 hover:text-red-400 disabled:opacity-40"
                title="Clear route"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-100 dark:bg-slate-800/60 rounded p-1.5 text-center">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Traveled</div>
              <div className="text-xs font-bold text-gray-100">{totalDistanceKm.toFixed(2)} km</div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/60 rounded p-1.5 text-center">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Waypoints</div>
              <div className="text-xs font-bold text-blue-400">{routePoints.length}</div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/60 rounded p-1.5 text-center">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Live Speed</div>
              <div className="text-xs font-bold text-teal-400">
                {location?.speed != null && location.speed > 0
                  ? `${(location.speed * 3.6).toFixed(1)} km/h`
                  : '0 km/h'}
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={routeTrackingEnabled}
                  onChange={(e) => handleToggleRouteTracking(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-slate-100 dark:bg-slate-800 accent-blue-500 cursor-pointer"
                />
                <span className={routeTrackingEnabled ? 'text-blue-300 font-semibold flex items-center gap-1.5' : 'text-slate-500 dark:text-slate-400'}>
                  {routeTrackingEnabled && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />}
                  Record Trip & Timeline
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTripSettings(!showTripSettings)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-gray-700 text-slate-700 dark:text-slate-300 text-[10px] flex items-center gap-1 transition-colors"
                  title="Configure idle movement radius & stay dwell time"
                >
                  <Activity className="h-3 w-3 text-blue-400" />
                  {idleRadius}m / {dwellMinutes}m filter {showTripSettings ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                </button>
                <button
                  onClick={() => setShowRouteTimeline(!showRouteTimeline)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                >
                  Timeline {showRouteTimeline ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Expandable Smart Trip & Idle Filter Settings */}
            {showTripSettings && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-2.5 space-y-2 text-[11px] text-slate-700 dark:text-slate-300 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Idle Radius Threshold:</span>
                  <div className="flex gap-1">
                    {[50, 100, 200, 500, 1000].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleUpdateRadius(r)}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          idleRadius === r
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-gray-700'
                        }`}
                      >
                        {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Min Stay Dwell Time:</span>
                  <div className="flex gap-1">
                    {[1, 3, 5, 10, 15].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleUpdateDwell(d)}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          dwellMinutes === d
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-gray-700'
                        }`}
                      >
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-900 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>⚡ Offline Buffer: GPS saved locally when disconnected & synced on reconnect</span>
                  <button
                    type="button"
                    onClick={handleClearTrip}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold ml-2 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Clear Trip
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasFix ? (
        <>
          {/* Resolved Address Banner */}
          <div className="flex flex-wrap items-center justify-between bg-teal-950/40 border border-teal-800/60 rounded-lg p-3 gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-teal-900/60 text-teal-300 shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                  Current Landmark / Address
                </span>
                <p className="text-xs sm:text-sm font-semibold text-white truncate">
                  {currentAddress || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMapFocus({ position: [location.latitude, location.longitude], zoom: 17, timestamp: Date.now() })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition-colors shrink-0 shadow cursor-pointer"
            >
              <Locate className="h-3.5 w-3.5" /> Center on Map
            </button>
          </div>

          {/* Telemetry Stats */}
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            <Stat label="Coordinates" value={`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`} />
            <Stat label="Accuracy" value={location.accuracy ? `± ${Math.round(location.accuracy)} m` : '—'} />
            <Stat
              label="Altitude / Speed"
              value={`${location.altitude != null ? `${Math.round(location.altitude)}m` : '—'} · ${location.speed != null ? `${(location.speed * 3.6).toFixed(1)} km/h` : '0 km/h'}`}
              icon={Gauge}
            />
            <Stat
              label="Updated"
              value={location.timestamp ? new Date(location.timestamp).toLocaleTimeString() : '—'}
              icon={Clock}
            />
          </div>

          {/* Interactive Map */}
          <div className="h-[460px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 relative">
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
              <FlyToFocus focus={mapFocus} />

              {/* 1. Safe Zone Geofence Circle on Map */}
              {geofenceEnabled && safeZoneCenter && (
                <>
                  <Circle
                    center={[safeZoneCenter.lat, safeZoneCenter.lng]}
                    radius={safeZoneRadius}
                    pathOptions={{
                      color: isInsideGeofence ? '#f59e0b' : '#ef4444',
                      fillColor: isInsideGeofence ? '#fbbf24' : '#ef4444',
                      fillOpacity: 0.15,
                      dashArray: '8, 8',
                      weight: 2
                    }}
                  />
                  <Marker position={[safeZoneCenter.lat, safeZoneCenter.lng]} icon={safeZoneCenterIcon}>
                    <Popup>
                      <strong>Safe Zone Center</strong>
                      <br />
                      Radius: {safeZoneRadius} m
                    </Popup>
                  </Marker>
                </>
              )}

              {/* 2. Route Polyline Path */}
              {polylinePositions.length > 1 && (
                <>
                  <Polyline
                    positions={polylinePositions}
                    pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.85 }}
                  />
                  {/* Start Point Marker */}
                  <Marker position={polylinePositions[0]} icon={routeStartIcon}>
                    <Popup>
                      <strong>Route Start</strong>
                      <br />
                      {new Date(routePoints[0].timestamp).toLocaleTimeString()}
                    </Popup>
                  </Marker>
                </>
              )}

              {/* 3. Device Current Fix Marker */}
              <Marker position={[location.latitude, location.longitude]} icon={deviceIcon}>
                <Popup>
                  <div className="text-xs">
                    <strong className="text-sm">{activeDevice?.deviceName || 'Device'}</strong>
                    <div className="mt-1">Fix: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</div>
                    <div>Accuracy: ±{Math.round(location.accuracy || 0)} m</div>
                    {location.speed != null && <div>Speed: {(location.speed * 3.6).toFixed(1)} km/h</div>}
                    <div>Time: {new Date(location.timestamp).toLocaleTimeString()}</div>
                  </div>
                </Popup>
              </Marker>

              {/* Accuracy circle */}
              {location.accuracy > 0 && (
                <Circle
                  center={[location.latitude, location.longitude]}
                  radius={location.accuracy}
                  pathOptions={{ color: '#14b8a6', fillColor: '#14b8a6', fillOpacity: 0.1, weight: 1 }}
                />
              )}
            </MapContainer>
          </div>

          {/* Rich Visual Route Timeline & Location Reports */}
          {showRouteTimeline && routePoints.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-gray-100">
                    Route Timeline & Location Report
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300">
                    {timelineSegments.length} Stops · {routePoints.length} Points
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTimelineViewMode('grouped')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                      timelineViewMode === 'grouped'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-white'
                    }`}
                  >
                    📍 Stops & Stays (Clean View)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineViewMode('raw')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                      timelineViewMode === 'raw'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-white'
                    }`}
                  >
                    📋 All GPS Points
                  </button>
                  <button
                    type="button"
                    onClick={handleClearTrip}
                    className="px-2.5 py-1 text-xs rounded font-medium bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-900 transition-colors cursor-pointer flex items-center gap-1"
                    title="Clear trip waypoints"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </div>
              </div>

              {/* Grouped Stops View */}
              {timelineViewMode === 'grouped' ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {timelineSegments.map((seg, idx) => {
                    const isStay = seg.type === 'stay';
                    const startStr = new Date(seg.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endStr = new Date(seg.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const durationMins = Math.max(1, Math.round((seg.endTime - seg.startTime) / 60000));

                    return (
                      <div
                        key={seg.startTime + '-' + idx}
                        className={`flex flex-wrap items-center justify-between p-3 rounded-lg border transition-all ${
                          isStay
                            ? 'bg-slate-50 dark:bg-slate-950/70 border-emerald-900/40 hover:border-emerald-700/60'
                            : 'bg-slate-50 dark:bg-slate-950/70 border-blue-900/40 hover:border-blue-700/60'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2 rounded-full mt-0.5 shrink-0 ${
                            isStay
                              ? 'bg-emerald-950 border border-emerald-700/80 text-emerald-400'
                              : 'bg-blue-950 border border-blue-700/80 text-blue-400 animate-pulse'
                          }`}>
                            {isStay ? <MapPin className="h-4 w-4" /> : <Car className="h-4 w-4" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                                isStay ? 'text-emerald-400' : 'text-blue-400'
                              }`}>
                                {isStay ? 'Stationary Stay' : 'In Transit / Moving'}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                {startStr}{startStr !== endStr ? ` → ${endStr} (${durationMins}m)` : ''}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                ({seg.pointCount} fixes)
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-semibold text-white mt-0.5 truncate">
                              {seg.address}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                {seg.lat.toFixed(5)}, {seg.lng.toFixed(5)}
                              </span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                isStay
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                  : 'bg-blue-950/60 text-blue-300 border-blue-800'
                              }`}>
                                {isStay ? 'Stationary (0 km/h)' : `Speed: ${seg.speed.toFixed(1)} km/h`}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                ±{Math.round(seg.accuracy)}m accuracy
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setMapFocus({ position: [seg.lat, seg.lng], zoom: 17, timestamp: Date.now() })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-gray-700 text-teal-300 hover:text-teal-200 text-xs font-medium border border-gray-700 transition-colors shrink-0 shadow mt-2 sm:mt-0 cursor-pointer"
                        >
                          <Locate className="h-3.5 w-3.5" /> Locate
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Raw Points View */
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {routePoints
                    .slice()
                    .reverse()
                    .slice(0, 60)
                    .map((p, idx) => {
                      const key = `${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`;
                      const resolvedName = addressMap[key] || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

                      return (
                        <div
                          key={p.timestamp + '-' + idx}
                          className="flex flex-wrap items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 gap-2 hover:bg-white dark:bg-slate-900/80 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] text-teal-400 shrink-0">
                              {new Date(p.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-white font-medium truncate text-xs">
                              {resolvedName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">±{Math.round(p.accuracy || 0)}m</span>
                            <span className="text-teal-300 font-mono text-[11px]">
                              {p.speed ? `${(p.speed * 3.6).toFixed(0)} km/h` : '0 km/h'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setMapFocus({ position: [p.lat, p.lng], zoom: 17, timestamp: Date.now() })}
                              className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-white"
                              title="Locate on map"
                            >
                              <Locate className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col h-[400px] items-center justify-center rounded-lg border border-dashed border-gray-700 p-6 text-center text-slate-500 dark:text-slate-400">
          <Navigation className="h-10 w-10 text-gray-600 mb-3 animate-pulse" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Waiting for GPS fix from phone…</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Make sure Location is turned ON in phone system settings and granted in the app. Click "Refresh GPS" above to query fresh coordinates.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 truncate text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}