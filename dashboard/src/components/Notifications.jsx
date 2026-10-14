import { useMemo, useState, useEffect } from 'react';
import { Bell, X, Smartphone, RefreshCw } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function Notifications() {
  const {
    notifications,
    activeDevice,
    activeDeviceId,
    markNotificationRead,
    dismissNotification,
    dismissAllNotifications,
    refreshNotifications
  } = useStore();
  const [filterUnread, setFilterUnread] = useState(false);
  const [notifRefreshing, setNotifRefreshing] = useState(false);

  useEffect(() => {
    // request browser permission to show system popups
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const activeList = useMemo(() => {
    const list = activeDeviceId
      ? notifications.filter((n) => n.deviceId === activeDeviceId)
      : notifications;
    const sorted = [...list].sort((a, b) => (b.postTime || 0) - (a.postTime || 0));
    return filterUnread ? sorted.filter((n) => !n.read) : sorted;
  }, [notifications, activeDeviceId, filterUnread]);

  const unreadCount = useMemo(
    () => (activeDeviceId
      ? notifications.filter((n) => n.deviceId === activeDeviceId && !n.read).length
      : notifications.filter((n) => !n.read).length),
    [notifications, activeDeviceId]
  );

  const clearAll = () => {
    dismissAllNotifications();
  };

  const dismiss = (key) => {
    dismissNotification(key);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Notification Center</h2>
          <p className="text-xs text-gray-500">
            {activeDevice ? `Mirrored from ${activeDevice.deviceName}` : 'All devices'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (notifRefreshing) return;
              setNotifRefreshing(true);
              refreshNotifications?.();
              setNotifRefreshing(false);
            }}
            disabled={!activeDeviceId || notifRefreshing}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            title="Reload mirrored notifications"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${notifRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <label className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={filterUnread}
              onChange={(e) => setFilterUnread(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 accent-teal-500"
            />
            Unread only
          </label>
          <button
            onClick={clearAll}
            disabled={activeList.length === 0}
            className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Dismiss all
          </button>
        </div>
      </div>

      {activeList.length === 0 ? (
        <Empty />
      ) : (
        <div className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900/50">
          {activeList.map((note) => (
            <NotificationRow
              key={note.key}
              note={note}
              onRead={() => markNotificationRead(note.key)}
              onDismiss={() => dismiss(note.key)}
            />
          ))}
        </div>
      )}

      {unreadCount > 0 && (
        <p className="text-xs text-gray-500">{unreadCount} unread notifications</p>
      )}
    </div>
  );
}

function NotificationRow({ note, onRead, onDismiss }) {
  const time = note.postTime ? new Date(note.postTime).toLocaleString() : '';

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
      onMouseEnter={onRead}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600/20 text-teal-400">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">{note.title || note.appName || 'Notification'}</p>
            {!note.read && (
              <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                New
              </span>
            )}
          </div>
          {note.text && <p className="mt-1 text-sm text-gray-400 whitespace-pre-wrap">{note.text}</p>}
          <p className="mt-1 text-xs text-gray-500">
            {note.appName}
            {time ? ` · ${time}` : ''}
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-red-600 hover:text-white"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 text-center text-gray-500">
      <Bell className="h-9 w-9 opacity-40" />
      <p className="text-sm">No notifications mirrored yet.</p>
      <p className="text-xs">Enable "Notification access" on your Android phone and they will appear here.</p>
    </div>
  );
}