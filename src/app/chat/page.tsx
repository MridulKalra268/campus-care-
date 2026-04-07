"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSpeech } from '@/lib/useWebSpeech';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  mood?: 'supportive' | 'concerned' | 'encouraging' | 'crisis';
};

type MoodTag = { label: string; emoji: string; color: string };

const MOOD_TAGS: MoodTag[] = [
  { label: 'Anxious', emoji: '😰', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Sad', emoji: '😔', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Stressed', emoji: '😤', color: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Lonely', emoji: '🫂', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Overwhelmed', emoji: '🌊', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { label: 'Hopeful', emoji: '🌱', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

const QUICK_PROMPTS = [
  "I'm feeling overwhelmed with exams 📚",
  "I haven't been sleeping well lately 😴",
  "I feel disconnected from everyone 💭",
  "I need help managing my anxiety 🧘",
  "I'm struggling with homesickness 🏠",
  "Talk to me about stress relief techniques ✨",
];

const RESOURCES = [
  { name: 'iCall Helpline', number: '9152987821', type: 'call', desc: 'Free counseling' },
  { name: 'Vandrevala Foundation', number: '1860-2662-345', type: 'call', desc: '24/7 support' },
  { name: 'Telemanas', number: '14416', type: 'call', desc: 'Govt. helpline' },
];

function getTimeString() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 max-w-[80%]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
        CC
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-violet-400"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%]">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-md">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          </div>
          <p className="text-right text-[10px] text-slate-400 mt-1 mr-1">{msg.timestamp}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 max-w-[82%]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
        CC
      </div>
      <div className="flex-1">
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{msg.text}</p>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 ml-1">{msg.timestamp}</p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [isPrivate, setIsPrivate] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  const {
    isSupported: voiceSupported,
    isListening,
    isSpeaking,
    transcript,
    voiceError,
    volumeLevel,
    speak,
    toggleListening,
    addAssistantMessage,
    clearConversation: clearVoiceConversation,
  } = useWebSpeech();

  // Create chat session on mount
  useEffect(() => {
    const create = async () => {
      try {
        const res = await fetch('/api/v1/chat/sessions', { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { data?: { id?: string } };
        if (!json?.data?.id) throw new Error('No session ID returned');
        setSessionId(json.data.id);

        // Welcome message
        setMessages([{
          role: 'assistant',
          text: "Hello 💙 I'm your CampusCare companion — a safe, private space for you to share whatever's on your mind.\n\nI'm here to listen without judgment, help you understand your feelings, and guide you toward support when needed. How are you feeling today?",
          timestamp: getTimeString(),
          mood: 'supportive',
        }]);
      } catch (err) {
        console.error('Failed to create session:', err);
        setSessionError('Could not start a session. Please refresh.');
      }
    };
    create();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || !sessionId || loading) return;

    setMessages(m => [...m, { role: 'user', text: content, timestamp: getTimeString() }]);
    setInput('');
    setCharCount(0);
    setLoading(true);
    setShowQuickPrompts(false);

    try {
      const res = await fetch(`/api/v1/chat/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content,
          privacyMode: isPrivate ? 'private' : 'standard',
          language: 'en',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } })) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? `Server error ${res.status}`);
      }

      const json = await res.json() as { data?: { reply?: string } };
      const reply = json?.data?.reply ?? "I'm here with you. Would you like to share more about how you're feeling?";

      setMessages(m => [...m, {
        role: 'assistant',
        text: reply,
        timestamp: getTimeString(),
        mood: 'supportive',
      }]);
      addAssistantMessage(reply);
      if (autoSpeak && voiceSupported) speak(reply);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessages(m => [...m, {
        role: 'assistant',
        text: `I'm having a moment of difficulty connecting. Please try again — I'm here for you. 💙`,
        timestamp: getTimeString(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [sessionId, loading, isPrivate, autoSpeak, voiceSupported, speak, addAssistantMessage]);

  const handleVoiceTranscript = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setCharCount(e.target.value.length);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleMoodSelect = (mood: MoodTag) => {
    setSelectedMood(mood.label);
    sendMessage(`I'm feeling ${mood.label.toLowerCase()} ${mood.emoji}`);
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleClearChat = () => {
    setMessages([{
      role: 'assistant',
      text: "Our conversation has been cleared for your privacy. I'm here whenever you need to talk. 💙",
      timestamp: getTimeString(),
      mood: 'supportive',
    }]);
    setShowQuickPrompts(true);
    setSelectedMood(null);
  };

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
        }
        .msg-enter { animation: fadeSlideUp 0.3s ease-out forwards; }
        .listening-pulse { animation: pulseRing 1.5s ease-out infinite; }
        .textarea-custom::-webkit-scrollbar { width: 4px; }
        .textarea-custom::-webkit-scrollbar-track { background: transparent; }
        .textarea-custom::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 4px; }
        .chat-scroll::-webkit-scrollbar { width: 5px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .chat-scroll::-webkit-scrollbar-thumb { background: #334155; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50/40 to-blue-50/30 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-900 flex flex-col">

        {/* Top header bar */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-violet-100 dark:border-slate-800 shadow-sm">
          <div className="mx-auto max-w-4xl px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                  CC
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-white">CampusCare AI</h1>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Online · Always here for you
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Privacy toggle */}
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isPrivate
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
                title="Toggle privacy mode"
              >
                <span>{isPrivate ? '🔒' : '🔓'}</span>
                <span className="hidden sm:inline">{isPrivate ? 'Private' : 'Standard'}</span>
              </button>

              {/* Crisis resources */}
              <button
                onClick={() => setShowResources(!showResources)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
              >
                <span>🆘</span>
                <span className="hidden sm:inline">Crisis Help</span>
              </button>

              {/* Clear chat */}
              <button
                onClick={handleClearChat}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Clear conversation"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Crisis resources dropdown */}
        {showResources && (
          <div className="mx-auto max-w-4xl px-4 pt-3 pb-1 z-20">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🆘</span>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">Immediate Crisis Support</p>
                <button onClick={() => setShowResources(false)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {RESOURCES.map(r => (
                  <a
                    key={r.name}
                    href={`tel:${r.number}`}
                    className="flex items-center gap-3 bg-white dark:bg-red-950/50 rounded-xl p-3 border border-red-100 dark:border-red-800 hover:shadow-md transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white flex-shrink-0">
                      📞
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{r.name}</p>
                      <p className="text-xs font-mono text-red-600 dark:text-red-400">{r.number}</p>
                      <p className="text-[10px] text-slate-500">{r.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
              <p className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-2 text-center">
                If you're in immediate danger, please call 112 (Emergency)
              </p>
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="flex-1 mx-auto w-full max-w-4xl px-4 pb-4 pt-3 flex flex-col gap-3">

          {/* Mood selector row */}
          {messages.length <= 1 && (
            <div className="msg-enter">
              <p className="text-xs text-center text-slate-500 mb-2 font-medium">How are you feeling right now?</p>
              <div className="flex flex-wrap justify-center gap-2">
                {MOOD_TAGS.map(mood => (
                  <button
                    key={mood.label}
                    onClick={() => handleMoodSelect(mood)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:shadow-sm active:scale-95 ${mood.color} ${selectedMood === mood.label ? 'ring-2 ring-violet-400 ring-offset-1' : ''}`}
                  >
                    <span>{mood.emoji}</span>
                    {mood.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat window */}
          <div
            ref={chatWindowRef}
            className="chat-scroll flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-3xl border border-violet-100/80 dark:border-slate-800 shadow-lg overflow-y-auto"
            style={{ minHeight: '400px', maxHeight: 'calc(100vh - 340px)' }}
          >
            <div className="p-5 space-y-4">
              {sessionError && (
                <div className="text-center py-4">
                  <div className="inline-block bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm">
                    ⚠️ {sessionError}
                  </div>
                </div>
              )}

              {!sessionId && !sessionError && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex gap-2 items-center text-violet-500">
                    <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Starting your session…</span>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className="msg-enter" style={{ animationDelay: `${i * 0.05}s` }}>
                  <MessageBubble msg={msg} />
                </div>
              ))}

              {loading && <TypingIndicator />}

              {/* Quick prompts */}
              {showQuickPrompts && sessionId && messages.length === 1 && (
                <div className="mt-4 msg-enter">
                  <p className="text-xs text-center text-slate-400 mb-3 font-medium">Or choose a topic to start:</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="text-left px-4 py-2.5 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200/60 dark:border-violet-800 rounded-xl text-xs text-violet-700 dark:text-violet-300 font-medium transition-all hover:shadow-sm active:scale-[0.98]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live voice transcript */}
              {isListening && transcript && (
                <div className="flex justify-end">
                  <div className="bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700 rounded-2xl rounded-br-sm px-4 py-3 max-w-[78%] italic text-sm text-violet-700 dark:text-violet-300">
                    🎤 {transcript}…
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Voice error */}
          {voiceError && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
              ⚠️ {voiceError}
            </div>
          )}

          {/* Input area */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-violet-200/60 dark:border-slate-700 shadow-lg p-3">
            <div className="flex gap-2 items-end">
              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  className="textarea-custom w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none focus:outline-none leading-relaxed py-1.5 px-1 min-h-[40px] max-h-[120px] overflow-y-auto"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? '🎤 Listening… speak now' : 'Share what\'s on your mind… (Enter to send)'}
                  disabled={!sessionId || isListening}
                  rows={1}
                  style={{ height: 'auto' }}
                />
                {charCount > 0 && (
                  <span className="absolute bottom-0 right-0 text-[10px] text-slate-300 dark:text-slate-600">
                    {charCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Voice button */}
                {voiceSupported && (
                  <button
                    onClick={() => toggleListening(handleVoiceTranscript)}
                    disabled={!sessionId || loading}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 text-white listening-pulse'
                        : 'bg-violet-100 dark:bg-violet-900/40 hover:bg-violet-200 dark:hover:bg-violet-800 text-violet-600 dark:text-violet-400'
                    }`}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  >
                    {isListening ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1"/>
                        <rect x="14" y="4" width="4" height="16" rx="1"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/>
                      </svg>
                    )}
                  </button>
                )}

                {/* Send button */}
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!sessionId || loading || !input.trim() || isListening}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white flex items-center justify-center disabled:opacity-40 transition-all active:scale-95 shadow-md hover:shadow-violet-300/50"
                  aria-label="Send message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span>🔒</span>
                  {isPrivate ? 'Private mode — not stored' : 'Standard mode'}
                </span>
                {isListening && (
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-[width] duration-75"
                        style={{ width: `${Math.min(100, volumeLevel * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-violet-500 font-medium">LIVE</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceOpen(!voiceOpen)}
                  className="text-[10px] text-slate-400 hover:text-violet-500 transition-colors flex items-center gap-1"
                >
                  {voiceOpen ? '▲ Less' : '▼ Voice settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Voice settings panel */}
          {voiceOpen && (
            <div className="msg-enter bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-violet-100 dark:border-slate-800 p-4 shadow-sm">
              {!voiceSupported && (
                <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-xs">
                  ⚠️ Speech recognition needs Chrome or Edge on desktop.
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <div
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${autoSpeak ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoSpeak ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-slate-600 dark:text-slate-400">
                    Auto-speak replies {isSpeaking ? '🔊' : ''}
                  </span>
                </label>
                <button
                  onClick={clearVoiceConversation}
                  className="text-xs text-slate-500 hover:text-violet-600 transition-colors"
                >
                  Clear transcript
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                🔒 Voice uses your browser's built-in speech API — no audio leaves your device.
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] text-center text-slate-400 pb-1">
            CampusCare AI provides emotional support, not medical advice. For emergencies, call <a href="tel:112" className="text-violet-500 font-medium">112</a>.
          </p>
        </div>
      </div>
    </>
  );
}