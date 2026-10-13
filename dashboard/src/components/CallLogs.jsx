import { useMemo, useState } from 'react';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, PhoneOff } from 'lucide-react';
import { useStore } from '../store/StoreContext';

const FILTERS = [
  { id: 'all', label: 'All', icon: Phone },
  { id: 'incoming', label: 'Incoming', icon: PhoneIncoming },
  { id: 'outgoing', label: 'Outgoing', icon: PhoneOutgoing },
  { id: 'missed', label: 'Missed', icon: PhoneMissed }
];

export default function CallLogs() {
  const { activeDeviceId, calls } = useStore();
  const [filter, setFilter] = useState('all');

  const list = useMemo(() => {
    const all = calls[activeDeviceId] || [];
    const sorted = [...all].sort((a, b) => b.timestamp - a.timestamp);
    if (filter === 'all') return sorted;
    return sorted.filter((call) => call.type === filter);
  }, [calls, activeDeviceId, filter]);

  if (!activeDeviceId) return <EmptyState />;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Call History</h2>
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-indigo-600 hover:text-white"
                title="Callback"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ))}
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
        <p className="mt-3 text-sm">Select a device to view call history</p>
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