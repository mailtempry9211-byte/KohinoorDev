import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Volume1,
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
  ShieldAlert,
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
  Headphones,
  Globe,
  ExternalLink,
  BatteryCharging,
  Thermometer,
  Gauge,
  CornerDownLeft,
  Home,
  Menu,
  Bell,
  Settings,
  Power,
  MousePointer,
  Hand,
  Sun,
  Keyboard,
  Send,
  Signal,
  Activity,
  Sparkles,
  FolderArchive,
  BellOff,
  Eye,
  Maximize2,
  Minimize2,
  MicOff,
  VideoOff,
  PhoneCall
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
    sendInputKey,
    sendInputTap,
    sendInputSwipe,
    volumeInfo,
    fetchVolumeInfo,
    setVolumeLevel,
    setRingerProfile,
    writeClipboardText,
    openRemoteUrl,
    batteryStats,
    fetchBatteryStats,
    launchRemoteApp,
    lostMode,
    setLostMode,
    galleryPhotos,
    galleryLoading,
    fetchGallery,
    sendInputText,
    wakeScreen,
    cellularInfo,
    fetchCellularInfo,
    strobeActive,
    toggleTorchStrobe,
    junkScanData,
    isScanningJunk,
    scanJunk,
    cleanJunk,
    dndStatus,
    fetchDndStatus,
    setDndMode,
    uninstallApp,
    makeCall,
    answerCall,
    declineCall,
    incomingCallAlert,
    motionAlarm,
    setMotionAlarm,
    walkieTalkieActive,
    startWalkieTalkie,
    sendWalkieTalkieChunk,
    stopWalkieTalkie,
    sendCommand,
    pushToast
  } = useStore();

  const [newBlockNumber, setNewBlockNumber] = useState('');
  const [micDuration, setMicDuration] = useState(15);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [streamFps, setStreamFps] = useState(15);
  const [cameraStreamFacing, setCameraStreamFacing] = useState('back');
  const [cameraStreamQuality, setCameraStreamQuality] = useState('low');
  const [cameraStreamFps, setCameraStreamFps] = useState(15);

  // Quick typing injection on screen
  const [quickTypeText, setQuickTypeText] = useState('');

  // Unified Surveillance Hub modes
  const [surveillanceMode, setSurveillanceMode] = useState('cam_mic');
  const [isFullScreenCCTV, setIsFullScreenCCTV] = useState(false);

  // Wallpaper direct PC file upload
  const [wallpaperFile, setWallpaperFile] = useState(null);

  // Remote wipe modal state
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');

  // Reverse Clipboard state
  const [reverseClipText, setReverseClipText] = useState('');

  // Remote URL Opener state
  const [remoteUrl, setRemoteUrl] = useState('https://www.google.com');

  // Lost Mode state
  const [lostMessage, setLostMessage] = useState('⚠️ THIS DEVICE IS LOST! Please call the owner immediately.');
  const [lostPhone, setLostPhone] = useState('');
  const [lostSoundAlarm, setLostSoundAlarm] = useState(false);

  // Theft Motion Alarm state
  const [motionThreshold, setMotionThreshold] = useState(2.5);

  // Live Push-To-Talk Walkie Talkie Intercom (Linear PCM 16kHz)
  const [isPressingWalkieTalkie, setIsPressingWalkieTalkie] = useState(false);
  const walkieAudioCtxRef = useRef(null);
  const walkieProcessorRef = useRef(null);
  const walkieStreamRef = useRef(null);

  const startHoldWalkieTalkie = async () => {
    try {
      if (isPressingWalkieTalkie) return;
      setIsPressingWalkieTalkie(true);
      if (startWalkieTalkie) startWalkieTalkie();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      walkieStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      walkieAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // 2048 buffer size = 128ms packets at 16kHz
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      walkieProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array (-1.0 to 1.0) to 16-bit PCM Int16Array
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert Int16Array bytes to base64
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        const len = uint8.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);
        if (base64 && sendWalkieTalkieChunk) {
          sendWalkieTalkieChunk(base64);
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      setIsPressingWalkieTalkie(false);
      pushToast('Microphone access denied: ' + err.message, 'error');
    }
  };

  const [handsFreeIntercom, setHandsFreeIntercom] = useState(false);

  const stopHoldWalkieTalkie = () => {
    setIsPressingWalkieTalkie(false);
    setHandsFreeIntercom(false);
    if (walkieProcessorRef.current) {
      try {
        walkieProcessorRef.current.disconnect();
      } catch (_) {}
      walkieProcessorRef.current = null;
    }
    if (walkieAudioCtxRef.current) {
      try {
        walkieAudioCtxRef.current.close();
      } catch (_) {}
      walkieAudioCtxRef.current = null;
    }
    if (walkieStreamRef.current) {
      try {
        walkieStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      walkieStreamRef.current = null;
    }
    if (stopWalkieTalkie) stopWalkieTalkie();
  };

  const toggleHandsFreeWalkie = () => {
    if (isPressingWalkieTalkie) {
      stopHoldWalkieTalkie();
    } else {
      startHoldWalkieTalkie();
      setHandsFreeIntercom(true);
    }
  };

  const forceStopWalkieTalkie = () => {
    stopHoldWalkieTalkie();
    try {
      if (stopWalkieTalkie) stopWalkieTalkie();
    } catch (_) {}
    pushToast('Intercom force stopped and phone speaker silenced', 'info');
  };

  // Live Screen Touch & Gesture interaction
  const screenImgRef = useRef(null);
  const touchStartRef = useRef(null);
  const [clickIndicator, setClickIndicator] = useState(null);

  // Gallery photo preview modal
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Automatically fetch volume, battery, cellular, and DND on load
  useEffect(() => {
    if (activeDeviceId) {
      if (fetchVolumeInfo) fetchVolumeInfo();
      if (fetchBatteryStats) fetchBatteryStats();
      if (fetchCellularInfo) fetchCellularInfo();
      if (fetchDndStatus) fetchDndStatus();
    }
  }, [activeDeviceId]);

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
  const [audioSourceMode, setAudioSourceMode] = useState('upload'); // 'upload' or 'url'
  const [audioFileBase64, setAudioFileBase64] = useState(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [dialNumber, setDialNumber] = useState('');

  const handleAudioFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      pushToast('Audio file exceeds 25MB limit', 'error');
      return;
    }
    setAudioFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAudioFileBase64(reader.result);
      pushToast(`Ready to play: ${file.name}`, 'info');
    };
    reader.readAsDataURL(file);
  };

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

  const handleScreenPointerDown = (e) => {
    if (!screenImgRef.current) return;
    const rect = screenImgRef.current.getBoundingClientRect();
    touchStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      time: Date.now(),
      rect
    };
  };

  const handleScreenPointerUp = (e) => {
    if (!touchStartRef.current || !screenImgRef.current) return;
    const start = touchStartRef.current;
    const rect = screenImgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = e.clientX - start.clientX;
    const dy = e.clientY - start.clientY;
    const dist = Math.hypot(dx, dy);
    const holdDuration = Math.max(50, Math.min(1500, Date.now() - start.time));

    // Calculate normalized coordinate ratios (0.0 to 1.0)
    const getRatioX = (cx) => Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
    const getRatioY = (cy) => Math.max(0, Math.min(1, (cy - rect.top) / rect.height));

    const xRatio = getRatioX(e.clientX);
    const yRatio = getRatioY(e.clientY);

    // Physical dimensions fallback if screenWidth is provided
    const phoneW = latestScreenFrame?.screenWidth || latestScreenFrame?.width || 1080;
    const phoneH = latestScreenFrame?.screenHeight || latestScreenFrame?.height || 2400;
    const px = Math.round(xRatio * phoneW);
    const py = Math.round(yRatio * phoneH);

    if (dist < 15) {
      // Tap (Quick or Long-Press)
      const rippleX = Math.round(e.clientX - rect.left);
      const rippleY = Math.round(e.clientY - rect.top);
      setClickIndicator({ id: Date.now(), x: rippleX, y: rippleY });
      setTimeout(() => setClickIndicator(null), 500);

      // Duration for tap: if held > 400ms, treat as long-press
      const tapDuration = holdDuration > 400 ? 800 : 50;
      sendInputTap({
        x: px,
        y: py,
        xRatio,
        yRatio,
        duration: tapDuration
      });
    } else {
      // Swipe / Drag
      const x1Ratio = getRatioX(start.clientX);
      const y1Ratio = getRatioY(start.clientY);
      const x2Ratio = xRatio;
      const y2Ratio = yRatio;
      const px1 = Math.round(x1Ratio * phoneW);
      const py1 = Math.round(y1Ratio * phoneH);
      const px2 = Math.round(x2Ratio * phoneW);
      const py2 = Math.round(y2Ratio * phoneH);
      const swipeDuration = Math.max(100, Math.min(1200, holdDuration));

      sendInputSwipe({
        x1: px1,
        y1: py1,
        x2: px2,
        y2: py2,
        x1Ratio,
        y1Ratio,
        x2Ratio,
        y2Ratio,
        duration: swipeDuration
      });
    }
    touchStartRef.current = null;
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

        {/* SOUND & VOLUME PROFILE MANAGER */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <Volume2 className="h-4 w-4 text-teal-400" /> Sound & Volume Profiles
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-gray-700 bg-gray-950 text-teal-400">
                  {volumeInfo?.ringerMode || 'Normal'}
                </span>
                <button
                  type="button"
                  onClick={() => fetchVolumeInfo()}
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800"
                  title="Refresh volumes"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Ringer Profiles Selector */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1.5">Ringer Profile</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRingerProfile('normal')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    (volumeInfo?.ringerMode === 'normal' || !volumeInfo?.ringerMode)
                      ? 'border-teal-500 bg-teal-950/50 text-teal-300'
                      : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                  }`}
                >
                  <Volume2 className="h-3.5 w-3.5 text-teal-400" /> Normal / Loud
                </button>
                <button
                  type="button"
                  onClick={() => setRingerProfile('vibrate')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    volumeInfo?.ringerMode === 'vibrate'
                      ? 'border-amber-500 bg-amber-950/50 text-amber-300'
                      : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                  }`}
                >
                  <Radio className="h-3.5 w-3.5 text-amber-400" /> Vibrate
                </button>
                <button
                  type="button"
                  onClick={() => setRingerProfile('silent')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    volumeInfo?.ringerMode === 'silent'
                      ? 'border-rose-500 bg-rose-950/50 text-rose-300'
                      : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                  }`}
                >
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" /> Silent
                </button>
              </div>
            </div>

            {/* Volume Sliders */}
            <div className="space-y-3">
              <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <Headphones className="h-3.5 w-3.5 text-teal-400" /> Media & Music
                  </span>
                  <span className="font-mono text-teal-400">
                    {volumeInfo?.mediaVolume ?? 7} / {volumeInfo?.mediaMax ?? 15}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={volumeInfo?.mediaMax || 15}
                  value={volumeInfo?.mediaVolume ?? 7}
                  onChange={(e) => setVolumeLevel('media', Number(e.target.value))}
                  className="w-full accent-teal-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-teal-400" /> Ringtone
                  </span>
                  <span className="font-mono text-teal-400">
                    {volumeInfo?.ringVolume ?? 5} / {volumeInfo?.ringMax ?? 7}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={volumeInfo?.ringMax || 7}
                  value={volumeInfo?.ringVolume ?? 5}
                  onChange={(e) => setVolumeLevel('ring', Number(e.target.value))}
                  className="w-full accent-teal-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-teal-400" /> Alarm
                  </span>
                  <span className="font-mono text-teal-400">
                    {volumeInfo?.alarmVolume ?? 6} / {volumeInfo?.alarmMax ?? 7}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={volumeInfo?.alarmMax || 7}
                  value={volumeInfo?.alarmVolume ?? 6}
                  onChange={(e) => setVolumeLevel('alarm', Number(e.target.value))}
                  className="w-full accent-teal-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <Volume1 className="h-3.5 w-3.5 text-teal-400" /> Notifications
                  </span>
                  <span className="font-mono text-teal-400">
                    {volumeInfo?.notificationVolume ?? 5} / {volumeInfo?.notificationMax ?? 7}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={volumeInfo?.notificationMax || 7}
                  value={volumeInfo?.notificationVolume ?? 5}
                  onChange={(e) => setVolumeLevel('notification', Number(e.target.value))}
                  className="w-full accent-teal-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* DND Emergency Override */}
            <div className="mt-4 pt-3 border-t border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-300 flex items-center gap-1.5 font-medium">
                  <BellOff className="h-3.5 w-3.5 text-amber-400" /> Do Not Disturb (DND)
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                  dndStatus?.isDndActive
                    ? 'border-rose-700 bg-rose-950/60 text-rose-300'
                    : 'border-emerald-700 bg-emerald-950/60 text-emerald-300'
                }`}>
                  {dndStatus?.mode || 'OFF'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDndMode('OFF')}
                  className={`py-1 px-2 rounded border text-[11px] font-medium transition-all ${
                    !dndStatus?.isDndActive
                      ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                      : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                  }`}
                  title="Turn DND OFF - all alerts and calls ring"
                >
                  DND OFF
                </button>
                <button
                  type="button"
                  onClick={() => setDndMode('PRIORITY')}
                  className={`py-1 px-2 rounded border text-[11px] font-medium transition-all ${
                    dndStatus?.mode === 'PRIORITY'
                      ? 'border-amber-500 bg-amber-950/50 text-amber-300'
                      : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                  }`}
                  title="Priority only"
                >
                  Priority
                </button>
                <button
                  type="button"
                  onClick={() => setDndMode('TOTAL_SILENCE')}
                  className={`py-1 px-2 rounded border text-[11px] font-medium transition-all ${
                    dndStatus?.mode === 'TOTAL_SILENCE'
                      ? 'border-rose-500 bg-rose-950/50 text-rose-300'
                      : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                  }`}
                  title="Total Silence"
                >
                  Silence
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* REMOTE URL OPENER */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-teal-400" /> Remote Browser URL Opener
              </h3>
              <span className="text-xs text-gray-500">Default Browser</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Push and instantly launch any website, YouTube video, or Google Maps directions link in the phone&apos;s browser.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Target Web URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                  <input
                    type="text"
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                    placeholder="https://example.com or youtube.com/..."
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 pl-9 pr-3 py-2 text-xs text-gray-200 focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 block mb-1.5">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Google Search', url: 'https://www.google.com' },
                    { label: 'YouTube', url: 'https://www.youtube.com' },
                    { label: 'Google Maps', url: 'https://maps.google.com' },
                    { label: 'Wikipedia', url: 'https://www.wikipedia.org' }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setRemoteUrl(preset.url)}
                      className="px-2 py-1 text-[11px] rounded bg-gray-950 border border-gray-800 text-gray-400 hover:text-teal-300 hover:border-gray-700 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (remoteUrl.trim()) {
                openRemoteUrl(remoteUrl);
              }
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors shadow"
          >
            <ExternalLink className="h-4 w-4" /> Open Link on Phone
          </button>
        </div>

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
              Play music or audio directly from your PC or stream via web URL on phone speakers.
            </p>

            <div className="flex items-center gap-1.5 mb-3 bg-gray-950 p-1 rounded-lg border border-gray-800">
              <button
                type="button"
                onClick={() => setAudioSourceMode('upload')}
                className={`flex-1 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  audioSourceMode === 'upload' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Upload from PC
              </button>
              <button
                type="button"
                onClick={() => setAudioSourceMode('url')}
                className={`flex-1 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  audioSourceMode === 'url' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Web URL & Presets
              </button>
            </div>

            {audioSourceMode === 'upload' ? (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="audio/*"
                  id="audio-upload-input"
                  className="hidden"
                  onChange={handleAudioFileChange}
                />
                <label
                  htmlFor="audio-upload-input"
                  className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-dashed border-gray-700 bg-gray-950 hover:border-teal-500 cursor-pointer text-center transition-colors"
                >
                  <Upload className="h-5 w-5 text-teal-400 mb-1" />
                  <span className="text-xs font-medium text-gray-200">
                    {audioFileName ? audioFileName : 'Select MP3/WAV/Audio from PC'}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">MP3, WAV, OGG, AAC up to 25MB</span>
                </label>
              </div>
            ) : (
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
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer pt-3">
              <input
                type="checkbox"
                checked={audioLoop}
                onChange={(e) => setAudioLoop(e.target.checked)}
                className="rounded border-gray-700 bg-gray-950 text-teal-500 focus:ring-teal-500 h-4 w-4"
              />
              <span>Loop playback continuously</span>
            </label>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/80 flex gap-2">
            <button
              onClick={() => {
                if (audioSourceMode === 'upload') {
                  if (!audioFileBase64) {
                    pushToast('Please choose an audio file from PC first', 'error');
                    return;
                  }
                  playAudio({ data: audioFileBase64, loop: audioLoop });
                  pushToast(`Playing "${audioFileName}" on phone speakers...`, 'info');
                } else {
                  if (!audioUrl.trim()) return;
                  playAudio({ url: audioUrl.trim(), loop: audioLoop });
                  pushToast('Playing audio URL on phone speakers...', 'info');
                }
              }}
              disabled={audioSourceMode === 'upload' ? !audioFileBase64 : !audioUrl.trim()}
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

        {/* 6. REMOTE PHONE CALL CONTROLS & DIALER */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2 text-sm">
                <PhoneCall className="h-4 w-4 text-emerald-400" /> Phone Calls & Dialer
              </h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                Live Telecom
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Answer or decline calls directly from your PC, or place outgoing calls remotely on phone.
            </p>

            {/* Active / Incoming Call Banner if ringing */}
            {incomingCallAlert ? (
              <div className="mb-3 rounded-lg border border-red-700/60 bg-red-950/80 p-2.5 space-y-2 animate-pulse">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-200 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    Incoming Ringing Call!
                  </span>
                  <span className="font-mono text-[11px] text-red-300">
                    {incomingCallAlert.name || incomingCallAlert.number || 'Unknown'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => answerCall(true)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    📞 Answer (Speaker)
                  </button>
                  <button
                    type="button"
                    onClick={() => declineCall()}
                    className="flex-1 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    ❌ Decline
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-3 rounded-lg bg-gray-950 p-2.5 border border-gray-800/80 text-xs text-gray-400 flex items-center justify-between">
                <span>Call Actions:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => answerCall(true)}
                    className="px-2.5 py-1 bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900 rounded text-xs font-medium cursor-pointer"
                    title="Accept ringing call in speaker mode"
                  >
                    📞 Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => declineCall()}
                    className="px-2.5 py-1 bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 rounded text-xs font-medium cursor-pointer"
                    title="Hang up or reject active call"
                  >
                    ❌ Decline
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 block mb-1">Make Outgoing Phone Call</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  placeholder="+91 or Phone Number..."
                  className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-200 focus:border-emerald-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!dialNumber.trim()) {
                      pushToast('Please enter a phone number to call', 'error');
                      return;
                    }
                    makeCall(dialNumber.trim());
                    pushToast(`Initiating call to ${dialNumber.trim()} on phone...`, 'info');
                  }}
                  disabled={!dialNumber.trim()}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <PhoneCall className="h-3.5 w-3.5" /> Call
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/80 text-[10px] text-gray-500">
            Telecom permission active · Speaker mode automatically enabled on answer
          </div>
        </div>

        {/* 7. FLASHLIGHT (TORCH) */}
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

          <div className="mt-5 pt-4 border-t border-gray-800/80 space-y-2">
            <button
              onClick={() => toggleTorch(!torchOn)}
              className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                torchOn
                  ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-md shadow-amber-950'
                  : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <Zap className="h-4 w-4" />
              {torchOn ? 'Turn Flashlight OFF' : 'Turn Flashlight ON'}
            </button>
            <button
              onClick={() => toggleTorchStrobe(!strobeActive, 150, 30)}
              className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                strobeActive
                  ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-950 animate-pulse'
                  : 'bg-gray-950 text-amber-300 hover:bg-amber-950/40 border border-amber-800/60'
              }`}
            >
              <Activity className="h-4 w-4" />
              {strobeActive ? '⚡ Stop SOS Strobe' : '⚡ Start SOS Strobe Beacon (30s Rapid Flash)'}
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

        {/* REVERSE CLIPBOARD: Push PC text to Phone Clipboard */}
        <div className="mt-4 pt-3 border-t border-gray-800">
          <label className="text-xs text-gray-300 font-medium block mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-teal-400" /> Push PC Text to Phone Clipboard
            </span>
            <span className="text-[10px] text-gray-500">Injects text directly into Android system clipboard</span>
          </label>
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={reverseClipText}
              onChange={(e) => setReverseClipText(e.target.value)}
              placeholder="Paste or type text here to inject directly into the phone's system clipboard..."
              className="flex-1 rounded-lg border border-gray-800 bg-gray-950 p-2 text-xs text-gray-200 focus:border-teal-500 focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => {
                if (reverseClipText.trim()) {
                  writeClipboardText(reverseClipText);
                  setReverseClipText('');
                }
              }}
              disabled={!reverseClipText.trim()}
              className="px-4 rounded-lg bg-teal-600 text-white font-medium text-xs hover:bg-teal-500 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0 shadow"
            >
              <Copy className="h-3.5 w-3.5" /> Push to Phone
            </button>
          </div>
        </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
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

              {/* Battery Telemetry Chip */}
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 block text-[10px]">Battery & Temp</span>
                  <span className={`text-[8px] font-semibold px-1.5 py-0.2 rounded border ${
                    (batteryStats?.temperatureC ?? activeDevice?.temperatureC ?? 28) > 42
                      ? 'bg-rose-950 border-rose-800 text-rose-400'
                      : (batteryStats?.temperatureC ?? activeDevice?.temperatureC ?? 28) > 38
                      ? 'bg-amber-950 border-amber-800 text-amber-400'
                      : 'bg-emerald-950 border-emerald-800 text-emerald-400'
                  }`}>
                    {(batteryStats?.temperatureC ?? activeDevice?.temperatureC ?? 28) > 42 ? 'OVERHEAT' : 'COOL'}
                  </span>
                </div>
                <span className="font-semibold text-gray-200 text-sm block mt-0.5">
                  {(batteryStats?.temperatureC ?? activeDevice?.temperatureC ?? 28).toFixed(1)}°C · {activeDevice?.battery ?? batteryStats?.battery ?? 100}%
                </span>
                <span className="text-[10px] text-teal-400 font-mono truncate block mt-0.5">
                  {batteryStats?.plugged ?? activeDevice?.plugged ?? (activeDevice?.isCharging ? 'Charging' : 'On Battery')}
                </span>
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        launchRemoteApp(app.packageName);
                      }}
                      className="px-2 py-0.5 rounded bg-teal-950 border border-teal-800 text-teal-300 hover:bg-teal-900 transition-colors flex items-center gap-1 text-[10px]"
                      title="Launch app on phone"
                    >
                      <Play className="h-2.5 w-2.5 fill-current" /> Launch
                    </button>
                    {!app.isSystem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Trigger uninstallation of "${app.name}" on phone?`)) {
                            uninstallApp(app.packageName);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 transition-colors flex items-center gap-1 text-[10px]"
                        title="Uninstall this app from device"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Uninstall
                      </button>
                    )}
                    <span className="text-teal-500 group-hover:underline flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Permissions
                    </span>
                  </div>
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

      {/* UNIFIED INDOOR SECURITY CAMERA & SURVEILLANCE HUB (LIVE VIDEO + MIC AUDIO) */}
      <div className={`rounded-xl border p-5 backdrop-blur-sm transition-all ${
        (cameraStreaming || liveListening)
          ? 'border-rose-900/60 bg-gray-900/90 shadow-xl shadow-rose-950/20'
          : 'border-gray-800 bg-gray-900/60'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              (cameraStreaming || liveListening)
                ? 'bg-rose-950/70 border-rose-800/80 text-rose-400 animate-pulse'
                : 'bg-teal-950/60 border-teal-800/60 text-teal-400'
            }`}>
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 text-sm flex items-center gap-2">
                Indoor Security Camera &amp; Live Surveillance Hub
                {(cameraStreaming || liveListening) && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400">
                Live CCTV video &amp; ambient audio surveillance for pet monitoring, home security &amp; video check-in
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cameraStreaming && (
              <span className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-950/80 border border-rose-800/80 px-2.5 py-1 rounded-full">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                CAM: {cameraStreamFacing.toUpperCase()} · {cameraStreamFps} FPS
              </span>
            )}
            {liveListening && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-full animate-pulse">
                <Headphones className="h-3 w-3" />
                MIC LIVE
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Mode Selector */}
          <div>
            <label className="text-xs text-gray-400 block mb-1.5 font-medium">Surveillance Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSurveillanceMode('cam_mic')}
                disabled={cameraStreaming || liveListening}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  surveillanceMode === 'cam_mic'
                    ? 'border-teal-500 bg-teal-950/60 text-teal-300 shadow'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                }`}
              >
                <Video className="h-4 w-4 text-teal-400" />
                <span>🎥 Video + Audio (CCTV / Call)</span>
              </button>
              <button
                type="button"
                onClick={() => setSurveillanceMode('cam_only')}
                disabled={cameraStreaming || liveListening}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  surveillanceMode === 'cam_only'
                    ? 'border-teal-500 bg-teal-950/60 text-teal-300 shadow'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                }`}
              >
                <Camera className="h-4 w-4 text-teal-400" />
                <span>📷 Camera Only (Silent)</span>
              </button>
              <button
                type="button"
                onClick={() => setSurveillanceMode('mic_only')}
                disabled={cameraStreaming || liveListening}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  surveillanceMode === 'mic_only'
                    ? 'border-teal-500 bg-teal-950/60 text-teal-300 shadow'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                }`}
              >
                <Mic className="h-4 w-4 text-teal-400" />
                <span>🎙️ Mic Only (Audio Stream)</span>
              </button>
            </div>
          </div>

          {/* Camera Settings (Facing, Quality, FPS) */}
          {surveillanceMode !== 'mic_only' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Lens Selection */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Camera Lens</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCameraStreamFacing('back');
                      if (cameraStreaming) {
                        startCameraStream('back', cameraStreamQuality, cameraStreamFps);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                      cameraStreamFacing === 'back'
                        ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                        : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                    }`}
                  >
                    Back Lens
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraStreamFacing('front');
                      if (cameraStreaming) {
                        startCameraStream('front', cameraStreamQuality, cameraStreamFps);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                      cameraStreamFacing === 'front'
                        ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                        : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                    }`}
                  >
                    Front Lens
                  </button>
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Stream Quality</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'low', label: '480p' },
                    { id: 'medium', label: '720p HD' },
                    { id: 'high', label: '1080p' }
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

              {/* FPS */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Frame Rate</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 10, 15, 25].map((f) => (
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
          )}

          {/* Master Start / Stop Action Buttons */}
          <div className="flex gap-2">
            {!(cameraStreaming || liveListening) ? (
              <button
                type="button"
                onClick={() => {
                  if (surveillanceMode === 'cam_mic') {
                    startCameraStream(cameraStreamFacing, cameraStreamQuality, cameraStreamFps);
                    startLiveListen();
                  } else if (surveillanceMode === 'cam_only') {
                    startCameraStream(cameraStreamFacing, cameraStreamQuality, cameraStreamFps);
                  } else if (surveillanceMode === 'mic_only') {
                    startLiveListen();
                  }
                }}
                disabled={!activeDeviceId}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Eye className="h-4 w-4" /> Start Live Surveillance ({surveillanceMode === 'cam_mic' ? 'Camera + Audio' : surveillanceMode === 'cam_only' ? 'Camera Only' : 'Audio Only'})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (cameraStreaming) stopCameraStream();
                  if (liveListening) stopLiveListen();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow transition-colors cursor-pointer"
              >
                <Square className="h-4 w-4 fill-current" /> Stop Surveillance Monitor
              </button>
            )}
          </div>

          {/* Live Viewport (Video Stream & Audio Controls) */}
          {(cameraStreaming || liveListening) && (
            <div className={`rounded-xl border border-teal-900/60 bg-black p-4 mt-2 ${isFullScreenCCTV ? 'fixed inset-0 z-50 p-6 flex flex-col justify-between' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-bold text-gray-200">
                    Live Security Monitor {cameraStreaming ? `(${cameraStreamFacing.toUpperCase()} Lens)` : '(Audio Only)'}
                  </span>
                  {cameraStreaming && latestCameraFrame && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      {latestCameraFrame.width}x{latestCameraFrame.height} · {((latestCameraFrame.sizeBytes || 0) / 1024).toFixed(1)} KB/frame
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick Audio Mute/Unmute toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (liveListening) stopLiveListen();
                      else startLiveListen();
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      liveListening
                        ? 'border-emerald-600 bg-emerald-950/70 text-emerald-300'
                        : 'border-gray-800 bg-gray-900 text-gray-400 hover:text-white'
                    }`}
                    title={liveListening ? 'Mute ambient microphone audio' : 'Unmute & listen live'}
                  >
                    {liveListening ? <Headphones className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> : <MicOff className="h-3.5 w-3.5" />}
                    <span>{liveListening ? 'Audio: ON (Listening)' : 'Audio: MUTED'}</span>
                  </button>

                  {/* Quick Lens Switcher */}
                  {cameraStreaming && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextFacing = cameraStreamFacing === 'back' ? 'front' : 'back';
                        setCameraStreamFacing(nextFacing);
                        startCameraStream(nextFacing, cameraStreamQuality, cameraStreamFps);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-800 bg-gray-900 text-gray-300 hover:text-teal-300 hover:border-teal-700 transition-colors cursor-pointer"
                      title="Switch between front and back camera"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-teal-400" />
                      <span>Switch to {cameraStreamFacing === 'back' ? 'Front' : 'Back'}</span>
                    </button>
                  )}

                  {/* Fullscreen CCTV Button */}
                  <button
                    type="button"
                    onClick={() => setIsFullScreenCCTV(!isFullScreenCCTV)}
                    className="p-1.5 rounded-md border border-gray-800 bg-gray-900 text-gray-300 hover:text-white"
                    title={isFullScreenCCTV ? 'Exit Fullscreen' : 'Expand to Fullscreen Monitor'}
                  >
                    {isFullScreenCCTV ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Video Feed */}
              {cameraStreaming && (
                <div className={`relative rounded-lg overflow-hidden border border-gray-800 bg-black flex items-center justify-center ${isFullScreenCCTV ? 'flex-1 max-h-[85vh]' : 'max-h-[500px]'}`}>
                  {latestCameraFrame ? (
                    <img
                      src={`data:image/jpeg;base64,${latestCameraFrame.data}`}
                      alt="Live Security Camera Frame"
                      className="max-h-full w-auto object-contain"
                    />
                  ) : (
                    <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-teal-400" />
                      Initializing live camera feed from device...
                    </div>
                  )}

                  {/* Watermark Overlay */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 border border-gray-700 text-[10px] text-rose-400 font-mono pointer-events-none flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                    SECURITY MONITOR · {new Date().toLocaleTimeString()}
                  </div>
                </div>
              )}

              {/* Audio-only Waveform View when camera is paused */}
              {liveListening && !cameraStreaming && (
                <div className="p-8 text-center rounded-lg border border-gray-800 bg-gray-950/80">
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    <span className="h-6 w-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-10 w-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-4 w-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="h-8 w-1 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                    <span className="h-5 w-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  </div>
                  <p className="text-xs font-semibold text-emerald-300">Live Ambient Microphone Streaming to PC</p>
                  <p className="text-[11px] text-gray-400 mt-1">Listening in real-time through Web Audio API (16kHz PCM audio stream)</p>
                  <button
                    type="button"
                    onClick={() => startCameraStream(cameraStreamFacing, cameraStreamQuality, cameraStreamFps)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white shadow transition-colors cursor-pointer"
                  >
                    <Video className="h-3.5 w-3.5" /> Turn Camera ON
                  </button>
                </div>
              )}

              {/* Save Snapshot frame button */}
              {latestCameraFrame && cameraStreaming && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => downloadBase64(latestCameraFrame.data, 'image/jpeg', `security_cam_${Date.now()}.jpg`)}
                    className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium px-2 py-1 rounded hover:bg-gray-900 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Save CCTV Snapshot
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
                <div>
                  <div className="rounded-lg overflow-hidden border border-gray-800 bg-black flex items-center justify-center select-none relative">
                    <div className="relative inline-block overflow-hidden cursor-crosshair leading-none">
                      <img
                        ref={screenImgRef}
                        src={`data:image/jpeg;base64,${latestScreenFrame.data}`}
                        alt="Live Stream Frame"
                        className="max-h-[500px] w-auto block pointer-events-auto select-none"
                        onPointerDown={handleScreenPointerDown}
                        onPointerUp={handleScreenPointerUp}
                        draggable={false}
                      />

                      {/* Touch Ripple Visual Indicator positioned exactly on the image coordinates */}
                      {clickIndicator && (
                        <span
                          key={clickIndicator.id}
                          className="pointer-events-none absolute h-7 w-7 rounded-full bg-teal-400/80 border-2 border-white -translate-x-1/2 -translate-y-1/2 animate-ping"
                          style={{ left: `${clickIndicator.x}px`, top: `${clickIndicator.y}px` }}
                        />
                      )}
                    </div>

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 border border-gray-700 text-[10px] text-teal-300 pointer-events-none flex items-center gap-1">
                      <MousePointer className="h-3 w-3" /> Click: Tap · Drag: Swipe
                    </div>
                  </div>

                  {/* Virtual Navigation Bar & System Keys */}
                  <div className="mt-3 p-2 rounded-lg bg-gray-900 border border-gray-800 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => sendInputKey('back')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-teal-600 hover:text-white text-gray-200 text-xs font-medium transition-colors"
                      title="Back Key"
                    >
                      <CornerDownLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('home')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-teal-600 hover:text-white text-gray-200 text-xs font-medium transition-colors"
                      title="Home Screen"
                    >
                      <Home className="h-3.5 w-3.5" /> Home
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('recents')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-teal-600 hover:text-white text-gray-200 text-xs font-medium transition-colors"
                      title="Recent Applications"
                    >
                      <Menu className="h-3.5 w-3.5" /> Recents
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('notifications')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-teal-600 hover:text-white text-gray-200 text-xs font-medium transition-colors"
                      title="Pull Down Notification Shade"
                    >
                      <Bell className="h-3.5 w-3.5" /> Notifications
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('quick_settings')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-teal-600 hover:text-white text-gray-200 text-xs font-medium transition-colors"
                      title="Quick Settings Panel"
                    >
                      <Settings className="h-3.5 w-3.5" /> Quick Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('power_dialog')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-rose-600 hover:text-white text-gray-200 text-xs font-medium transition-colors"
                      title="Power Off / Restart Dialog"
                    >
                      <Power className="h-3.5 w-3.5" /> Power
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('lock_screen')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-amber-600 hover:text-white text-gray-200 text-xs font-medium transition-colors"
                      title="Lock Device Screen"
                    >
                      <Lock className="h-3.5 w-3.5" /> Lock Screen
                    </button>
                    <button
                      type="button"
                      onClick={() => wakeScreen()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-emerald-600 hover:text-white text-gray-200 text-xs font-medium transition-colors cursor-pointer"
                      title="Wake Up Dark Phone Screen via WakeLock"
                    >
                      <Sun className="h-3.5 w-3.5 text-amber-400" /> Wake Screen
                    </button>
                  </div>

                  {/* Remote Keyboard Quick Typing Injection */}
                  <div className="mt-3 p-3 rounded-lg bg-gray-900 border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                        <Keyboard className="h-4 w-4 text-teal-400" /> Remote Typing Injection (PC Keyboard → Phone Screen)
                      </span>
                      <span className="text-[10px] text-gray-400">Injects into active text field</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (quickTypeText.trim()) {
                          sendInputText(quickTypeText);
                          setQuickTypeText('');
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={quickTypeText}
                        onChange={(e) => setQuickTypeText(e.target.value)}
                        placeholder="Type text from PC to enter on phone screen (WhatsApp, search, login)..."
                        className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-200 focus:border-teal-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!quickTypeText.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow transition-colors cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" /> Type on Phone
                      </button>
                    </form>
                  </div>
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

            <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  launchRemoteApp(inspectApp.packageName);
                }}
                className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors flex items-center gap-1.5 shadow"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Launch App on Phone
              </button>
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

      {/* 8. LOST MODE EMERGENCY BANNER */}
      <div className="rounded-xl border border-rose-950/70 bg-gray-900/90 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-rose-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-950 border border-rose-800 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-rose-300 text-sm">Lost Mode Screen Emergency Banner</h3>
              <p className="text-xs text-rose-300/70">Pin persistent emergency return details & contact dialer on phone lockscreen</p>
            </div>
          </div>
          {lostMode?.active && (
            <span className="text-[10px] font-semibold text-rose-400 bg-rose-950 border border-rose-800 px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              LOST MODE ACTIVE ON PHONE
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-gray-300 font-medium block mb-1">Emergency Message</label>
            <textarea
              rows={2}
              value={lostMessage}
              onChange={(e) => setLostMessage(e.target.value)}
              placeholder="e.g. THIS PHONE IS LOST! Please contact owner for reward."
              className="w-full rounded-lg border border-gray-800 bg-gray-950 p-2 text-xs text-gray-200 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-gray-300 font-medium block mb-1">Owner Contact Phone Number</label>
              <input
                type="text"
                value={lostPhone}
                onChange={(e) => setLostPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-200 focus:border-rose-500 focus:outline-none font-mono"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer bg-gray-950 p-2 rounded-lg border border-gray-800">
              <input
                type="checkbox"
                checked={lostSoundAlarm}
                onChange={(e) => setLostSoundAlarm(e.target.checked)}
                className="rounded border-gray-700 bg-gray-950 text-rose-500 focus:ring-rose-500 h-4 w-4"
              />
              <span>Also sound continuous emergency siren alarm</span>
            </label>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          {!lostMode?.active ? (
            <button
              type="button"
              onClick={() => setLostMode(true, lostMessage, lostPhone, lostSoundAlarm)}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors shadow"
            >
              <AlertTriangle className="h-4 w-4" /> Activate Lost Mode Banner
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLostMode(false, '', '', false)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow"
            >
              <Check className="h-4 w-4" /> Deactivate Lost Mode
            </button>
          )}
        </div>
      </div>

      {/* THEFT MOTION ALARM (DESK GUARD) */}
      <div className="rounded-xl border border-amber-950/70 bg-gray-900/90 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-amber-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-200 text-sm">Theft Motion Alarm ("Don't Touch My Phone")</h3>
              <p className="text-xs text-amber-200/70">Sounds a loud siren on phone and alerts PC if device is moved or picked up from desk</p>
            </div>
          </div>

          {motionAlarm?.triggered ? (
            <span className="text-[10px] font-semibold text-rose-300 bg-rose-950 border border-rose-800 px-3 py-1 rounded-full animate-bounce flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.6)]">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              MOTION DETECTED · SIREN SOUNDING
            </span>
          ) : motionAlarm?.armed ? (
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              ARMED & GUARDING DESK
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-950 border border-gray-800 px-2.5 py-1 rounded-full">
              DISARMED
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Motion Sensitivity Threshold</span>
                <span className="font-mono text-amber-400">{motionThreshold} m/s²</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={motionThreshold}
                onChange={(e) => setMotionThreshold(parseFloat(e.target.value))}
                disabled={motionAlarm?.armed}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>High Sensitivity (1.0)</span>
                <span>Default (2.5)</span>
                <span>Heavy Bump Only (6.0)</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {motionAlarm?.armed || motionAlarm?.triggered ? (
                <button
                  type="button"
                  onClick={() => setMotionAlarm(false)}
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors shadow"
                >
                  <X className="h-4 w-4" /> Disarm Guard & Stop Siren
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMotionAlarm(true, motionThreshold, 3)}
                  className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-colors shadow"
                >
                  <ShieldAlert className="h-4 w-4" /> Arm Theft Guard (3s Delay)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LIVE VOICE WALKIE-TALKIE INTERCOM */}
      <div className="rounded-xl border border-sky-950/70 bg-gray-900/90 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-sky-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-800/80 text-sky-400">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sky-200 text-sm">Live Voice Walkie-Talkie (Intercom)</h3>
              <p className="text-xs text-sky-200/70">Hold to speak from PC microphone directly through the phone's speakerphone in real time</p>
            </div>
          </div>

          {isPressingWalkieTalkie || walkieTalkieActive ? (
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              BROADCASTING LIVE TO PHONE SPEAKER
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-sky-400 bg-sky-950 border border-sky-800 px-2.5 py-1 rounded-full">
              INTERCOM READY
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-950/60 p-4 rounded-xl border border-sky-900/30">
          <div className="text-xs text-gray-300 space-y-1">
            <div className="font-semibold text-sky-300">Push-to-Talk Broadcast</div>
            <div className="text-[11px] text-gray-400">
              Hold the talk button or toggle hands-free to speak directly through the phone's speakerphone in real time. Use Force Stop if audio ever gets stuck.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onMouseDown={startHoldWalkieTalkie}
              onMouseUp={stopHoldWalkieTalkie}
              onMouseLeave={stopHoldWalkieTalkie}
              onTouchStart={startHoldWalkieTalkie}
              onTouchEnd={stopHoldWalkieTalkie}
              className={`select-none flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer ${
                isPressingWalkieTalkie && !handsFreeIntercom
                  ? 'bg-rose-600 text-white shadow-rose-600/40 ring-4 ring-rose-500/30 animate-pulse'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30'
              }`}
            >
              <Mic className={`h-4 w-4 ${isPressingWalkieTalkie && !handsFreeIntercom ? 'animate-bounce' : ''}`} />
              {isPressingWalkieTalkie && !handsFreeIntercom ? 'TALKING (RELEASE TO STOP)' : 'HOLD TO TALK'}
            </button>

            <button
              type="button"
              onClick={toggleHandsFreeWalkie}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border shadow ${
                handsFreeIntercom && isPressingWalkieTalkie
                  ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-400/40 animate-pulse'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
              }`}
            >
              <Mic className="h-4 w-4 text-emerald-400" />
              {handsFreeIntercom && isPressingWalkieTalkie ? 'MUTE HANDS-FREE' : 'HANDS-FREE ON'}
            </button>

            <button
              type="button"
              onClick={forceStopWalkieTalkie}
              title="Immediately cut audio track and silence the phone speaker"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 transition-colors shadow"
            >
              <MicOff className="h-4 w-4 text-rose-400" />
              FORCE STOP
            </button>
          </div>
        </div>
      </div>

      {/* 9. MEDIA & PHOTO GALLERY VIEWER */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-800/60 text-teal-400">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-100 text-sm">Recent Photos & Camera Gallery</h3>
              <p className="text-xs text-gray-400">Live visual thumbnail grid of photos captured on phone camera with one-click download</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchGallery(36)}
            disabled={galleryLoading}
            className="flex items-center gap-1.5 rounded-lg bg-gray-950 border border-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${galleryLoading ? 'animate-spin text-teal-400' : ''}`} />
            {galleryLoading ? 'Loading Photos...' : 'Refresh Gallery'}
          </button>
        </div>

        {galleryPhotos.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-xs">
            <ImageIcon className="mx-auto h-8 w-8 opacity-30 mb-2" />
            <p>No photos loaded yet.</p>
            <button
              type="button"
              onClick={() => fetchGallery(36)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-teal-600 text-white font-medium text-xs hover:bg-teal-500 transition-colors"
            >
              Load Device Photos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
            {galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative rounded-lg border border-gray-800 bg-gray-950 overflow-hidden flex flex-col justify-between hover:border-teal-500/60 transition-all"
              >
                <div
                  className="aspect-square w-full bg-black flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  {photo.thumbnail ? (
                    <img
                      src={photo.thumbnail}
                      alt={photo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-gray-700" />
                  )}
                </div>

                <div className="p-2 text-[10px]">
                  <p className="truncate text-gray-300 font-medium">{photo.name}</p>
                  <div className="flex items-center justify-between text-gray-500 mt-1">
                    <span>{formatBytes(photo.size)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (photo.thumbnail) {
                          const link = document.createElement('a');
                          link.href = photo.thumbnail;
                          link.download = photo.name;
                          link.click();
                        } else {
                          sendCommand('file-download', { deviceId: activeDeviceId, path: photo.path, name: photo.name, mimeType: 'image/jpeg' });
                        }
                      }}
                      className="text-teal-400 hover:text-teal-300 p-0.5 rounded"
                      title="Download photo"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
              <div>
                <h4 className="font-semibold text-gray-100 text-sm truncate max-w-sm">{selectedPhoto.name}</h4>
                <p className="text-[10px] text-gray-400">{formatBytes(selectedPhoto.size)} · {new Date(selectedPhoto.date).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden max-h-[60vh] p-2">
              <img
                src={selectedPhoto.thumbnail}
                alt={selectedPhoto.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedPhoto.thumbnail;
                  link.download = selectedPhoto.name;
                  link.click();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-500"
              >
                <Download className="h-3.5 w-3.5" /> Download Thumbnail
              </button>
              <button
                type="button"
                onClick={() => {
                  sendCommand('file-download', { deviceId: activeDeviceId, path: selectedPhoto.path, name: selectedPhoto.name, mimeType: 'image/jpeg' });
                  pushToast('Full resolution download requested from phone', 'info');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-teal-300 text-xs font-medium hover:bg-gray-700 border border-teal-800/60"
              >
                <Download className="h-3.5 w-3.5" /> Download Full Res
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CELLULAR & DUAL-SIM TELEMETRY */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Signal className="h-4 w-4 text-teal-400" />
            <h3 className="font-semibold text-gray-100 text-sm">Cellular & Dual-SIM Network Telemetry</h3>
          </div>
          <button
            type="button"
            onClick={fetchCellularInfo}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Refresh Telemetry
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Real-time cellular signal strength bars, 5G/4G network generation, roaming status, and active Dual-SIM carrier profiles.
        </p>

        {cellularInfo ? (
          <div className="space-y-4">
            {/* Primary Signal & Network Badge */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-[11px] text-gray-400 block mb-1">Signal Strength</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-end gap-0.5 h-4">
                    {[1, 2, 3, 4].map((bar) => (
                      <span
                        key={bar}
                        className={`w-1 rounded-sm ${
                          (cellularInfo.signalLevel ?? 0) >= bar
                            ? 'bg-emerald-400'
                            : 'bg-gray-700'
                        }`}
                        style={{ height: `${bar * 25}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono font-semibold text-white">
                    {cellularInfo.signalLevel != null ? `${cellularInfo.signalLevel}/4 Bars` : 'Active'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-[11px] text-gray-400 block mb-1">Network Gen</span>
                <span className="text-xs font-mono font-bold text-teal-300 px-2 py-0.5 rounded bg-teal-950/60 border border-teal-800/80 inline-block">
                  {cellularInfo.networkGen || 'Cellular'}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
                  {cellularInfo.networkTypeName || 'Active'}
                </span>
              </div>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-[11px] text-gray-400 block mb-1">Data State</span>
                <span className={`text-xs font-mono font-semibold uppercase ${
                  cellularInfo.dataState === 'CONNECTED' ? 'text-emerald-400' : 'text-gray-400'
                }`}>
                  {cellularInfo.dataState || 'UNKNOWN'}
                </span>
              </div>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-[11px] text-gray-400 block mb-1">Roaming</span>
                <span className={`text-xs font-mono font-semibold ${
                  cellularInfo.isNetworkRoaming ? 'text-amber-400' : 'text-gray-400'
                }`}>
                  {cellularInfo.isNetworkRoaming ? 'Roaming ON' : 'Domestic / Home'}
                </span>
              </div>
            </div>

            {/* SIM Cards List */}
            {Array.isArray(cellularInfo.sims) && cellularInfo.sims.length > 0 ? (
              <div>
                <span className="text-xs font-medium text-gray-300 block mb-2">Active SIM Cards:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cellularInfo.sims.map((sim, idx) => (
                    <div key={idx} className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded bg-teal-950/50 border border-teal-800/60 text-teal-400">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{sim.carrierName || sim.displayName || 'SIM ' + (idx + 1)}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{sim.simSlot} • {sim.countryIso ? sim.countryIso.toUpperCase() : 'IN'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-xs text-gray-400 flex items-center justify-between">
                <span>Carrier: <strong className="text-white">{cellularInfo.networkOperatorName || cellularInfo.simOperatorName || 'Cellular Service'}</strong></span>
                <span className="font-mono text-gray-500">{cellularInfo.phoneType || 'GSM'}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-gray-800 rounded-lg">
            <Signal className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No cellular telemetry received yet.</p>
            <button
              type="button"
              onClick={fetchCellularInfo}
              className="mt-2 text-xs text-teal-400 hover:text-teal-300 underline"
            >
              Fetch SIM & Cellular Status
            </button>
          </div>
        )}
      </div>

      {/* STORAGE & JUNK CLEANER */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <h3 className="font-semibold text-gray-100 text-sm">Storage & WhatsApp Junk Cleaner</h3>
          </div>
          <button
            type="button"
            disabled={isScanningJunk}
            onClick={scanJunk}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isScanningJunk ? 'animate-spin' : ''}`} />
            {isScanningJunk ? 'Scanning Storage...' : 'Scan Storage Junk'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Scan and remotely purge leftover APK package installers, WhatsApp sent media forwards, app cache, and files larger than 50MB.
        </p>

        {junkScanData ? (
          <div className="space-y-4">
            {/* Total Junk Banner */}
            <div className="flex flex-wrap items-center justify-between bg-teal-950/30 border border-teal-800/60 rounded-lg p-3.5 gap-3">
              <div>
                <span className="text-[11px] text-teal-300 block">Total Junk Found</span>
                <span className="text-xl font-bold font-mono text-white">
                  {(junkScanData.totalBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  across {junkScanData.categories?.length || 0} categories
                </span>
              </div>
              <button
                type="button"
                onClick={() => cleanJunk('all')}
                disabled={junkScanData.totalBytes === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" /> 1-Click Clean All
              </button>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.isArray(junkScanData.categories) && junkScanData.categories.map((cat) => (
                <div key={cat.id} className="bg-gray-950 p-3 rounded-lg border border-gray-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-200">{cat.title}</span>
                      <span className="text-xs font-mono text-teal-400 font-semibold">
                        {(cat.totalBytes / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">{cat.description} ({cat.count} files)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cleanJunk(cat.id)}
                    disabled={cat.count === 0}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" /> Clean This Category
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-gray-800 rounded-lg">
            <FolderArchive className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No storage scan performed yet.</p>
            <button
              type="button"
              disabled={isScanningJunk}
              onClick={scanJunk}
              className="mt-2 text-xs text-teal-400 hover:text-teal-300 underline"
            >
              Start Deep Storage Scan
            </button>
          </div>
        )}
      </div>

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

