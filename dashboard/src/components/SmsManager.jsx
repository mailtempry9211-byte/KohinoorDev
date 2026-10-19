import { useMemo, useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User, RefreshCw, ArrowLeft } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function SmsManager({ isMobile = false }) {
  const { activeDeviceId, activeDevice, messages, sendCommand } = useStore();
  const [conversations, setConversations] = useState([]);
  const [openThread, setOpenThread] = useState(null);
  const [draft, setDraft] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [smsRefreshing, setSmsRefreshing] = useState(false);
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
    const sorted = Object.values(byAddress).sort((a, b) => b.lastDate - a.lastDate);
    setConversations(sorted);
    if (!openThread && sorted.length > 0) {
      setOpenThread(sorted[0].address);
    }
  }, [all, openThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [openThread, all.length]);

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 opacity-30 text-indigo-500 animate-pulse" />
          <p className="mt-3 text-sm font-semibold">Select a device to view SMS messages</p>
        </div>
      </div>
    );
  }

  const thread = openThread
    ? conversations.find((c) => c.address === openThread) ||
      { address: openThread, messages: [], lastDate: Date.now(), lastBody: '', type: 2, unread: 0 }
    : null;

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
    setConversations((list) => {
      const exists = list.some((c) => c.address === openThread);
      if (exists) {
        return list.map((c) => (c.address === openThread ? { ...c, messages: [...c.messages, optimistic], lastBody: optimistic.body, lastDate: optimistic.date } : c));
      }
      return [...list, { address: openThread, messages: [optimistic], lastDate: optimistic.date, lastBody: optimistic.body, type: 2, unread: 0 }];
    });
    const messageToSend = draft.trim();
    setDraft('');
    await sendCommand('send-sms', { deviceId: activeDeviceId, recipient: openThread, message: messageToSend });
  };

  return (
    <div className={`mx-auto flex max-w-6xl gap-4 ${
      isMobile
        ? 'w-full h-[calc(100vh-210px)] min-h-[500px]'
        : 'h-[calc(100vh-145px)]'
    }`}>
      {/* Sidebar: Conversation Threads */}
      <div className={`${
        isMobile
          ? (mobileShowThread ? 'hidden' : 'flex w-full')
          : `${mobileShowThread ? 'hidden' : 'flex'} w-full md:flex md:w-80 md:shrink-0`
      } flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl`}>
        <div className="border-b border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Conversations
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{conversations.length} threads</p>
            </div>
            <button
              onClick={async () => {
                if (!activeDeviceId || smsRefreshing) return;
                setSmsRefreshing(true);
                await sendCommand('request-sms', { deviceId: activeDeviceId });
                setSmsRefreshing(false);
              }}
              disabled={!activeDeviceId || smsRefreshing}
              className="btn-interactive flex items-center gap-1 rounded-xl bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 shadow-xs cursor-pointer"
              title="Request fresh SMS list from the phone"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-500 ${smsRefreshing ? 'animate-spin' : ''}`} />
              Sync
            </button>
          </div>

          {/* New message recipient input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newNumber.trim()) return;
              setOpenThread(newNumber.trim());
              setMobileShowThread(true);
            }}
            className="mt-3 flex items-center gap-2"
          >
            <input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="New number or contact…"
              className="min-w-0 flex-1 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-xs font-mono"
            />
            <button
              type="submit"
              disabled={!newNumber.trim()}
              className="btn-interactive shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs disabled:opacity-40 cursor-pointer"
            >
              Chat
            </button>
          </form>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 scrollbar-thin">
          {conversations.length === 0 && (
            <div className="px-4 py-12 text-center text-xs text-slate-400">No messages found.</div>
          )}
          {conversations.map((conv) => {
            const isActive = openThread === conv.address;
            return (
              <button
                key={conv.address}
                onClick={() => {
                  setOpenThread(conv.address);
                  setMobileShowThread(true);
                }}
                className={`w-full p-3 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/10 border border-indigo-500/30 shadow-xs'
                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{conv.address}</p>
                      <span className="shrink-0 text-[10px] font-mono text-slate-400">{formatDay(conv.lastDate)}</span>
                    </div>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {conv.type === 2 ? 'You: ' : ''}
                      {conv.lastBody}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-xs">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Thread Area */}
      <div className={`${
        isMobile
          ? (mobileShowThread ? 'flex w-full' : 'hidden')
          : `${mobileShowThread ? 'flex' : 'hidden'} min-w-0 flex-1 md:flex`
      } flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl`}>
        {thread ? (
          <>
            {/* Thread Header */}
            <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 bg-white/40 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => setMobileShowThread(false)}
                className={`btn-interactive text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 items-center justify-center cursor-pointer shadow-xs ${
                  isMobile ? 'flex' : 'flex md:hidden'
                }`}
                title="Back to conversations list"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{thread.address}</p>
                <p className="text-[10px] font-mono text-slate-400">Direct SMS Carrier Tunnel</p>
              </div>
              {!activeDevice?.online && (
                <span className="ml-auto rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  Offline — Queueing for reconnect
                </span>
              )}
            </div>

            {/* Chat Bubble Scroll Area */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
              {thread.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 2 ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl p-3.5 text-xs leading-relaxed transition-all ${
                      msg.type === 2
                        ? 'rounded-br-xs bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                        : 'rounded-bl-xs bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 shadow-xs'
                    } ${msg.pending ? 'opacity-70' : ''}`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={`mt-1.5 text-[9px] font-mono ${msg.type === 2 ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(msg.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      {msg.pending ? ' • sending…' : ''}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Message Compose Form */}
            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200/80 dark:border-slate-800 p-3 bg-white/40 dark:bg-slate-900/40">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type an SMS to push through phone…"
                className="min-w-0 flex-1 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-xs"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="btn-interactive flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Select a conversation thread on the left
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