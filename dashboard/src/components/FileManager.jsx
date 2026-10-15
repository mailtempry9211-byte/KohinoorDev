import { useEffect, useState } from 'react';
import {
  Folder as FolderIcon,
  File as FileIcon,
  ChevronRight,
  Download,
  Upload,
  HardDrive,
  ArrowUp,
  RefreshCw,
  Trash2,
  Edit3,
  FolderPlus
} from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function FileManager() {
  const { activeDeviceId, files, sendCommand, deleteFile, renameFile, createFolder, pushToast } = useStore();
  const [downloaded, setDownloaded] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameItem, setRenameItem] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (activeDeviceId) sendCommand('file-list', { deviceId: activeDeviceId, path: '/' });
  }, [activeDeviceId, sendCommand]);

  useEffect(() => {
    if (!files.download) return;
    if (files.download.error) {
      setDownloading(null);
      return;
    }
    const { blobUrl, name } = files.download;
    if (!blobUrl) return;
    const safeName = name || 'download';
    setDownloaded({ url: blobUrl, name: safeName });
    setDownloading(null);

    // Auto-trigger browser download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [files.download]);

  const openFolder = (path) => sendCommand('file-list', { deviceId: activeDeviceId, path });

  const download = (entry) => {
    setDownloaded(null);
    setDownloading(entry.path);
    sendCommand('file-download', { deviceId: activeDeviceId, path: entry.path, name: entry.name, mimeType: entry.mimeType });
  };

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <HardDrive className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-3 text-sm">Select a device to browse storage</p>
        </div>
      </div>
    );
  }

  const segments = files.path.split('/').filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">File Explorer</h2>
          <p className="text-xs text-gray-500">Internal storage</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewFolderName('');
              setNewFolderOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-200 transition-colors hover:bg-gray-700 border border-gray-700 shadow-sm"
            title="Create a new folder in this directory"
          >
            <FolderPlus className="h-3.5 w-3.5 text-teal-400" />
            New Folder
          </button>
          <button
            onClick={() => openFolder(files.path || '/')}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-700"
            title="Refresh this folder"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 shadow"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-sm">
        <button onClick={() => openFolder('/')} className="text-gray-400 hover:text-white">
          storage
        </button>
        {segments.map((segment, index) => (
          <span key={index} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            <button
              onClick={() => openFolder('/' + segments.slice(0, index + 1).join('/'))}
              className="text-gray-400 hover:text-white"
            >
              {segment}
            </button>
          </span>
        ))}
      </nav>

      {files.error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {files.error}
        </div>
      )}

      {files.path !== '/' && (
        <button
          onClick={() => openFolder('/' + segments.slice(0, -1).join('/'))}
          className="flex items-center gap-2 rounded-lg border border-gray-800 px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <ArrowUp className="h-4 w-4" />
          Up one level
        </button>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/50">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5 font-medium w-auto">Name</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell w-24">Size</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell w-44">Modified</th>
              <th className="px-4 py-2.5 text-right font-medium w-28 sm:w-32">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/70">
            {files.entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">
                  This folder is empty or permission was denied.
                </td>
              </tr>
            )}
            {files.entries.map((entry) => {
              const isDir = Boolean(entry.isDirectory === true || entry.isDirectory === 'true' || entry.isDirectory === 1);
              return (
                <tr key={entry.path} className="transition-colors hover:bg-gray-800/40">
                  <td className="px-4 py-2.5 max-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      {isDir ? (
                        <button onClick={() => openFolder(entry.path)} className="flex min-w-0 items-center gap-3 text-left">
                          <FolderIcon className="h-4 w-4 shrink-0 text-teal-400" />
                          <span className="truncate font-medium text-teal-300 hover:text-teal-200" title={entry.name}>{entry.name}</span>
                        </button>
                      ) : (
                        <div className="flex min-w-0 items-center gap-3">
                          <FileIcon className="h-4 w-4 shrink-0 text-gray-500" />
                          <span className="truncate text-gray-200" title={entry.name}>{entry.name}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-2.5 text-gray-500 sm:table-cell truncate">
                    {isDir ? '—' : formatSize(entry.size)}
                  </td>
                  <td className="hidden px-4 py-2.5 text-gray-500 md:table-cell truncate">
                    {entry.lastModified ? new Date(entry.lastModified).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {!isDir && (
                        <button
                          onClick={() => download(entry)}
                          disabled={downloading === entry.path}
                          className="inline-flex items-center gap-1 rounded bg-gray-800 p-1.5 text-xs text-gray-300 hover:bg-teal-600 hover:text-white transition-colors disabled:opacity-50"
                          title="Download file"
                        >
                          <Download className={`h-3.5 w-3.5 ${downloading === entry.path ? 'animate-bounce' : ''}`} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setRenameItem(entry);
                          setRenameValue(entry.name);
                        }}
                        className="inline-flex items-center gap-1 rounded bg-gray-800 p-1.5 text-xs text-gray-400 hover:text-teal-300 hover:bg-gray-750 transition-colors"
                        title="Rename"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(entry)}
                        className="inline-flex items-center gap-1 rounded bg-gray-800 p-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-750 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {downloaded && !downloaded.error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-2xl">
            <h3 className="text-sm font-semibold">Download ready</h3>
            <p className="mt-1.5 text-xs text-gray-400">
              Your browser will save <span className="text-gray-200">{downloaded.name}</span>.
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href={downloaded.url}
                download={downloaded.name}
                onClick={() => setDownloaded(null)}
                className="flex-1 rounded-lg bg-teal-600 py-2 text-center text-sm font-medium text-white hover:bg-teal-500"
              >
                Save file
              </a>
              <button onClick={() => setDownloaded(null)} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          currentPath={files.path}
          onClose={() => setUploadOpen(null)}
          onPickTarget={(path) => setUploadTarget(path)}
          uploadTarget={uploadTarget}
          onUpload={async (file) => {
            setUploadOpen(false);
            const reader = new FileReader();
            reader.onload = async () => {
              const base64 = btoa(new Uint8Array(reader.result).reduce((data, byte) => data + String.fromCharCode(byte), ''));
              await sendCommand('file-upload', {
                deviceId: activeDeviceId,
                path: (uploadTarget || files.path) + '/' + file.name,
                data: base64,
                isLastChunk: true
              });
            };
            reader.readAsArrayBuffer(file);
          }}
        />
      )}

      {newFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-teal-400" /> Create New Folder
            </h3>
            <p className="text-xs text-gray-400">
              Create folder in: <span className="font-mono text-gray-300">{files.path || '/'}</span>
            </p>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. MyDocuments or Photos"
              autoFocus
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-teal-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNewFolderOpen(false)}
                className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newFolderName.trim()}
                onClick={() => {
                  createFolder(files.path || '/', newFolderName.trim());
                  setNewFolderOpen(false);
                }}
                className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {renameItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-teal-400" /> Rename Item
            </h3>
            <p className="text-xs text-gray-400">
              Current: <span className="font-mono text-gray-300">{renameItem.name}</span>
            </p>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-teal-500 focus:outline-none font-mono"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRenameItem(null)}
                className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!renameValue.trim() || renameValue === renameItem.name}
                onClick={() => {
                  renameFile(renameItem.path, renameValue.trim());
                  setRenameItem(null);
                }}
                className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-red-900 bg-gray-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-400">
              <Trash2 className="h-5 w-5" />
              <h3 className="text-sm font-bold text-red-200">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to permanently delete:
              <br />
              <strong className="text-white font-mono block mt-1.5 p-2 bg-gray-900 rounded border border-gray-800 break-all">
                {deleteTarget.name}
              </strong>
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteFile(deleteTarget.path);
                  setDeleteTarget(null);
                }}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-500 shadow-md shadow-red-950"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadModal({ currentPath, onClose, onPickTarget, uploadTarget, onUpload }) {
  const [targetPath, setTargetPath] = useState(currentPath || '/');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (uploadTarget) setTargetPath(uploadTarget);
  }, [uploadTarget]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-2xl">
        <h3 className="text-sm font-semibold">Upload file to phone</h3>

        <label className="mt-1.5 block text-xs text-gray-400">Destination folder</label>
        <div className="mt-1 flex gap-2">
          <input
            value={targetPath}
            onChange={(e) => setTargetPath(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={() => onPickTarget(targetPath)}
            className="rounded-lg bg-gray-800 px-3 py-2 text-xs hover:bg-gray-700"
          >
            Use path
          </button>
        </div>

        <label className="mt-4 block text-xs text-gray-400">File</label>
        <input
          type="file"
          onChange={(e) => setSelected(e.target.files?.[0])}
          className="mt-1 block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-teal-500"
        />

        <p className="mt-3 rounded-lg bg-gray-800/60 px-3 py-2 text-[11px] text-gray-500">
          Large files are base64-encoded through the relay. Keep uploads modest in local mode.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => selected && onUpload(selected)}
            disabled={!selected}
            className="flex-1 rounded-lg bg-teal-600 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-40"
          >
            Upload
          </button>
          <button onClick={onClose} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes) {
  if (bytes == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}