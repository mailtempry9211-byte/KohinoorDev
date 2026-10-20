import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Crown
} from 'lucide-react';

export default function DashboardLockModal({ isOpen, onUnlock, onLock }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGodMode, setIsGodMode] = useState(false);

  // Tab: 'unlock' or 'change'
  const [tab, setTab] = useState('unlock');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Clear inputs on open/tab change
  useEffect(() => {
    setError('');
    setSuccessMsg('');
    setPin('');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  }, [tab, isOpen]);

  const handleVerifyPin = async (e) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your 4-digit PIN');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('plh_auth_token', data.token);
        if (data.isGodMode) {
          setIsGodMode(true);
          localStorage.setItem('plh_god_mode', 'true');
        }
        setSuccessMsg(data.message || 'Unlocked successfully!');
        setTimeout(() => {
          onUnlock();
        }, 500);
      } else {
        setError(data.message || 'Incorrect PIN. Default is 9211.');
      }
    } catch (err) {
      setError('Connection error. Please verify server status.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (e) => {
    if (e) e.preventDefault();
    if (!newPin.trim() || newPin.trim().length < 4) {
      setError('New PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PIN and Confirm PIN do not match');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: currentPin.trim(), newPin: newPin.trim() })
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg('Password updated! Use your new PIN next time.');
        setTimeout(() => {
          setTab('unlock');
          setPin(newPin);
        }, 1200);
      } else {
        setError(data.message || 'Failed to update PIN. Check current PIN.');
      }
    } catch (err) {
      setError('Error communicating with server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (val) => {
    setError('');
    if (val === 'DEL') {
      setPin((prev) => prev.slice(0, -1));
    } else if (val === 'CLR') {
      setPin('');
    } else {
      if (pin.length < 12) {
        setPin((prev) => prev + val);
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-300 select-none">
      <div className="w-full max-w-sm rounded-3xl border border-indigo-500/30 bg-white/90 dark:bg-slate-900/90 shadow-2xl shadow-indigo-500/10 backdrop-blur-3xl overflow-hidden p-6 sm:p-7 relative transition-all">
        {/* Glow decorative backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="text-center relative z-10 mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-inner mb-3">
            {isGodMode ? <Crown className="h-7 w-7 text-amber-400 animate-pulse" /> : <Lock className="h-7 w-7" />}
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>{tab === 'unlock' ? 'PhoneLink Hub Security' : 'Change Security PIN'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              PRO
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {tab === 'unlock'
              ? 'Enter PIN passcode to unlock controls & telemetry'
              : 'Set a new secure password for this dashboard'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-5 relative z-10">
          <button
            type="button"
            onClick={() => setTab('unlock')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === 'unlock'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Unlock Dashboard
          </button>
          <button
            type="button"
            onClick={() => setTab('change')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === 'change'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Change PIN
          </button>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* UNLOCK TAB */}
        {tab === 'unlock' && (
          <form onSubmit={handleVerifyPin} className="space-y-4 relative z-10">
            {/* PIN Input with Eye Toggle */}
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN (Default 9211)"
                className="w-full tracking-widest text-center text-lg font-mono font-bold py-3 pl-4 pr-11 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Quick Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeypadPress(k)}
                  className="py-2.5 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/50 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" />
              <span>{loading ? 'Verifying...' : 'Unlock Dashboard'}</span>
            </button>

            {/* Footer Notice */}
            <div className="text-center pt-2">
              <span className="text-[11px] text-slate-400">
                Default PIN: <strong className="text-indigo-500 dark:text-indigo-400 font-mono">9211</strong>
              </span>
            </div>
          </form>
        )}

        {/* CHANGE PIN TAB */}
        {tab === 'change' && (
          <form onSubmit={handleChangePin} className="space-y-3 relative z-10">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                Current PIN
              </label>
              <input
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Current PIN (e.g. 9211)"
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                New PIN (Min 4 digits)
              </label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter new PIN"
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                Confirm New PIN
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Re-enter new PIN"
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>{loading ? 'Updating...' : 'Save New PIN'}</span>
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

