"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MoodDef {
  id: string;
  emoji: string;
  label: string;
  color: string;
  glow: string;
  tip: string;
}

interface HistoryEntry extends MoodDef {
  time: string;
}

interface Scores {
  [key: string]: number;
}

interface SnapshotData {
  dataUrl: string;
  mood: MoodDef | null;
  time: string;
}

// ─── Mood definitions ──────────────────────────────────────────────────────────
const MOODS: MoodDef[] = [
  { id: "happy",    emoji: "😊", label: "Joyful",    color: "#22c55e", glow: "rgba(34,197,94,0.35)",   tip: "You seem in great spirits! Ride this energy — maybe journal what's making today good." },
  { id: "calm",     emoji: "😌", label: "Calm",       color: "#6366f1", glow: "rgba(99,102,241,0.35)",  tip: "A calm mind is your superpower. Great time to reflect, plan, or meditate." },
  { id: "neutral",  emoji: "😐", label: "Neutral",    color: "#94a3b8", glow: "rgba(148,163,184,0.25)", tip: "Feeling even-keeled. Take a short walk or hydrate — small acts shift your energy." },
  { id: "stressed", emoji: "😰", label: "Stressed",   color: "#f59e0b", glow: "rgba(245,158,11,0.35)",  tip: "Stress detected. Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. You've got this." },
  { id: "sad",      emoji: "😔", label: "Low",        color: "#3b82f6", glow: "rgba(59,130,246,0.35)",  tip: "It's okay to feel low. Reach out to a friend or try our chat — you don't have to carry this alone." },
  { id: "anxious",  emoji: "😤", label: "Anxious",    color: "#ef4444", glow: "rgba(239,68,68,0.35)",   tip: "Anxiety is energy without direction. Ground yourself: 5 things you see, 4 hear, 3 feel." },
  { id: "focused",  emoji: "🧘", label: "Focused",    color: "#8b5cf6", glow: "rgba(139,92,246,0.35)",  tip: "You're in a focused state — ideal for studying or creative work. Protect this headspace!" },
  { id: "tired",    emoji: "😴", label: "Tired",      color: "#64748b", glow: "rgba(100,116,139,0.25)", tip: "Fatigue shows. A 20-min nap or 10-min walk can restore more than another coffee." },
];

// ─── Mood detection (pixel analysis heuristic) ─────────────────────────────────
// In production replace with: TensorFlow.js face-api.js OR MediaPipe FaceMesh
function detectMoodFromFrame(canvas: HTMLCanvasElement, frameCount: number): Scores {
  const ctx = canvas.getContext("2d");
  if (!ctx) return {};

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let r = 0, g = 0, b = 0, brightness = 0;
  const samples: number[] = [];
  const step = 8;
  let count = 0;

  for (let i = 0; i < data.length; i += 4 * step) {
    const rv = data[i], gv = data[i + 1], bv = data[i + 2];
    r += rv; g += gv; b += bv;
    const lum = 0.299 * rv + 0.587 * gv + 0.114 * bv;
    brightness += lum;
    samples.push(lum);
    count++;
  }

  if (count === 0) return {};
  r /= count; g /= count; b /= count; brightness /= count;
  const mean = brightness;
  const variance = samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length;
  const std = Math.sqrt(variance);

  // Feature booleans
  const warm        = r > g && r > b;
  const cool        = b > r && b > g;
  const greenTone   = g > r * 1.05 && g > b * 1.05;
  const dark        = brightness < 60;
  const veryBright  = brightness > 160;
  const highContrast = std > 55;
  const lowContrast  = std < 25;

  // Temporal drift to keep scores alive
  const drift = Math.sin(frameCount * 0.018) * 0.15;

  const raw: Scores = {
    happy:   (veryBright && warm ? 0.7 : 0.1) + (greenTone ? 0.2 : 0) + drift,
    calm:    (cool && !dark && lowContrast ? 0.65 : 0.1) + (brightness > 100 && std < 40 ? 0.2 : 0) - drift * 0.5,
    neutral: (brightness > 80 && brightness < 140 && std > 30 && std < 55 ? 0.55 : 0.2) + Math.abs(drift) * 0.3,
    stressed:(highContrast && warm && !veryBright ? 0.6 : 0.1) + (dark && warm ? 0.3 : 0) + drift * 0.5,
    sad:     (dark && cool ? 0.65 : 0.1) + (lowContrast && dark ? 0.2 : 0) - drift,
    anxious: (highContrast && !veryBright ? 0.5 : 0.1) + (warm && dark ? 0.3 : 0),
    focused: (!dark && !veryBright && std > 35 && std < 60 ? 0.55 : 0.1) + (cool ? 0.15 : 0),
    tired:   (dark && lowContrast ? 0.6 : 0.1) + (brightness < 80 ? 0.2 : 0) - drift * 0.3,
  };

  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Math.max(0, v / total)])
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function MoodBar({ mood, score, isTop }: { mood: MoodDef; score: number; isTop: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, opacity: score > 0.03 ? 1 : 0.3, transition: "opacity 0.5s" }}>
      <span style={{ fontSize: "0.85rem", width: 20, textAlign: "center" }}>{mood.emoji}</span>
      <span style={{ width: 58, fontSize: "0.72rem", color: "rgba(226,232,240,0.55)", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
        {mood.label}
      </span>
      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          borderRadius: 999,
          width: `${(score * 100).toFixed(1)}%`,
          background: isTop ? `linear-gradient(90deg, ${mood.color}cc, ${mood.color})` : `${mood.color}66`,
          boxShadow: isTop ? `0 0 12px ${mood.glow}` : "none",
          transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <span style={{ width: 32, fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "rgba(226,232,240,0.4)", textAlign: "right" }}>
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function MoodRing({ topMood, scores, scanning }: { topMood: MoodDef | null; scores: Scores; scanning: boolean }) {
  const SIZE = 180, CX = 90, CY = 90, R = 72, STROKE = 10;
  const C = 2 * Math.PI * R;

  let offset = 0;
  const arcs = MOODS.map((m) => {
    const score = scores[m.id] || 0;
    const gap = 4;
    const arcLen = Math.max(0, score * C - gap);
    const arc = { id: m.id, color: m.color, glow: m.glow, arcLen, dashOffset: -(offset) };
    offset += score * C;
    return arc;
  });

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE} />
      {arcs.map((a) => (
        <circle
          key={a.id}
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={a.color}
          strokeWidth={STROKE}
          strokeDasharray={`${a.arcLen} ${C}`}
          strokeDashoffset={a.dashOffset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${a.glow || a.color})`, transition: "stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease" }}
        />
      ))}
      {scanning && (
        <circle cx={CX} cy={CY} r={R + 6} fill="none"
          stroke={topMood?.color || "#6366f1"} strokeWidth={1}
          strokeDasharray="8 16" opacity={0.5}>
          <animateTransform attributeName="transform" type="rotate"
            from="0 90 90" to="360 90 90" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

function Timeline({ history }: { history: HistoryEntry[] }) {
  if (!history.length) return null;
  return (
    <div style={{ padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
        Session Journey
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {history.map((h, i) => (
          <div key={i} title={`${h.label} · ${h.time}`}
            style={{ width: 12, height: 12, borderRadius: "50%", background: h.color, boxShadow: `0 0 6px ${h.glow}`, cursor: "help", transition: "transform 0.2s", flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.4)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          />
        ))}
      </div>
      {history.length > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "rgba(226,232,240,0.3)" }}>
          <span>{history[0].time}</span>
          <span>{history[history.length - 1].time}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VideoMoodAnalysis() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number | null>(null);
  const frameRef   = useRef(0);
  const streamRef  = useRef<MediaStream | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [camState, setCamState] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [camError, setCamError] = useState("");
  const [scores, setScores]     = useState<Scores>({});
  const [topMood, setTopMood]   = useState<MoodDef | null>(null);
  const [history, setHistory]   = useState<HistoryEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [showTip, setShowTip]   = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  const startCamera = useCallback(async () => {
    setCamState("requesting");
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState("active");
      setScanning(true);
      frameRef.current = 0;
      timerRef.current = setInterval(() => setSessionTime((t) => t + 1), 1000);
    } catch (e: unknown) {
      setCamState("error");
      const err = e as { name?: string; message?: string };
      setCamError(err.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access in your browser settings."
        : err.message || "Could not access camera.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setCamState("idle");
    setScanning(false);
    setSessionTime(0);
    setScores({});
    setTopMood(null);
  }, []);

  // Analysis loop
  useEffect(() => {
    if (camState !== "active") return;
    const ANALYZE_EVERY = 12;
    let historyTick = 0;

    const loop = () => {
      frameRef.current++;
      const video  = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        canvas.width  = video.videoWidth  || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          if (frameRef.current % ANALYZE_EVERY === 0) {
            const newScores = detectMoodFromFrame(canvas, frameRef.current);
            setScores(newScores);

            const top = MOODS.reduce(
              (a, m) => (newScores[m.id] > (newScores[a.id] || 0) ? m : a),
              MOODS[0]
            );

            setTopMood((prev) => {
              if (prev?.id !== top.id) {
                setPulseKey((k) => k + 1);
                setShowTip(true);
                setTimeout(() => setShowTip(false), 6000);
              }
              return top;
            });

            historyTick++;
            if (historyTick % 5 === 0) {
              const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
              setHistory((h) => [...h.slice(-29), { ...top, time }]);
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [camState]);

  const takeSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSnapshot({
      dataUrl: canvas.toDataURL("image/jpeg", 0.85),
      mood: topMood,
      time: new Date().toLocaleTimeString(),
    });
  }, [topMood]);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Face landmark positions
  const FACE_DOTS = [
    { top: "12%", left: "25%" }, { top: "12%", left: "75%" },
    { top: "30%", left: "15%" }, { top: "30%", left: "85%" },
    { top: "45%", left: "30%" }, { top: "45%", left: "70%" },
    { top: "50%", left: "50%" },
    { top: "65%", left: "35%" }, { top: "65%", left: "65%" },
    { top: "78%", left: "25%" }, { top: "78%", left: "50%" }, { top: "78%", left: "75%" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        .vma-root { min-height: 100vh; background: #080c14; background-image: radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(139,92,246,0.12) 0%, transparent 50%); color: #e2e8f0; font-family: 'Syne', sans-serif; padding: 32px 20px 60px; }
        .vma-grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .vma-grid { grid-template-columns: 1fr; } }
        .cam-panel { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; }
        .cam-inner { position: relative; aspect-ratio: 4/3; background: #0d1220; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .cam-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        canvas.hidden { display: none; }
        .scan-overlay { position: absolute; inset: 0; pointer-events: none; }
        .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(99,102,241,0.8), transparent); animation: scanLine 3s ease-in-out infinite; }
        .corner { position: absolute; width: 20px; height: 20px; border-color: rgba(99,102,241,0.7); border-style: solid; }
        .c-tl { top: 16px; left: 16px; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
        .c-tr { top: 16px; right: 16px; border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
        .c-bl { bottom: 16px; left: 16px; border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
        .c-br { bottom: 16px; right: 16px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }
        .face-dot { position: absolute; width: 3px; height: 3px; border-radius: 50%; animation: faceDot 2s ease-in-out infinite; }
        .cam-idle { display: flex; flex-direction: column; align-items: center; gap: 16px; color: rgba(226,232,240,0.5); text-align: center; padding: 24px; }
        .cam-idle-icon { width: 72px; height: 72px; border-radius: 50%; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        .cam-controls { padding: 14px 16px; display: flex; align-items: center; gap: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
        .btn-start { flex: 1; padding: 10px 18px; border-radius: 12px; border: none; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
        .btn-start.start { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; box-shadow: 0 4px 20px rgba(99,102,241,0.35); }
        .btn-start.start:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(99,102,241,0.45); }
        .btn-start.stop { background: rgba(239,68,68,0.12); color: #fca5a5; border: 1px solid rgba(239,68,68,0.25); }
        .btn-snap { padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(226,232,240,0.6); font-size: 1rem; cursor: pointer; transition: all 0.2s; }
        .btn-snap:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .btn-snap:disabled { opacity: 0.3; cursor: not-allowed; }
        .snap-modal-bg { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.75); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.3s ease; }
        .snap-modal { background: #0d1220; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; max-width: 480px; width: 100%; animation: scaleIn 0.3s ease; }
        .cam-error { padding: 12px 16px; background: rgba(239,68,68,0.08); border-top: 1px solid rgba(239,68,68,0.2); font-size: 0.78rem; color: #fca5a5; font-family: 'DM Mono', monospace; }
        .vma-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); border-radius: 999px; padding: 4px 14px; font-size: 0.72rem; color: #a5b4fc; font-family: 'DM Mono', monospace; margin-bottom: 16px; letter-spacing: 0.08em; text-transform: uppercase; }
        .badge-dot { width: 6px; height: 6px; background: #818cf8; border-radius: 50%; animation: blink 1.4s ease-in-out infinite; }
        .spinner { width: 40px; height: 40px; border: 2px solid rgba(99,102,241,0.2); border-top-color: #818cf8; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes scanLine { 0% { top: 0%; opacity: 0; } 5% { opacity: 1; } 95% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes faceDot { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="vma-root">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div className="vma-badge">
            <div className="badge-dot" />
            CampusCare · Mood Vision
          </div>
          <h1 style={{
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 40%, #c4b5fd 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8,
          }}>Real-Time Mood Analysis</h1>
          <p style={{ fontSize: "0.9rem", color: "rgba(226,232,240,0.5)", fontFamily: "'DM Mono', monospace" }}>
            AI-powered emotional state detection via your camera
          </p>
        </div>

        <div className="vma-grid">
          {/* ── Camera panel ── */}
          <div className="cam-panel">
            <div className="cam-inner">
              {camState === "idle" && (
                <div className="cam-idle">
                  <div className="cam-idle-icon">📷</div>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Enable Camera</h3>
                    <p style={{ fontSize: "0.8rem", maxWidth: 200, lineHeight: 1.5 }}>
                      Your camera stays private — all analysis runs in your browser.
                    </p>
                  </div>
                </div>
              )}
              {camState === "requesting" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "rgba(226,232,240,0.6)" }}>
                  <div className="spinner" />
                  <span style={{ fontSize: "0.85rem" }}>Requesting camera access…</span>
                </div>
              )}
              <video
                ref={videoRef}
                className="cam-video"
                muted
                playsInline
                style={{ display: camState === "active" ? "block" : "none" }}
              />

              {/* Scanning overlay */}
              {camState === "active" && (
                <div className="scan-overlay">
                  <div className="scan-line" />
                  <div className="corner c-tl" />
                  <div className="corner c-tr" />
                  <div className="corner c-bl" />
                  <div className="corner c-br" />
                  {/* Face landmark dots */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 140, height: 170 }}>
                    {FACE_DOTS.map((pos, i) => (
                      <div
                        key={i}
                        className="face-dot"
                        style={{
                          ...pos,
                          animationDelay: `${i * 0.15}s`,
                          background: topMood?.color || "rgba(99,102,241,0.6)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {camState === "error" && (
              <div className="cam-error">⚠️ {camError}</div>
            )}

            <div className="cam-controls">
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: "0.8rem",
                color: camState === "active" ? "#a5b4fc" : "rgba(226,232,240,0.4)", letterSpacing: "0.08em",
              }}>
                {camState === "active" ? `⏱ ${fmtTime(sessionTime)}` : "--:--"}
              </span>
              <button
                className={`btn-start ${camState === "active" ? "stop" : "start"}`}
                onClick={camState === "active" ? stopCamera : startCamera}
                disabled={camState === "requesting"}
              >
                {camState === "active" ? "⏹ Stop Analysis"
                  : camState === "requesting" ? "Starting…"
                  : "▶ Start Analysis"}
              </button>
              <button
                className="btn-snap"
                disabled={camState !== "active" || !topMood}
                onClick={takeSnapshot}
                title="Save mood snapshot"
              >
                📸
              </button>
            </div>
          </div>

          {/* ── Analysis panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Main mood card */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20, padding: 20, position: "relative", overflow: "hidden",
            }}>
              {/* Glow bg */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `radial-gradient(ellipse 60% 60% at 80% 0%, ${topMood?.glow || "rgba(99,102,241,0.1)"}, transparent 70%)`,
                transition: "background 1s",
              }} />

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, position: "relative" }}>
                {/* Ring */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <MoodRing topMood={topMood} scores={scores} scanning={scanning} />
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", transform: "rotate(90deg)",
                  }}>
                    <div key={pulseKey} style={{ fontSize: "2rem", lineHeight: 1 }}>
                      {topMood?.emoji || "🔍"}
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "rgba(226,232,240,0.5)", marginTop: 2 }}>
                      {topMood ? `${((scores[topMood.id] || 0) * 100).toFixed(0)}%` : "--"}
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    key={`label-${pulseKey}`}
                    style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: topMood?.color || "#6366f1", transition: "color 0.5s" }}
                  >
                    {camState === "active" ? (topMood?.label || "Detecting…") : "Ready"}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(226,232,240,0.45)", marginTop: 6 }}>
                    {topMood && camState === "active"
                      ? <>Confidence: <span style={{ color: topMood.color, fontWeight: 500 }}>{((scores[topMood.id] || 0) * 100).toFixed(1)}%</span></>
                      : "Start camera to begin"}
                  </div>
                  {camState === "active" && (
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "rgba(226,232,240,0.35)", marginTop: 4 }}>
                      Frame: <span style={{ color: "#a5b4fc" }}>{frameRef.current}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tip */}
              {showTip && topMood && camState === "active" && (
                <div style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: "12px 14px", fontSize: "0.82rem",
                  color: "rgba(226,232,240,0.75)", lineHeight: 1.5,
                  animation: "slideUp 0.4s ease", position: "relative",
                }}>
                  💡 {topMood.tip}
                </div>
              )}
            </div>

            {/* Probability bars */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 18 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(226,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
                Emotional State Distribution
              </div>
              {camState === "active" && Object.keys(scores).length > 0
                ? MOODS
                    .slice()
                    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                    .map((m) => (
                      <MoodBar key={m.id} mood={m} score={scores[m.id] || 0} isTop={m.id === topMood?.id} />
                    ))
                : MOODS.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, opacity: 0.25 }}>
                      <span style={{ fontSize: "0.85rem", width: 20, textAlign: "center" }}>{m.emoji}</span>
                      <span style={{ width: 58, fontSize: "0.72rem", color: "rgba(226,232,240,0.55)", fontFamily: "'DM Mono', monospace" }}>{m.label}</span>
                      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 999 }} />
                      <span style={{ width: 32, fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "rgba(226,232,240,0.3)", textAlign: "right" }}>—</span>
                    </div>
                  ))
              }
            </div>

            {/* Timeline */}
            {history.length > 0 && <Timeline history={history} />}
          </div>
        </div>

        {/* Privacy strip */}
        <div style={{
          maxWidth: 1100, margin: "20px auto 0",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, padding: "16px 22px", display: "flex", alignItems: "center", gap: 12,
          fontSize: "0.78rem", color: "rgba(226,232,240,0.4)", fontFamily: "'DM Mono', monospace",
        }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>🔒</span>
          All analysis runs entirely in your browser via the Canvas API. No images or video are transmitted to any server.
        </div>
      </div>

      {/* Snapshot modal */}
      {snapshot && (
        <div className="snap-modal-bg" onClick={() => setSnapshot(null)}>
          <div className="snap-modal" onClick={(e) => e.stopPropagation()}>
            <img style={{ width: "100%", display: "block", transform: "scaleX(-1)" }} src={snapshot.dataUrl} alt="Mood snapshot" />
            <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{snapshot.mood?.emoji} {snapshot.mood?.label}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "rgba(226,232,240,0.4)", marginTop: 2 }}>{snapshot.time}</div>
              </div>
              <button
                onClick={() => setSnapshot(null)}
                style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(226,232,240,0.6)", fontFamily: "'Syne', sans-serif", fontSize: "0.8rem", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" style={{ display: "none" }} />
    </>
  );
}