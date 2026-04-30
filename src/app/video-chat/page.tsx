'use client';
// src/app/video-chat/page.tsx
// AI Video Chat: camera preview + mic → STT → Mistral → TTS
import { useEmotionDetection } from '@/lib/useEmotionDetection';
import SessionReport from '@/components/SessionReport';
import { useEffect, useRef, useState, useCallback } from 'react';
import { randomUUID } from 'crypto';

// Extend Window for webkit prefix
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

type Message = { role: 'user' | 'ai'; text: string; ts: string };

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Generate a stable session ID (client-side UUID)
function makeSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function VideoChatPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const sessionIdRef = useRef<string>(makeSessionId());

  const [camState, setCamState] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');
  const [camError, setCamError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sttSupported, setSttSupported] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [micError, setMicError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialise
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSttSupported(!!SpeechRec && !!window.speechSynthesis);
    synthRef.current = window.speechSynthesis ?? null;

    // Welcome message
    setMessages([{
      role: 'ai',
      text: "Hi! I'm CampusCare. Turn on your camera and click the mic to start talking. I'm here to listen 💙",
      ts: ts(),
    }]);

    return () => {
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript, isThinking]);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamState('requesting');
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false, // mic is separate
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState('active');
    } catch (e: unknown) {
      setCamState('error');
      const err = e as { name?: string };
      setCamError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow in browser settings.'
        : 'Could not access camera.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamState('idle');
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1;
    utt.pitch = 1;
    utt.lang = 'en-US';
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utt);
  }, []);

  // ── API call ─────────────────────────────────────────────────────────────────
  const sendToAI = useCallback(async (text: string) => {
    setIsThinking(true);
    try {
      const res = await fetch('/api/v1/video-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current, message: text }),
      });
      const json = await res.json() as { data?: { reply?: string }; error?: string };
      const reply = json.data?.reply ?? "I'm here with you. Could you say that again?";
      setMessages(m => [...m, { role: 'ai', text: reply, ts: ts() }]);
      if (autoSpeak) speak(reply);
    } catch {
      const fallback = "I had trouble connecting. Please try again.";
      setMessages(m => [...m, { role: 'ai', text: fallback, ts: ts() }]);
    } finally {
      setIsThinking(false);
    }
  }, [autoSpeak, speak]);

  // ── STT ─────────────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    setMicError('');
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicError('Speech recognition not supported. Try Chrome or Edge.');
      return;
    }

    recognitionRef.current?.stop();
    const rec = new SpeechRec();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => setIsListening(true);

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setLiveTranscript(final || interim);
      if (final.trim()) {
        const text = final.trim();
        setLiveTranscript('');
        setMessages(m => [...m, { role: 'user', text, ts: ts() }]);
        sendToAI(text);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      setLiveTranscript('');
      const map: Record<string, string> = {
        'not-allowed': 'Microphone permission denied.',
        'no-speech': 'No speech detected. Try again.',
        'network': 'Network error during speech recognition.',
        'audio-capture': 'No microphone found.',
      };
      setMicError(map[event.error] ?? `Mic error: ${event.error}`);
    };

    rec.onend = () => {
      setIsListening(false);
      setLiveTranscript('');
    };

    try { rec.start(); } catch (e) {
      setMicError('Could not start microphone: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [sendToAI]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setLiveTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const clearSession = async () => {
    await fetch(`/api/v1/video-chat?sessionId=${sessionIdRef.current}`, { method: 'DELETE' });
    sessionIdRef.current = makeSessionId();
    setMessages([{ role: 'ai', text: "Session cleared. I'm here whenever you're ready 💙", ts: ts() }]);
  };

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(139,92,246,0.5); }
          70%  { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); }
        }
        @keyframes bounce3 { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        .mic-pulse { animation: pulse-ring 1.4s ease-out infinite; }
        .dot1 { animation: bounce3 1.2s ease-in-out 0s   infinite; }
        .dot2 { animation: bounce3 1.2s ease-in-out 0.2s infinite; }
        .dot3 { animation: bounce3 1.2s ease-in-out 0.4s infinite; }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 4px; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50/40 to-blue-50 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-900 flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-violet-100 dark:border-slate-800 shadow-sm">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">AI</div>
              <span className="font-semibold text-sm">AI Video Chat</span>
              {isSpeaking && <span className="text-xs text-violet-600 font-medium animate-pulse">🔊 Speaking…</span>}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={e => { setAutoSpeak(e.target.checked); if (!e.target.checked) synthRef.current?.cancel(); }}
                  className="accent-violet-600"
                />
                <span className="text-foreground/60">Auto-speak</span>
              </label>
              <button onClick={clearSession} className="text-xs text-foreground/50 hover:text-red-500 transition-colors">Clear session</button>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="flex-1 mx-auto w-full max-w-5xl px-4 py-5 grid md:grid-cols-2 gap-5">

          {/* ── Camera panel ── */}
          <div className="flex flex-col gap-4">
            {/* Video */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-lg">
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)', display: camState === 'active' ? 'block' : 'none' }}
              />

              {camState !== 'active' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl">📷</div>
                  <p className="text-sm">
                    {camState === 'requesting' ? 'Requesting camera…'
                     : camState === 'error' ? camError
                     : 'Camera is off'}
                  </p>
                </div>
              )}

              {/* Status overlay */}
              {camState === 'active' && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 rounded-full px-2.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-white font-medium">Live</span>
                </div>
              )}
            </div>

            {/* Camera controls */}
            <div className="flex gap-3">
              <button
                onClick={camState === 'active' ? stopCamera : startCamera}
                disabled={camState === 'requesting'}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  camState === 'active'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50'
                }`}
              >
                {camState === 'active' ? '⏹ Stop Camera' : camState === 'requesting' ? 'Starting…' : '▶ Start Camera'}
              </button>
            </div>

            {/* Mic button */}
            <button
              onClick={toggleListening}
              disabled={!sttSupported}
              className={`relative w-full py-4 rounded-2xl font-semibold text-sm transition-all ${
                isListening
                  ? 'bg-violet-600 text-white mic-pulse'
                  : 'bg-white dark:bg-slate-800 border border-violet-200 dark:border-slate-700 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
              } disabled:opacity-40 disabled:cursor-not-allowed shadow-sm`}
            >
              {isListening ? '🎤 Listening… (click to stop)' : '🎤 Tap to Speak'}
            </button>

            {/* Live transcript */}
            {liveTranscript && (
              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3 text-sm text-violet-700 dark:text-violet-300 italic">
                {liveTranscript}…
              </div>
            )}

            {/* Errors */}
            {(micError) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
                ⚠️ {micError}
              </div>
            )}

            {!sttSupported && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 text-xs text-slate-500">
                ℹ️ Speech recognition requires Chrome or Edge on desktop.
              </div>
            )}

            {/* How to use */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 text-xs text-foreground/60 space-y-1">
              <p className="font-semibold text-foreground/80 mb-2">How to use</p>
              <p>1. Click <strong>Start Camera</strong> to see yourself</p>
              <p>2. Click <strong>Tap to Speak</strong> and talk</p>
              <p>3. The AI hears your words and replies in text + voice</p>
              <p>4. Toggle <strong>Auto-speak</strong> on/off in the top bar</p>
            </div>
          </div>

          {/* ── Chat panel ── */}
          <div className="flex flex-col gap-3">
            <div
              className="chat-scroll flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-violet-100/80 dark:border-slate-800 shadow-lg overflow-y-auto"
              style={{ minHeight: '420px', maxHeight: 'calc(100vh - 260px)' }}
            >
              <div className="p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ai' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">AI</div>
                    )}
                    <div className="max-w-[80%]">
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                      <p className={`text-[10px] text-slate-400 mt-0.5 ${msg.role === 'user' ? 'text-right' : 'ml-1'}`}>{msg.ts}</p>
                    </div>
                  </div>
                ))}

                {/* Thinking indicator */}
                {isThinking && (
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center h-4">
                        <div className="w-2 h-2 rounded-full bg-violet-400 dot1" />
                        <div className="w-2 h-2 rounded-full bg-violet-400 dot2" />
                        <div className="w-2 h-2 rounded-full bg-violet-400 dot3" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-center text-slate-400">
              CampusCare AI is not a licensed therapist. For emergencies call <a href="tel:112" className="text-violet-500">112</a> or iCall <a href="tel:9152987821" className="text-violet-500">9152987821</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}