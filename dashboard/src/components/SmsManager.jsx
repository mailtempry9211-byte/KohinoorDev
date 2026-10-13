import { useMemo, useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function SmsManager() {
  const { activeDeviceId, activeDevice, messages, sendCommand } = useStore();
  const [conversations, setConversations] = useState([]);
  const [openThread, setOpenThread] = useState(null);
  const [draft, setDraft] = useState('');
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const bottomRef = useRef(null);

  const all = useMemo(() => {
    const list = messages[activeDeviceId] || [];
    return [...list].sort((a, b) => a.date - b.date);
  }, [messages, activeDeviceId]);

  useEffect(() => {
    const byAddress = {};
    for (const msg of all) {
      const key = msg.address;
      if (!byAddress[key]) byAddress[key] = { address: key, messages: [], lastDate: 0, lastBody: '', unread: 0 };
      byAddress[key].messages.push(msg);
      if (msg.date >= byAddress[key].lastDate) {
        byAddress[key].lastDate = msg.date;
        byAddress[key].lastBody = msg.body;
        byAddress[key].type = msg.type;
      }
      if (msg.type === 1 && msg.date > Date.now() - 60_000) byAddress[key].unread += 1;
    }
    setConversations(Object.values(byAddress).sort((a, b) => b.lastDate - a.lastDate));
    if (!openThread && Object.keys(byAddress).length > 0) setOpenThread(Object.values(byAddress).sort((a, b) => b.lastDate - a.lastDate)[0].address);
  }, [all, openThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [openThread, all.length]);

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <MessageSquare className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-3 text-sm">Select a device to view messages</p>
        </div>
      </div>
    );
  }

  const thread = openThread ? conversations.find((c) => c.address === openThread) : null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !openThread) return;
    const optimistic = {
      id: `local-${Date.now()}`,
      address: openThread,
      body: draft.trim(),
      date: Date.now(),
      type: 2,
      deviceId: activeDeviceId,
      pending: true
    };
    setConversations((list) =>
      list.map((c) => (c.address === openThread ? { ...c, messages: [...c.messages, optimistic], lastBody: optimistic.body, lastDate: optimistic.date } : c))
    );
    setDraft('');
    await sendCommand('send-sms', { deviceId: activeDeviceId, recipient: openThread, message: optimistic.body });
  };

  return (
    <div className="mx-auto flex h-full max-w-6xl gap-4">
      <div className={`${mobileShowThread ? 'hidden' : 'flex'} w-full flex-col overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50 md:flex md:w-80 md:shrink-0`}>
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <p className="text-xs text-gray-500">{conversations.length} threads</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/70 scrollbar-thin">
          {conversations.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-gray-500">No messages yet.</div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.address}
              onClick={() => {
                setOpenThread(conv.address);
                setMobileShowThread(true);
              }}
              className={`w-full px-4 py-3 text-left transition-colors ${openThread === conv.address ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{conv.address}</p>
                    <span className="shrink-0 text-[10px] text-gray-500">{formatDay(conv.lastDate)}</span>
                  </div>
                  <p className="truncate text-xs text-gray-500">
                    {conv.type === 2 ? 'You: ' : ''}
                    {conv.lastBody}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold">
                    {conv.unread}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`${mobileShowThread ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50 md:flex`}>
        {thread ? (
          <>
            <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
              <button onClick={() => setMobileShowThread(false)} className="text-gray-400 hover:text-white md:hidden">
                ←
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
                <User className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium">{thread.address}</p>
              {!activeDevice?.online && (
                <span className="ml-auto rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-400">
                  Offline — will send on reconnect
                </span>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin">
              {thread.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 2 ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      msg.type === 2
                        ? 'rounded-br-sm bg-indigo-600 text-white'
                        : 'rounded-bl-sm bg-gray-800 text-gray-100'
                    } ${msg.pending ? 'opacity-60' : ''}`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={`mt-1 text-[10px] ${msg.type === 2 ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {new Date(msg.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      {msg.pending ? ' · sending…' : ''}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-gray-800 p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="min-w-0 flex-1 rounded-full bg-gray-800 px-4 py-2.5 text-sm outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}

function formatDay(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}