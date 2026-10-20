import { useMemo, useState, useEffect } from 'react';
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
  Music,
  Info,
  Clock,
  HardDrive,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useStore } from '../store/StoreContext';

const FILTERS = [
  { id: 'all', label: 'All Calls', icon: Phone },
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Call Recordings state
  const [selectedFolder, setSelectedFolder] = useState('/MIUI/sound_recorder/call_rec');
  const [scanningRecordings, setScanningRecordings] = useState(false);
  const [activeAudioPlaying, setActiveAudioPlaying] = useState(null);
  const [loadingAudioPath, setLoadingAudioPath] = useState(null);

  const refreshCalls = async () => {
    if (!activeDeviceId || refreshing) return;
    setRefreshing(true);
    await sendCommand('request-calls', { deviceId: activeDeviceId });
    setRefreshing(false);
  };

  const handleDeleteCall = async (targetCall = deleteTarget) => {
    if (!targetCall || !activeDeviceId) return;
    setDeleting(true);
    const res = await sendCommand('delete-call', {
      deviceId: activeDeviceId,
      callId: targetCall.id || targetCall.timestamp
    });
    setDeleting(false);
    if (res && res.success) {
      pushToast('Call record deleted from phone', 'success');
      setDeleteTarget(null);
      sendCommand('request-calls', { deviceId: activeDeviceId });
    } else {
      pushToast(`Failed to delete call: ${res?.error || 'phone offline'}`, 'error');
    }
  };

  const handleClearAllCalls = async () => {
    if (!activeDeviceId) return;
    setDeleting(true);
    const res = await sendCommand('clear-calls', {
      deviceId: activeDeviceId
    });
    setDeleting(false);
    if (res && res.success) {
      pushToast('All call logs wiped from phone', 'success');
      setShowClearAllModal(false);
      sendCommand('request-calls', { deviceId: activeDeviceId });
    } else {
      pushToast(`Failed to clear calls: ${res?.error || 'phone offline'}`, 'error');
    }
  };

  const scanFolder = (folderPath) => {
    if (!activeDeviceId) return;
    setScanningRecordings(true);
    sendCommand('file-list', { deviceId: activeDeviceId, path: folderPath || selectedFolder });
  };

  useEffect(() => {
    if (activeTab === 'recordings' && activeDeviceId) {
      scanFolder(selectedFolder);
    }
  }, [activeTab, selectedFolder, activeDeviceId]);

  useEffect(() => {
    if (files?.path) {
      setScanningRecordings(false);
    }
  }, [files]);

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
      setActiveAudioPlaying(null);
      return;
    }
    setLoadingAudioPath(entry.path);
    sendCommand('file-download', {
      deviceId: activeDeviceId,
      path: entry.path,
      name: entry.name
    });
  };

  const downloadRecording = (entry) => {
    sendCommand('file-download', {
      deviceId: activeDeviceId,
      path: entry.path,
      name: entry.name
    });
    pushToast(`Requesting download: ${entry.name}`, 'info');
  };

  const list = useMemo(() => {
    const all = calls[activeDeviceId] || [];
    const sorted = [...all].sort((a, b) => b.timestamp - a.timestamp);
    if (filter === 'all') return sorted;
    return sorted.filter((call) => call.type === filter);
  }, [calls, activeDeviceId, filter]);

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
    <div className="mx-auto max-w-4xl space-y-5">
      {/* HEADER WITH SUBTAB NAVIGATION & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-200/20 dark:shadow-black/30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`btn-interactive flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Phone className="h-4 w-4" />
            Call History ({list.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recordings')}
            className={`btn-interactive flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'recordings'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Mic className="h-4 w-4" />
            Call Recordings Vault
          </button>
        </div>

        {/* REFRESH & FILTERS */}
        {activeTab === 'history' ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshCalls}
              disabled={!activeDeviceId || refreshing}
              className="btn-interactive flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer shadow-xs"
              title="Request fresh call log from the phone"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-500 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {list.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                className="btn-interactive flex items-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 px-3 py-2 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-xs cursor-pointer"
                title="Wipe entire call history on device"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </button>
            )}
            <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-950/80 p-1 border border-slate-200/80 dark:border-slate-800">
              {FILTERS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`btn-interactive flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    filter === id
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
              className="btn-interactive flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scanningRecordings ? 'animate-spin text-indigo-500' : ''}`} />
              {scanningRecordings ? 'Scanning Storage...' : 'Scan Phone Recordings'}
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: CALL HISTORY LIST */}
      {activeTab === 'history' && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 p-2 shadow-xl shadow-slate-200/20 dark:shadow-black/30">
          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 py-12 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              No {filter === 'all' ? '' : filter} calls logged yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {list.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 group"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                      call.type === 'missed'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                        : call.type === 'outgoing'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
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
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {call.name || call.number || 'Unknown'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{call.number}</span>
                      <span>•</span>
                      <span>{formatTime(call.timestamp)}</span>
                      <span className="inline-flex sm:hidden font-semibold text-indigo-600 dark:text-indigo-400">
                        • {call.type === 'missed' ? 'Missed' : formatDuration(call.duration)}
                      </span>
                    </div>
                  </div>

                  <span className="hidden sm:inline-flex shrink-0 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-300 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60">
                    {call.type === 'missed' ? 'Missed' : formatDuration(call.duration)}
                  </span>

                  <a
                    href={`tel:${call.number}`}
                    className="btn-interactive flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-gradient-to-tr hover:from-indigo-600 hover:to-violet-600 hover:text-white border border-slate-200 dark:border-slate-700/80 shadow-xs cursor-pointer"
                    title="Callback"
                  >
                    <Phone className="h-4 w-4" />
                  </a>

                  {deleteTarget?.id === (call.id || call.timestamp) ? (
                    <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-xl animate-in fade-in">
                      <span className="text-[11px] font-bold text-rose-500">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCall(call)}
                        disabled={deleting}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {deleting ? '…' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(null)}
                        className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(call)}
                      className="btn-interactive flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700/80 shadow-xs cursor-pointer transition-all"
                      title="Delete call log from phone"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CALL RECORDINGS VAULT */}
      {activeTab === 'recordings' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 dark:bg-sky-950/20 backdrop-blur-xl p-5 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-sky-200 flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-sky-500" />
                  Select Phone Recording Directory
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose the folder on the phone where your dialer stores automatic call recordings.
                </p>
              </div>

              <select
                value={selectedFolder}
                onChange={(e) => {
                  setSelectedFolder(e.target.value);
                  scanFolder(e.target.value);
                }}
                className="rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 px-3 py-2 outline-none focus:border-indigo-500 shadow-xs cursor-pointer"
              >
                {RECORDING_FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-2.5 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-sky-500/20 text-xs text-slate-600 dark:text-slate-300">
              <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-sky-600 dark:text-sky-300">MIUI / Xiaomi Auto-Call Recording:</span> Go to Phone Dialer &rarr; Settings &rarr; Call Recording &rarr; Enable <em>"Record calls automatically"</em>. MIUI automatically saves recorded calls in <code className="text-sky-600 dark:text-sky-300 font-mono bg-sky-500/10 px-1 py-0.5 rounded">/MIUI/sound_recorder/call_rec</code>. All recorded calls will show up here to listen or download.
              </div>
            </div>
          </div>

          {/* ACTIVE AUDIO INLINE PLAYER */}
          {activeAudioPlaying && (
            <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 dark:bg-indigo-950/30 backdrop-blur-xl p-4 shadow-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="h-4 w-4 text-indigo-500 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-indigo-200 truncate max-w-md">
                    {activeAudioPlaying.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAudioPlaying(null)}
                  className="btn-interactive text-xs font-semibold text-slate-500 hover:text-rose-500 cursor-pointer"
                >
                  Close Player
                </button>
              </div>
              <audio
                controls
                autoPlay
                src={activeAudioPlaying.blobUrl}
                className="w-full h-10 rounded-xl"
              />
            </div>
          )}

          {/* RECORDINGS LIST */}
          {files?.error && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs font-medium text-amber-700 dark:text-amber-300">
              Folder scan status: {files.error}
            </div>
          )}

          {recordingFiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xl py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <Mic className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600 opacity-60" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No call recordings found in this directory</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                If your phone stores recordings in another location, select another folder from the dropdown above or check if Call Recording is turned on in your phone dialer settings.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              <div className="bg-slate-50 dark:bg-slate-950/60 px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Call Audio Recording ({recordingFiles.length} files)</span>
                <span>Actions</span>
              </div>
              {recordingFiles.map((entry) => {
                const isLoadingThis = loadingAudioPath === entry.path;
                const isPlayingThis = activeAudioPlaying?.path === entry.path;

                return (
                  <div
                    key={entry.path}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-indigo-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
                        <Music className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{entry.name}</p>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
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
                        className={`btn-interactive flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          isPlayingThis
                            ? 'bg-amber-600 text-white hover:bg-amber-500'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50'
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
                        className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
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



      {/* Clear All Calls Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-400 dark:border-rose-900/80 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Wipe All Call Logs?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently delete <strong>all call history entries</strong> from the child's phone. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllCalls}
                disabled={deleting}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-500/25 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Wiping…' : 'Yes, Wipe All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-slate-400">
      <div className="text-center">
        <PhoneOff className="mx-auto h-12 w-12 opacity-30 text-indigo-500 animate-pulse" />
        <p className="mt-3 text-sm font-semibold">Select a device to view call history and recordings</p>
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