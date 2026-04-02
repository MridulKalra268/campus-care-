"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSpeech } from '@/lib/useWebSpeech';

type Message = { role: 'user' | 'assistant'; text: string };

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    isSupported: voiceSupported,
    isListening,
    isSpeaking,
    transcript,
    conversation: voiceConversation,
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
      } catch (err) {
        console.error('Failed to create session:', err);
        setSessionError('Could not start a chat session. Please refresh the page.');
      }
    };
    create();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || !sessionId || loading) return;

    setMessages((m) => [...m, { role: 'user', text: content }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/chat/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, privacyMode: 'private', language: 'en' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } })) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? `Server error ${res.status}`);
      }

      const json = await res.json() as { data?: { reply?: string } };
      const reply = json?.data?.reply ?? 'I\'m here to support you. Could you tell me more?';

      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      addAssistantMessage(reply);

      // Speak reply if auto-speak is on
      if (autoSpeak && voiceSupported) {
        speak(reply);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessages((m) => [...m, { role: 'assistant', text: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [sessionId, loading, autoSpeak, voiceSupported, speak, addAssistantMessage]);

  // Called by voice recognition when a final transcript is ready
  const handleVoiceTranscript = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Chat</h1>
          <p className="mt-2 text-foreground/70">
            Ask anything. Powered by Mistral AI — your messages are private.
          </p>
        </div>

        {/* Session error */}
        {sessionError && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 p-3 text-sm">
            {sessionError}
          </div>
        )}

        {/* Chat window */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-background/60 backdrop-blur shadow-sm flex flex-col">
          {/* Messages */}
          <div className="flex-1 h-[460px] overflow-y-auto p-4 space-y-3">
            {!sessionId && !sessionError && (
              <div className="text-sm text-foreground/60 animate-pulse">Connecting…</div>
            )}
            {messages.length === 0 && sessionId && (
              <div className="flex h-full items-center justify-center">
                <p className="text-foreground/40 text-sm text-center">
                  Start by typing a message below, or use the 🎤 button to speak.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl max-w-[78%] text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-black/[.06] dark:bg-white/[.08] rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-black/[.06] dark:bg-white/[.08] text-sm text-foreground/60">
                  <span className="animate-pulse">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Live voice transcript indicator */}
          {isListening && transcript && (
            <div className="border-t border-black/10 dark:border-white/10 px-4 py-2 text-sm text-foreground/60 italic">
              🎤 {transcript}…
            </div>
          )}

          {/* Input bar */}
          <div className="border-t border-black/10 dark:border-white/10 p-3 flex gap-2 items-center">
            <input
              ref={inputRef}
              className="flex-1 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? '🎤 Listening…' : 'Type your message…'}
              disabled={!sessionId || isListening}
              aria-label="Chat message input"
            />

            {/* Send button */}
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white rounded-xl disabled:opacity-50 text-sm font-medium"
              onClick={() => sendMessage(input)}
              disabled={!sessionId || loading || !input.trim() || isListening}
              aria-label="Send message"
            >
              Send
            </button>

            {/* Voice toggle button */}
            <button
              aria-pressed={voiceOpen}
              onClick={() => setVoiceOpen((v) => !v)}
              className={`px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 text-lg transition-colors ${
                voiceOpen ? 'bg-black/10 dark:bg-white/10' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title="Toggle voice controls"
              aria-label="Toggle voice controls"
            >
              🎤
            </button>
          </div>
        </div>

        {/* Voice panel */}
        {voiceOpen && (
          <div className="mt-3 rounded-2xl border border-black/10 dark:border-white/10 p-4 space-y-3">
            {/* Browser support warning */}
            {!voiceSupported && (
              <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 p-3 text-sm">
                ⚠️ Speech recognition is not supported in this browser. Please use <strong>Chrome</strong> or <strong>Edge</strong> on desktop.
              </div>
            )}

            {/* Voice error */}
            {voiceError && (
              <div className="rounded-md border border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 p-3 text-sm">
                {voiceError}
              </div>
            )}

            {/* Voice controls */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => toggleListening(handleVoiceTranscript)}
                disabled={!voiceSupported || !sessionId || loading}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                aria-pressed={isListening}
              >
                {isListening ? '⏹ Stop listening' : '🎤 Start listening'}
              </button>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                  className="rounded"
                  disabled={!voiceSupported}
                />
                <span className={!voiceSupported ? 'text-foreground/40' : ''}>
                  Auto-speak replies {isSpeaking ? '🔊' : ''}
                </span>
              </label>

              <button
                onClick={clearVoiceConversation}
                className="px-3 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Clear transcript
              </button>

              {/* Volume bar */}
              {isListening && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground/60">Mic</span>
                  <div className="w-20 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-[width] duration-75"
                      style={{ width: `${Math.min(100, volumeLevel * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Voice transcript */}
            <div>
              <div className="text-sm font-medium text-foreground/70 mb-2">Voice transcript</div>
              <div className="max-h-44 overflow-y-auto space-y-1 text-sm">
                {voiceConversation.length === 0 ? (
                  <div className="text-foreground/40">
                    {voiceSupported
                      ? 'Click "Start listening" and speak — your words will appear here.'
                      : 'Voice not supported in this browser.'}
                  </div>
                ) : (
                  voiceConversation.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <span className={`shrink-0 font-medium ${m.role === 'user' ? 'text-blue-600 dark:text-blue-400' : 'text-foreground/60'}`}>
                        {m.role === 'user' ? 'You' : 'Assistant'}:
                      </span>
                      <span className="whitespace-pre-wrap text-foreground/80">{m.text}</span>
                      {!m.isFinal && <span className="text-foreground/40">(…)</span>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Info note */}
            <p className="text-xs text-foreground/50">
              🔒 Voice uses your browser's built-in speech recognition — no audio is sent to our servers. Works best in Chrome/Edge on HTTPS.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}