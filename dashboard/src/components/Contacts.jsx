import { useMemo, useState } from 'react';
import { Users, Search, Download, Phone, Plus } from 'lucide-react';
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
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <Users className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-3 text-sm">Select a device to view contacts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Contacts</h2>
          <p className="text-xs text-gray-500">{activeDevice ? `Synced from ${activeDevice.deviceName}` : ''} · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => sendCommand('request-contacts', { deviceId: activeDeviceId })} className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800">Refresh</button>
          <button onClick={() => download('vcf')} disabled={filtered.length === 0} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-40"><Download className="h-3.5 w-3.5" />.vcf</button>
          <button onClick={() => download('csv')} disabled={filtered.length === 0} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-40"><Download className="h-3.5 w-3.5" />.csv</button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
        <Search className="h-4 w-4 text-gray-500" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or number…" className="w-full bg-transparent text-sm outline-none placeholder:text-gray-600" />
      </div>

      <AddContactForm />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center text-sm text-gray-500">No contacts synced yet. Open the app on the phone and grant contacts permission.</div>
      ) : (
        <div className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900/50">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600/20 text-teal-400"><Phone className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name || 'Unknown'}</p>
                <p className="truncate text-xs text-gray-500">{(c.numbers || []).join(' · ')}</p>
              </div>
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
    } else {
      pushToast(`Add contact failed: ${res?.error || 'phone offline?'}`, 'error');
    }
  };

  return (
    <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-800 bg-gray-900/50 p-3">
      <div className="min-w-40 flex-1">
        <label className="text-[11px] text-gray-500">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New contact name" className="mt-1 w-full rounded-lg bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
      </div>
      <div className="min-w-40 flex-1">
        <label className="text-[11px] text-gray-500">Phone number</label>
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+91…" className="mt-1 w-full rounded-lg bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
      </div>
      <button type="submit" disabled={adding || !name.trim() || !number.trim()} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500 disabled:opacity-40"><Plus className="h-4 w-4" />{adding ? 'Adding…' : 'Add contact'}</button>
    </form>
  );
}
