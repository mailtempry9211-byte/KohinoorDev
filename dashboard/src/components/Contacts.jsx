import { useMemo, useState } from 'react';
import { Users, Search, Download, Phone, Plus, RefreshCw } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function Contacts() {
  const { activeDeviceId, activeDevice, contacts, sendCommand } = useStore();
  const [query, setQuery] = useState('');

  const list = useMemo(() => contacts[activeDeviceId] || [], [contacts, activeDeviceId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list
      .filter((c) => (c.name || '').toLowerCase().includes(q) || (c.numbers || []).some((n) => n.includes(query.trim())))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [list, query]);

  const download = (format) => {
    if (filtered.length === 0) return;
    let blob;
    if (format === 'vcf') {
      const vcf = filtered
        .map((c) => ['BEGIN:VCARD', 'VERSION:3.0', `FN:${c.name || 'Unknown'}`, ...(c.numbers || []).map((n) => `TEL;TYPE=CELL:${n}`), 'END:VCARD'].join('\n'))
        .join('\n');
      blob = new Blob([vcf], { type: 'text/vcard' });
    } else {
      const rows = ['name,number', ...filtered.flatMap((c) => (c.numbers || []).map((n) => `"${(c.name || '').replace(/"/g, '""')}","${n}"`))];
      blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${activeDeviceId || 'device'}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 opacity-30 text-indigo-500 animate-pulse" />
          <p className="mt-3 text-sm font-semibold">Select a device to view contacts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-200/20 dark:shadow-black/30">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Device Contacts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeDevice ? `Synced from ${activeDevice.deviceName}` : ''} • {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => sendCommand('request-contacts', { deviceId: activeDeviceId })}
            className="btn-interactive flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-indigo-500" /> Refresh
          </button>
          <button
            onClick={() => download('vcf')}
            disabled={filtered.length === 0}
            className="btn-interactive flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> .vcf
          </button>
          <button
            onClick={() => download('csv')}
            disabled={filtered.length === 0}
            className="btn-interactive flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> .csv
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by contact name or phone number…"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs transition-all"
        />
      </div>

      {/* Add Contact Form */}
      <AddContactForm />

      {/* Contacts List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xl p-10 text-center text-xs font-medium text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">No contacts matching your query</p>
          <p className="text-[11px] text-slate-500">Ensure the Phone Link Android app has Contact permissions granted.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3.5 px-4 py-3 hover:bg-indigo-50/50 dark:hover:bg-slate-800/40 transition-colors group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                {(c.name || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {c.name || 'Unknown'}
                </p>
                <p className="truncate text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {(c.numbers || []).join(' • ')}
                </p>
              </div>
              {c.numbers?.[0] && (
                <a
                  href={`tel:${c.numbers[0]}`}
                  className="btn-interactive flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-gradient-to-tr hover:from-indigo-600 hover:to-violet-600 hover:text-white border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
                  title="Call Contact"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddContactForm() {
  const { activeDeviceId, sendCommand, pushToast } = useStore();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !number.trim() || !activeDeviceId) return;
    setAdding(true);
    const res = await sendCommand('add-contact', { deviceId: activeDeviceId, name: name.trim(), number: number.trim() });
    setAdding(false);
    if (res && res.success) {
      setName('');
      setNumber('');
      sendCommand('request-contacts', { deviceId: activeDeviceId });
      pushToast('Contact added to phone', 'success');
    } else {
      pushToast(`Add contact failed: ${res?.error || 'phone offline?'}`, 'error');
    }
  };

  return (
    <form
      onSubmit={handleAdd}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-lg"
    >
      <div className="min-w-44 flex-1">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Contact Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John Doe"
          className="w-full rounded-xl bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 shadow-xs"
        />
      </div>
      <div className="min-w-44 flex-1">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+91…"
          className="w-full rounded-xl bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 shadow-xs"
        />
      </div>
      <button
        type="submit"
        disabled={adding || !name.trim() || !number.trim()}
        className="btn-interactive flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        {adding ? 'Adding…' : 'Add Contact'}
      </button>
    </form>
  );
}
