import { useState, useEffect, useRef } from 'react';
import { Sparkles, Heart, Zap, Clock, ShieldCheck, X } from 'lucide-react';
import { useStore } from '../store/StoreContext';

const THOUGHTS = [
  { text: 'All systems synchronized and secure!', icon: ShieldCheck, mood: 'happy' },
  { text: 'Tick-tock! Watching over your phone 24/7.', icon: Clock, mood: 'smart' },
  { text: 'Everything is running butter smooth ⚡', icon: Zap, mood: 'excited' },
  { text: 'No missed calls or spam alerts right now ✌️', icon: Heart, mood: 'chill' },
  { text: 'Battery & network telemetry are looking great!', icon: Zap, mood: 'analytical' },
  { text: 'Offline GPS buffer is standing by if needed 🛰️', icon: Sparkles, mood: 'curious' },
  { text: 'Click me anytime to see what I am thinking!', icon: Sparkles, mood: 'wink' }
];

export default function ThinkingClock({ compact = false }) {
  const { connected, activeDevice, cellularInfo, batteryStats } = useStore();
  const [time, setTime] = useState(new Date());
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isThinking, setIsThinking] = useState(true);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [showThoughtBubble, setShowThoughtBubble] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [wink, setWink] = useState(false);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Periodic blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3800);
    return () => clearInterval(blinkInterval);
  }, []);

  // Thought rotation
  useEffect(() => {
    const thoughtTimer = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % THOUGHTS.length);
      // Brief thinking eye movement when thought changes
      setPupilOffset({ x: 2, y: -4 });
      setIsThinking(true);
      setTimeout(() => {
        setPupilOffset({ x: 0, y: 0 });
        setIsThinking(false);
      }, 1500);
    }, 8000);
    return () => clearInterval(thoughtTimer);
  }, []);

  // Clock hands angles
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  const formattedDigital = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = time.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const handleMascotClick = () => {
    setWink(true);
    setThoughtIndex((prev) => (prev + 1) % THOUGHTS.length);
    setShowThoughtBubble(true);
    setTimeout(() => setWink(false), 600);
  };

  const currentThought = THOUGHTS[thoughtIndex];

  // Compact Header Version
  if (compact) {
    return (
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2.5 rounded-full border border-teal-800/60 bg-gray-950/80 px-3 py-1.5 shadow-md hover:border-teal-500/80 hover:bg-gray-900 transition-all cursor-pointer group"
          title="Click to view Animated Thinking Clock mascot"
        >
          {/* Mini Cartoon Clock Face */}
          <div className="relative h-6 w-6 shrink-0 rounded-full border-2 border-teal-400 bg-teal-950/80 flex items-center justify-center shadow-[0_0_8px_rgba(20,184,166,0.4)]">
            {/* Clock bells */}
            <div className="absolute -top-1 -left-0.5 h-1.5 w-1.5 rounded-full bg-teal-400" />
            <div className="absolute -top-1 -right-0.5 h-1.5 w-1.5 rounded-full bg-teal-400" />

            {/* Cartoon Eyes */}
            <div className="flex gap-1 items-center justify-center">
              {/* Left Eye */}
              <div className={`h-1.5 w-1.5 rounded-full bg-white flex items-center justify-center transition-all ${isBlinking || wink ? 'scale-y-[0.1]' : ''}`}>
                <div
                  className="h-1 w-1 rounded-full bg-teal-950 transition-transform"
                  style={{ transform: `translate(${pupilOffset.x / 4}px, ${pupilOffset.y / 4}px)` }}
                />
              </div>
              {/* Right Eye */}
              <div className={`h-1.5 w-1.5 rounded-full bg-white flex items-center justify-center transition-all ${isBlinking ? 'scale-y-[0.1]' : ''}`}>
                <div
                  className="h-1 w-1 rounded-full bg-teal-950 transition-transform"
                  style={{ transform: `translate(${pupilOffset.x / 4}px, ${pupilOffset.y / 4}px)` }}
                />
              </div>
            </div>

            {/* Small smiling mouth */}
            <div className="absolute bottom-1 h-0.5 w-1.5 border-b border-teal-300 rounded-full" />
          </div>

          {/* Time & Quick Thought */}
          <div className="flex items-center gap-2 text-left">
            <span className="font-mono text-xs font-bold text-teal-300 tracking-tight">
              {formattedDigital}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-teal-300 transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
              Thinking: {currentThought.text.slice(0, 32)}…
            </span>
          </div>
        </button>

        {/* Expanded Popover Modal */}
        {expanded && (
          <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-teal-700/80 bg-gray-950/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Tik-Tik • Sochne Wali Ghadi
              </span>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ThinkingClockMascot
              time={time}
              secondDeg={secondDeg}
              minuteDeg={minuteDeg}
              hourDeg={hourDeg}
              formattedDigital={formattedDigital}
              formattedDate={formattedDate}
              isBlinking={isBlinking}
              wink={wink}
              pupilOffset={pupilOffset}
              currentThought={currentThought}
              onMascotClick={handleMascotClick}
              connected={connected}
              activeDevice={activeDevice}
            />
          </div>
        )}
      </div>
    );
  }

  // Full Widget Version
  return (
    <div className="rounded-2xl border border-teal-800/60 bg-gray-900/90 p-5 shadow-xl backdrop-blur-md">
      <ThinkingClockMascot
        time={time}
        secondDeg={secondDeg}
        minuteDeg={minuteDeg}
        hourDeg={hourDeg}
        formattedDigital={formattedDigital}
        formattedDate={formattedDate}
        isBlinking={isBlinking}
        wink={wink}
        pupilOffset={pupilOffset}
        currentThought={currentThought}
        onMascotClick={handleMascotClick}
        connected={connected}
        activeDevice={activeDevice}
      />
    </div>
  );
}

function ThinkingClockMascot({
  time,
  secondDeg,
  minuteDeg,
  hourDeg,
  formattedDigital,
  formattedDate,
  isBlinking,
  wink,
  pupilOffset,
  currentThought,
  onMascotClick,
  connected,
  activeDevice
}) {
  return (
    <div className="flex flex-col items-center select-none">
      {/* Cartoon Thought Bubble */}
      <div className="relative mb-3 w-full animate-bounce">
        <div className="relative rounded-xl border border-teal-600/70 bg-teal-950/80 px-3.5 py-2 shadow-lg text-center">
          <p className="text-xs font-semibold text-teal-100 flex items-center justify-center gap-1.5">
            <span>💭</span>
            <span>&quot;{currentThought.text}&quot;</span>
          </p>
        </div>
        {/* Thought bubbles tail */}
        <div className="flex justify-center -space-x-1 mt-0.5">
          <div className="h-2 w-2 rounded-full bg-teal-700/80" />
          <div className="h-1.5 w-1.5 rounded-full bg-teal-600/60 translate-y-1" />
        </div>
      </div>

      {/* Main Interactive Cartoon Clock */}
      <div
        onClick={onMascotClick}
        className="group relative h-36 w-36 cursor-pointer rounded-full border-4 border-teal-400 bg-gradient-to-br from-gray-900 via-teal-950 to-gray-950 p-2 shadow-[0_0_30px_rgba(20,184,166,0.35)] transition-transform hover:scale-105 active:scale-95"
        title="Click me to change thought or wink!"
      >
        {/* Cartoon Bells / Ears */}
        <div className="absolute -top-2.5 -left-1.5 h-6 w-6 rounded-full border-2 border-teal-400 bg-teal-600 shadow-md transform -rotate-12 group-hover:animate-wiggle" />
        <div className="absolute -top-2.5 -right-1.5 h-6 w-6 rounded-full border-2 border-teal-400 bg-teal-600 shadow-md transform rotate-12 group-hover:animate-wiggle" />
        {/* Top Winder button */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-2.5 w-4 rounded bg-teal-500 border border-teal-300" />

        {/* Dial ticks */}
        <div className="absolute inset-1 rounded-full border border-teal-800/40" />

        {/* Animated Analog Clock Hands */}
        {/* Hour Hand */}
        <div
          className="absolute left-1/2 top-1/2 h-8 w-1 origin-bottom rounded-full bg-teal-200 shadow"
          style={{ transform: `translate(-50%, -100%) rotate(${hourDeg}deg)` }}
        />
        {/* Minute Hand */}
        <div
          className="absolute left-1/2 top-1/2 h-11 w-0.5 origin-bottom rounded-full bg-teal-300 shadow"
          style={{ transform: `translate(-50%, -100%) rotate(${minuteDeg}deg)` }}
        />
        {/* Second Hand (Ticking) */}
        <div
          className="absolute left-1/2 top-1/2 h-13 w-[1px] origin-bottom rounded-full bg-rose-400 shadow transition-transform duration-100"
          style={{ transform: `translate(-50%, -100%) rotate(${secondDeg}deg)` }}
        />
        {/* Center pin */}
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300 bg-rose-500 z-10" />

        {/* Expressive Cartoon Face */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full pt-1 pointer-events-none">
          {/* Eyebrows (one raised in deep thought) */}
          <div className="flex gap-4 mb-1">
            <div className="h-1 w-3 rounded-full bg-teal-300 transform -rotate-12 transition-transform" />
            <div className="h-1 w-3 rounded-full bg-teal-300 transform -translate-y-1 rotate-6 transition-transform" />
          </div>

          {/* Big Cartoon Eyes */}
          <div className="flex gap-3 items-center">
            {/* Left Eye */}
            <div
              className={`h-5 w-5 rounded-full border-2 border-teal-400 bg-white flex items-center justify-center shadow-inner transition-all duration-150 ${
                isBlinking || wink ? 'scale-y-[0.1]' : ''
              }`}
            >
              <div
                className="h-2.5 w-2.5 rounded-full bg-gray-950 flex items-start justify-end p-0.5 transition-transform duration-200"
                style={{ transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)` }}
              >
                {/* Pupil glint */}
                <div className="h-1 w-1 rounded-full bg-white" />
              </div>
            </div>

            {/* Right Eye */}
            <div
              className={`h-5 w-5 rounded-full border-2 border-teal-400 bg-white flex items-center justify-center shadow-inner transition-all duration-150 ${
                isBlinking ? 'scale-y-[0.1]' : ''
              }`}
            >
              <div
                className="h-2.5 w-2.5 rounded-full bg-gray-950 flex items-start justify-end p-0.5 transition-transform duration-200"
                style={{ transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)` }}
              >
                {/* Pupil glint */}
                <div className="h-1 w-1 rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* Rosy Cheeks & Mouth */}
          <div className="flex items-center gap-6 mt-1">
            <div className="h-1.5 w-2.5 rounded-full bg-rose-500/50 blur-[0.5px]" />
            <div className="h-1.5 w-2.5 rounded-full bg-rose-500/50 blur-[0.5px]" />
          </div>

          {/* Smiling Thinking Mouth */}
          <div className="h-1 w-3 rounded-full border-b-2 border-teal-200 -mt-1" />
        </div>
      </div>

      {/* Digital Time & Date Banner */}
      <div className="mt-3.5 text-center">
        <div className="font-mono text-base font-extrabold text-teal-300 tracking-wider">
          {formattedDigital}
        </div>
        <div className="text-[11px] text-gray-400 font-medium">
          {formattedDate} • <span className={connected ? 'text-emerald-400 font-bold' : 'text-red-400'}>
            {connected ? '🟢 Synced' : '🔴 Offline'}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          {activeDevice ? activeDevice.deviceName : 'No Phone Selected'}
        </p>
      </div>
    </div>
  );
}
