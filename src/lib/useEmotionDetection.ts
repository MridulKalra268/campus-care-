// src/lib/useEmotionDetection.ts
// Uses face-api.js loaded via CDN — no npm install needed.
// Runs detection every INTERVAL_MS on a video element.
// All processing is local — nothing leaves the browser.

import { useRef, useState, useCallback } from 'react';

export type EmotionEntry = { emotion: string; confidence: number; timestamp: number };

const INTERVAL_MS = 3000; // detect every 3 seconds — keeps CPU low
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'; // CDN models

// Typed handle to face-api loaded at runtime
type FaceAPIExpressions = { asSortedArray: () => Array<{ expression: string; probability: number }> };
type FaceAPIResult = { expressions: FaceAPIExpressions } | null;
type FaceAPIStatic = {
  nets: { tinyFaceDetector: { loadFromUri: (u: string) => Promise<void>; isLoaded: boolean }; faceExpressionNet: { loadFromUri: (u: string) => Promise<void>; isLoaded: boolean } };
  detectSingleFace: (el: HTMLVideoElement, opts: unknown) => { withFaceExpressions: () => Promise<FaceAPIResult> };
  TinyFaceDetectorOptions: new () => unknown;
};

declare global { interface Window { faceapi?: FaceAPIStatic } }

export function useEmotionDetection() {
  const [timeline, setTimeline] = useState<EmotionEntry[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>('—');
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const loadModels = useCallback(async () => {
    if (window.faceapi?.nets.tinyFaceDetector.isLoaded) { setIsReady(true); return; }
    try {
      // Inject script tag if not already present
      if (!document.getElementById('faceapi-script')) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.id = 'faceapi-script';
          s.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.esm.js';
          s.type = 'module';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load face-api.js'));
          document.head.appendChild(s);
        });
        // Give the module a moment to register on window
        await new Promise(r => setTimeout(r, 500));
      }
      const fa = window.faceapi;
      if (!fa) { setLoadError('face-api not available'); return; }
      await Promise.all([
        fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        fa.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setIsReady(true);
    } catch (e) {
      setLoadError('Could not load face detection models (check network).');
      console.warn('[emotion]', e);
    }
  }, []);

  const startDetection = useCallback((videoEl: HTMLVideoElement) => {
    if (!window.faceapi || !isReady) return;
    startTimeRef.current = Date.now();
    setTimeline([]);

    timerRef.current = setInterval(async () => {
      try {
        const fa = window.faceapi!;
        const result = await fa
          .detectSingleFace(videoEl, new fa.TinyFaceDetectorOptions())
          .withFaceExpressions();

        if (result) {
          const top = result.expressions.asSortedArray()[0];
          const entry: EmotionEntry = {
            emotion: top.expression,
            confidence: Math.round(top.probability * 100),
            timestamp: Math.round((Date.now() - startTimeRef.current) / 1000),
          };
          setCurrentEmotion(top.expression);
          setTimeline(prev => [...prev, entry]);
        }
      } catch {
        // silently skip missed frames
      }
    }, INTERVAL_MS);
  }, [isReady]);

  const stopDetection = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setCurrentEmotion('—');
  }, []);

  return { timeline, currentEmotion, isReady, loadError, loadModels, startDetection, stopDetection };
}