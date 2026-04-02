'use client';
// useWebSpeech.ts - Browser Web Speech API (completely free, no API keys)
// STT: SpeechRecognition API  |  TTS: SpeechSynthesis API

import { useEffect, useRef, useState, useCallback } from 'react';

export type SpeechMessage = {
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
  timestamp: string;
};

// Extend Window with webkit prefix fallback
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export function useWebSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState<SpeechMessage[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasSynth = !!window.speechSynthesis;
    setIsSupported(!!(SpeechRec && hasSynth));
    synthRef.current = hasSynth ? window.speechSynthesis : null;
  }, []);

  // Volume analyser cleanup
  const stopVolumeMonitor = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setVolumeLevel(0);
  }, []);

  const startVolumeMonitor = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolumeLevel(avg / 128); // normalize 0–1ish
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch {
      // volume monitor is optional, ignore errors
    }
  }, []);

  const addMessage = useCallback((msg: SpeechMessage) => {
    setConversation((prev) => [...prev, msg]);
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel(); // stop any ongoing speech
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1;
    utt.pitch = 1;
    utt.lang = 'en-US';
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utt);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    stopVolumeMonitor();
    setIsListening(false);
    setTranscript('');
  }, [stopVolumeMonitor]);

  const startListening = useCallback((onFinalTranscript: (text: string) => void) => {
    setVoiceError(null);

    if (typeof window === 'undefined') {
      setVoiceError('Speech recognition is not available server-side.');
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const rec = new SpeechRec();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      startVolumeMonitor();
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final.trim()) {
        addMessage({
          role: 'user',
          text: final.trim(),
          isFinal: true,
          timestamp: new Date().toLocaleTimeString(),
        });
        onFinalTranscript(final.trim());
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      stopVolumeMonitor();
      setIsListening(false);
      setTranscript('');
      const msg: Record<string, string> = {
        'not-allowed': 'Microphone permission denied. Please allow mic access in your browser.',
        'no-speech': 'No speech detected. Please try again.',
        'network': 'Network error during speech recognition.',
        'audio-capture': 'No microphone found or it is in use by another app.',
        'service-not-allowed': 'Speech service not allowed. Try using HTTPS.',
      };
      setVoiceError(msg[event.error] ?? `Speech error: ${event.error}`);
    };

    rec.onend = () => {
      stopVolumeMonitor();
      setIsListening(false);
      setTranscript('');
    };

    try {
      rec.start();
    } catch (err) {
      setVoiceError('Could not start speech recognition: ' + (err instanceof Error ? err.message : String(err)));
      setIsListening(false);
    }
  }, [addMessage, startVolumeMonitor, stopVolumeMonitor]);

  const toggleListening = useCallback((onFinalTranscript: (text: string) => void) => {
    if (isListening) {
      stopListening();
    } else {
      startListening(onFinalTranscript);
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
      stopVolumeMonitor();
    };
  }, [stopVolumeMonitor]);

  return {
    isSupported,
    isListening,
    isSpeaking,
    transcript,
    conversation,
    voiceError,
    volumeLevel,
    speak,
    startListening,
    stopListening,
    toggleListening,
    addAssistantMessage: (text: string) => {
      addMessage({
        role: 'assistant',
        text,
        isFinal: true,
        timestamp: new Date().toLocaleTimeString(),
      });
    },
    clearConversation: () => setConversation([]),
  };
}