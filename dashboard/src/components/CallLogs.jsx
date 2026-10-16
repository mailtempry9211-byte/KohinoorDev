import { useMemo, useState, useEffect, useRef } from 'react';
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Phone,
  PhoneOff,
  RefreshCw,
  Mic,
  Play,
  Pause,
  Download,
  Folder,
  Music,
  Info,
  Clock,
  HardDrive
} from 'lucide-react';
import { useStore } from '../store/StoreContext';

const FILTERS = [
  { id: 'all', label: 'All', icon: Phone },
  { id: 'incoming', label: 'Incoming', icon: PhoneIncoming },
  { id: 'outgoing', label: 'Outgoing', icon: PhoneOutgoing },
  { id: 'missed', label: 'Missed', icon: PhoneMissed }
];

const RECORDING_FOLDERS = [
  { id: '/MIUI/sound_recorder/call_rec', label: 'MIUI / HyperOS Call Records (/MIUI/sound_recorder/call_rec)' },
  { id: '/Recordings/Call', label: 'Android Call Records (/Recordings/Call)' },
  { id: '/Recordings', label: 'General Voice Recordings (/Recordings)' },
  { id: '/MIUI/sound_recorder', label: 'MIUI Sound Recorder Root (/MIUI/sound_recorder)' }
];

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.amr', '.3gp', '.ogg', '.opus', '.flac'];

export default function CallLogs() {
  const { activeDeviceId, calls, files, sendCommand, pushToast, callLogsSubTab, setCallLogsSubTab } = useStore();
  const activeTab = callLogsSubTab || 'history';
  const setActiveTab = setCallLogsSubTab || (() => {});
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Call Recordings state
  const [selectedFolder, setSelectedFolder] = useState('/MIUI/sound_recorder/call_rec');
  const [scanningRecordings, setScanningRecordings] = useState(false);
  const [activeAudioPlaying, setActiveAudioPlaying] = useState(null); // { path, name, blobUrl }
  const [loadingAudioPath, setLoadingAudioPath] = useState(null);

  const refreshCalls = async () => {
    if (!activeDeviceId || refreshing) return;
    setRefreshing(true);
    await sendCommand('request-calls', { deviceId: activeDeviceId });
    setRefreshing(false);
  };

  const scanFolder = (folderPath) => {
    if (!activeDeviceId) return;
    setScanningRecordings(true);
    sendCommand('file-list', { deviceId: activeDeviceId, path: folderPath || selectedFolder });
  };

  // When switching to recordings tab or changing folder, automatically scan
  useEffect(() => {
    if (activeTab === 'recordings' && activeDeviceId) {
      scanFolder(selectedFolder);
    }
  }, [activeTab, selectedFolder, activeDeviceId]);

  // When file-list response comes in, turn off scan spinner
  useEffect(() => {
    if (files?.path) {
      setScanningRecordings(false);
    }
  }, [files]);

  // Handle incoming downloaded recording audio
  useEffect(() => {
    if (!files?.download) return;
    if (files.download.error) {
      setLoadingAudioPath(null);
      pushToast(`Failed to load recording: ${files.download.error}`, 'error');
      return;
    }
    const { blobUrl, name } = files.download;
    if (blobUrl && loadingAudioPath) {
      setActiveAudioPlaying({ path: loadingAudioPath, name: name || 'call_recording', blobUrl });
      setLoadingAudioPath(null);
      pushToast(`Playing "${name}"`, 'info');
    }
  }, [files?.download]);

  const playRecording = (entry) => {
    if (activeAudioPlaying?.path === entry.path) {
      // Toggle stop
      setActiveAudioPlaying(null);
      return;
    }
    setLoadingAudioPath(entry.path);
    sendCommand('file-download', {
      deviceId: activeDeviceId,
      path: entry.path,
      name: entry.name,
      mimeType: entry.mimeType || 'audio/mp3'
    });
  };

  const downloadRecording = (entry) => {
    pushToast(`Requesting download for "${entry.name}"...`, 'info');
    sendCommand('file-download', {
      deviceId: activeDeviceId,
      path: entry.path,
      name: entry.name,
      mimeType: entry.mimeType || 'audio/mp3'
    });
  };

  const list = useMemo(() => {
    const all = calls[activeDeviceId] || [];
    const sorted = [...all].sort((a, b) => b.timestamp - a.timestamp);
    if (filter === 'all') return sorted;
    return sorted.filter((call) => call.type === filter);
  }, [calls, activeDeviceId, filter]);

  // Filter current files list for audio recordings
  const recordingFiles = useMemo(() => {
    if (!files?.entries) return [];
    return files.entries.filter((item) => {
      if (item.isDirectory) return false;
      const lower = item.name.toLowerCase();
      return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
    });
  }, [files]);

  if (!activeDeviceId) return <EmptyState />;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* HEADER WITH TAB NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                : 'bg-gray-900 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <Phone className="h-4 w-4" />
            Call History ({list.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recordings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'recordings'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/30'
                : 'bg-gray-900 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <Mic className="h-4 w-4" />
            Call Recordings Vault
          </button>
        </div>

        {/* REFRESH & FILTERS */}
        {activeTab === 'history' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={refreshCalls}
              disabled={!activeDeviceId || refreshing}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:opacity-40"
              title="Request fresh call log from the phone"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
              {FILTERS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => scanFolder(selectedFolder)}
              disabled={!activeDeviceId || scanningRecordings}
              className="flex items-center gap-1.5 rounded-lg bg-sky-950 border border-sky-800 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scanningRecordings ? 'animate-spin text-sky-400' : ''}`} />
              {scanningRecordings ? 'Scanning Phone Storage...' : 'Scan Recordings'}
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: CALL HISTORY LIST */}
      {activeTab === 'history' && (
        <>
          {list.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-700 py-12 text-center text-sm text-gray-500">
              No {filter === 'all' ? '' : filter} calls recorded.
            </div>
          ) : (
            <div className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900/50">
              {list.map((call) => (
                <div key={call.id} className="flex items-center gap-4 px-4 py-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      call.type === 'missed'
                        ? 'bg-red-500/10 text-red-400'
                        : call.type === 'outgoing'
                        ? 'bg-sky-500/10 text-sky-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {call.type === 'missed' ? (
                      <PhoneMissed className="h-4 w-4" />
                    ) : call.type === 'outgoing' ? (
                      <PhoneOutgoing className="h-4 w-4" />
                    ) : (
                      <PhoneIncoming className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{call.name || call.number || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">
                      {call.number} · {formatTime(call.timestamp)}
                    </p>
                  </div>

                  <span className="hidden shrink-0 text-xs text-gray-500 sm:block">
                    {call.type === 'missed' ? 'Missed' : formatDuration(call.duration)}
                  </span>

                  <a
                    href={`tel:${call.number}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-teal-600 hover:text-white"
                    title="Callback"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: CALL RECORDINGS VAULT */}
      {activeTab === 'recordings' && (
        <div className="space-y-4">
          {/* FOLDER SELECTOR & EXPLANATION */}
          <div className="rounded-xl border border-sky-900/50 bg-sky-950/20 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-sky-200 flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-sky-400" />
                  Select Phone Recording Directory
                </h3>
                <p className="text-xs text-gray-400">
                  Choose the folder on the phone where your dialer stores automatic call recordings.
                </p>
              </div>

              <select
                value={selectedFolder}
                onChange={(e) => {
                  setSelectedFolder(e.target.value);
                  scanFolder(e.target.value);
                }}
                className="rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 px-3 py-2 outline-none focus:border-sky-500"
              >
                {RECORDING_FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-2 bg-gray-900/70 p-2.5 rounded-lg border border-gray-800 text-[11px] text-gray-300">
              <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-sky-300">MIUI / Xiaomi Auto-Call Recording:</span> Go to Phone Dialer &rarr; Settings &rarr; Call Recording &rarr; Enable <em>"Record calls automatically"</em>. MIUI automatically saves recorded calls in <code className="text-sky-300 bg-black/40 px-1 py-0.5 rounded">/MIUI/sound_recorder/call_rec</code>. All recorded calls will show up here to listen or download.
              </div>
            </div>
          </div>

          {/* ACTIVE AUDIO INLINE PLAYER */}
          {activeAudioPlaying && (
            <div className="rounded-xl border border-teal-800 bg-teal-950/40 p-4 shadow-lg space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-teal-400 animate-pulse" />
                  <span className="text-xs font-semibold text-teal-200 truncate max-w-md">
                    {activeAudioPlaying.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAudioPlaying(null)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Close Player
                </button>
              </div>
              <audio
                controls
                autoPlay
                src={activeAudioPlaying.blobUrl}
                className="w-full h-9 rounded-lg"
              />
            </div>
          )}

          {/* RECORDINGS LIST */}
          {files?.error && (
            <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-4 text-xs text-amber-300">
              Folder scan status: {files.error}
            </div>
          )}

          {recordingFiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/30 py-12 text-center text-xs text-gray-400 space-y-2">
              <Mic className="mx-auto h-8 w-8 text-gray-600 opacity-60" />
              <p className="font-semibold text-gray-300">No call recordings found in this directory</p>
              <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                If your phone stores recordings in another location, select another folder from the dropdown above or check if Call Recording is turned on in your phone dialer settings.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 bg-gray-900/60 shadow overflow-hidden">
              <div className="bg-gray-950/80 px-4 py-2.5 text-xs font-semibold text-gray-400 flex items-center justify-between">
                <span>Call Audio Recording ({recordingFiles.length} files)</span>
                <span>Actions</span>
              </div>
              {recordingFiles.map((entry) => {
                const isLoadingThis = loadingAudioPath === entry.path;
                const isPlayingThis = activeAudioPlaying?.path === entry.path;

                return (
                  <div key={entry.path} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-950 border border-sky-800/60 text-sky-400">
                        <Music className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-200 truncate">{entry.name}</p>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                          <span>{formatFileSize(entry.size)}</span>
                          {entry.lastModified && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(entry.lastModified)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => playRecording(entry)}
                        disabled={isLoadingThis}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow ${
                          isPlayingThis
                            ? 'bg-amber-600 text-white hover:bg-amber-500'
                            : 'bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50'
                        }`}
                      >
                        {isLoadingThis ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Loading...
                          </>
                        ) : isPlayingThis ? (
                          <>
                            <Pause className="h-3.5 w-3.5" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            Play
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadRecording(entry)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        title="Download call recording to PC"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-gray-500">
      <div className="text-center">
        <PhoneOff className="mx-auto h-10 w-10 opacity-40" />
        <p className="mt-3 text-sm">Select a device to view call history and recordings</p>
      </div>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: '2-digit', month: 'short' }) +
        ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let unitIndex = 0;
  while (val >= 1024 && unitIndex < units.length - 1) {
    val /= 1024;
    unitIndex++;
  }
  return `${val.toFixed(1)} ${units[unitIndex]}`;
}