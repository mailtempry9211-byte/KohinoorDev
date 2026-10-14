import { PhoneIncoming, MessageSquare, X } from 'lucide-react';
import { useStore } from '../store/StoreContext';

export default function AlertBanner() {
  const { incomingCallAlert, dismissAlert, smsAlert, dismissSmsAlert } = useStore();

  if (!incomingCallAlert && !smsAlert) return null;

  return (
    <>
      {incomingCallAlert && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-700/60 bg-red-950/60 px-4 py-3 shadow-lg animate-in slide-in-from-top">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
            <PhoneIncoming className="h-4 w-4 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-100">Incoming call</p>
            <p className="truncate text-xs text-red-300">
              {incomingCallAlert.name || incomingCallAlert.number || 'Unknown number'}
            </p>
          </div>
          <a
            href={`tel:${incomingCallAlert.number}`}
            className="hidden rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 sm:block"
          >
            Answer on phone
          </a>
          <button onClick={dismissAlert} className="text-red-400 hover:text-red-200">
            <X className="h-4 w-4" />
          </button>
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