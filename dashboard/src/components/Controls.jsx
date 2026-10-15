import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sliders,
  Volume2,
  Square,
  Play,
  Palette,
  Image as ImageIcon,
  Clipboard,
  Copy,
  Check,
  Search,
  RefreshCw,
  Wifi,
  Smartphone,
  Cpu,
  HardDrive,
  Layers,
  Shield,
  Info,
  Clock,
  Radio,
  Lock,
  PhoneOff,
  Trash2,
  X,
  Mic,
  Camera,
  Monitor,
  Video,
  Download,
  Zap,
  AlertTriangle,
  Upload,
  Headphones
} from 'lucide-react';
import { useStore } from '../store/StoreContext';

const PRESET_PATTERNS = [
  { label: 'Single Buzz', pattern: [0, 300] },
  { label: 'Double Buzz', pattern: [0, 200, 100, 200] },
  { label: 'Triple Alert', pattern: [0, 150, 80, 150, 80, 250] },
  { label: 'SOS Alert', pattern: [0, 100, 80, 100, 80, 100, 200, 300, 100, 300, 100, 300, 200, 100, 80, 100, 80, 100] }
];

const PRESET_SOUNDS = [
  { label: 'Notification Ding', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
  { label: 'Warning Siren', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
  { label: 'Clock Ring', url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg' },
  { label: 'Digital Alarm', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
  { label: 'Bugle Alert', url: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg' }
];

const PRESET_COLORS = [
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Slate Dark', hex: '#0f172a' },
  { name: 'Midnight Blue', hex: '#1e1b4b' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Crimson', hex: '#be123c' },
  { name: 'Charcoal', hex: '#18181b' }
];

export default function Controls() {
  const {
    activeDeviceId,
    activeDevice,
    deviceInfo,
    installedApps,
    wifiInfo,
    clipboardHistory,
    clipboardCapture,
    appPermissions,
    vibratePhone,
    speakTts,
    playAudio,
    stopAudio,
    setWallpaper,
    refreshDeviceInfo,
    refreshInstalledApps,
    fetchAppPerms,
    refreshWifiInfo,
    readClipboard,
    toggleClipboardCapture,
    lockDevice,
    callBlocklist,
    syncCallBlocklist,
    micRecording,
    latestMicAudio,
    recordMic,
    cameraCapturing,
    latestCameraPhoto,
    captureCamera,
    cameraStreaming,
    latestCameraFrame,
    startCameraStream,
    stopCameraStream,
    screenshotCapturing,
    latestScreenshot,
    captureScreenshot,
    screenRecording,
    latestScreenFrame,
    startScreenRecord,
    stopScreenRecord,
    torchOn,
    toggleTorch,
    wipeDevice,
    liveListening,
    latestAudioChunk,
    startLiveListen,
    stopLiveListen,
    pushToast
  } = useStore();

  const [newBlockNumber, setNewBlockNumber] = useState('');
  const [micDuration, setMicDuration] = useState(15);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [streamFps, setStreamFps] = useState(15);
  const [cameraStreamFacing, setCameraStreamFacing] = useState('back');
  const [cameraStreamQuality, setCameraStreamQuality] = useState('low');
  const [cameraStreamFps, setCameraStreamFps] = useState(15);

  // Wallpaper direct PC file upload
  const [wallpaperFile, setWallpaperFile] = useState(null);

  // Remote wipe modal state
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');

  // Web Audio API playback for Live Listen
  const audioContextRef = useRef(null);
  const nextPlayTimeRef = useRef(0);

  useEffect(() => {
    if (!liveListening || !latestAudioChunk?.data) return;

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
        nextPlayTimeRef.current = audioContextRef.current.currentTime;
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Decode base64 to binary
      const binaryString = atob(latestAudioChunk.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM bytes to Float32Array (-1.0 to 1.0)
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      // Create AudioBuffer
      const audioBuffer = ctx.createBuffer(1, float32.length, 16000);
      audioBuffer.getChannelData(0).set(float32);

      // Play buffer scheduled continuously
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime + 0.04;
      }

      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
    } catch (e) {
      console.error('Audio chunk playback error:', e);
    }
  }, [latestAudioChunk, liveListening]);

  useEffect(() => {
    if (!liveListening && audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
      nextPlayTimeRef.current = 0;
    }
  }, [liveListening]);

  const downloadBase64 = (base64Data, mimeType, filename) => {
    try {
      const link = document.createElement('a');
      link.href = `data:${mimeType};base64,${base64Data}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      pushToast('Download failed: ' + String(e), 'error');
    }
  };

  // Vibrate state
  const [vibrateDuration, setVibrateDuration] = useState(500);
  const [selectedPattern, setSelectedPattern] = useState(null);

  // TTS state
  const [ttsText, setTtsText] = useState('Attention! This is a message from Phone Link.');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);

  // Audio state
  const [audioUrl, setAudioUrl] = useState('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  const [audioLoop, setAudioLoop] = useState(false);

  // Wallpaper state
  const [wallpaperColor, setWallpaperColor] = useState('#0d9488');
  const [wallpaperUrl, setWallpaperUrl] = useState('');

  // Apps state
  const [appSearch, setAppSearch] = useState('');
  const [appFilter, setAppFilter] = useState('user'); // 'all', 'user', 'system'
  const [inspectApp, setInspectApp] = useState(null);

  // Copied clipboard ID indicator
  const [copiedId, setCopiedId] = useState(null);

  const filteredApps = useMemo(() => {
    let list = installedApps || [];
    if (appFilter === 'user') list = list.filter((a) => !a.isSystem);
    if (appFilter === 'system') list = list.filter((a) => a.isSystem);

    const q = appSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.packageName || '').toLowerCase().includes(q)
    );
  }, [installedApps, appFilter, appSearch]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    pushToast('Copied to PC clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <Sliders className="mx-auto h-10 w-10 opacity-40 text-teal-400" />
          <p className="mt-3 text-sm">Select an active device to access remote controls</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-teal-400" /> Remote Controls & System Hub
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Targeting <span className="text-teal-300 font-medium">{activeDevice?.deviceName || activeDeviceId}</span>
          </p>
        </div>
      </div>

      {/* Grid of Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. VIBRATION CONTROLLER */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <Radio className="h-4 w-4 text-teal-400" /> Remote Vibration
              </h3>
              <span className="text-xs font-mono text-teal-400 bg-teal-950/60 border border-teal-800 px-2 py-0.5 rounded">
                {selectedPattern ? 'Pattern Mode' : `${vibrateDuration} ms`}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Trigger haptic feedback or rhythm vibration alerts on the target phone.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Custom Duration</span>
                  <span className="font-mono text-gray-300">{vibrateDuration} ms</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="3000"
                  step="50"
                  value={vibrateDuration}
                  onChange={(e) => {
                    setVibrateDuration(Number(e.target.value));
                    setSelectedPattern(null);
                  }}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Preset Patterns</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_PATTERNS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setSelectedPattern(p.pattern);
                        vibratePhone(vibrateDuration, p.pattern);
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors text-left ${
                        selectedPattern === p.pattern
                          ? 'bg-teal-900/60 border-teal-500 text-teal-200'
                          : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80">
            <button
              onClick={() => vibratePhone(vibrateDuration, selectedPattern)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors shadow-md shadow-teal-950"
            >
              <Radio className="h-4 w-4" /> Vibrate Phone Now
            </button>
          </div>
        </div>

        {/* 2. TEXT-TO-SPEECH (TTS) */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <Volume2 className="h-4 w-4 text-teal-400" /> Text-to-Speech (TTS)
              </h3>
              <span className="text-xs font-mono text-gray-400">Speaker Output</span>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Synthesize and speak text out loud through the device loudspeaker.
            </p>

            <div className="space-y-4">
              <div>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Enter text for the phone to speak..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-200 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Speed</span>
                    <span className="font-mono">{ttsSpeed}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(Number(e.target.value))}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Pitch</span>
                    <span className="font-mono">{ttsPitch}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={ttsPitch}
                    onChange={(e) => setTtsPitch(Number(e.target.value))}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80">
            <button
              onClick={() => speakTts(ttsText, ttsSpeed, ttsPitch)}
              disabled={!ttsText.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors disabled:opacity-40 shadow-md shadow-teal-950"
            >
              <Volume2 className="h-4 w-4" /> Speak On Phone
            </button>
          </div>
        </div>

        {/* 3. PLAY REMOTE AUDIO */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <Play className="h-4 w-4 text-teal-400" /> Play Remote Audio
              </h3>
              <span className="text-xs font-mono text-gray-400">MediaPlayer</span>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Stream or play any direct audio stream/URL on the phone.
            </p>

            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://example.com/sound.mp3"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-200 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1.5">Quick Samples</div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SOUNDS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setAudioUrl(s.url)}
                      className="text-xs px-2.5 py-1 rounded bg-gray-950 border border-gray-800 text-gray-300 hover:border-teal-600 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={audioLoop}
                  onChange={(e) => setAudioLoop(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-950 text-teal-500 focus:ring-teal-500 h-4 w-4"
                />
                <span>Loop playback continuously</span>
              </label>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80 flex gap-2">
            <button
              onClick={() => playAudio(audioUrl, audioLoop)}
              disabled={!audioUrl.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors disabled:opacity-40"
            >
              <Play className="h-4 w-4" /> Start Audio
            </button>
            <button
              onClick={() => stopAudio()}
              className="flex items-center justify-center gap-2 rounded-lg bg-red-950/80 border border-red-800/80 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-900 transition-colors"
              title="Stop current audio"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
          </div>
        </div>

        {/* 4. REMOTE WALLPAPER */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4 text-teal-400" /> Remote Wallpaper
              </h3>
              <span className="text-xs font-mono text-gray-400">Homescreen</span>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Set solid theme colors or online image wallpaper directly onto the phone.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Solid Color Presets</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => {
                        setWallpaperColor(c.hex);
                        setWallpaperUrl('');
                      }}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${
                        wallpaperColor === c.hex && !wallpaperUrl ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={wallpaperColor}
                    onChange={(e) => {
                      setWallpaperColor(e.target.value);
                      setWallpaperUrl('');
                    }}
                    className="h-7 w-7 rounded cursor-pointer bg-transparent border-0"
                    title="Custom Color"
                  />
                  <span className="text-xs font-mono text-gray-400 ml-1">{wallpaperColor}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Or Image URL</label>
                <input
                  type="text"
                  value={wallpaperUrl}
                  onChange={(e) => {
                    setWallpaperUrl(e.target.value);
                    if (e.target.value) setWallpaperFile(null);
                  }}
                  placeholder="https://example.com/wallpaper.jpg"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-200 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Or Upload Image File from PC</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="wallpaper-upload-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 8 * 1024 * 1024) {
                          pushToast('Image too large. Please select an image under 8MB.', 'error');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setWallpaperFile({
                            name: file.name,
                            size: (file.size / 1024).toFixed(0) + ' KB',
                            data: ev.target.result
                          });
                          setWallpaperUrl('');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="wallpaper-upload-input"
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-300 hover:border-teal-500 hover:text-white cursor-pointer transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 text-teal-400" />
                    <span className="truncate">{wallpaperFile ? wallpaperFile.name : 'Choose picture from computer'}</span>
                  </label>
                  {wallpaperFile && (
                    <button
                      type="button"
                      onClick={() => setWallpaperFile(null)}
                      className="p-2 text-gray-500 hover:text-red-400 rounded bg-gray-950 border border-gray-800"
                      title="Clear uploaded image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {wallpaperFile && (
                  <div className="mt-2 flex items-center gap-2 p-1.5 rounded bg-gray-950 border border-gray-800">
                    <img
                      src={wallpaperFile.data}
                      alt="Preview"
                      className="h-10 w-10 object-cover rounded border border-gray-700"
                    />
                    <div className="text-xs font-mono truncate">
                      <div className="text-gray-200 truncate">{wallpaperFile.name}</div>
                      <div className="text-[10px] text-gray-500">{wallpaperFile.size}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80">
            <button
              onClick={() => {
                if (wallpaperFile?.data) {
                  setWallpaper({ data: wallpaperFile.data });
                  pushToast('Applying custom wallpaper from PC…', 'info');
                } else if (wallpaperUrl.trim()) {
                  setWallpaper({ url: wallpaperUrl.trim() });
                } else {
                  setWallpaper({ color: wallpaperColor });
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors shadow-md shadow-teal-950"
            >
              <Palette className="h-4 w-4" /> Apply Wallpaper
            </button>
          </div>
        </div>

        {/* 5. LOCK DEVICE */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-teal-400" /> Remote Screen Lock
              </h3>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                  deviceInfo?.adminActive
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                    : 'bg-amber-950/60 border-amber-800 text-amber-300'
                }`}
              >
                {deviceInfo?.adminActive ? 'Admin Active' : 'Admin Setup Req'}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Instantly turn off display and lock the device screen using Android DevicePolicyManager.
            </p>

            <div className="rounded-lg bg-gray-950 p-3 border border-gray-800/80 text-xs text-gray-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                <Shield className="h-3.5 w-3.5 text-teal-400" /> Device Admin Security
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Requires the app to be activated as a Device Administrator on phone. If not active, tap &quot;Enable Remote Screen Lock&quot; in the mobile app.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to lock the phone screen right now?')) {
                  lockDevice();
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-950/80 border border-red-800/80 px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-900 transition-colors shadow-md"
            >
              <Lock className="h-4 w-4" /> Lock Device Screen Now
            </button>
          </div>
        </div>

        {/* 6. FLASHLIGHT (TORCH) */}
        <div className={`rounded-xl border p-5 shadow-lg flex flex-col justify-between transition-colors ${
          torchOn
            ? 'border-amber-500/60 bg-amber-950/20 shadow-amber-950/20'
            : 'border-gray-800 bg-gray-900'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <Zap className={`h-4 w-4 ${torchOn ? 'text-amber-400' : 'text-teal-400'}`} /> Flashlight (Torch)
              </h3>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                  torchOn
                    ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                    : 'bg-gray-950 border-gray-800 text-gray-400'
                }`}
              >
                {torchOn ? 'LIGHT ON' : 'OFF'}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Remotely toggle device rear camera LED flashlight ON or OFF.
            </p>

            <div className="flex items-center justify-center py-3">
              <div
                className={`h-16 w-16 rounded-full flex items-center justify-center border-2 transition-all ${
                  torchOn
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.5)] text-amber-300 scale-105'
                    : 'border-gray-700 bg-gray-950 text-gray-600'
                }`}
              >
                <Zap className={`h-8 w-8 ${torchOn ? 'animate-pulse' : ''}`} />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80">
            <button
              onClick={() => toggleTorch(!torchOn)}
              className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                torchOn
                  ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-md shadow-amber-950'
                  : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <Zap className="h-4 w-4" />
              {torchOn ? 'Turn Flashlight OFF' : 'Turn Flashlight ON'}
            </button>
          </div>
        </div>

        {/* 7. CALL BLOCKER / SCREENING */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <PhoneOff className="h-4 w-4 text-teal-400" /> Call Blocker &amp; Spam Shield
              </h3>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={callBlocklist?.enabled || false}
                  onChange={(e) => {
                    syncCallBlocklist(e.target.checked, callBlocklist?.numbers || []);
                  }}
                  className="rounded border-gray-700 bg-gray-950 text-teal-500 focus:ring-teal-500 h-4 w-4"
                />
                <span className={callBlocklist?.enabled ? 'text-teal-400 font-medium' : 'text-gray-500'}>
                  {callBlocklist?.enabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Automatically reject incoming spam calls using Android CallScreeningService.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBlockNumber}
                  onChange={(e) => setNewBlockNumber(e.target.value)}
                  placeholder="Enter phone number to block..."
                  className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-3 py-1.5 text-xs text-gray-200 focus:border-teal-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBlockNumber.trim()) {
                      const updated = [...new Set([...(callBlocklist?.numbers || []), newBlockNumber.trim()])];
                      syncCallBlocklist(callBlocklist?.enabled ?? true, updated);
                      setNewBlockNumber('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (!newBlockNumber.trim()) return;
                    const updated = [...new Set([...(callBlocklist?.numbers || []), newBlockNumber.trim()])];
                    syncCallBlocklist(callBlocklist?.enabled ?? true, updated);
                    setNewBlockNumber('');
                  }}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 transition-colors"
                >
                  Block
                </button>
              </div>

              {/* Blocked numbers list */}
              <div className="max-h-28 overflow-y-auto scrollbar-thin space-y-1.5">
                {(callBlocklist?.numbers || []).length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic py-2">No numbers in blocklist yet.</p>
                ) : (
                  (callBlocklist?.numbers || []).map((num) => (
                    <div
                      key={num}
                      className="flex items-center justify-between gap-2 px-2.5 py-1 rounded bg-gray-950 border border-gray-800 text-xs"
                    >
                      <span className="font-mono text-gray-200">{num}</span>
                      <button
                        onClick={() => {
                          const updated = (callBlocklist?.numbers || []).filter((n) => n !== num);
                          syncCallBlocklist(callBlocklist?.enabled ?? false, updated);
                        }}
                        className="text-gray-500 hover:text-red-400 p-1"
                        title="Remove from blocklist"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/80 text-[10px] text-gray-500">
            Note: On Android 10+, tap &quot;Enable Call Screening&quot; in the mobile app to authorize screening.
          </div>
        </div>

      </div>

      {/* 6. CLIPBOARD SYNC & LOG */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-800 pb-3">
          <div>
            <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
              <Clipboard className="h-4 w-4 text-teal-400" /> Clipboard Manager & Live Sync
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Read current phone clipboard or toggle automatic background clip capture.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
              <input
                type="checkbox"
                checked={clipboardCapture}
                onChange={(e) => toggleClipboardCapture(e.target.checked)}
                className="rounded border-gray-700 bg-gray-950 text-teal-500 focus:ring-teal-500 h-4 w-4"
              />
              <span>Live Capture Active</span>
            </label>

            <button
              onClick={() => readClipboard()}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 transition-colors"
            >
              <Clipboard className="h-3.5 w-3.5" /> Read Clipboard
            </button>
          </div>
        </div>

        {clipboardHistory.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">
            No clipboard history recorded yet. Tap &quot;Read Clipboard&quot; or toggle live capture.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
            {clipboardHistory.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-800/80 bg-gray-950 p-2.5 text-xs hover:border-gray-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-gray-200 break-words whitespace-pre-wrap">{item.text}</p>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {new Date(item.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(item.text, item.id || idx)}
                  className="shrink-0 p-1.5 rounded bg-gray-900 text-gray-400 hover:text-teal-300 hover:bg-gray-800 transition-colors"
                  title="Copy to PC"
                >
                  {copiedId === (item.id || idx) ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. SYSTEM TELEMETRY & SPECS */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-800 pb-3">
          <div>
            <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4 text-teal-400" /> System Information & Telemetry
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Live hardware, memory, storage and Android OS diagnostics.
            </p>
          </div>
          <button
            onClick={() => refreshDeviceInfo()}
            className="flex items-center gap-1.5 rounded-lg bg-gray-950 border border-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Info
          </button>
        </div>

        {deviceInfo ? (
          <div className="space-y-5">
            {/* Spec chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-500 block text-[10px]">Model & Brand</span>
                <span className="font-semibold text-gray-200 truncate block mt-0.5">
                  {deviceInfo.manufacturer} {deviceInfo.model}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{deviceInfo.product || deviceInfo.board}</span>
              </div>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-500 block text-[10px]">Android OS</span>
                <span className="font-semibold text-teal-300 block mt-0.5">
                  Android {deviceInfo.androidVersion}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">API {deviceInfo.sdkInt}</span>
              </div>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-500 block text-[10px]">Display</span>
                <span className="font-semibold text-gray-200 block mt-0.5">
                  {deviceInfo.display?.widthPixels} x {deviceInfo.display?.heightPixels}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{deviceInfo.display?.densityDpi} DPI</span>
              </div>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-500 block text-[10px]">Uptime & Security</span>
                <span className="font-semibold text-gray-200 block mt-0.5">
                  {Math.floor((deviceInfo.uptimeMs || 0) / 3600000)}h {Math.floor(((deviceInfo.uptimeMs || 0) % 3600000) / 60000)}m
                </span>
                <span className="text-[10px] text-gray-500 font-mono truncate block">Patch: {deviceInfo.securityPatch || 'N/A'}</span>
              </div>
            </div>

            {/* RAM & Storage bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* RAM */}
              <div className="bg-gray-950 p-3.5 rounded-lg border border-gray-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-medium text-gray-300 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-teal-400" /> RAM Memory
                  </span>
                  <span className="font-mono text-gray-400">
                    {formatBytes((deviceInfo.ram?.totalMem || 0) - (deviceInfo.ram?.availMem || 0))} / {formatBytes(deviceInfo.ram?.totalMem)}
                  </span>
                </div>
                {(() => {
                  const total = deviceInfo.ram?.totalMem || 1;
                  const avail = deviceInfo.ram?.availMem || 0;
                  const usedPct = Math.min(100, Math.max(0, Math.round(((total - avail) / total) * 100)));
                  return (
                    <div>
                      <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block text-right">{usedPct}% used</span>
                    </div>
                  );
                })()}
              </div>

              {/* Storage */}
              <div className="bg-gray-950 p-3.5 rounded-lg border border-gray-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-medium text-gray-300 flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-teal-400" /> Internal Storage
                  </span>
                  <span className="font-mono text-gray-400">
                    {formatBytes(deviceInfo.storage?.usedBytes)} / {formatBytes(deviceInfo.storage?.totalBytes)}
                  </span>
                </div>
                {(() => {
                  const total = deviceInfo.storage?.totalBytes || 1;
                  const used = deviceInfo.storage?.usedBytes || 0;
                  const usedPct = Math.min(100, Math.max(0, Math.round((used / total) * 100)));
                  return (
                    <div>
                      <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block text-right">{usedPct}% used</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 text-xs">
            Click &quot;Refresh Info&quot; to fetch live system specs from phone.
          </div>
        )}
      </div>

      {/* 7. WI-FI NETWORK DIAGNOSTICS */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-800 pb-3">
          <div>
            <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
              <Wifi className="h-4 w-4 text-teal-400" /> Wi-Fi Status & Scanner
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Connection details, signal level, link speed and nearby AP scan results.
            </p>
          </div>
          <button
            onClick={() => refreshWifiInfo()}
            className="flex items-center gap-1.5 rounded-lg bg-gray-950 border border-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Scan Wi-Fi
          </button>
        </div>

        {wifiInfo ? (
          <div className="space-y-4">
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full ${wifiInfo.connected ? 'bg-teal-950 text-teal-400 border border-teal-800' : 'bg-gray-900 text-gray-500'}`}>
                  <Wifi className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-100">{wifiInfo.ssid || 'Disconnected'}</h4>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    BSSID: {wifiInfo.bssid || 'N/A'} · IP: {wifiInfo.ipAddress || '0.0.0.0'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Link Speed</span>
                  <span className="text-teal-300 font-semibold">{wifiInfo.linkSpeedMbps} Mbps</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Frequency</span>
                  <span className="text-gray-300 font-semibold">{wifiInfo.frequencyMHz} MHz</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">RSSI Signal</span>
                  <span className="text-gray-300 font-semibold">{wifiInfo.rssi} dBm</span>
                </div>
              </div>
            </div>

            {/* Nearby networks */}
            {wifiInfo.scanResults && wifiInfo.scanResults.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-400 mb-2">Nearby Wi-Fi Networks ({wifiInfo.scanResults.length})</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                  {wifiInfo.scanResults.map((r, i) => (
                    <div key={i} className="bg-gray-950 p-2.5 rounded-lg border border-gray-800/80 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-200 truncate">{r.ssid || '<Hidden SSID>'}</span>
                        <span className="font-mono text-[10px] text-gray-500">{r.level} dBm</span>
                      </div>
                      <span className="text-[10px] text-gray-500 block truncate mt-0.5">{r.capabilities}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 text-xs">
            Click &quot;Scan Wi-Fi&quot; to retrieve current Wi-Fi status and scan results.
          </div>
        )}
      </div>

      {/* 8. INSTALLED APPS & PERMISSIONS INSPECTOR */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-800 pb-3">
          <div>
            <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-teal-400" /> Installed Apps & Permissions Explorer
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Inspect all apps on device. Click any app to view its granted and denied permissions.
            </p>
          </div>
          <button
            onClick={() => refreshInstalledApps()}
            className="flex items-center gap-1.5 rounded-lg bg-gray-950 border border-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Apps
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              placeholder="Search by app name or package..."
              className="w-full rounded-lg border border-gray-800 bg-gray-950 pl-9 pr-3 py-2 text-xs text-gray-200 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex rounded-lg bg-gray-950 p-1 border border-gray-800 text-xs">
            <button
              onClick={() => setAppFilter('user')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                appFilter === 'user' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              User Apps
            </button>
            <button
              onClick={() => setAppFilter('system')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                appFilter === 'system' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              System Apps
            </button>
            <button
              onClick={() => setAppFilter('all')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                appFilter === 'all' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({installedApps?.length || 0})
            </button>
          </div>
        </div>

        {/* Apps List */}
        {filteredApps.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">
            {installedApps?.length === 0
              ? 'Click "Refresh Apps" to load the installed applications from phone.'
              : 'No applications match your filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {filteredApps.map((app) => (
              <div
                key={app.packageName}
                onClick={() => {
                  setInspectApp(app);
                  fetchAppPerms(app.packageName);
                }}
                className="group cursor-pointer rounded-lg border border-gray-800/80 bg-gray-950 p-3 hover:border-teal-500/60 hover:bg-gray-900/80 transition-all text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-200 group-hover:text-teal-300 truncate">
                      {app.name}
                    </span>
                    {app.isSystem && (
                      <span className="text-[9px] bg-gray-900 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                        System
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-gray-500 truncate">{app.packageName}</p>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-900">
                  <span>v{app.versionName || app.versionCode}</span>
                  <span className="text-teal-500 group-hover:underline flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Permissions
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Listen (Continuous Real-Time Audio Stream) */}
      <div className={`rounded-xl border p-5 shadow-lg backdrop-blur-sm transition-all ${
        liveListening
          ? 'border-teal-500/60 bg-teal-950/20 shadow-teal-950/20'
          : 'border-gray-800 bg-gray-900/60'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border transition-colors ${
              liveListening
                ? 'bg-teal-500 text-black border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.5)]'
                : 'bg-teal-950/60 border-teal-800/60 text-teal-400'
            }`}>
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-200 text-sm">Live Listen (Continuous Audio Stream)</h3>
                {liveListening && (
                  <span className="flex items-center gap-1.5 text-[11px] text-teal-400 font-medium bg-teal-950/80 border border-teal-700 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
                    LIVE STREAMING
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">Stream ambient microphone audio live to PC speakers (No 60-second limit, no files stored)</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {liveListening ? (
            <div className="rounded-lg border border-teal-800/60 bg-gray-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-teal-300">
                  <Radio className="h-4 w-4 animate-spin text-teal-400" />
                  <span className="font-medium">Live Microphone Stream Active (16kHz PCM)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-1 bg-teal-400 rounded animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="h-4 w-1 bg-teal-400 rounded animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="h-6 w-1 bg-teal-400 rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span className="h-4 w-1 bg-teal-400 rounded animate-pulse" style={{ animationDelay: '450ms' }} />
                  <span className="h-2 w-1 bg-teal-400 rounded animate-pulse" style={{ animationDelay: '600ms' }} />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Sound is streaming directly through your browser audio in real-time. Useful for monitoring pets, babies, or elders in emergency without saving audio clips on the phone.
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Starts a continuous ambient microphone audio stream from the phone directly into your PC headphones/speakers with low latency.
            </p>
          )}

          <div className="flex gap-2">
            {!liveListening ? (
              <button
                onClick={() => startLiveListen()}
                disabled={!activeDeviceId}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-teal-500 transition-colors disabled:opacity-50"
              >
                <Headphones className="h-4 w-4" /> Start Live Listening Now
              </button>
            ) : (
              <button
                onClick={() => stopLiveListen()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-red-500 transition-colors"
              >
                <Square className="h-4 w-4" /> Stop Live Listening
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Remote Microphone (T7) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-800/60 text-teal-400">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 text-sm">Remote Microphone (Audio Clip)</h3>
              <p className="text-xs text-gray-400">Record a high-quality ambient AAC audio clip from device mic</p>
            </div>
          </div>
          {micRecording && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-950/40 border border-amber-800/50 px-2.5 py-1 rounded-full animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Recording phone mic...
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Clip Duration</span>
              <span className="font-mono text-teal-400">{micDuration} seconds</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={micDuration}
              onChange={(e) => setMicDuration(Number(e.target.value))}
              disabled={micRecording}
              className="w-full accent-teal-500 bg-gray-800 rounded-lg h-2"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>5s (quick check)</span>
              <span>15s (standard)</span>
              <span>30s</span>
              <span>60s (max)</span>
            </div>
          </div>

          <button
            onClick={() => recordMic(micDuration)}
            disabled={!activeDeviceId || micRecording}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-teal-500 transition-colors disabled:opacity-50"
          >
            {micRecording ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Recording ({micDuration}s)...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" /> Start Ambient Recording
              </>
            )}
          </button>

          {/* Latest recorded audio player */}
          {latestMicAudio && (
            <div className="rounded-lg border border-teal-900/60 bg-gray-950 p-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-teal-300 flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5" /> Latest Recorded Clip
                </span>
                <span className="text-[10px] text-gray-500">
                  {new Date(latestMicAudio.timestamp).toLocaleTimeString()} · {latestMicAudio.durationSec}s · {(latestMicAudio.sizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <audio
                controls
                className="w-full h-8 mt-1"
                src={`data:${latestMicAudio.mimeType || 'audio/mp4'};base64,${latestMicAudio.data}`}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => downloadBase64(latestMicAudio.data, latestMicAudio.mimeType || 'audio/mp4', `mic_record_${latestMicAudio.timestamp}.m4a`)}
                  className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium px-2 py-1 rounded hover:bg-gray-900 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download Audio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Remote Camera Capture (T8) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-800/60 text-teal-400">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 text-sm">Remote Camera (One-Shot Photo)</h3>
              <p className="text-xs text-gray-400">Silently capture a photo using front or back camera</p>
            </div>
          </div>
          {cameraCapturing && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-950/40 border border-amber-800/50 px-2.5 py-1 rounded-full animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Opening camera & snapping...
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Camera Facing</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCameraFacing('back')}
                disabled={cameraCapturing}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  cameraFacing === 'back'
                    ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                }`}
              >
                Back Camera (Main)
              </button>
              <button
                type="button"
                onClick={() => setCameraFacing('front')}
                disabled={cameraCapturing}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  cameraFacing === 'front'
                    ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                }`}
              >
                Front Camera (Selfie)
              </button>
            </div>
          </div>

          <button
            onClick={() => captureCamera(cameraFacing)}
            disabled={!activeDeviceId || cameraCapturing}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-teal-500 transition-colors disabled:opacity-50"
          >
            {cameraCapturing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Capturing {cameraFacing === 'front' ? 'Front' : 'Back'} Camera...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" /> Snap Photo Now
              </>
            )}
          </button>

          {/* Latest captured photo preview */}
          {latestCameraPhoto && (
            <div className="rounded-lg border border-teal-900/60 bg-gray-950 p-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-teal-300 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" /> Latest Captured Photo
                </span>
                <span className="text-[10px] text-gray-500">
                  {latestCameraPhoto.facing === 'front' ? 'Front' : 'Back'} · {latestCameraPhoto.width}x{latestCameraPhoto.height} · {((latestCameraPhoto.sizeBytes || 0) / 1024).toFixed(1)} KB · {new Date(latestCameraPhoto.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="rounded-lg overflow-hidden border border-gray-800 bg-black flex items-center justify-center max-h-72">
                <img
                  src={`data:${latestCameraPhoto.mimeType || 'image/jpeg'};base64,${latestCameraPhoto.data}`}
                  alt="Remote Camera Capture"
                  className="max-h-72 w-auto object-contain"
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => downloadBase64(latestCameraPhoto.data, latestCameraPhoto.mimeType || 'image/jpeg', `camera_${latestCameraPhoto.facing}_${latestCameraPhoto.timestamp}.jpg`)}
                  className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium px-2 py-1 rounded hover:bg-gray-900 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download JPEG
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Camera Stream (Pet & Security Monitor) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-800/60 text-teal-400">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 text-sm">Live Camera Stream (Pet & Room Monitor)</h3>
              <p className="text-xs text-gray-400">Stream continuous live video from phone cameras with quality & FPS settings</p>
            </div>
          </div>
          {cameraStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-950/60 border border-rose-800/60 px-2.5 py-1 rounded-full animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              LIVE CAMERA ({cameraStreamFacing.toUpperCase()} · {cameraStreamQuality.toUpperCase()} · {cameraStreamFps} FPS)
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Camera facing */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Camera Lens</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCameraStreamFacing('back')}
                  disabled={cameraStreaming}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                    cameraStreamFacing === 'back'
                      ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                      : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                  }`}
                >
                  Back (Main)
                </button>
                <button
                  type="button"
                  onClick={() => setCameraStreamFacing('front')}
                  disabled={cameraStreaming}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                    cameraStreamFacing === 'front'
                      ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                      : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                  }`}
                >
                  Front (Selfie)
                </button>
              </div>
            </div>

            {/* Quality option */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Stream Quality</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'low', label: 'Low (480p)' },
                  { id: 'medium', label: 'Med (720p)' },
                  { id: 'high', label: 'High (1080p)' }
                ].map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCameraStreamQuality(q.id)}
                    disabled={cameraStreaming}
                    className={`py-1.5 px-1 rounded-lg border text-[11px] font-medium text-center transition-all ${
                      cameraStreamQuality === q.id
                        ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                        : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FPS option */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Frame Rate</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 30].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCameraStreamFps(f)}
                    disabled={cameraStreaming}
                    className={`py-1.5 px-1 rounded-lg border text-[11px] font-medium text-center transition-all ${
                      cameraStreamFps === f
                        ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                        : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                    }`}
                  >
                    {f} FPS
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!cameraStreaming ? (
              <button
                onClick={() => startCameraStream(cameraStreamFacing, cameraStreamQuality, cameraStreamFps)}
                disabled={!activeDeviceId}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-teal-500 transition-colors disabled:opacity-50"
              >
                <Video className="h-4 w-4" /> Start Live Camera Stream
              </button>
            ) : (
              <button
                onClick={() => stopCameraStream()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-rose-500 transition-colors"
              >
                <Square className="h-4 w-4 fill-current" /> Stop Camera Stream
              </button>
            )}
          </div>

          {/* Live Camera Feed */}
          {cameraStreaming && (
            <div className="rounded-lg border border-teal-900/60 bg-gray-950 p-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  Live Camera Feed ({cameraStreamFacing} camera)
                </span>
                {latestCameraFrame && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    {latestCameraFrame.width}x{latestCameraFrame.height} · {((latestCameraFrame.sizeBytes || 0) / 1024).toFixed(1)} KB/frame · {latestCameraFrame.fps} FPS
                  </span>
                )}
              </div>

              {latestCameraFrame ? (
                <div className="rounded-lg overflow-hidden border border-gray-800 bg-black flex items-center justify-center max-h-[480px]">
                  <img
                    src={`data:image/jpeg;base64,${latestCameraFrame.data}`}
                    alt="Live Camera Frame"
                    className="max-h-[480px] w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-gray-400 flex items-center justify-center gap-2 border border-gray-800/80 rounded-lg bg-black">
                  <RefreshCw className="h-4 w-4 animate-spin text-teal-400" />
                  Starting live camera stream from phone...
                </div>
              )}

              {latestCameraFrame && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => downloadBase64(latestCameraFrame.data, 'image/jpeg', `camera_stream_${Date.now()}.jpg`)}
                    className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium px-2 py-1 rounded hover:bg-gray-900 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Save Current Frame
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Remote Screenshot (T9) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-800/60 text-teal-400">
              <Monitor className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 text-sm">Remote Screenshot (Display Frame)</h3>
              <p className="text-xs text-gray-400">Capture the current screen of the phone via MediaProjection</p>
            </div>
          </div>
          {screenshotCapturing && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-950/40 border border-amber-800/50 px-2.5 py-1 rounded-full animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Capturing screenshot...
            </span>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-[11px] text-gray-400 bg-gray-950/80 border border-gray-800 p-2.5 rounded-lg">
            Tip: If screen recording consent is not yet granted on the phone, a heads-up consent prompt or dialog will pop up on the device screen for one-tap approval.
          </p>

          <button
            onClick={() => captureScreenshot()}
            disabled={!activeDeviceId || screenshotCapturing}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-teal-500 transition-colors disabled:opacity-50"
          >
            {screenshotCapturing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Capturing Screen Frame...
              </>
            ) : (
              <>
                <Monitor className="h-4 w-4" /> Capture Screenshot Now
              </>
            )}
          </button>

          {/* Latest captured screenshot preview */}
          {latestScreenshot && (
            <div className="rounded-lg border border-teal-900/60 bg-gray-950 p-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-teal-300 flex items-center gap-1.5">
                  <Monitor className="h-3.5 w-3.5" /> Latest Screen Capture
                </span>
                <span className="text-[10px] text-gray-500">
                  {latestScreenshot.width}x{latestScreenshot.height} · {((latestScreenshot.sizeBytes || 0) / 1024).toFixed(1)} KB · {new Date(latestScreenshot.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="rounded-lg overflow-hidden border border-gray-800 bg-black flex items-center justify-center max-h-80">
                <img
                  src={`data:${latestScreenshot.mimeType || 'image/jpeg'};base64,${latestScreenshot.data}`}
                  alt="Remote Screenshot"
                  className="max-h-80 w-auto object-contain"
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => downloadBase64(latestScreenshot.data, latestScreenshot.mimeType || 'image/jpeg', `screenshot_${latestScreenshot.timestamp}.jpg`)}
                  className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium px-2 py-1 rounded hover:bg-gray-900 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download Screenshot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Screen Stream ~1-30 FPS (T10) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-800/60 text-teal-400">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 text-sm">Live Screen Stream (1-30 FPS)</h3>
              <p className="text-xs text-gray-400">Stream phone display live with high frame rate and low latency over WebSocket</p>
            </div>
          </div>
          {screenRecording && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full animate-pulse">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE STREAMING ({streamFps} FPS)
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Stream Refresh Rate</label>
            <div className="grid grid-cols-6 gap-2">
              {[2, 5, 10, 15, 20, 30].map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => setStreamFps(fps)}
                  disabled={screenRecording}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                    streamFps === fps
                      ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                      : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                  }`}
                >
                  {fps} FPS {fps === 15 && '(Default)'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {!screenRecording ? (
              <button
                onClick={() => startScreenRecord(streamFps)}
                disabled={!activeDeviceId}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-teal-500 transition-colors disabled:opacity-50"
              >
                <Video className="h-4 w-4" /> Start Live Screen Stream
              </button>
            ) : (
              <button
                onClick={() => stopScreenRecord()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-rose-500 transition-colors"
              >
                <Square className="h-4 w-4 fill-current" /> Stop Screen Stream
              </button>
            )}
          </div>

          {/* Live Stream Display */}
          {screenRecording && (
            <div className="rounded-lg border border-teal-900/60 bg-gray-950 p-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Display View
                </span>
                {latestScreenFrame && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    {latestScreenFrame.width}x{latestScreenFrame.height} · {((latestScreenFrame.sizeBytes || 0) / 1024).toFixed(1)} KB/frame
                  </span>
                )}
              </div>

              {latestScreenFrame ? (
                <div className="rounded-lg overflow-hidden border border-gray-800 bg-black flex items-center justify-center max-h-[480px]">
                  <img
                    src={`data:image/jpeg;base64,${latestScreenFrame.data}`}
                    alt="Live Stream Frame"
                    className="max-h-[480px] w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-gray-400 flex items-center justify-center gap-2 border border-gray-800/80 rounded-lg bg-black">
                  <RefreshCw className="h-4 w-4 animate-spin text-teal-400" />
                  Connecting to live device screen feed...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Permissions Modal / Drawer */}
      {inspectApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-start justify-between border-b border-gray-800 pb-3 mb-4">
              <div>
                <h4 className="font-bold text-gray-100 text-base">{inspectApp.name}</h4>
                <p className="font-mono text-xs text-teal-400 mt-0.5">{inspectApp.packageName}</p>
              </div>
              <button
                onClick={() => setInspectApp(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2">
              <h5 className="text-xs font-semibold text-gray-400 mb-2">Requested Permissions</h5>
              {appPermissions[inspectApp.packageName] ? (
                appPermissions[inspectApp.packageName].length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">This app requests no special permissions.</p>
                ) : (
                  appPermissions[inspectApp.packageName].map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2 rounded bg-gray-950 border border-gray-800/80 text-xs"
                    >
                      <span className="font-mono text-gray-300 break-all text-[11px]">
                        {p.permission.replace('android.permission.', '')}
                      </span>
                      {p.granted ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded shrink-0">
                          <Check className="h-3 w-3" /> Granted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded shrink-0">
                          <X className="h-3 w-3" /> Denied
                        </span>
                      )}
                    </div>
                  ))
                )
              ) : (
                <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-teal-400" /> Inspecting permissions...
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setInspectApp(null)}
                className="rounded-lg bg-gray-800 px-4 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. DANGER ZONE: REMOTE FACTORY RESET / WIPE */}
      <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950 border border-red-800 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-red-200 text-sm">Danger Zone: Remote Factory Reset (Format Device)</h3>
              <p className="text-xs text-red-300/70">Permanently erase all personal data, photos, accounts and apps from device</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
            DEVICE ADMIN REQUIRED
          </span>
        </div>

        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          If your phone is lost or stolen with sensitive data, you can remotely trigger a complete hardware factory reset via Android Device Admin policy (<code>wipeData(0)</code>). This action is <strong className="text-red-300">permanent and irreversible</strong>.
        </p>

        <button
          onClick={() => setShowWipeModal(true)}
          disabled={!activeDeviceId}
          className="flex items-center justify-center gap-2 rounded-lg bg-red-950 border border-red-700/80 px-4 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-900 hover:text-white transition-colors disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4 text-red-400" /> Remote Factory Reset / Wipe Phone
        </button>
      </div>

      {/* Wipe Confirmation Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-red-700 bg-gray-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400 border-b border-red-900/60 pb-3">
              <AlertTriangle className="h-6 w-6 flex-shrink-0 animate-bounce" />
              <div>
                <h3 className="font-bold text-white text-base">Confirm Factory Reset / Wipe</h3>
                <p className="text-xs text-red-300">This action will completely format the phone!</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              All files, photos, Google accounts, installed apps, and system settings will be wiped immediately. To confirm that you really intend to erase this phone, please type <strong className="text-red-400 font-mono">FORMAT PHONE</strong> below:
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={wipeConfirmText}
                onChange={(e) => setWipeConfirmText(e.target.value)}
                placeholder="Type FORMAT PHONE to confirm"
                className="w-full rounded-lg border border-red-900 bg-gray-900 px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowWipeModal(false);
                  setWipeConfirmText('');
                }}
                className="rounded-lg bg-gray-800 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wipeConfirmText !== 'FORMAT PHONE'}
                onClick={() => {
                  wipeDevice('FORMAT PHONE');
                  setShowWipeModal(false);
                  setWipeConfirmText('');
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-red-950 transition-colors"
              >
                Permanently Format Phone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

