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

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-200/20 dark:shadow-black/30">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Notification Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeDevice ? `Live mirrored from ${activeDevice.deviceName}` : 'All connected devices'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (notifRefreshing) return;
              setNotifRefreshing(true);
              refreshNotifications?.();
              setNotifRefreshing(false);
            }}
            disabled={!activeDeviceId || notifRefreshing}
            className="btn-interactive flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer shadow-xs"
            title="Reload mirrored notifications"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-500 ${notifRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filterUnread}
              onChange={(e) => setFilterUnread(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            Unread only
          </label>
          <button
            onClick={dismissAllNotifications}
            disabled={activeList.length === 0}
            className="btn-interactive rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer shadow-xs"
          >
            Dismiss All
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {activeList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xl py-14 text-center text-xs font-medium text-slate-500 dark:text-slate-400 space-y-2">
          <Bell className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600 opacity-50" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No active notifications</p>
          <p className="text-[11px] text-slate-500">Incoming device alerts and push notifications will show up here.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {activeList.map((note) => (
            <NotificationRow
              key={note.key}
              note={note}
              onRead={() => markNotificationRead(note.key)}
              onDismiss={() => dismissNotification(note.key)}
            />
          ))}
        </div>
      )}

      {unreadCount > 0 && (
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 pl-2">
          {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

function NotificationRow({ note, onRead, onDismiss }) {
  const time = note.postTime ? new Date(note.postTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div
      className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between hover:bg-indigo-50/50 dark:hover:bg-slate-800/40 transition-colors group"
      onMouseEnter={onRead}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{note.title || note.appName || 'Notification'}</p>
            {!note.read && (
              <span className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs">
                New
              </span>
            )}
          </div>
          {note.text && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {note.text}
            </p>
          )}
          <p className="mt-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
            {note.appName} {time ? `• ${time}` : ''}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="btn-interactive self-start opacity-0 group-hover:opacity-100 rounded-lg p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
        title="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}