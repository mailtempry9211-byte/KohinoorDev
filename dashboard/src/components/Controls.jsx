import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  PhoneCall,
  Database,
  MapPin,
  MessageSquare,
  Pause,
  WifiOff,
  RotateCw,
  Cloud,
  Server
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import DevicePairingHub from './DevicePairingHub';

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

export default function Controls({ theme, isMobile = false }) {
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
    openCallRecordingsVault,
    setCurrentTab,
    syncConfig,
    updateSyncConfig,
    toggleMasterDataSaver,
    parentalControl,
    appUsage,
    updateParentalControl,
    requestAppUsage,
    batteryConfig,
    updateBatteryConfig,
    autoTimelapse,
    latestTimelapse,
    timelapseGallery,
    updateAutoTimelapse,
    geofence,
    updateGeofence,
    autoReply,
    updateAutoReply,
    networkUsage,
    requestNetworkUsage,
    scheduledList,
    manageSchedule,
    volumeSos,
    updateVolumeSos,
    callRecording,
    updateCallRecording,
    camouflage,
    updateCamouflage,
    quickSettings,
    sendQuickSetting,
    storageAnalysis,
    requestStorageAnalysis,
    pauseMonitoring,
    locations,
    sendCommand,
    pushToast,
    isFindingPhone,
    triggerFindPhone,
    stopFindPhone
  } = useStore();

  const [lockScreenNote, setLockScreenNote] = useState('');
  const [newBlockNumber, setNewBlockNumber] = useState('');
  const [micDuration, setMicDuration] = useState(15);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [streamFps, setStreamFps] = useState(15);
  const [cameraStreamFacing, setCameraStreamFacing] = useState('back');
  const [cameraStreamQuality, setCameraStreamQuality] = useState('low');
  const [cameraStreamFps, setCameraStreamFps] = useState(15);

  const [newBlockPkg, setNewBlockPkg] = useState('');
  const [newOverlayPkg, setNewOverlayPkg] = useState('');
  const [newAppLockPin, setNewAppLockPin] = useState('');
  const [screenTimeLimit, setScreenTimeLimit] = useState(120);
  const [allowedAppsText, setAllowedAppsText] = useState('com.whatsapp, com.android.dialer, com.google.android.apps.messaging, com.android.camera, com.google.android.apps.photos');

  // 8 Advanced Features UI states
  const [schedCommand, setSchedCommand] = useState('lock');
  const [schedMinutes, setSchedMinutes] = useState(15);
  const [geofenceNameInput, setGeofenceNameInput] = useState('Home Safe Zone');
  const [geofenceRadiusInput, setGeofenceRadiusInput] = useState(300);
  const [autoReplyMsgInput, setAutoReplyMsgInput] = useState('I am currently away / driving. Will contact you soon.');
  const [batteryCutoffInput, setBatteryCutoffInput] = useState(90);
  const [batteryTempLimitInput, setBatteryTempLimitInput] = useState(45);
  const [timelapseIntervalInput, setTimelapseIntervalInput] = useState(5);
  const [timelapseFacingInput, setTimelapseFacingInput] = useState('back');
  const [selectedTimelapsePhoto, setSelectedTimelapsePhoto] = useState(null);
  const [showTimelapseModal, setShowTimelapseModal] = useState(false);
  const [disguisePinInput, setDisguisePinInput] = useState('9211');
  const [customNotifTitleInput, setCustomNotifTitleInput] = useState('');
  const [customNotifTextInput, setCustomNotifTextInput] = useState('');

  const downloadTimelapsePhoto = (base64Data, filename) => {
    if (!base64Data) return;
    try {
      const link = document.createElement('a');
      link.href = `data:image/jpeg;base64,${base64Data}`;
      link.download = filename || `timelapse_snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      pushToast('📸 Timelapse photo downloaded to your computer', 'success');
    } catch (e) {
      pushToast('Failed to download photo', 'error');
    }
  };

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

  // UI/UX Pro Max: Controls Category Sub-navigation & Instant Filter
  const [controlTab, setControlTab] = useState('all');
  const [controlSearch, setControlSearch] = useState('');

  const isCardVisible = (category, keywords = []) => {
    const matchesTab = controlTab === 'all' || controlTab === category;
    if (!matchesTab) return false;
    if (!controlSearch.trim()) return true;
    const q = controlSearch.toLowerCase();
    return (
      category.toLowerCase().includes(q) ||
      keywords.some((k) => (k || '').toLowerCase().includes(q))
    );
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

  // Free Cloud Server Storage & Purge stats
  const [serverStats, setServerStats] = useState(null);
  const [isLoadingServerStats, setIsLoadingServerStats] = useState(false);
  const [isPurgingStorage, setIsPurgingStorage] = useState(false);

  const fetchServerStats = async () => {
    setIsLoadingServerStats(true);
    try {
      const res = await fetch('/api/server/storage-stats');
      if (res.ok) {
        const data = await res.json();
        setServerStats(data);
      }
    } catch (_) {}
    setIsLoadingServerStats(false);
  };

  const purgeServerData = async (options = { calls: true, messages: true, notifications: true, locations: true, clipboard: true }) => {
    if (!window.confirm('Are you sure you want to permanently clear stored calls, SMS, notifications, and locations from cloud server database? This will free up 100% disk space while keeping your phone paired.')) {
      return;
    }
    setIsPurgingStorage(true);
    try {
      const res = await fetch('/api/server/purge-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      const data = await res.json();
      if (data.success) {
        pushToast(`Server Cleaned: Permanently wiped ${data.clearedItems} historical records! Free disk is clean.`, 'success');
        fetchServerStats();
      } else {
        pushToast(data.error || 'Failed to purge server data', 'error');
      }
    } catch (e) {
      pushToast('Error purging server storage: ' + e.message, 'error');
    } finally {
      setIsPurgingStorage(false);
    }
  };

  useEffect(() => {
    fetchServerStats();
    const interval = setInterval(fetchServerStats, 15000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="py-2">
        <DevicePairingHub
          onOpenGuideModal={() => {
            window.dispatchEvent(new CustomEvent('open-remote-guide-modal'));
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Redesigned Glassmorphic Mission Control Header - Ultra Responsive */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-xl shadow-slate-200/20 dark:shadow-black/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-400/30 shrink-0">
            <Sliders className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {activeDevice?.deviceName || activeDeviceId}
              </span>
              {activeDevice?.online ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.2 rounded-full">
                  Offline
                </span>
              )}
              {activeDevice?.battery !== undefined && (
                <span className="text-[9px] font-mono text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-1.5 py-0.2 rounded-md">
                  🔋{activeDevice.battery}%
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate hidden sm:block">
              Device Mission Control &amp; Remote Access Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Home Mode Toggle Mini Pill */}
          <button
            type="button"
            onClick={() => pauseMonitoring(!activeDevice?.monitoringPaused)}
            className={`btn-interactive flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-xs cursor-pointer border ${
              activeDevice?.monitoringPaused
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 shadow-amber-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="When active, keeps connection live but stops syncing SMS, calls, location & notifications"
          >
            <Pause className="h-3 w-3" />
            <span>{activeDevice?.monitoringPaused ? 'Home On' : 'Home Mode'}</span>
          </button>

          {/* Open App On Device Mini Pill */}
          <button
            type="button"
            onClick={async () => {
              const res = await sendCommand('open-app', { deviceId: activeDeviceId });
              if (res && res.success) {
                pushToast('Opening PhoneLink on child phone...', 'success');
              } else {
                pushToast(`Could not open app: ${res?.error || 'phone offline'}`, 'error');
              }
            }}
            className="btn-interactive flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            title="Remotely launches PhoneLink settings on phone screen"
          >
            <Smartphone className="h-3 w-3 text-indigo-500" />
            <span className="hidden sm:inline">Open App</span>
          </button>
        </div>
      </div>

      {/* 🚀 QUICK CONTROL CENTER - 12 INTERACTIVE 1-TAP ACTION TILES */}
      <div className="rounded-2xl p-3 sm:p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-xl shadow-slate-200/20 dark:shadow-black/30">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
              ⚡ Quick Control Center
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">1-Tap Remote Actions</span>
        </div>

        {/* 12 Interactive Compact Tiles Matrix */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {/* 1. Flashlight / Torch */}
          <button
            type="button"
            onClick={() => sendQuickSetting('torch')}
            className={`btn-interactive p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none ${
              quickSettings?.torchOn || torchOn
                ? 'bg-amber-500/20 border-amber-500/70 text-amber-600 dark:text-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-amber-400/50'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${quickSettings?.torchOn || torchOn ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-amber-500'}`}>
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Torch</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
              quickSettings?.torchOn || torchOn ? 'bg-amber-400/30 text-amber-700 dark:text-amber-300' : 'text-slate-400'
            }`}>
              {quickSettings?.torchOn || torchOn ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* 2. Haptic Vibration Alert */}
          <button
            type="button"
            onClick={() => {
              vibratePhone(500);
              pushToast('Sent 500ms vibration to phone', 'info');
            }}
            className="btn-interactive p-2.5 rounded-xl border bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-teal-400/60 hover:bg-teal-500/10 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none"
          >
            <div className="p-1.5 rounded-xl bg-teal-500/15 text-teal-500 dark:text-teal-400">
              <Radio className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Vibrate</span>
            <span className="text-[9px] font-mono text-teal-600 dark:text-teal-400 font-bold">500ms</span>
          </button>

          {/* 3. Loud Siren / Find Phone */}
          {isFindingPhone ? (
            <button
              type="button"
              onClick={() => stopFindPhone(activeDeviceId)}
              className="btn-interactive p-2.5 rounded-xl border bg-rose-600 hover:bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-600/50 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none animate-pulse"
            >
              <div className="p-1.5 rounded-xl bg-white/20 text-white">
                <VolumeX className="h-4 w-4 animate-bounce" />
              </div>
              <span className="text-[11px] font-bold leading-tight">Stop Siren</span>
              <span className="text-[9px] font-mono bg-white/30 text-white px-1.5 py-0.2 rounded font-black">RINGING</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Ring this phone at full volume, even on silent?')) {
                  triggerFindPhone(activeDeviceId);
                }
              }}
              className="btn-interactive p-2.5 rounded-xl border bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-rose-400/60 hover:bg-rose-500/10 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none"
            >
              <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-500 dark:text-rose-400">
                <Volume2 className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold leading-tight">Find Siren</span>
              <span className="text-[9px] font-mono text-rose-500 font-bold">Loud Alarm</span>
            </button>
          )}

          {/* 4. Remote Screen Wake */}
          <button
            type="button"
            onClick={async () => {
              await wakeScreen();
              pushToast('Turned target phone screen ON', 'success');
            }}
            className="btn-interactive p-2.5 rounded-xl border bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-emerald-400/60 hover:bg-emerald-500/10 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none"
          >
            <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
              <Sun className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Wake Screen</span>
            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Display ON</span>
          </button>

          {/* 5. Remote Screen Lock */}
          <button
            type="button"
            onClick={() => {
              lockDevice();
              pushToast('Lock command sent to phone screen', 'info');
            }}
            className="btn-interactive p-2.5 rounded-xl border bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-violet-400/60 hover:bg-violet-500/10 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none"
          >
            <div className="p-1.5 rounded-xl bg-violet-500/15 text-violet-500 dark:text-violet-400">
              <Lock className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Lock Screen</span>
            <span className="text-[9px] font-mono text-violet-600 dark:text-violet-400 font-bold">Instant Lock</span>
          </button>

          {/* 6. Ringer Mode Switcher */}
          <button
            type="button"
            onClick={() => {
              const current = volumeInfo?.ringerMode?.toLowerCase() || quickSettings?.ringerMode || 'normal';
              if (current === 'normal') {
                sendQuickSetting('ringer_vibrate');
                pushToast('Ringer set to Vibrate', 'info');
              } else if (current === 'vibrate') {
                sendQuickSetting('ringer_silent');
                pushToast('Ringer set to Silent', 'info');
              } else {
                sendQuickSetting('ringer_normal');
                pushToast('Ringer set to Normal', 'info');
              }
            }}
            className="btn-interactive p-2.5 rounded-xl border bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-sky-400/60 hover:bg-sky-500/10 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none"
          >
            <div className="p-1.5 rounded-xl bg-sky-500/15 text-sky-500 dark:text-sky-400">
              <BellOff className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Ringer</span>
            <span className="text-[9px] font-mono text-sky-600 dark:text-sky-400 font-bold uppercase truncate max-w-full">
              {volumeInfo?.ringerMode || quickSettings?.ringerMode || 'Normal'}
            </span>
          </button>

          {/* 7. Instant Photo Snap */}
          <button
            type="button"
            onClick={() => captureCamera({ facing: 'back' })}
            disabled={cameraCapturing}
            className="btn-interactive p-2.5 rounded-xl border bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-purple-400/60 hover:bg-purple-500/10 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none disabled:opacity-40"
          >
            <div className="p-1.5 rounded-xl bg-purple-500/15 text-purple-500 dark:text-purple-400">
              <Camera className={`h-4 w-4 ${cameraCapturing ? 'animate-spin' : ''}`} />
            </div>
            <span className="text-[11px] font-bold leading-tight">Photo Snap</span>
            <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 font-bold">
              {cameraCapturing ? 'Snapping...' : 'Silent Rear'}
            </span>
          </button>

          {/* 8. Instant Mic Listen (15s) */}
          <button
            type="button"
            onClick={() => recordMic(15)}
            disabled={micRecording}
            className={`btn-interactive p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none disabled:opacity-40 ${
              micRecording
                ? 'bg-rose-500/20 border-rose-500/70 text-rose-600 dark:text-rose-300 animate-pulse'
                : 'bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-rose-400/60 hover:bg-rose-500/10'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${micRecording ? 'bg-rose-500 text-white' : 'bg-rose-500/15 text-rose-500 dark:text-rose-400'}`}>
              <Mic className={`h-4 w-4 ${micRecording ? 'animate-bounce' : ''}`} />
            </div>
            <span className="text-[11px] font-bold leading-tight">Mic Audio</span>
            <span className="text-[9px] font-mono text-rose-500 font-bold">
              {micRecording ? 'Listening...' : '15s Clip'}
            </span>
          </button>

          {/* 9. Instant Screenshot Grab */}
          <button
            type="button"
            onClick={() => captureScreenshot()}
            disabled={screenshotCapturing}
            className="btn-interactive p-2.5 rounded-xl border bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400/60 hover:bg-indigo-500/10 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none disabled:opacity-40"
          >
            <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-500 dark:text-indigo-400">
              <Monitor className={`h-4 w-4 ${screenshotCapturing ? 'animate-spin' : ''}`} />
            </div>
            <span className="text-[11px] font-bold leading-tight">Screenshot</span>
            <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              {screenshotCapturing ? 'Grabbing...' : 'Live Grab'}
            </span>
          </button>

          {/* 10. Data Saver Mode Toggle */}
          <button
            type="button"
            onClick={() => toggleMasterDataSaver(!syncConfig?.lowDataMode)}
            className={`btn-interactive p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none ${
              syncConfig?.lowDataMode
                ? 'bg-amber-500/20 border-amber-500/70 text-amber-600 dark:text-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-emerald-400/60'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${syncConfig?.lowDataMode ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400'}`}>
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Data Saver</span>
            <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
              syncConfig?.lowDataMode ? 'bg-amber-400/30 text-amber-700 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {syncConfig?.lowDataMode ? 'SAVER ON' : 'ACTIVE'}
            </span>
          </button>

          {/* 11. Home Mode (Pause/Resume Monitoring) */}
          <button
            type="button"
            onClick={() => pauseMonitoring(!activeDevice?.monitoringPaused)}
            className={`btn-interactive p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none ${
              activeDevice?.monitoringPaused
                ? 'bg-amber-500/20 border-amber-500/70 text-amber-600 dark:text-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-amber-400/60'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${activeDevice?.monitoringPaused ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <Pause className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Home Mode</span>
            <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
              activeDevice?.monitoringPaused ? 'bg-amber-400/30 text-amber-700 dark:text-amber-300' : 'text-slate-400'
            }`}>
              {activeDevice?.monitoringPaused ? 'PAUSED' : 'ONLINE'}
            </span>
          </button>

          {/* 12. Full Telemetry Sync */}
          <button
            type="button"
            onClick={async () => {
              await Promise.all([refreshDeviceInfo(), fetchBatteryStats(), fetchVolumeInfo()]);
              pushToast('All telemetry refreshed from phone', 'success');
            }}
            className="btn-interactive p-2.5 rounded-xl border bg-white/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400/60 hover:bg-indigo-500/10 text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none"
          >
            <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-500 dark:text-indigo-400">
              <RefreshCw className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Sync Now</span>
            <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">Refresh</span>
          </button>
        </div>
      </div>

      {/* STREAMLINED GLASS SUB-NAVIGATION PILL BAR & COMPACT SEARCH */}
      <div className="sticky top-0 z-30 -mx-1 px-2.5 py-2 sm:py-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-xl shadow-slate-200/30 dark:shadow-black/40 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none py-0.5">
          {[
            { id: 'all', label: 'All', icon: Sliders },
            { id: 'hardware', label: '⚡ Hardware', icon: Zap },
            { id: 'surveillance', label: '👁️ Stream', icon: Eye },
            { id: 'safety', label: '🛡️ Safety', icon: Shield },
            { id: 'automation', label: '⚙️ Auto', icon: Cpu },
            { id: 'danger', label: '⚠️ Danger', icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = controlTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setControlTab(tab.id)}
                className={`btn-interactive px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`h-3 w-3 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[120px] max-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
          <input
            type="text"
            value={controlSearch}
            onChange={(e) => setControlSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-6 py-1.5 rounded-xl bg-white/90 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 text-[11px] font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs transition-all"
          />
          {controlSearch && (
            <button
              type="button"
              onClick={() => setControlSearch('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* BANDWIDTH & BACKGROUND SYNC MANAGER (SERVER-LEVEL & CLIENT-LEVEL CONTROL) */}
      <div className={`rounded-2xl border p-5 shadow-xl transition-all ${isCardVisible("automation", ["bandwidth", "sync", "data saver", "low data mode", "network"]) ? "" : "hidden"} ${
        syncConfig?.lowDataMode
          ? 'border-amber-500/40 dark:border-amber-500/60 bg-amber-50/50 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-gray-900 dark:via-amber-950/20 dark:to-gray-950 shadow-lg'
          : 'border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-gray-900 dark:via-indigo-950/20 dark:to-gray-950 shadow-lg'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              syncConfig?.lowDataMode
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-teal-500/20 border-teal-500/40 text-teal-400'
            }`}>
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Bandwidth & Remote Feature Sync Manager</h3>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  syncConfig?.lowDataMode
                    ? 'bg-amber-950 border-amber-600 text-amber-300 animate-pulse'
                    : 'bg-emerald-950 border-emerald-600 text-emerald-300'
                }`}>
                  {syncConfig?.lowDataMode ? '⚡ Ultra Low Data (Standby Only)' : '🟢 Active Syncing'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pause unnecessary background sync per-feature to save battery, free tunnel bandwidth & prevent quota burnout.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleMasterDataSaver(!syncConfig?.lowDataMode)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md border ${
                syncConfig?.lowDataMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white'
              }`}
            >
              {syncConfig?.lowDataMode ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {syncConfig?.lowDataMode ? 'Resume Full Sync' : 'Pause All Sync (Low Data)'}
            </button>
          </div>
        </div>

        {/* Sync Channels Grid */}
        <div className={isMobile ? "flex flex-col gap-2.5 w-full" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"}>
          {/* Notifications */}
          <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
            syncConfig?.notifications && !syncConfig?.lowDataMode
              ? 'border-teal-500/40 bg-teal-950/20 text-slate-800 dark:text-slate-200'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400'
          }`}>
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Bell className={`h-3.5 w-3.5 ${syncConfig?.notifications && !syncConfig?.lowDataMode ? 'text-teal-400' : 'text-gray-500'}`} />
                <span>Notifications</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Incoming app mirroring</p>
            </div>
            <button
              onClick={() => updateSyncConfig({ notifications: !syncConfig?.notifications })}
              disabled={syncConfig?.lowDataMode}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                syncConfig?.notifications && !syncConfig?.lowDataMode
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 hover:bg-teal-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {syncConfig?.notifications && !syncConfig?.lowDataMode ? 'SYNC ON' : 'PAUSED'}
            </button>
          </div>

          {/* Calls */}
          <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
            syncConfig?.calls && !syncConfig?.lowDataMode
              ? 'border-teal-500/40 bg-teal-950/20 text-slate-800 dark:text-slate-200'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400'
          }`}>
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <PhoneCall className={`h-3.5 w-3.5 ${syncConfig?.calls && !syncConfig?.lowDataMode ? 'text-teal-400' : 'text-gray-500'}`} />
                <span>Call Logs</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">History & ring alerts</p>
            </div>
            <button
              onClick={() => updateSyncConfig({ calls: !syncConfig?.calls })}
              disabled={syncConfig?.lowDataMode}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                syncConfig?.calls && !syncConfig?.lowDataMode
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 hover:bg-teal-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {syncConfig?.calls && !syncConfig?.lowDataMode ? 'SYNC ON' : 'PAUSED'}
            </button>
          </div>

          {/* SMS */}
          <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
            syncConfig?.sms && !syncConfig?.lowDataMode
              ? 'border-teal-500/40 bg-teal-950/20 text-slate-800 dark:text-slate-200'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400'
          }`}>
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <MessageSquare className={`h-3.5 w-3.5 ${syncConfig?.sms && !syncConfig?.lowDataMode ? 'text-teal-400' : 'text-gray-500'}`} />
                <span>SMS Messages</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Inbox & outbox sync</p>
            </div>
            <button
              onClick={() => updateSyncConfig({ sms: !syncConfig?.sms })}
              disabled={syncConfig?.lowDataMode}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                syncConfig?.sms && !syncConfig?.lowDataMode
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 hover:bg-teal-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {syncConfig?.sms && !syncConfig?.lowDataMode ? 'SYNC ON' : 'PAUSED'}
            </button>
          </div>

          {/* Location / GPS */}
          <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
            syncConfig?.location && !syncConfig?.lowDataMode
              ? 'border-teal-500/40 bg-teal-950/20 text-slate-800 dark:text-slate-200'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400'
          }`}>
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <MapPin className={`h-3.5 w-3.5 ${syncConfig?.location && !syncConfig?.lowDataMode ? 'text-teal-400' : 'text-gray-500'}`} />
                <span>GPS Location</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Radio hardware & tracking</p>
            </div>
            <button
              onClick={() => updateSyncConfig({ location: !syncConfig?.location })}
              disabled={syncConfig?.lowDataMode}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                syncConfig?.location && !syncConfig?.lowDataMode
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 hover:bg-teal-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {syncConfig?.location && !syncConfig?.lowDataMode ? 'SYNC ON' : 'PAUSED'}
            </button>
          </div>

          {/* Clipboard */}
          <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
            syncConfig?.clipboard && !syncConfig?.lowDataMode
              ? 'border-teal-500/40 bg-teal-950/20 text-slate-800 dark:text-slate-200'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400'
          }`}>
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Clipboard className={`h-3.5 w-3.5 ${syncConfig?.clipboard && !syncConfig?.lowDataMode ? 'text-teal-400' : 'text-gray-500'}`} />
                <span>Clipboard</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Background copy watcher</p>
            </div>
            <button
              onClick={() => updateSyncConfig({ clipboard: !syncConfig?.clipboard })}
              disabled={syncConfig?.lowDataMode}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                syncConfig?.clipboard && !syncConfig?.lowDataMode
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 hover:bg-teal-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {syncConfig?.clipboard && !syncConfig?.lowDataMode ? 'SYNC ON' : 'PAUSED'}
            </button>
          </div>

          {/* Recordings */}
          <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
            syncConfig?.recordings && !syncConfig?.lowDataMode
              ? 'border-teal-500/40 bg-teal-950/20 text-slate-800 dark:text-slate-200'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400'
          }`}>
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Mic className={`h-3.5 w-3.5 ${syncConfig?.recordings && !syncConfig?.lowDataMode ? 'text-teal-400' : 'text-gray-500'}`} />
                <span>Recordings</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Audio vault auto-scan</p>
            </div>
            <button
              onClick={() => updateSyncConfig({ recordings: !syncConfig?.recordings })}
              disabled={syncConfig?.lowDataMode}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                syncConfig?.recordings && !syncConfig?.lowDataMode
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 hover:bg-teal-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {syncConfig?.recordings && !syncConfig?.lowDataMode ? 'SYNC ON' : 'PAUSED'}
            </button>
          </div>

          {/* Telemetry */}
          <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
            syncConfig?.telemetry && !syncConfig?.lowDataMode
              ? 'border-teal-500/40 bg-teal-950/20 text-slate-800 dark:text-slate-200'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400'
          }`}>
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Activity className={`h-3.5 w-3.5 ${syncConfig?.telemetry && !syncConfig?.lowDataMode ? 'text-teal-400' : 'text-gray-500'}`} />
                <span>Telemetry</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Battery, heat & WiFi stats</p>
            </div>
            <button
              onClick={() => updateSyncConfig({ telemetry: !syncConfig?.telemetry })}
              disabled={syncConfig?.lowDataMode}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                syncConfig?.telemetry && !syncConfig?.lowDataMode
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 hover:bg-teal-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {syncConfig?.telemetry && !syncConfig?.lowDataMode ? 'SYNC ON' : 'PAUSED'}
            </button>
          </div>

          {/* Quick Info Tile */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Shield className="h-3 w-3 text-teal-400" /> Remote Policy Active
            </span>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 font-mono">
              {syncConfig?.lowDataMode
                ? 'Standby Ping Mode (~95% Saved)'
                : `${Object.entries(syncConfig || {}).filter(([k, v]) => k !== 'lowDataMode' && k !== 'deviceId' && v === true).length}/7 channels syncing`}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Control Cards */}
      <div className={isMobile ? "flex flex-col gap-4 w-full" : "grid gap-4 grid-cols-1 lg:grid-cols-2"}>

        {/* PARENTAL CONTROLS, APP BLOCKER & SCREEN TIME LIMITS */}
        <div className={`rounded-2xl border border-purple-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-950 p-4 sm:p-5 shadow-xl flex flex-col justify-between ${isMobile ? '' : 'lg:col-span-2'} ${isCardVisible("safety", ["parental", "blocker", "screen time", "kids", "doomscrolling"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Parental Controls, App Blocker & Screen Time</h3>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      parentalControl?.enabled
                        ? 'bg-purple-950 border-purple-500 text-purple-300'
                        : 'bg-gray-800 border-gray-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {parentalControl?.enabled ? '🛡️ ENFORCED' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Prevent doomscrolling & protect kids: Block adult/social apps instantly & lock screen to only essential apps (Calls, WhatsApp, Camera) after time limit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => requestAppUsage()}
                  className="btn-interactive px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/40 transition-all cursor-pointer"
                >
                  🔄 Refresh Screen Time
                </button>
                <button
                  type="button"
                  onClick={() => updateParentalControl({ enabled: !parentalControl?.enabled })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md border ${
                    parentalControl?.enabled
                      ? 'bg-rose-600 hover:bg-rose-500 border-rose-500 text-white'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-indigo-400/40 text-white shadow-indigo-500/25'
                  }`}
                >
                  {parentalControl?.enabled ? 'Disable Protection' : 'Enable Protection'}
                </button>
              </div>
            </div>

            {/* Usage Access Permission Alert */}
            {appUsage && appUsage.hasPermission === false && (
              <div className="mb-4 p-3 rounded-lg bg-amber-950/40 border border-amber-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-200">
                    <strong>Usage Access required on phone:</strong> Android requires special "Usage Access" permission to track Digital Wellbeing &amp; screen time per app.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => sendQuickSetting('usage_access')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shrink-0 self-start sm:self-auto shadow transition"
                >
                  ⚙️ Open Usage Settings on Phone
                </button>
              </div>
            )}

            {/* Screen Time & Doomscrolling Guard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Today's Total Screen Time</span>
                  <Clock className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {Math.floor((appUsage?.totalScreenTimeMinutes || 0) / 60)}h {(appUsage?.totalScreenTimeMinutes || 0) % 60}m
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Daily Limit: <span className="text-purple-300 font-bold">{parentalControl?.screenTimeLimitMinutes || 0} mins</span> ({((parentalControl?.screenTimeLimitMinutes || 0) / 60).toFixed(1)} hrs)
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 lg:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  ⏳ Set Daily Screen Time Limit (Doomscrolling Cutoff)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[60, 120, 180, 240, 300].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setScreenTimeLimit(mins);
                        updateParentalControl({ screenTimeLimitMinutes: mins });
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                        (parentalControl?.screenTimeLimitMinutes || screenTimeLimit) === mins
                          ? 'bg-purple-600 border-purple-400 text-white shadow'
                          : 'bg-gray-800 border-gray-700 text-slate-500 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      {mins / 60} {mins === 60 ? 'Hour' : 'Hours'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setScreenTimeLimit(0);
                      updateParentalControl({ screenTimeLimitMinutes: 0 });
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                      (parentalControl?.screenTimeLimitMinutes || screenTimeLimit) === 0
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-gray-800 border-gray-700 text-slate-500 dark:text-slate-400 hover:text-white'
                    }`}
                  >
                    Unlimited
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                  When limit expires, Accessibility automatically closes all doomscrolling/gaming apps and permits only White-listed apps (Phone calls, WhatsApp, Camera, Gallery).
                </p>
              </div>
            </div>

            {/* Top Used Apps Today Breakdown */}
            {Array.isArray(appUsage?.apps) && appUsage.apps.length > 0 && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">📊 Today's App Usage Breakdown</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{appUsage.apps.length} apps active</span>
                </div>
                <div className={isMobile ? "flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 w-full" : "grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1"}>
                  {appUsage.apps.slice(0, 8).map((app, idx) => (
                    <div key={idx} className="p-2 rounded bg-gray-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{app.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono block truncate">{app.packageName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-purple-300 font-bold bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-800/40">
                          {app.foregroundMinutes}m
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const existing = Array.isArray(parentalControl?.blockedPackages) ? parentalControl.blockedPackages : [];
                            if (!existing.includes(app.packageName)) {
                              updateParentalControl({ blockedPackages: [...existing, app.packageName] });
                            }
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 transition"
                          title="Block this app"
                        >
                          + Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blocked Apps Manager */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                🚫 Block Specific Apps (Instantly closes app via Accessibility if opened by kid)
              </label>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Enter package name (e.g. com.zhiliaoapp.musically, com.instagram.android)..."
                  value={newBlockPkg}
                  onChange={(e) => setNewBlockPkg(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = newBlockPkg.trim();
                    if (!clean) return;
                    const existing = Array.isArray(parentalControl?.blockedPackages) ? parentalControl.blockedPackages : [];
                    const updated = Array.from(new Set([...existing, clean]));
                    updateParentalControl({ blockedPackages: updated });
                    setNewBlockPkg('');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors"
                >
                  Block App
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 py-0.5">Quick Block:</span>
                {[
                  { name: 'Instagram', pkg: 'com.instagram.android' },
                  { name: 'TikTok', pkg: 'com.zhiliaoapp.musically' },
                  { name: 'Snapchat', pkg: 'com.snapchat.android' },
                  { name: 'Free Fire / BGMI', pkg: 'com.dts.freefireth' },
                  { name: 'Chrome', pkg: 'com.android.chrome' }
                ].map((item) => (
                  <button
                    key={item.pkg}
                    type="button"
                    onClick={() => {
                      const existing = Array.isArray(parentalControl?.blockedPackages) ? parentalControl.blockedPackages : [];
                      const updated = Array.from(new Set([...existing, item.pkg]));
                      updateParentalControl({ blockedPackages: updated });
                    }}
                    className="px-2 py-0.5 rounded text-[10px] bg-gray-800 hover:bg-rose-950/60 hover:text-rose-300 border border-gray-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    + Block {item.name}
                  </button>
                ))}
              </div>

              {/* Blocked Apps Pills */}
              <div className="flex flex-wrap gap-2">
                {(parentalControl?.blockedPackages || []).length === 0 ? (
                  <span className="text-xs text-gray-500 italic">No apps currently blocked. Add above or use Quick Block.</span>
                ) : (
                  (parentalControl?.blockedPackages || []).map((pkg) => (
                    <span
                      key={pkg}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-rose-950/60 border border-rose-800 text-rose-300"
                    >
                      {pkg}
                      <button
                        type="button"
                        onClick={() => {
                          const existing = Array.isArray(parentalControl?.blockedPackages) ? parentalControl.blockedPackages : [];
                          const updated = existing.filter((p) => p !== pkg);
                          updateParentalControl({ blockedPackages: updated });
                        }}
                        className="hover:text-white font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LAYER 2: OVERLAY APP LOCK & ANTI-TAMPER GUARDIAN */}
        <div className={`md:col-span-2 rounded-2xl border border-sky-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-sky-950/20 dark:to-slate-950 p-5 shadow-xl flex flex-col justify-between ${isCardVisible("safety", ["overlay", "applock", "lock", "anti-uninstall", "tamper", "pin", "parental"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Layer 2: Overlay App Lock &amp; Anti-Tamper Shield</h3>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      parentalControl?.overlayAppLockEnabled
                        ? 'bg-sky-950 border-sky-500 text-sky-300'
                        : 'bg-gray-800 border-gray-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {parentalControl?.overlayAppLockEnabled ? '🔒 APP LOCK ACTIVE' : 'APP LOCK OFF'}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      parentalControl?.overlayAntiUninstallEnabled !== false
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-gray-800 border-gray-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {parentalControl?.overlayAntiUninstallEnabled !== false ? '🛡️ ANTI-TAMPER ACTIVE' : 'TAMPER OFF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <strong>Display Over Other Apps (SYSTEM_ALERT_WINDOW):</strong> Renders an impassable PIN lock screen over restricted apps and locks phone settings if someone tries to open App Info to uninstall PhoneLink Hub.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => sendQuickSetting('overlay_permission')}
                  className="btn-interactive px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border border-indigo-400/40 shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
                  title="Opens Android 'Display over other apps' screen on phone"
                >
                  ⚙️ Open Overlay Permission on Phone
                </button>

                <button
                  type="button"
                  onClick={() => updateParentalControl({ overlayAntiUninstallEnabled: !(parentalControl?.overlayAntiUninstallEnabled !== false) })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    parentalControl?.overlayAntiUninstallEnabled !== false
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {parentalControl?.overlayAntiUninstallEnabled !== false ? 'Anti-Tamper: ON' : 'Anti-Tamper: OFF'}
                </button>

                <button
                  type="button"
                  onClick={() => updateParentalControl({ overlayAppLockEnabled: !parentalControl?.overlayAppLockEnabled })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md border ${
                    parentalControl?.overlayAppLockEnabled
                      ? 'bg-rose-600 hover:bg-rose-500 border-rose-500 text-white'
                      : 'bg-sky-600 hover:bg-sky-500 border-sky-500 text-white'
                  }`}
                >
                  {parentalControl?.overlayAppLockEnabled ? 'Disable App Lock' : 'Enable App Lock'}
                </button>
              </div>
            </div>

            {/* Parent PIN Setup */}
            {/* Parent PIN & Re-lock Policy Setup */}
            <div className={isMobile ? "flex flex-col gap-3 mb-4 w-full" : "grid grid-cols-1 md:grid-cols-2 gap-3 mb-4"}>
              {/* PIN Box */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    🔑 Parent Unlock PIN
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {parentalControl?.hasAppLockPin ? '✓ Custom PIN is configured on device.' : 'Default PIN is: 1234. Change it below to secure lock screens.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="New 4-6 digit PIN"
                    value={newAppLockPin}
                    onChange={(e) => setNewAppLockPin(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-gray-500 text-center font-mono focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAppLockPin.length < 4) {
                        pushToast('PIN must be at least 4 digits', 'error');
                        return;
                      }
                      updateParentalControl({ overlayAppLockPin: newAppLockPin });
                      setNewAppLockPin('');
                      pushToast('Parent PIN updated successfully!', 'success');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Set PIN
                  </button>
                </div>
              </div>

              {/* Re-lock Frequency Policy Box */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    ⏱️ Re-lock Timing / Frequency
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose when locked apps ask for PIN again after being opened once.
                  </p>
                </div>
                <div className="mt-3">
                  <select
                    value={parentalControl?.overlayRelockTimeout ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateParentalControl({ overlayRelockTimeout: val });
                      pushToast(`Re-lock policy updated: ${e.target.options[e.target.selectedIndex].text}`, 'success');
                    }}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-slate-200 font-medium focus:border-sky-500 focus:outline-none cursor-pointer"
                  >
                    <option value={0}>⚡ Immediately when app is closed / switched (Strict)</option>
                    <option value={-1}>📱 When phone screen turns off (Screen Lock)</option>
                    <option value={60}>⏱️ After 1 minute</option>
                    <option value={300}>⏱️ After 5 minutes</option>
                    <option value={900}>⏱️ After 15 minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Overlay Locked Apps Manager */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                🔒 Overlay App Lock List (Draws an impassable PIN keypad over these apps when opened)
              </label>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Enter package name (e.g. com.instagram.android, com.google.android.youtube)..."
                  value={newOverlayPkg}
                  onChange={(e) => setNewOverlayPkg(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = newOverlayPkg.trim();
                    if (!clean) return;
                    const existing = Array.isArray(parentalControl?.overlayLockedPackages) ? parentalControl.overlayLockedPackages : [];
                    const updated = Array.from(new Set([...existing, clean]));
                    updateParentalControl({ overlayLockedPackages: updated });
                    setNewOverlayPkg('');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-colors"
                >
                  Lock App
                </button>
              </div>

              {/* Quick Lock Presets */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 py-0.5">Quick Lock:</span>
                {[
                  { name: 'Instagram', pkg: 'com.instagram.android' },
                  { name: 'YouTube', pkg: 'com.google.android.youtube' },
                  { name: 'Snapchat', pkg: 'com.snapchat.android' },
                  { name: 'Free Fire / BGMI', pkg: 'com.dts.freefireth' },
                  { name: 'TikTok', pkg: 'com.zhiliaoapp.musically' },
                  { name: 'Chrome', pkg: 'com.android.chrome' }
                ].map((item) => (
                  <button
                    key={item.pkg}
                    type="button"
                    onClick={() => {
                      const existing = Array.isArray(parentalControl?.overlayLockedPackages) ? parentalControl.overlayLockedPackages : [];
                      const updated = Array.from(new Set([...existing, item.pkg]));
                      updateParentalControl({ overlayLockedPackages: updated });
                    }}
                    className="px-2 py-0.5 rounded text-[10px] bg-gray-800 hover:bg-sky-950/60 hover:text-sky-300 border border-gray-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    + Lock {item.name}
                  </button>
                ))}
              </div>

              {/* Locked Apps Chips */}
              <div className="flex flex-wrap gap-2">
                {(parentalControl?.overlayLockedPackages || []).length === 0 ? (
                  <span className="text-xs text-gray-500 italic">No apps currently locked with overlay. Add package above or tap Quick Lock.</span>
                ) : (
                  (parentalControl?.overlayLockedPackages || []).map((pkg) => (
                    <span
                      key={pkg}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-sky-950/60 border border-sky-800 text-sky-300"
                    >
                      🔒 {pkg}
                      <button
                        type="button"
                        onClick={() => {
                          const existing = Array.isArray(parentalControl?.overlayLockedPackages) ? parentalControl.overlayLockedPackages : [];
                          const updated = existing.filter((p) => p !== pkg);
                          updateParentalControl({ overlayLockedPackages: updated });
                        }}
                        className="hover:text-white font-bold"
                        title="Remove lock"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 1. ADVANCED BATTERY HEALTH, CUTOFF & OVERHEAT GUARD */}
        <div className={`rounded-2xl border border-emerald-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-950 p-5 shadow-xl flex flex-col justify-between ${isCardVisible("hardware", ["battery", "overheat", "cutoff", "charging", "temperature", "thermal"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  <BatteryCharging className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Battery Cutoff & Overheat Guard</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">90% charge alarm & 45°C thermal protect</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                batteryConfig?.batteryAlertsEnabled !== false
                  ? 'border-emerald-300 dark:border-emerald-500/60 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : 'border-slate-300 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400'
              }`}>
                {batteryConfig?.batteryAlertsEnabled !== false ? 'GUARD ACTIVE' : 'MUTED'}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Max Charge Cutoff</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Triggers alarm when reached</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="70"
                    max="100"
                    value={batteryCutoffInput}
                    onChange={(e) => setBatteryCutoffInput(Number(e.target.value))}
                    className="w-14 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white text-center font-mono font-bold shadow-inner"
                  />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">%</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Thermal Warning</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Overheat alert threshold</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="35"
                    max="60"
                    value={batteryTempLimitInput}
                    onChange={(e) => setBatteryTempLimitInput(Number(e.target.value))}
                    className="w-14 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white text-center font-mono font-bold shadow-inner"
                  />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">°C</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800/60 font-mono">
              <span>{activeDevice?.isCharging ? '⚡ Charging' : 'Discharging'}</span>
              <span>{activeDevice?.temperatureC ? `${activeDevice.temperatureC}°C` : 'Normal Temp'}</span>
              <span>Health: {activeDevice?.health || 'Good'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateBatteryConfig({
                batteryAlertsEnabled: batteryConfig?.batteryAlertsEnabled === false ? true : false,
                batteryMaxLevelCutoff: batteryCutoffInput,
                batteryOverheatTempThreshold: batteryTempLimitInput
              })}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                batteryConfig?.batteryAlertsEnabled !== false
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                  : 'border-slate-300 dark:border-gray-700 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {batteryConfig?.batteryAlertsEnabled !== false ? '✓ Guard Enabled' : 'Enable Guard'}
            </button>
            <button
              type="button"
              onClick={() => updateBatteryConfig({
                batteryAlertsEnabled: true,
                batteryMaxLevelCutoff: batteryCutoffInput,
                batteryOverheatTempThreshold: batteryTempLimitInput
              })}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>

        {/* 5. CAMERA AUTO-TIMELAPSE SECURITY GUARD */}
        <div className={`rounded-2xl border border-blue-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-950 p-5 shadow-xl flex flex-col justify-between ${isCardVisible("surveillance", ["timelapse", "camera", "security", "guard", "snapshot", "interval"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Camera Auto-Timelapse Guard</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Periodic silent background photo sync</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                autoTimelapse?.enabled
                  ? 'border-blue-500/60 bg-blue-950 text-blue-300'
                  : 'border-gray-700 bg-gray-800 text-slate-500 dark:text-slate-400'
              }`}>
                {autoTimelapse?.enabled ? 'TIMELAPSE ACTIVE' : 'PAUSED'}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Capture Frequency</label>
                <select
                  value={timelapseIntervalInput}
                  onChange={(e) => setTimelapseIntervalInput(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                >
                  <option value={1}>Every 1 min</option>
                  <option value={2}>Every 2 mins</option>
                  <option value={5}>Every 5 mins</option>
                  <option value={10}>Every 10 mins</option>
                  <option value={30}>Every 30 mins</option>
                </select>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Camera Lens</label>
                <select
                  value={timelapseFacingInput}
                  onChange={(e) => setTimelapseFacingInput(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                >
                  <option value="back">Rear Camera</option>
                  <option value="front">Front Camera</option>
                </select>
              </div>
            </div>

            {latestTimelapse && (
              <div className="mb-4 p-2.5 bg-slate-50 dark:bg-slate-950/90 rounded-lg border border-blue-500/30 flex items-center gap-3">
                <div
                  className="relative group cursor-pointer flex-shrink-0"
                  onClick={() => {
                    setSelectedTimelapsePhoto({ data: latestTimelapse, timestamp: Date.now() });
                    setShowTimelapseModal(true);
                  }}
                  title="Click to view full photo"
                >
                  <img
                    src={`data:image/jpeg;base64,${latestTimelapse}`}
                    alt="Latest Timelapse"
                    className="h-14 w-20 object-cover rounded border border-gray-700 group-hover:border-blue-400 transition"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition">
                    <Maximize2 className="h-4 w-4 text-white drop-shadow" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-slate-800 dark:text-slate-200 font-semibold block">Latest Security Frame</span>
                  <span className="text-[10px] text-blue-400 font-mono block">Silent background snapshot</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTimelapsePhoto({ data: latestTimelapse, timestamp: Date.now() });
                        setShowTimelapseModal(true);
                      }}
                      className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> View Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTimelapsePhoto(latestTimelapse)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-gray-600 text-[10px] font-semibold flex items-center gap-1"
                      title="Download photo to PC"
                    >
                      <Download className="h-3 w-3" /> Save / Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {timelapseGallery && timelapseGallery.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    Snapshot History ({timelapseGallery.length} saved)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTimelapsePhoto(timelapseGallery[0]);
                      setShowTimelapseModal(true);
                    }}
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <Eye className="h-2.5 w-2.5" /> View Gallery
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {timelapseGallery.slice(0, 8).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => {
                        setSelectedTimelapsePhoto(item);
                        setShowTimelapseModal(true);
                      }}
                      className="relative flex-shrink-0 cursor-pointer rounded border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 overflow-hidden transition group"
                      title={new Date(item.timestamp).toLocaleTimeString()}
                    >
                      <img
                        src={`data:image/jpeg;base64,${item.data}`}
                        alt={`Snapshot ${idx}`}
                        className="h-10 w-14 object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] text-slate-700 dark:text-slate-300 text-center font-mono py-0.5 truncate">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => updateAutoTimelapse({
              enabled: !autoTimelapse?.enabled,
              intervalMins: timelapseIntervalInput,
              facing: timelapseFacingInput
            })}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
              autoTimelapse?.enabled
                ? 'border-blue-500/50 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                : 'border-slate-300 dark:border-gray-700 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {autoTimelapse?.enabled ? '⏹ Stop Timelapse Guard' : '▶ Start Auto-Timelapse Guard'}
          </button>
        </div>

        {/* 8. GEOFENCING & BOUNDARY ALERTS */}
        <div className={`rounded-2xl border border-amber-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-amber-950/20 dark:to-slate-950 p-5 shadow-xl flex flex-col justify-between ${isCardVisible("safety", ["geofencing", "boundary", "gps", "location", "safe zone", "radius"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Geofencing & Boundary Alerts</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Instant alert when phone leaves safe area</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                geofence?.enabled
                  ? 'border-amber-500/60 bg-amber-950 text-amber-300'
                  : 'border-slate-300 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400'
              }`}>
                {geofence?.enabled ? 'BOUNDARY ARMED' : 'OFF'}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0">Zone Name</span>
                <input
                  type="text"
                  value={geofenceNameInput}
                  onChange={(e) => setGeofenceNameInput(e.target.value)}
                  placeholder="e.g. Home, School"
                  className="w-36 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 text-right focus:outline-none"
                />
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Safety Radius</span>
                <select
                  value={geofenceRadiusInput}
                  onChange={(e) => setGeofenceRadiusInput(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                >
                  <option value={100}>100m (Tight)</option>
                  <option value={300}>300m (Standard)</option>
                  <option value={500}>500m (Area)</option>
                  <option value={1000}>1 km (City)</option>
                  <option value={3000}>3 km (Wide)</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <button
                type="button"
                onClick={() => {
                  const locs = locations?.[activeDeviceId] || [];
                  const latestFix = locs[locs.length - 1];
                  if (latestFix?.latitude && latestFix?.longitude) {
                    updateGeofence({
                      enabled: true,
                      latitude: latestFix.latitude,
                      longitude: latestFix.longitude,
                      radiusMeters: geofenceRadiusInput,
                      name: geofenceNameInput
                    });
                    pushToast(`📍 Geofence center set to current phone GPS`, 'success');
                  } else {
                    pushToast('No current location available. Request location first.', 'error');
                  }
                }}
                className="btn-interactive w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-gray-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                Set Current GPS as Center
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateGeofence({
              enabled: !geofence?.enabled,
              radiusMeters: geofenceRadiusInput,
              name: geofenceNameInput
            })}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
              geofence?.enabled
                ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                : 'border-slate-300 dark:border-gray-700 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {geofence?.enabled ? '🛡️ Geofence Active (Click to Disarm)' : 'Arm Geofence Boundary Alert'}
          </button>
        </div>

        {/* 9. SMART NOTIFICATION AUTO-REPLY */}
        <div className={`rounded-2xl border border-cyan-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-cyan-950/20 dark:to-slate-950 p-5 shadow-xl flex flex-col justify-between ${isCardVisible("automation", ["auto-reply", "reply", "notifications", "whatsapp", "sms"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Smart Notification Auto-Reply</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Auto-respond to WhatsApp, SMS & Messages</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                autoReply?.enabled
                  ? 'border-cyan-500/60 bg-cyan-950 text-cyan-300'
                  : 'border-slate-300 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400'
              }`}>
                {autoReply?.enabled ? 'AUTO-RESPOND ON' : 'OFF'}
              </span>
            </div>

            <div className="mb-3">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Auto-Reply Message Text</label>
              <textarea
                rows={2}
                value={autoReplyMsgInput}
                onChange={(e) => setAutoReplyMsgInput(e.target.value)}
                placeholder="Message sent automatically to incoming messages..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 py-0.5">Supported:</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold">WhatsApp</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-semibold">Google Messages</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-semibold">SMS / MMS</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateAutoReply({
                enabled: !autoReply?.enabled,
                message: autoReplyMsgInput,
                packages: ['com.whatsapp', 'com.google.android.apps.messaging', 'com.android.mms']
              })}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                autoReply?.enabled
                  ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                  : 'border-slate-300 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {autoReply?.enabled ? '✓ Auto-Responder Active' : 'Enable Auto-Reply'}
            </button>
            <button
              type="button"
              onClick={() => updateAutoReply({
                enabled: true,
                message: autoReplyMsgInput,
                packages: ['com.whatsapp', 'com.google.android.apps.messaging', 'com.android.mms']
              })}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Save Text
            </button>
          </div>
        </div>

        {/* 4. NETWORK DATA USAGE TRACKER */}
        <div className={`rounded-2xl border border-indigo-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-950 p-4 sm:p-5 shadow-xl flex flex-col justify-between ${isCardVisible("automation", ["network", "data usage", "traffic", "wifi", "cellular"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
                  <Wifi className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Network Data Usage Tracker</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Per-app mobile vs Wi-Fi consumption</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => requestNetworkUsage()}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-gray-700 transition-colors cursor-pointer"
              >
                🔄 Refresh
              </button>
            </div>

            <div className={isMobile ? "flex flex-col gap-2 mb-3 w-full" : "grid grid-cols-3 gap-2 mb-3 text-center"}>
              <div className={`p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 ${isMobile ? 'flex items-center justify-between' : ''}`}>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Total Network Data</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {((networkUsage?.summary?.totalBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
              <div className={`p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 ${isMobile ? 'flex items-center justify-between' : ''}`}>
                <span className="text-[11px] text-emerald-500 block font-medium">Mobile Cellular Data</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {((networkUsage?.summary?.mobileBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
              <div className={`p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 ${isMobile ? 'flex items-center justify-between' : ''}`}>
                <span className="text-[11px] text-cyan-500 block font-medium">Wi-Fi Data</span>
                <span className="text-xs font-bold text-cyan-400 font-mono">
                  {((networkUsage?.summary?.wifiBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
              {(networkUsage?.apps || []).slice(0, 5).map((app) => (
                <div key={app.packageName} className="flex items-center justify-between p-2 bg-slate-50/80 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800/80 text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{app.appName || app.packageName}</span>
                    <span className="text-[10px] text-gray-500 font-mono truncate block">{app.packageName}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-400 shrink-0">
                    {((app.totalBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              ))}
              {(!networkUsage?.apps || networkUsage.apps.length === 0) && (
                <div className="text-center py-3 text-xs text-gray-500 italic">
                  Click 'Refresh' to inspect per-app data usage from device.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 10. SCHEDULED REMOTE COMMANDS */}
        <div className={`rounded-2xl border border-rose-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-rose-950/20 dark:to-slate-950 p-4 sm:p-5 shadow-xl flex flex-col justify-between ${isCardVisible("automation", ["scheduled", "cron", "timer", "commands", "remote schedule"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Scheduled Remote Commands</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Trigger actions at a future time</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Action</span>
                <select
                  value={schedCommand}
                  onChange={(e) => setSchedCommand(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                >
                  <option value="LOCK_COMMAND">Screen Lock</option>
                  <option value="FIND_PHONE_COMMAND">Loud Alarm</option>
                  <option value="TORCH_COMMAND">Toggle Torch</option>
                  <option value="DND_SET_COMMAND">Enable DND Mode</option>
                </select>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Execute In</span>
                <select
                  value={schedMinutes}
                  onChange={(e) => setSchedMinutes(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                >
                  <option value={5}>5 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const triggerTimeMs = Date.now() + schedMinutes * 60_000;
                manageSchedule('add', {
                  id: String(Date.now()),
                  triggerTimeMs,
                  commandEvent: schedCommand,
                  payload: schedCommand === 'DND_SET_COMMAND' ? { mode: 'PRIORITY' } : {}
                });
                pushToast(`⏰ Scheduled ${schedCommand} in ${schedMinutes} minutes`, 'success');
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow mb-3"
            >
              + Schedule Remote Command
            </button>

            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
              {(scheduledList || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950/80 rounded border border-slate-200/80 dark:border-slate-800 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.commandEvent}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Due in: {Math.max(1, Math.round((item.triggerTimeMs - Date.now()) / 60_000))} mins
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => manageSchedule('cancel', { id: item.id })}
                    className="px-2 py-0.5 rounded text-[11px] bg-gray-800 hover:bg-rose-950 text-rose-300 border border-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ))}
              {(scheduledList || []).length === 0 && (
                <span className="text-xs text-gray-500 italic block text-center py-2">No active scheduled commands pending.</span>
              )}
            </div>
          </div>
        </div>

        {/* 11. HARDWARE VOLUME BUTTON SOS */}
        <div className={`rounded-2xl border border-red-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-red-950/20 dark:to-slate-950 p-5 shadow-xl flex flex-col justify-between ${isCardVisible("safety", ["sos", "volume button", "panic", "emergency"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Volume Button 5x SOS Alert</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Hardware key distress trigger + live GPS</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                volumeSos?.enabled !== false
                  ? 'border-red-500/60 bg-red-950 text-red-300'
                  : 'border-gray-700 bg-gray-800 text-slate-500 dark:text-slate-400'
              }`}>
                {volumeSos?.enabled !== false ? 'SOS ARMED' : 'DISABLED'}
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-950/70 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 leading-relaxed">
              Pressing the physical phone <strong>Volume UP / DOWN key 5 times</strong> quickly triggers a silent emergency distress beacon. The phone immediately uploads live GPS coordinates, battery level and notifies this dashboard!
            </p>
          </div>

          <button
            type="button"
            onClick={() => updateVolumeSos(volumeSos?.enabled === false ? true : false)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
              volumeSos?.enabled !== false
                ? 'border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'border-indigo-400/40 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25'
            }`}
          >
            {volumeSos?.enabled !== false ? '✓ Volume SOS Key Listening (Click to Disable)' : 'Enable Volume SOS Key Listening'}
          </button>
        </div>

        {/* 12. AUTOMATIC PHONE CALL RECORDING */}
        <div className={`rounded-2xl border border-teal-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-teal-950/20 dark:to-slate-950 p-5 shadow-xl flex flex-col justify-between ${isCardVisible("surveillance", ["call recording", "recorder", "phone call", "audio"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-400">
                  <Mic className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Automatic Phone Call Recording</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Background call audio record & vault save</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                callRecording?.enabled
                  ? 'border-teal-500/60 bg-teal-950 text-teal-300'
                  : 'border-gray-700 bg-gray-800 text-slate-500 dark:text-slate-400'
              }`}>
                {callRecording?.enabled ? 'AUTO RECORDING ON' : 'DISABLED'}
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-950/70 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 leading-relaxed">
              When enabled, incoming and outgoing phone calls are recorded in high-fidelity AAC format and saved into the phone's call vault.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateCallRecording(!callRecording?.enabled)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                callRecording?.enabled
                  ? 'border-teal-500/50 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30'
                  : 'border-indigo-400/40 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25'
              }`}
            >
              {callRecording?.enabled ? '✓ Auto-Record Active' : 'Enable Call Recording'}
            </button>
            <button
              type="button"
              onClick={() => openCallRecordingsVault()}
              className="btn-interactive py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              🎙️ Open Vault
            </button>
          </div>
        </div>

        {/* KIDS SAFETY & IOS CALCULATOR CAMOUFLAGE */}
        <div className={`rounded-2xl border border-amber-500/50 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-amber-950/20 dark:to-slate-950 p-5 shadow-xl flex flex-col justify-between ${isCardVisible("safety", ["calculator", "camouflage", "kids safety", "launcher", "pixel safe", "stealth"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Kids Safety &amp; iOS Calculator Camouflage</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Stealth app disguise, invisible notification &amp; anti-tamper</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                camouflage?.hideAppIcon
                  ? 'border-purple-300 dark:border-purple-500/60 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                  : camouflage?.filesDisguise
                  ? 'border-sky-300 dark:border-sky-500/60 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                  : camouflage?.calculatorDisguise
                  ? 'border-amber-300 dark:border-amber-500/60 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  : 'border-slate-300 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400'
              }`}>
                {camouflage?.hideAppIcon ? '👻 ICON HIDDEN' : camouflage?.filesDisguise ? '📁 FILES ACTIVE' : camouflage?.calculatorDisguise ? '🧮 CALCULATOR ACTIVE' : 'STANDARD ICON'}
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-950/70 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 leading-relaxed">
              When Camouflage is active, the app disguise changes to <strong>"Google Files"</strong>, <strong>"iOS Calculator"</strong>, or is completely hidden from the home screen &amp; app drawer.
              <br />
              <strong>Ways to reopen settings:</strong> Secret dialer code <strong>*#*#74663#*#*</strong> ("PHONE") or <strong>*#74663#</strong> or <strong>*9211</strong>, or use the <strong>Open On Device</strong> button at the top of this dashboard, or browse to <strong>phonelink://open</strong> in Chrome.
            </p>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold block">Disguise as Google Files</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Changes icon to Files. Clicking opens phone's real File Manager. Secret dial: *#*#74663#*#*</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateCamouflage({
                    filesDisguise: !camouflage?.filesDisguise,
                    stealthMode: camouflage?.filesDisguise ? 'NORMAL' : 'FILES'
                  })}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    camouflage?.filesDisguise
                      ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-700'
                  }`}
                >
                  {camouflage?.filesDisguise ? 'ENABLED' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold block">Disguise as iOS Calculator</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Changes launcher icon to Calculator &amp; opens real calculator</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateCamouflage({
                    calculatorDisguise: !camouflage?.calculatorDisguise,
                    stealthMode: camouflage?.calculatorDisguise ? 'NORMAL' : 'CALCULATOR'
                  })}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    camouflage?.calculatorDisguise
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-700'
                  }`}
                >
                  {camouflage?.calculatorDisguise ? 'ENABLED' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold block">Hide App Icon Completely</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Vanishes from home screen &amp; drawer. Unhide remotely here, dial *9211, or open phonelink://open</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateCamouflage({
                    hideIcon: !camouflage?.hideAppIcon,
                    stealthMode: camouflage?.hideAppIcon ? 'NORMAL' : 'HIDDEN'
                  })}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    camouflage?.hideAppIcon
                      ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-700'
                  }`}
                >
                  {camouflage?.hideAppIcon ? 'HIDDEN' : 'VISIBLE'}
                </button>
              </div>

              {/* Notification Peel Template Selector */}
              <div className="bg-slate-50/80 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold block">Disguised Notification Template</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Choose what kids see in their Android notification bar</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 font-bold">
                    {camouflage?.notificationTemplate || 'WEATHER_CLOCK'}
                  </span>
                </div>

                <div className={isMobile ? "flex flex-col gap-1.5 pt-1 w-full" : "grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1"}>
                  {[
                    { id: 'WEATHER_CLOCK', label: '⛅ Weather & Clock', desc: 'Live temp & time' },
                    { id: 'WEATHER_ONLY', label: '🌦️ Weather Only', desc: 'Forecast & radar' },
                    { id: 'CLOCK_ONLY', label: '🕒 Digital Clock', desc: 'Accurate timekeeper' },
                    { id: 'SHINCHAN', label: '⚡ Shinchan Radar', desc: 'Action Kamen club' },
                    { id: 'THINKING', label: '💡 Wisdom Quotes', desc: 'Mindful motivation' },
                    { id: 'CUSTOM', label: '✏️ Custom Text', desc: 'Your own wording' },
                  ].map((tpl) => {
                    const isSelected = (camouflage?.notificationTemplate || 'WEATHER_CLOCK') === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => updateCamouflage({ notificationTemplate: tpl.id })}
                        className={`p-2 rounded-lg text-left transition border cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/15 border-blue-500/60 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-[11px] leading-tight font-semibold">{tpl.label}</div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{tpl.desc}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Custom Notification Title &amp; Text:</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Title (e.g. Daily Schedule)"
                      value={customNotifTitleInput}
                      onChange={(e) => setCustomNotifTitleInput(e.target.value)}
                      className="flex-1 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Text (e.g. Study Session in progress)"
                      value={customNotifTextInput}
                      onChange={(e) => setCustomNotifTextInput(e.target.value)}
                      className="flex-1 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updateCamouflage({
                          notificationTemplate: 'CUSTOM',
                          customTitle: customNotifTitleInput,
                          customText: customNotifTextInput
                        });
                        pushToast('Custom notification capsule saved to phone!', 'success');
                      }}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer transition whitespace-nowrap"
                    >
                      Apply Custom Text
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold block">Anti-Uninstall Settings Shield</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Accessibility automatically kicks kid to Home if they open App Info / Uninstall</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateCamouflage({
                    antiTamper: camouflage?.antiTamper === false ? true : false
                  })}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    camouflage?.antiTamper !== false
                      ? 'bg-rose-100 dark:bg-red-500/20 text-rose-800 dark:text-red-300 border border-rose-300 dark:border-red-500/40'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-700'
                  }`}
                >
                  {camouflage?.antiTamper !== false ? 'PROTECTED' : 'OFF'}
                </button>
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold block">Secret Parent Unlock PIN</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Type this number on calculator and press = to unlock</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={8}
                    value={disguisePinInput}
                    onChange={(e) => setDisguisePinInput(e.target.value)}
                    placeholder="9211"
                    className="w-20 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 rounded px-2.5 py-1 text-xs text-center text-slate-900 dark:text-white font-mono shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (disguisePinInput.length < 4) {
                        pushToast('PIN must be at least 4 digits', 'error');
                        return;
                      }
                      updateCamouflage({ ownerPin: disguisePinInput });
                      pushToast('Secret Parent PIN updated on phone!', 'success');
                    }}
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs cursor-pointer transition"
                  >
                    Set PIN
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => updateCamouflage({
                calculatorDisguise: !camouflage?.calculatorDisguise,
                stealthNotification: true,
                antiTamper: true
              })}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                camouflage?.calculatorDisguise
                  ? 'border-amber-400 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30'
                  : 'border-indigo-400/50 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20'
              }`}
            >
              {camouflage?.calculatorDisguise ? '✓ Full Camouflage Active' : '🧮 Activate iOS Calculator Camouflage'}
            </button>

            <div className={isMobile ? "flex flex-col gap-2 pt-1 w-full" : "grid grid-cols-2 gap-2 pt-1"}>
              <button
                type="button"
                onClick={() => {
                  sendQuickSetting('pin_widget');
                  pushToast('Clock Widget Pinning request sent to phone!', 'info');
                }}
                className="w-full py-2.5 px-3 rounded-lg border border-cyan-200 dark:border-gray-700 bg-cyan-50 dark:bg-gray-800/80 hover:bg-cyan-100 dark:hover:bg-gray-700 text-cyan-800 dark:text-cyan-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Send 1-tap request to add Live Clock Widget to phone home screen"
              >
                <span>📌 Pin Clock Widget</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sendQuickSetting('notification_settings');
                  pushToast('Opened Notification Settings on phone', 'info');
                }}
                className="w-full py-2.5 px-3 rounded-lg border border-amber-200 dark:border-gray-700 bg-amber-50 dark:bg-gray-800/80 hover:bg-amber-100 dark:hover:bg-gray-700 text-amber-800 dark:text-amber-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Open app notification settings on phone to silence or hide"
              >
                <span>🔔 Mute/Hide Notification</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                sendQuickSetting('home_settings');
                pushToast('Opened Home Launcher Settings on phone', 'info');
              }}
              className="w-full py-2 px-2.5 rounded-lg border border-slate-300 dark:border-cyan-500/40 bg-slate-100 dark:bg-cyan-950/20 hover:bg-slate-200 dark:hover:bg-cyan-900/30 text-slate-700 dark:text-cyan-300 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 mt-1 cursor-pointer"
              title="Open phone settings to set Pixel Safe Launcher as default Home"
            >
              <span>🏠 Set Pixel Safe Launcher as Default Home</span>
            </button>
          </div>
        </div>

        {/* DEVICE STORAGE ANALYZER CARD */}
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-cyan-500/40 p-5 shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${isCardVisible("hardware", ["storage", "disk", "space", "analyzer", "memory"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <HardDrive className="h-4 w-4 text-cyan-500" /> Device Storage Analyzer
              </h3>
              <button
                type="button"
                onClick={requestStorageAnalysis}
                className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/20 cursor-pointer shadow-xs"
              >
                <RefreshCw className="h-3 w-3" /> Analyze Storage
              </button>
            </div>

            {storageAnalysis ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total Internal Storage:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {((storageAnalysis.totalBytes || 0) / (1024 * 1024 * 1024)).toFixed(1)} GB
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden flex">
                  <div
                    className="bg-cyan-500 h-2.5 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((storageAnalysis.usedBytes || 0) / (storageAnalysis.totalBytes || 1)) * 100))}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Used: {((storageAnalysis.usedBytes || 0) / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                  <span>Free: {((storageAnalysis.freeBytes || 0) / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                </div>

                <div className={isMobile ? "flex flex-col gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs w-full" : "grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px]"}>
                  <div className={`p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 ${isMobile ? 'flex items-center justify-between' : ''}`}>
                    <span className="text-slate-500 block">Photos / Images</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {((storageAnalysis.imagesBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 ${isMobile ? 'flex items-center justify-between' : ''}`}>
                    <span className="text-slate-500 block">Videos &amp; Movies</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {((storageAnalysis.videosBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 ${isMobile ? 'flex items-center justify-between' : ''}`}>
                    <span className="text-slate-500 block">Audio &amp; Calls</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {((storageAnalysis.audioBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 ${isMobile ? 'flex items-center justify-between' : ''}`}>
                    <span className="text-slate-500 block">Docs &amp; Downloads</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {((storageAnalysis.docsBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
                Click <strong>Analyze Storage</strong> to inspect photos, videos, recordings, and free disk space.
              </div>
            )}
          </div>
        </div>

        {/* CUSTOM LOCK SCREEN REMINDER MESSAGE CARD */}
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${isCardVisible("safety", ["lockscreen", "message", "reminder", "screen", "banner", "note"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-indigo-500" /> Lock Screen Parental Note
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Display a persistent contact banner or urgent reminder note on the child's lock screen.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={lockScreenNote}
                onChange={(e) => setLockScreenNote(e.target.value)}
                placeholder="e.g. Call Mum immediately on +91 9876543210"
                className="w-full rounded-xl bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 shadow-xs"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!lockScreenNote.trim()) {
                    pushToast('Please enter a note to display', 'error');
                    return;
                  }
                  const res = await sendCommand('lock-screen-message', {
                    deviceId: activeDeviceId,
                    message: lockScreenNote.trim()
                  });
                  if (res && res.success) {
                    pushToast('Lock screen note posted on phone', 'success');
                  } else {
                    pushToast(`Failed to update note: ${res?.error || 'phone offline'}`, 'error');
                  }
                }}
                className="w-full btn-interactive py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 cursor-pointer"
              >
                Display on Child Lock Screen
              </button>
            </div>
          </div>
        </div>

        {/* REMOTE ACCESS & PORT FORWARDING CARD */}
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("safety", ["tunnel", "ngrok", "cloud", "remote", "wan", "parental", "network", "port"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-indigo-400" /> Remote Access &amp; Port Forwarding
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-semibold">
                4G/5G Cellular Guide
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Connect and monitor your child's phone even when outside Wi-Fi coverage on mobile data. View step-by-step instructions for <strong>Cloudflare Free Tunnel</strong>, <strong>ngrok CLI</strong>, or <strong>Router Port Forwarding</strong>.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                <span>Local Server Port: 5000</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                For complete offline instructions, read <code className="text-indigo-500 font-mono">PORT_FORWARDING_GUIDE.md</code>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-remote-guide-modal'))}
            className="w-full btn-interactive py-2.5 px-4 rounded-xl text-xs font-bold transition border border-indigo-500/40 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Open Remote Setup Guide</span>
          </button>
        </div>

        {/* PHONE HARDWARE & QUICK SETTINGS CONTROLS CARD */}
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("hardware", ["hardware", "quick settings", "wifi", "bluetooth", "hotspot", "torch", "ringer", "toggles"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Sliders className="h-4 w-4 text-cyan-400" /> Phone Hardware &amp; Quick Settings
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => sendQuickSetting('status')}
                  className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-white hover:bg-gray-800 transition"
                  title="Refresh Quick Settings status"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Remote hardware toggles &amp; quick setting panels (Wi-Fi, Bluetooth, Hotspot, Auto-Rotate, Torch, DND, Ringer &amp; Status Shade).
            </p>

            <div className={isMobile ? "flex flex-col gap-2 mb-3 w-full" : "grid grid-cols-2 gap-2.5 mb-3"}>
              {/* Wi-Fi Control */}
              <button
                type="button"
                onClick={() => sendQuickSetting('wifi', { enable: !quickSettings?.wifiEnabled })}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition w-full ${
                  quickSettings?.wifiEnabled
                    ? 'border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-300'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-cyan-400/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg ${quickSettings?.wifiEnabled ? 'bg-cyan-500/20 text-cyan-500 dark:text-cyan-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Wifi className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Wi-Fi Connection</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Toggle remote Wi-Fi adapter</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold border ${
                  quickSettings?.wifiEnabled
                    ? 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}>
                  {quickSettings?.wifiEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Hotspot / Tethering */}
              <button
                type="button"
                onClick={() => sendQuickSetting('hotspot', { enable: !quickSettings?.hotspotEnabled })}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition w-full ${
                  quickSettings?.hotspotEnabled
                    ? 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-amber-400/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg ${quickSettings?.hotspotEnabled ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Signal className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Portable Hotspot</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Share mobile data tethering</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold border ${
                  quickSettings?.hotspotEnabled
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}>
                  {quickSettings?.hotspotEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Auto-Rotate */}
              <button
                type="button"
                onClick={() => sendQuickSetting('auto_rotate')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition w-full ${
                  quickSettings?.autoRotate
                    ? 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-emerald-400/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg ${quickSettings?.autoRotate ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <RotateCw className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Screen Auto-Rotate</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Orientation sensor lock</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold border ${
                  quickSettings?.autoRotate
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}>
                  {quickSettings?.autoRotate ? 'ON' : 'LOCKED'}
                </span>
              </button>

              {/* Flashlight / Torch */}
              <button
                type="button"
                onClick={() => sendQuickSetting('torch')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition w-full ${
                  quickSettings?.torchOn || torchOn
                    ? 'border-amber-500/40 bg-amber-500/10 dark:bg-yellow-950/20 text-amber-700 dark:text-yellow-300'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-amber-400/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg ${quickSettings?.torchOn || torchOn ? 'bg-amber-500/20 text-amber-500 dark:text-yellow-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Rear Flashlight Torch</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">High intensity camera LED</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold border ${
                  quickSettings?.torchOn || torchOn
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}>
                  {quickSettings?.torchOn || torchOn ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Do Not Disturb */}
              <button
                type="button"
                onClick={() => sendQuickSetting('dnd')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition w-full ${
                  quickSettings?.dndActive || dndStatus
                    ? 'border-purple-500/40 bg-purple-500/10 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-purple-400/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg ${quickSettings?.dndActive || dndStatus ? 'bg-purple-500/20 text-purple-500 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <BellOff className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Do Not Disturb (DND)</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">Silence incoming notifications</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold border ${
                  quickSettings?.dndActive || dndStatus
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}>
                  {quickSettings?.dndActive || dndStatus ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Quick Settings Shade & Notifications Shade Pulldown */}
            <div className={isMobile ? "flex flex-col gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 w-full" : "grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80"}>
              <button
                type="button"
                onClick={() => sendQuickSetting('shade')}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/70 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                title="Pull down the Android Quick Settings tile shade"
              >
                <Sliders className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> Pull Down Android Quick Settings
              </button>
              <button
                type="button"
                onClick={() => sendQuickSetting('notifications_shade')}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/70 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                title="Pull down notification shade"
              >
                <Bell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Pull Down Notification Shade
              </button>
            </div>
          </div>

          {/* Ringer Quick Switch */}
          <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Ringer Profile:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => sendQuickSetting('ringer_normal')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition border cursor-pointer ${
                  quickSettings?.ringerMode === 'normal' || volumeInfo?.ringerMode?.toLowerCase() === 'normal'
                    ? 'border-emerald-300 dark:border-emerald-500/50 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => sendQuickSetting('ringer_vibrate')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition border cursor-pointer ${
                  quickSettings?.ringerMode === 'vibrate' || volumeInfo?.ringerMode?.toLowerCase() === 'vibrate'
                    ? 'border-amber-300 dark:border-amber-500/50 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                    : 'border-slate-300 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Vibrate
              </button>
              <button
                type="button"
                onClick={() => sendQuickSetting('ringer_silent')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition border cursor-pointer ${
                  quickSettings?.ringerMode === 'silent' || volumeInfo?.ringerMode?.toLowerCase() === 'silent'
                    ? 'border-rose-300 dark:border-rose-500/50 bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
                    : 'border-slate-300 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Silent
              </button>
            </div>
          </div>
        </div>

        {/* SOUND & VOLUME PROFILE MANAGER */}
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("hardware", ["sound", "volume", "profiles", "audio", "mute", "ringer"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Volume2 className="h-4 w-4 text-teal-400" /> Sound & Volume Profiles
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-gray-700 bg-slate-50 dark:bg-slate-950 text-teal-400">
                  {volumeInfo?.ringerMode || 'Normal'}
                </span>
                <button
                  type="button"
                  onClick={() => fetchVolumeInfo()}
                  className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-white hover:bg-gray-800"
                  title="Refresh volumes"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Ringer Profiles Selector */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5">Ringer Profile</label>
              <div className={isMobile ? "flex flex-col gap-2 w-full" : "grid grid-cols-3 gap-2"}>
                <button
                  type="button"
                  onClick={() => setRingerProfile('normal')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    (volumeInfo?.ringerMode === 'normal' || !volumeInfo?.ringerMode)
                      ? 'border-teal-500 bg-teal-950/50 text-teal-300'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
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
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
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
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" /> Silent
                </button>
              </div>
            </div>

            {/* Volume Sliders */}
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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

              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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

              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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

              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
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
              <div className={isMobile ? "flex flex-col gap-2 w-full" : "grid grid-cols-3 gap-2"}>
                <button
                  type="button"
                  onClick={() => setDndMode('OFF')}
                  className={`py-1 px-2 rounded border text-[11px] font-medium transition-all ${
                    !dndStatus?.isDndActive
                      ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
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
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
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
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
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
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("automation", ["url", "browser", "website", "open remote link"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-teal-400" /> Remote Browser URL Opener
              </h3>
              <span className="text-xs text-gray-500">Default Browser</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Push and instantly launch any website, YouTube video, or Google Maps directions link in the phone&apos;s browser.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Target Web URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                  <input
                    type="text"
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                    placeholder="https://example.com or youtube.com/..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-teal-500 focus:outline-none font-mono"
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
                      className="px-2 py-1 text-[11px] rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-teal-300 hover:border-gray-700 transition-colors"
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
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("hardware", ["vibration", "haptic", "buzz"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Radio className="h-4 w-4 text-teal-400" /> Remote Vibration
              </h3>
              <span className="text-xs font-mono text-teal-400 bg-teal-950/60 border border-teal-800 px-2 py-0.5 rounded">
                {selectedPattern ? 'Pattern Mode' : `${vibrateDuration} ms`}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Trigger haptic feedback or rhythm vibration alerts on the target phone.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <span>Custom Duration</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{vibrateDuration} ms</span>
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
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5">Preset Patterns</label>
                <div className={isMobile ? "flex flex-col gap-2 w-full" : "grid grid-cols-2 gap-2"}>
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
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-gray-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
            <button
              onClick={() => vibratePhone(vibrateDuration, selectedPattern)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors shadow-md shadow-teal-950"
            >
              <Radio className="h-4 w-4" /> Vibrate Phone Now
            </button>
          </div>
        </div>

        {/* 2. TEXT-TO-SPEECH (TTS) */}
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("automation", ["tts", "text to speech", "voice", "speak"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Volume2 className="h-4 w-4 text-teal-400" /> Text-to-Speech (TTS)
              </h3>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Speaker Output</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Synthesize and speak text out loud through the device loudspeaker.
            </p>

            <div className="space-y-4">
              <div>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Enter text for the phone to speak..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className={isMobile ? "flex flex-col gap-3 w-full" : "grid grid-cols-2 gap-4"}>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
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
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
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

          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
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
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("automation", ["play audio", "sound file", "siren", "alarm"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Play className="h-4 w-4 text-teal-400" /> Play Remote Audio
              </h3>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">MediaPlayer</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Play music or audio directly from your PC or stream via web URL on phone speakers.
            </p>

            <div className="flex items-center gap-1.5 mb-3 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAudioSourceMode('upload')}
                className={`flex-1 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  audioSourceMode === 'upload' ? 'bg-teal-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-white'
                }`}
              >
                Upload from PC
              </button>
              <button
                type="button"
                onClick={() => setAudioSourceMode('url')}
                className={`flex-1 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  audioSourceMode === 'url' ? 'bg-teal-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-white'
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
                  className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-dashed border-gray-700 bg-slate-50 dark:bg-slate-950 hover:border-teal-500 cursor-pointer text-center transition-colors"
                >
                  <Upload className="h-5 w-5 text-teal-400 mb-1" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
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
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Quick Samples</div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_SOUNDS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => setAudioUrl(s.url)}
                        className="text-xs px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-600 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-3">
              <input
                type="checkbox"
                checked={audioLoop}
                onChange={(e) => setAudioLoop(e.target.checked)}
                className="rounded border-gray-700 bg-slate-50 dark:bg-slate-950 text-teal-500 focus:ring-teal-500 h-4 w-4"
              />
              <span>Loop playback continuously</span>
            </label>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex gap-2">
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
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("automation", ["wallpaper", "background", "theme"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4 text-teal-400" /> Remote Wallpaper
              </h3>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Homescreen</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Set solid theme colors or online image wallpaper directly onto the phone.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Solid Color Presets</label>
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
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-1">{wallpaperColor}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Or Image URL</label>
                <input
                  type="text"
                  value={wallpaperUrl}
                  onChange={(e) => {
                    setWallpaperUrl(e.target.value);
                    if (e.target.value) setWallpaperFile(null);
                  }}
                  placeholder="https://example.com/wallpaper.jpg"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Or Upload Image File from PC</label>
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
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:text-white cursor-pointer transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 text-teal-400" />
                    <span className="truncate">{wallpaperFile ? wallpaperFile.name : 'Choose picture from computer'}</span>
                  </label>
                  {wallpaperFile && (
                    <button
                      type="button"
                      onClick={() => setWallpaperFile(null)}
                      className="p-2 text-gray-500 hover:text-red-400 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800"
                      title="Clear uploaded image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {wallpaperFile && (
                  <div className="mt-2 flex items-center gap-2 p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <img
                      src={wallpaperFile.data}
                      alt="Preview"
                      className="h-10 w-10 object-cover rounded border border-gray-700"
                    />
                    <div className="text-xs font-mono truncate">
                      <div className="text-slate-800 dark:text-slate-200 truncate">{wallpaperFile.name}</div>
                      <div className="text-[10px] text-gray-500">{wallpaperFile.size}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
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
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("danger", ["lock", "screen lock", "secure", "lockscreen"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-teal-400" /> Remote Screen Lock
              </h3>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  deviceInfo?.adminActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                }`}
              >
                {deviceInfo?.adminActive ? 'Admin Active' : 'Admin Setup Req'}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Instantly turn off display and lock the device screen using Android DevicePolicyManager.
            </p>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <Shield className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Device Admin Security
              </div>
              <p className="text-[11px] text-slate-500 dark:text-gray-500 leading-relaxed">
                Requires the app to be activated as a Device Administrator on phone. If not active, tap &quot;Enable Remote Screen Lock&quot; in the mobile app.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to lock the phone screen right now?')) {
                  lockDevice();
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-red-950/80 dark:hover:bg-red-900 border border-rose-300 dark:border-red-800/80 px-4 py-2.5 text-sm font-semibold text-rose-800 dark:text-red-200 transition-colors shadow-xs cursor-pointer"
            >
              <Lock className="h-4 w-4" /> Lock Device Screen Now
            </button>
          </div>
        </div>

        {/* 6. REMOTE PHONE CALL CONTROLS & DIALER */}
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("hardware", ["phone call", "dialer", "call", "sim"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <PhoneCall className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Phone Calls &amp; Dialer
              </h3>
              <span className="text-xs font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded font-semibold">
                Live Telecom
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
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
              <div className="mb-3 rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span className="font-medium text-slate-600 dark:text-slate-400">Call Actions:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => answerCall(true)}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded text-xs font-semibold cursor-pointer transition-colors"
                    title="Accept ringing call in speaker mode"
                  >
                    📞 Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => declineCall()}
                    className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded text-xs font-semibold cursor-pointer transition-colors"
                    title="Hang up or reject active call"
                  >
                    ❌ Decline
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Make Outgoing Phone Call</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  placeholder="+91 or Phone Number..."
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none font-mono"
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

          <div className="mt-3">
            <button
              onClick={() => {
                if (openCallRecordingsVault) {
                  openCallRecordingsVault();
                } else if (setCurrentTab) {
                  setCurrentTab('calls');
                }
                pushToast('Opening Call Recordings Vault...', 'info');
              }}
              className="w-full py-2 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 border border-teal-300 dark:border-teal-500/30 text-teal-800 dark:text-teal-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Mic className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Open Call Recordings Vault
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-gray-500">
            Telecom permission active · Speaker mode automatically enabled on answer
          </div>
        </div>

        {/* 7. FLASHLIGHT (TORCH) */}
        <div className={`rounded-2xl border p-5 shadow-xl flex flex-col justify-between transition-colors ${isCardVisible("hardware", ["flashlight", "torch", "flash", "light"]) ? "" : "hidden"} ${
          torchOn
            ? 'border-amber-500/60 bg-amber-500/10 dark:bg-amber-950/20 shadow-amber-500/10'
            : 'border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <Zap className={`h-4 w-4 ${torchOn ? 'text-amber-500 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}`} /> Flashlight (Torch)
              </h3>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  torchOn
                    ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {torchOn ? 'LIGHT ON' : 'OFF'}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Remotely toggle device rear camera LED flashlight ON or OFF.
            </p>

            <div className="flex items-center justify-center py-3">
              <div
                className={`h-16 w-16 rounded-full flex items-center justify-center border-2 transition-all ${
                  torchOn
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.5)] text-amber-500 dark:text-amber-300 scale-105'
                    : 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-gray-600'
                }`}
              >
                <Zap className={`h-8 w-8 ${torchOn ? 'animate-pulse' : ''}`} />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
            <button
              onClick={() => toggleTorch(!torchOn)}
              className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                torchOn
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
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
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 dark:bg-slate-950 dark:hover:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
              }`}
            >
              <Activity className="h-4 w-4" />
              {strobeActive ? '⚡ Stop SOS Strobe' : '⚡ Start SOS Strobe Beacon (30s Rapid Flash)'}
            </button>
          </div>
        </div>

        {/* 7. CALL BLOCKER / SCREENING */}
        <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between ${isCardVisible("safety", ["call blocker", "spam", "blocklist", "screening"]) ? "" : "hidden"}`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                <PhoneOff className="h-4 w-4 text-teal-400" /> Call Blocker &amp; Spam Shield
              </h3>
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={callBlocklist?.enabled || false}
                  onChange={(e) => {
                    syncCallBlocklist(e.target.checked, callBlocklist?.numbers || []);
                  }}
                  className="rounded border-gray-700 bg-slate-50 dark:bg-slate-950 text-teal-500 focus:ring-teal-500 h-4 w-4"
                />
                <span className={callBlocklist?.enabled ? 'text-teal-400 font-medium' : 'text-gray-500'}>
                  {callBlocklist?.enabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Automatically reject incoming spam calls using Android CallScreeningService.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBlockNumber}
                  onChange={(e) => setNewBlockNumber(e.target.value)}
                  placeholder="Enter phone number to block..."
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-teal-500 focus:outline-none"
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
                      className="flex items-center justify-between gap-2 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs"
                    >
                      <span className="font-mono text-slate-800 dark:text-slate-200">{num}</span>
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

          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 text-[10px] text-gray-500">
            Note: On Android 10+, tap &quot;Enable Call Screening&quot; in the mobile app to authorize screening.
          </div>
        </div>

      </div>

      {/* 6. CLIPBOARD SYNC & LOG */}
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("automation", ["clipboard", "copy", "paste", "sync clipboard"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
              <Clipboard className="h-4 w-4 text-teal-400" /> Clipboard Manager & Live Sync
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Read current phone clipboard or toggle automatic background clip capture.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <input
                type="checkbox"
                checked={clipboardCapture}
                onChange={(e) => toggleClipboardCapture(e.target.checked)}
                className="rounded border-gray-700 bg-slate-50 dark:bg-slate-950 text-teal-500 focus:ring-teal-500 h-4 w-4"
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
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs hover:border-gray-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap">{item.text}</p>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {new Date(item.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(item.text, item.id || idx)}
                  className="shrink-0 p-1.5 rounded bg-gray-900 text-slate-500 dark:text-slate-400 hover:text-teal-300 hover:bg-gray-800 transition-colors"
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
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800">
          <label className="text-xs text-slate-700 dark:text-slate-300 font-medium block mb-1.5 flex items-center justify-between">
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
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-teal-500 focus:outline-none font-mono"
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
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("hardware", ["telemetry", "system info", "cpu", "ram", "specs", "storage"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4 text-teal-400" /> System Information & Telemetry
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live hardware, memory, storage and Android OS diagnostics.
            </p>
          </div>
          <button
            onClick={() => refreshDeviceInfo()}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Info
          </button>
        </div>

        {deviceInfo ? (
          <div className="space-y-5">
            {/* Spec chips */}
            <div className={isMobile ? "flex flex-col gap-2.5 text-xs w-full" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs"}>
              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-gray-500 block text-[10px]">Model & Brand</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {deviceInfo.manufacturer} {deviceInfo.model}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{deviceInfo.product || deviceInfo.board}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-gray-500 block text-[10px]">Android OS</span>
                <span className="font-semibold text-teal-300 block mt-0.5">
                  Android {deviceInfo.androidVersion}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">API {deviceInfo.sdkInt}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-gray-500 block text-[10px]">Display</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {deviceInfo.display?.widthPixels} x {deviceInfo.display?.heightPixels}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{deviceInfo.display?.densityDpi} DPI</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-gray-500 block text-[10px]">Uptime & Security</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {Math.floor((deviceInfo.uptimeMs || 0) / 3600000)}h {Math.floor(((deviceInfo.uptimeMs || 0) % 3600000) / 60000)}m
                </span>
                <span className="text-[10px] text-gray-500 font-mono truncate block">Patch: {deviceInfo.securityPatch || 'N/A'}</span>
              </div>

              {/* Battery Telemetry Chip */}
              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
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
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm block mt-0.5">
                  {(batteryStats?.temperatureC ?? activeDevice?.temperatureC ?? 28).toFixed(1)}°C · {activeDevice?.battery ?? batteryStats?.battery ?? 100}%
                </span>
                <span className="text-[10px] text-teal-400 font-mono truncate block mt-0.5">
                  {batteryStats?.plugged ?? activeDevice?.plugged ?? (activeDevice?.isCharging ? 'Charging' : 'On Battery')}
                </span>
              </div>
            </div>

            {/* RAM & Storage bars */}
            <div className={isMobile ? "flex flex-col gap-3 text-xs w-full" : "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"}>
              {/* RAM */}
              <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-teal-400" /> RAM Memory
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
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
              <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-teal-400" /> Internal Storage
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
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
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("hardware", ["wifi", "wi-fi", "network diagnostics", "scanner"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
              <Wifi className="h-4 w-4 text-teal-400" /> Wi-Fi Status & Scanner
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connection details, signal level, link speed and nearby AP scan results.
            </p>
          </div>
          <button
            onClick={() => refreshWifiInfo()}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Scan Wi-Fi
          </button>
        </div>

        {wifiInfo ? (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full ${wifiInfo.connected ? 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-800' : 'bg-slate-200 dark:bg-gray-900 text-slate-500 dark:text-gray-500'}`}>
                  <Wifi className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-gray-100">{wifiInfo.ssid || 'Disconnected'}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
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
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{wifiInfo.frequencyMHz} MHz</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">RSSI Signal</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{wifiInfo.rssi} dBm</span>
                </div>
              </div>
            </div>

            {/* Nearby networks */}
            {wifiInfo.scanResults && wifiInfo.scanResults.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Nearby Wi-Fi Networks ({wifiInfo.scanResults.length})</h5>
                <div className={isMobile ? "flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1 w-full" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1"}>
                  {wifiInfo.scanResults.map((r, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{r.ssid || '<Hidden SSID>'}</span>
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
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("automation", ["installed apps", "permissions", "packages", "apps inspector"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-teal-400" /> Installed Apps & Permissions Explorer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspect all apps on device. Click any app to view its granted and denied permissions.
            </p>
          </div>
          <button
            onClick={() => refreshInstalledApps()}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
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
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex rounded-lg bg-slate-50 dark:bg-slate-950 p-1 border border-slate-200/80 dark:border-slate-800 text-xs">
            <button
              onClick={() => setAppFilter('user')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                appFilter === 'user' ? 'bg-teal-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-white'
              }`}
            >
              User Apps
            </button>
            <button
              onClick={() => setAppFilter('system')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                appFilter === 'system' ? 'bg-teal-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-white'
              }`}
            >
              System Apps
            </button>
            <button
              onClick={() => setAppFilter('all')}
              className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                appFilter === 'all' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({installedApps?.length || 0})
            </button>
          </div>
        </div>

        {/* Apps List */}
        {filteredApps.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-gray-500 text-xs">
            {installedApps?.length === 0
              ? 'Click "Refresh Apps" to load the installed applications from phone.'
              : 'No applications match your filter.'}
          </div>
        ) : (
          <div className={isMobile ? "flex flex-col gap-2.5 max-h-80 overflow-y-auto scrollbar-thin pr-1 w-full" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto scrollbar-thin pr-1"}>
            {filteredApps.map((app) => (
              <div
                key={app.packageName}
                onClick={() => {
                  setInspectApp(app);
                  fetchAppPerms(app.packageName);
                }}
                className="group cursor-pointer rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 p-3 hover:border-teal-500/60 hover:bg-teal-50/20 dark:hover:bg-slate-900/60 shadow-xs transition-all text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-300 truncate">
                      {app.name}
                    </span>
                    {app.isSystem && (
                      <span className="text-[9px] bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                        System
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">{app.packageName}</p>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                  <span>v{app.versionName || app.versionCode}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        launchRemoteApp(app.packageName);
                      }}
                      className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/80 dark:hover:bg-teal-900 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 transition-colors flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
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
                        className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/80 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 transition-colors flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                        title="Uninstall this app from device"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Uninstall
                      </button>
                    )}
                    <span className="text-teal-600 dark:text-teal-400 group-hover:underline flex items-center gap-0.5 font-medium ml-0.5">
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
      <div className={`rounded-2xl border p-5 shadow-xl backdrop-blur-xl transition-all ${isCardVisible("surveillance", ["live listen", "audio stream", "microphone", "hear"]) ? "" : "hidden"} ${
        liveListening
          ? 'border-teal-500/60 bg-teal-500/10 dark:bg-teal-950/20 shadow-teal-500/10'
          : 'border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border transition-colors ${
              liveListening
                ? 'bg-teal-500 text-white border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.5)]'
                : 'bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400'
            }`}>
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Live Listen (Continuous Audio Stream)</h3>
                {liveListening && (
                  <span className="flex items-center gap-1.5 text-[11px] text-teal-400 font-medium bg-teal-950/80 border border-teal-700 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
                    LIVE STREAMING
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Stream ambient microphone audio live to PC speakers (No 60-second limit, no files stored)</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {liveListening ? (
            <div className="rounded-lg border border-teal-800/60 bg-slate-50 dark:bg-slate-950 p-4">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Sound is streaming directly through your browser audio in real-time. Useful for monitoring pets, babies, or elders in emergency without saving audio clips on the phone.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("surveillance", ["remote microphone", "audio clip", "record mic"]) ? "" : "hidden"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Remote Microphone (Audio Clip)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Record a high-quality ambient AAC audio clip from device mic</p>
            </div>
          </div>
          {micRecording && (
            <span className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-full animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Recording phone mic...
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Clip Duration</span>
              <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">{micDuration} seconds</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={micDuration}
              onChange={(e) => setMicDuration(Number(e.target.value))}
              disabled={micRecording}
              className="w-full accent-teal-500 bg-slate-200 dark:bg-gray-800 rounded-lg h-2"
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
            <div className="rounded-lg border border-teal-900/60 bg-slate-50 dark:bg-slate-950 p-4 mt-2">
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
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("surveillance", ["remote camera", "photo", "camera snapshot", "front back"]) ? "" : "hidden"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Remote Camera (One-Shot Photo)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Silently capture a photo using front or back camera</p>
            </div>
          </div>
          {cameraCapturing && (
            <span className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-full animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Opening camera & snapping...
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5 font-medium">Camera Facing</label>
            <div className={isMobile ? "flex flex-col gap-2 w-full" : "grid grid-cols-2 gap-2"}>
              <button
                type="button"
                onClick={() => setCameraFacing('back')}
                disabled={cameraCapturing}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  cameraFacing === 'back'
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Back Camera (Main)
              </button>
              <button
                type="button"
                onClick={() => setCameraFacing('front')}
                disabled={cameraCapturing}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  cameraFacing === 'front'
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
            <div className="rounded-lg border border-teal-900/60 bg-slate-50 dark:bg-slate-950 p-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-teal-300 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" /> Latest Captured Photo
                </span>
                <span className="text-[10px] text-gray-500">
                  {latestCameraPhoto.facing === 'front' ? 'Front' : 'Back'} · {latestCameraPhoto.width}x{latestCameraPhoto.height} · {((latestCameraPhoto.sizeBytes || 0) / 1024).toFixed(1)} KB · {new Date(latestCameraPhoto.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black flex items-center justify-center max-h-72">
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
      <div className={`rounded-2xl border p-5 backdrop-blur-xl transition-all ${isCardVisible("surveillance", ["camera stream", "surveillance hub", "live video", "webrtc", "stream"]) ? "" : "hidden"} ${
        (cameraStreaming || liveListening)
          ? 'border-rose-500/50 bg-rose-500/10 dark:bg-gray-900/90 shadow-xl shadow-rose-500/10'
          : 'border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              (cameraStreaming || liveListening)
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-500 animate-pulse'
                : 'bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400'
            }`}>
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                Indoor Security Camera &amp; Live Surveillance Hub
                {(cameraStreaming || liveListening) && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5 font-medium">Surveillance Mode</label>
            <div className={isMobile ? "flex flex-col gap-2 w-full" : "grid grid-cols-1 sm:grid-cols-3 gap-2"}>
              <button
                type="button"
                onClick={() => setSurveillanceMode('cam_mic')}
                disabled={cameraStreaming || liveListening}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  surveillanceMode === 'cam_mic'
                    ? 'border-teal-500 bg-teal-950/60 text-teal-300 shadow'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
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
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
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
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="h-4 w-4 text-teal-400" />
                <span>🎙️ Mic Only (Audio Stream)</span>
              </button>
            </div>
          </div>

          {/* Camera Settings (Facing, Quality, FPS) */}
          {surveillanceMode !== 'mic_only' && (
            <div className={isMobile ? "flex flex-col gap-3 w-full" : "grid grid-cols-1 sm:grid-cols-3 gap-3"}>
              {/* Lens Selection */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5">Camera Lens</label>
                <div className={isMobile ? "flex flex-col gap-2 w-full" : "grid grid-cols-2 gap-2"}>
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
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
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
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
                    }`}
                  >
                    Front Lens
                  </button>
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5">Stream Quality</label>
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
                          : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FPS */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5">Frame Rate</label>
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
                          : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
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
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Live Security Monitor {cameraStreaming ? `(${cameraStreamFacing.toUpperCase()} Lens)` : '(Audio Only)'}
                  </span>
                  {cameraStreaming && latestCameraFrame && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
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
                        : 'border-slate-200/80 dark:border-slate-800 bg-gray-900 text-slate-500 dark:text-slate-400 hover:text-white'
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200/80 dark:border-slate-800 bg-gray-900 text-slate-700 dark:text-slate-300 hover:text-teal-300 hover:border-teal-700 transition-colors cursor-pointer"
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
                    className="p-1.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-gray-900 text-slate-700 dark:text-slate-300 hover:text-white"
                    title={isFullScreenCCTV ? 'Exit Fullscreen' : 'Expand to Fullscreen Monitor'}
                  >
                    {isFullScreenCCTV ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Video Feed */}
              {cameraStreaming && (
                <div className={`relative rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black flex items-center justify-center ${isFullScreenCCTV ? 'flex-1 max-h-[85vh]' : 'max-h-[500px]'}`}>
                  {latestCameraFrame ? (
                    <img
                      src={`data:image/jpeg;base64,${latestCameraFrame.data}`}
                      alt="Live Security Camera Frame"
                      className="max-h-full w-auto object-contain"
                    />
                  ) : (
                    <div className="py-20 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
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
                <div className="p-8 text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70/80">
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    <span className="h-6 w-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-10 w-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-4 w-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="h-8 w-1 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                    <span className="h-5 w-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  </div>
                  <p className="text-xs font-semibold text-emerald-300">Live Ambient Microphone Streaming to PC</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Listening in real-time through Web Audio API (16kHz PCM audio stream)</p>
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
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("surveillance", ["screenshot", "display", "screen capture"]) ? "" : "hidden"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400">
              <Monitor className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Remote Screenshot (Display Frame)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Capture the current screen of the phone via MediaProjection</p>
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
          <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-lg">
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
            <div className="rounded-lg border border-teal-900/60 bg-slate-50 dark:bg-slate-950 p-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-teal-300 flex items-center gap-1.5">
                  <Monitor className="h-3.5 w-3.5" /> Latest Screen Capture
                </span>
                <span className="text-[10px] text-gray-500">
                  {latestScreenshot.width}x{latestScreenshot.height} · {((latestScreenshot.sizeBytes || 0) / 1024).toFixed(1)} KB · {new Date(latestScreenshot.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black flex items-center justify-center max-h-80">
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
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("surveillance", ["live screen stream", "remote control", "gestures", "screen mirror"]) ? "" : "hidden"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Live Screen Stream (1-30 FPS)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Stream phone display live with high frame rate and low latency over WebSocket</p>
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
            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5">Stream Refresh Rate</label>
            <div className={isMobile ? "grid grid-cols-3 gap-1.5 w-full" : "grid grid-cols-6 gap-2"}>
              {[2, 5, 10, 15, 20, 30].map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => setStreamFps(fps)}
                  disabled={screenRecording}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                    streamFps === fps
                      ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  {fps} FPS {fps === 15 && !isMobile && '(Default)'}
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
            <div className="rounded-lg border border-teal-900/60 bg-slate-50 dark:bg-slate-950 p-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Display View
                </span>
                {latestScreenFrame && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {latestScreenFrame.width}x{latestScreenFrame.height} · {((latestScreenFrame.sizeBytes || 0) / 1024).toFixed(1)} KB/frame
                  </span>
                )}
              </div>

              {latestScreenFrame ? (
                <div>
                  <div className="rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black flex items-center justify-center select-none relative">
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
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => sendInputKey('back')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-teal-50 dark:bg-gray-800 dark:hover:bg-teal-600 hover:text-teal-700 dark:hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-transparent transition-colors shadow-sm"
                      title="Back Key"
                    >
                      <CornerDownLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('home')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-teal-50 dark:bg-gray-800 dark:hover:bg-teal-600 hover:text-teal-700 dark:hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-transparent transition-colors shadow-sm"
                      title="Home Screen"
                    >
                      <Home className="h-3.5 w-3.5" /> Home
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('recents')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-teal-50 dark:bg-gray-800 dark:hover:bg-teal-600 hover:text-teal-700 dark:hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-transparent transition-colors shadow-sm"
                      title="Recent Applications"
                    >
                      <Menu className="h-3.5 w-3.5" /> Recents
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('notifications')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-teal-50 dark:bg-gray-800 dark:hover:bg-teal-600 hover:text-teal-700 dark:hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-transparent transition-colors shadow-sm"
                      title="Pull Down Notification Shade"
                    >
                      <Bell className="h-3.5 w-3.5" /> Notifications
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('quick_settings')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-teal-50 dark:bg-gray-800 dark:hover:bg-teal-600 hover:text-teal-700 dark:hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-transparent transition-colors shadow-sm"
                      title="Quick Settings Panel"
                    >
                      <Settings className="h-3.5 w-3.5" /> Quick Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('power_dialog')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 dark:bg-gray-800 dark:hover:bg-rose-600 hover:text-rose-700 dark:hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-transparent transition-colors shadow-sm"
                      title="Power Off / Restart Dialog"
                    >
                      <Power className="h-3.5 w-3.5" /> Power
                    </button>
                    <button
                      type="button"
                      onClick={() => sendInputKey('lock_screen')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 dark:bg-gray-800 dark:hover:bg-amber-600 hover:text-amber-700 dark:hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-transparent transition-colors shadow-sm"
                      title="Lock Device Screen"
                    >
                      <Lock className="h-3.5 w-3.5" /> Lock Screen
                    </button>
                    <button
                      type="button"
                      onClick={() => wakeScreen()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 dark:bg-gray-800 dark:hover:bg-emerald-600 hover:text-emerald-700 dark:hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-transparent transition-colors cursor-pointer shadow-sm"
                      title="Wake Up Dark Phone Screen via WakeLock"
                    >
                      <Sun className="h-3.5 w-3.5 text-amber-500" /> Wake Screen
                    </button>
                  </div>

                  {/* Remote Keyboard Quick Typing Injection */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                        <Keyboard className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Remote Typing Injection (PC Keyboard → Phone Screen)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Injects into active text field</span>
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
                        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
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
                <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-800/80 rounded-lg bg-black">
                  <RefreshCw className="h-4 w-4 animate-spin text-teal-400" />
                  Connecting to live device screen feed...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Permissions Modal / Drawer */}
      {inspectApp && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-200/80 dark:border-slate-800 bg-gray-900 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h4 className="font-bold text-gray-100 text-base">{inspectApp.name}</h4>
                <p className="font-mono text-xs text-teal-400 mt-0.5">{inspectApp.packageName}</p>
              </div>
              <button
                onClick={() => setInspectApp(null)}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2">
              <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Requested Permissions</h5>
              {appPermissions[inspectApp.packageName] ? (
                appPermissions[inspectApp.packageName].length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">This app requests no special permissions.</p>
                ) : (
                  appPermissions[inspectApp.packageName].map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-xs"
                    >
                      <span className="font-mono text-slate-700 dark:text-slate-300 break-all text-[11px]">
                        {p.permission.replace('android.permission.', '')}
                      </span>
                      {p.granted ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded shrink-0">
                          <Check className="h-3 w-3" /> Granted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-gray-900 border border-slate-200/80 dark:border-slate-800 px-2 py-0.5 rounded shrink-0">
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

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
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
                className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 8. LOST MODE EMERGENCY BANNER */}
      {/* 8. LOST MODE EMERGENCY BANNER */}
      <div className={`rounded-2xl border border-rose-500/30 dark:border-rose-500/20 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 shadow-xl shadow-rose-500/5 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("danger", ["lost mode", "banner", "emergency banner", "lost phone"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-rose-200/80 dark:border-rose-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-rose-300 text-sm">Lost Mode Screen Emergency Banner</h3>
              <p className="text-xs text-slate-500 dark:text-rose-300/70 mt-0.5">Pin persistent emergency return details &amp; contact dialer on phone lockscreen</p>
            </div>
          </div>
          {lostMode?.active ? (
            <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 border border-rose-500/40 px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              LOST MODE ACTIVE ON PHONE
            </span>
          ) : (
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              STANDBY
            </span>
          )}
        </div>

        <div className={isMobile ? "flex flex-col gap-4 text-xs w-full" : "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"}>
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1.5">Emergency Message</label>
            <textarea
              rows={2}
              value={lostMessage}
              onChange={(e) => setLostMessage(e.target.value)}
              placeholder="e.g. THIS PHONE IS LOST! Please contact owner for reward."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-xs outline-none transition-all"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1.5">Owner Contact Phone Number</label>
              <input
                type="text"
                value={lostPhone}
                onChange={(e) => setLostPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-mono shadow-xs outline-none transition-all"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900 shadow-xs transition-all">
              <input
                type="checkbox"
                checked={lostSoundAlarm}
                onChange={(e) => setLostSoundAlarm(e.target.checked)}
                className="rounded border-slate-400 dark:border-slate-700 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
              />
              <span>Also sound continuous emergency siren alarm</span>
            </label>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          {!lostMode?.active ? (
            <button
              type="button"
              onClick={() => setLostMode(true, lostMessage, lostPhone, lostSoundAlarm)}
              className="btn-interactive flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <AlertTriangle className="h-4 w-4" /> Activate Lost Mode Banner
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLostMode(false, '', '', false)}
              className="btn-interactive flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" /> Deactivate Lost Mode
            </button>
          )}
        </div>
      </div>

      {/* THEFT MOTION ALARM (DESK GUARD) */}
      <div className={`rounded-2xl border border-amber-500/30 dark:border-amber-950/70 bg-white/70 dark:bg-slate-900/90 backdrop-blur-xl p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("safety", ["theft alarm", "motion alarm", "accelerometer", "anti-theft"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-amber-200 dark:border-amber-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800/80 text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Theft Motion Alarm ("Don't Touch My Phone")</h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/70">Sounds a loud siren on phone and alerts PC if device is moved or picked up from desk</p>
            </div>
          </div>

          {motionAlarm?.triggered ? (
            <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 px-3 py-1 rounded-full animate-bounce flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.6)]">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              MOTION DETECTED · SIREN SOUNDING
            </span>
          ) : motionAlarm?.armed ? (
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              ARMED & GUARDING DESK
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-full">
              DISARMED
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                <span>Motion Sensitivity Threshold</span>
                <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">{motionThreshold} m/s²</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={motionThreshold}
                onChange={(e) => setMotionThreshold(parseFloat(e.target.value))}
                disabled={motionAlarm?.armed}
                className="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
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
      <div className={`rounded-2xl border border-sky-500/30 dark:border-sky-950/70 bg-white/70 dark:bg-slate-900/90 backdrop-blur-xl p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("surveillance", ["walkie talkie", "intercom", "live voice", "push to talk"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-sky-200 dark:border-sky-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800/80 text-sky-700 dark:text-sky-400">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sky-900 dark:text-sky-200 text-sm">Live Voice Walkie-Talkie (Intercom)</h3>
              <p className="text-xs text-sky-800/80 dark:text-sky-200/70">Hold to speak from PC microphone directly through the phone's speakerphone in real time</p>
            </div>
          </div>

          {isPressingWalkieTalkie || walkieTalkieActive ? (
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              BROADCASTING LIVE TO PHONE SPEAKER
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-800 px-2.5 py-1 rounded-full">
              INTERCOM READY
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-sky-900/30">
          <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <div className="font-bold text-sky-800 dark:text-sky-300">Push-to-Talk Broadcast</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-gray-700 dark:text-slate-200 border-slate-300 dark:border-gray-700'
              }`}
            >
              <Mic className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {handsFreeIntercom && isPressingWalkieTalkie ? 'MUTE HANDS-FREE' : 'HANDS-FREE ON'}
            </button>

            <button
              type="button"
              onClick={forceStopWalkieTalkie}
              title="Immediately cut audio track and silence the phone speaker"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 dark:bg-rose-950/80 dark:hover:bg-rose-900 dark:border-rose-700/80 dark:text-rose-300 transition-colors shadow"
            >
              <MicOff className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              FORCE STOP
            </button>
          </div>
        </div>
      </div>

      {/* 9. MEDIA & PHOTO GALLERY VIEWER */}
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("surveillance", ["photos", "gallery", "camera roll", "images"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-800/60 text-teal-400">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Recent Photos & Camera Gallery</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live visual thumbnail grid of photos captured on phone camera with one-click download</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchGallery(36)}
            disabled={galleryLoading}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
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
                className="group relative rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 overflow-hidden flex flex-col justify-between hover:border-teal-500/60 transition-all"
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
                  <p className="truncate text-slate-700 dark:text-slate-300 font-medium">{photo.name}</p>
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
      {selectedPhoto && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-xl border border-slate-200/80 dark:border-slate-800 bg-gray-900 p-5 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-3">
              <div>
                <h4 className="font-semibold text-gray-100 text-sm truncate max-w-sm">{selectedPhoto.name}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatBytes(selectedPhoto.size)} · {new Date(selectedPhoto.date).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-white hover:bg-gray-800"
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-teal-700 dark:text-teal-300 text-xs font-semibold border border-teal-300 dark:border-teal-800/60"
              >
                <Download className="h-3.5 w-3.5" /> Download Full Res
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CELLULAR & DUAL-SIM TELEMETRY */}
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("hardware", ["cellular", "dual sim", "telemetry", "sim signal"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Signal className="h-4 w-4 text-teal-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Cellular & Dual-SIM Network Telemetry</h3>
          </div>
          <button
            type="button"
            onClick={fetchCellularInfo}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Refresh Telemetry
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Real-time cellular signal strength bars, 5G/4G network generation, roaming status, and active Dual-SIM carrier profiles.
        </p>

        {cellularInfo ? (
          <div className="space-y-4">
            {/* Primary Signal & Network Badge */}
            <div className={isMobile ? "flex flex-col gap-2 w-full" : "grid grid-cols-2 sm:grid-cols-4 gap-3"}>
              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Signal Strength</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-end gap-0.5 h-4">
                    {[1, 2, 3, 4].map((bar) => (
                      <span
                        key={bar}
                        className={`w-1 rounded-sm ${
                          (cellularInfo.signalLevel ?? 0) >= bar
                            ? 'bg-emerald-500'
                            : 'bg-slate-300 dark:bg-gray-700'
                        }`}
                        style={{ height: `${bar * 25}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                    {cellularInfo.signalLevel != null ? `${cellularInfo.signalLevel}/4 Bars` : 'Active'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Network Gen</span>
                <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800/80 inline-block">
                  {cellularInfo.networkGen || 'Cellular'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                  {cellularInfo.networkTypeName || 'Active'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Data State</span>
                <span className={`text-xs font-mono font-semibold uppercase ${
                  cellularInfo.dataState === 'CONNECTED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {cellularInfo.dataState || 'UNKNOWN'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Roaming</span>
                <span className={`text-xs font-mono font-semibold ${
                  cellularInfo.isNetworkRoaming ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {cellularInfo.isNetworkRoaming ? 'Roaming ON' : 'Domestic / Home'}
                </span>
              </div>
            </div>

            {/* SIM Cards List */}
            {Array.isArray(cellularInfo.sims) && cellularInfo.sims.length > 0 ? (
              <div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">Active SIM Cards:</span>
                <div className={isMobile ? "flex flex-col gap-2.5 w-full" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
                  {cellularInfo.sims.map((sim, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded bg-teal-100 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800/60 text-teal-600 dark:text-teal-400">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{sim.carrierName || sim.displayName || 'SIM ' + (idx + 1)}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{sim.simSlot} • {sim.countryIso ? sim.countryIso.toUpperCase() : 'IN'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Carrier: <strong className="text-slate-900 dark:text-white">{cellularInfo.networkOperatorName || cellularInfo.simOperatorName || 'Cellular Service'}</strong></span>
                <span className="font-mono text-gray-500">{cellularInfo.phoneType || 'GSM'}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-200/80 dark:border-slate-800 rounded-lg">
            <Signal className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No cellular telemetry received yet.</p>
            <button
              type="button"
              onClick={fetchCellularInfo}
              className="mt-2 text-xs text-teal-600 dark:text-teal-400 hover:underline"
            >
              Fetch SIM & Cellular Status
            </button>
          </div>
        )}
      </div>

      {/* STORAGE & JUNK CLEANER */}
      <div className={`rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("automation", ["storage cleaner", "whatsapp junk", "cache", "cleaner"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Storage & WhatsApp Junk Cleaner</h3>
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

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Scan and remotely purge leftover APK package installers, WhatsApp sent media forwards, app cache, and files larger than 50MB.
        </p>

        {junkScanData ? (
          <div className="space-y-4">
            {/* Total Junk Banner */}
            <div className="flex flex-wrap items-center justify-between bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-xl p-3.5 gap-3">
              <div>
                <span className="text-[11px] text-teal-800 dark:text-teal-300 font-semibold block">Total Junk Found</span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {(junkScanData.totalBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
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
            <div className={isMobile ? "flex flex-col gap-2.5 w-full" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
              {Array.isArray(junkScanData.categories) && junkScanData.categories.map((cat) => (
                <div key={cat.id} className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat.title}</span>
                      <span className="text-xs font-mono text-teal-600 dark:text-teal-400 font-semibold">
                        {(cat.totalBytes / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{cat.description} ({cat.count} files)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cleanJunk(cat.id)}
                    disabled={cat.count === 0}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-medium border border-slate-300 dark:border-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3 w-3 text-red-500 dark:text-red-400" /> Clean This Category
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-200/80 dark:border-slate-800 rounded-lg">
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

      {/* 8.5 FREE CLOUD STORAGE & BANDWIDTH MANAGER */}
      <div className={`rounded-2xl border border-indigo-500/40 bg-white/70 dark:bg-slate-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-950 p-5 shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("automation", ["storage", "cloud", "render", "purge", "cleaner", "bandwidth", "free host", "disk", "database"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Free Cloud Storage & Zero-Bandwidth Manager</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  100% Free Hosting Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Optimize disk space on free cloud hosts (Render/Railway) and freeze phone sync to consume zero server bandwidth.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoadingServerStats}
            onClick={fetchServerStats}
            className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Server Storage Metrics"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoadingServerStats ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Database className="h-3 w-3 text-indigo-500" />
              <span>DB Size</span>
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {serverStats ? formatBytes(serverStats.dbSizeBytes) : '...'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Disk footprint</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <PhoneCall className="h-3 w-3 text-blue-500" />
              <span>Calls</span>
            </div>
            <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {serverStats ? serverStats.totalCalls : 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Stored records</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-emerald-500" />
              <span>SMS</span>
            </div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {serverStats ? serverStats.totalMessages : 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Stored chats</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Bell className="h-3 w-3 text-amber-500" />
              <span>Notifs</span>
            </div>
            <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {serverStats ? serverStats.totalNotifications : 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Stored alerts</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-rose-500" />
              <span>GPS History</span>
            </div>
            <div className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {serverStats ? serverStats.totalLocations : 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Stored trackings</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Cpu className="h-3 w-3 text-purple-500" />
              <span>Server RAM</span>
            </div>
            <div className="text-base font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              {serverStats ? `${serverStats.memoryUsageMB} MB` : '...'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Safe (512 MB Free)</div>
          </div>
        </div>

        {/* Action Controls in Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Freeze Sync (Zero-Bandwidth Phone Standby) */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeDevice?.monitoringPaused
              ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`flex h-2.5 w-2.5 rounded-full ${activeDevice?.monitoringPaused ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                    {activeDevice?.monitoringPaused ? 'Phone Sync Paused (Standby)' : 'Phone Sync Active'}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {activeDevice?.monitoringPaused
                    ? 'Phone remains connected on WebSocket (instant ring & commands work), but all heavy background syncing is paused to use 0 MB bandwidth.'
                    : 'Child phone periodically syncs calls, SMS, location & notifications. Turn ON Freeze Mode if you want to conserve cloud bandwidth.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => pauseMonitoring(!activeDevice?.monitoringPaused)}
                className={`btn-interactive shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeDevice?.monitoringPaused
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
                }`}
              >
                {activeDevice?.monitoringPaused ? 'Unfreeze (Resume Sync)' : 'Freeze Sync (0 MB)'}
              </button>
            </div>
          </div>

          {/* Card 2: Permanent Database & File Purge */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  <span>Permanent Storage Cleaner</span>
                </h4>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                  Zero Data Loss For Paired Phone
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Permanently wipes accumulated calls, SMS, GPS points and notifications from the server disk. Keeps device pairing, licenses, and connection completely intact.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={isPurgingStorage}
                onClick={() => purgeServerData()}
                className="btn-interactive flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 border border-rose-400/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isPurgingStorage ? 'Purging Storage...' : 'Purge All Stored Data (Keep Disk Free)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 9. DANGER ZONE: REMOTE FACTORY RESET / WIPE */}
      <div className={`rounded-2xl border border-red-500/30 dark:border-red-500/20 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl p-6 shadow-xl shadow-red-500/5 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${isCardVisible("danger", ["danger zone", "factory reset", "wipe", "format phone"]) ? "" : "hidden"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-red-200/80 dark:border-red-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-red-300 text-sm">Danger Zone: Remote Factory Reset (Format Device)</h3>
              <p className="text-xs text-slate-500 dark:text-red-300/70 mt-0.5">Permanently erase all personal data, photos, accounts and apps from device</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 shadow-xs">
            DEVICE ADMIN REQUIRED
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
          If your phone is lost or stolen with sensitive data, you can remotely trigger a complete hardware factory reset via Android Device Admin policy (<code className="font-mono bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 px-1 py-0.5 rounded">wipeData(0)</code>). This action is <strong className="text-red-600 dark:text-red-400 font-semibold">permanent and irreversible</strong>.
        </p>

        <button
          onClick={() => setShowWipeModal(true)}
          disabled={!activeDeviceId}
          className="btn-interactive flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> Remote Factory Reset / Wipe Phone
        </button>
      </div>

      {/* Wipe Confirmation Modal */}
      {showWipeModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-red-700 bg-slate-50 dark:bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400 border-b border-red-900/60 pb-3">
              <AlertTriangle className="h-6 w-6 flex-shrink-0 animate-bounce" />
              <div>
                <h3 className="font-bold text-white text-base">Confirm Factory Reset / Wipe</h3>
                <p className="text-xs text-red-300">This action will completely format the phone!</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
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
                className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-700"
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
        </div>,
        document.body
      )}

      {/* TIMELAPSE PHOTO VIEWER & DOWNLOAD MODAL */}
      {showTimelapseModal && selectedTimelapsePhoto && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-blue-500/40 rounded-2xl max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Timelapse Security Snapshot</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Captured: {new Date(selectedTimelapsePhoto.timestamp || Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimelapseModal(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-slate-500 dark:text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/60 rounded-xl p-2 border border-slate-200/80 dark:border-slate-800 min-h-[260px]">
              <img
                src={`data:image/jpeg;base64,${selectedTimelapsePhoto.data}`}
                alt="Full Timelapse Snapshot"
                className="max-h-[55vh] max-w-full rounded object-contain shadow-lg"
              />
            </div>

            {timelapseGallery && timelapseGallery.length > 1 && (
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1.5">
                  Browse Snapshots ({timelapseGallery.length})
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {timelapseGallery.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => setSelectedTimelapsePhoto(item)}
                      className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition ${
                        selectedTimelapsePhoto.data === item.data
                          ? 'border-blue-500 ring-2 ring-blue-500/40 scale-105'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-gray-600 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={`data:image/jpeg;base64,${item.data}`}
                        alt={`Thumb ${idx}`}
                        className="h-12 w-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800 pt-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {selectedTimelapsePhoto.facing === 'front' ? 'Front Camera' : 'Back Camera'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadTimelapsePhoto(selectedTimelapsePhoto.data)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  <Download className="h-4 w-4" /> Save / Download JPG
                </button>
                <button
                  type="button"
                  onClick={() => setShowTimelapseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-300 dark:border-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

