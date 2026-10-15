import { PhoneIncoming, MessageSquare, X, Phone, PhoneOff } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function AlertBanner() {
  const { incomingCallAlert, dismissAlert, smsAlert, dismissSmsAlert, answerCall, declineCall } = useStore();

  if (!incomingCallAlert && !smsAlert) return null;

  return (
    <>
      {incomingCallAlert && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-700/60 bg-red-950/80 px-4 py-3 shadow-xl animate-in slide-in-from-top">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white animate-bounce">
              <PhoneIncoming className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-red-100 flex items-center gap-2">
                Incoming Phone Call
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </p>
              <p className="truncate text-xs text-red-200 font-mono">
                {incomingCallAlert.name || incomingCallAlert.number || 'Unknown Caller'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => answerCall(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow transition-colors cursor-pointer"
              title="Answer call remotely in Speakerphone mode"
            >
              <Phone className="h-3.5 w-3.5" /> Answer (Speaker)
            </button>
            <button
              type="button"
              onClick={() => declineCall()}
              className="flex items-center gap-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow transition-colors cursor-pointer"
              title="Decline / Reject call"
            >
              <PhoneOff className="h-3.5 w-3.5" /> Decline
            </button>
            <button onClick={dismissAlert} className="text-red-400 hover:text-red-200 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {smsAlert && !incomingCallAlert && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-teal-700/60 bg-teal-950/60 px-4 py-3 shadow-lg animate-in slide-in-from-top">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal-100">New message from {smsAlert.address}</p>
            <p className="truncate text-xs text-teal-300">{smsAlert.body}</p>
          </div>
          <button onClick={dismissSmsAlert} className="text-teal-400 hover:text-teal-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}