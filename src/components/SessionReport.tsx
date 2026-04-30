'use client';
// src/components/SessionReport.tsx
// Shown after "End Call" — displays AI-generated summary, topics, and emotion chart.

import { EmotionEntry } from '@/lib/useEmotionDetection';

type ReportData = {
  summary: string;
  topics: string[];
  emotionInsight: string;
  wellbeingNote: string;
  dominantEmotion: string;
  riskFlag: boolean;
};

type Props = {
  report: ReportData;
  emotionTimeline: EmotionEntry[];
  durationSec: number;
  onClose: () => void;
};

const EMOTION_COLORS: Record<string, string> = {
  happy:     '#22c55e',
  neutral:   '#94a3b8',
  sad:       '#3b82f6',
  angry:     '#ef4444',
  surprised: '#f59e0b',
  fearful:   '#8b5cf6',
  disgusted: '#f97316',
};

function EmotionBar({ emotion, count, total }: { emotion: string; count: number; total: number }) {
  const pct = Math.round((count / total) * 100);
  const color = EMOTION_COLORS[emotion] ?? '#94a3b8';
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-right capitalize text-foreground/70">{emotion}</span>
      <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-10 text-xs text-foreground/50 font-mono">{pct}%</span>
    </div>
  );
}

function EmotionTimeline({ timeline, durationSec }: { timeline: EmotionEntry[]; durationSec: number }) {
  if (!timeline.length) return <p className="text-sm text-foreground/50 italic">No facial data captured.</p>;

  // Build 10-segment bar
  const segments = 10;
  const segDur = durationSec / segments;
  const bars = Array.from({ length: segments }, (_, i) => {
    const segStart = i * segDur, segEnd = segStart + segDur;
    const entries = timeline.filter(e => e.timestamp >= segStart && e.timestamp < segEnd);
    if (!entries.length) return { emotion: 'neutral', color: '#94a3b8', label: '' };
    const counts: Record<string, number> = {};
    entries.forEach(e => { counts[e.emotion] = (counts[e.emotion] ?? 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { emotion: top, color: EMOTION_COLORS[top] ?? '#94a3b8', label: top };
  });

  return (
    <div>
      <div className="flex gap-1 items-end mb-1">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-sm h-5" style={{ background: b.color, opacity: 0.85 }} title={b.emotion} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-foreground/40">
        <span>0s</span><span>{Math.round(durationSec / 2)}s</span><span>{durationSec}s</span>
      </div>
    </div>
  );
}

export default function SessionReport({ report, emotionTimeline, durationSec, onClose }: Props) {
  // Emotion frequency counts
  const counts: Record<string, number> = {};
  emotionTimeline.forEach(e => { counts[e.emotion] = (counts[e.emotion] ?? 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = emotionTimeline.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl w-full max-w-xl my-4">

        {/* Header */}
        <div className="p-6 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Session Report</h2>
              <p className="text-sm text-foreground/50 mt-0.5">Duration: {durationSec}s · {emotionTimeline.length} emotion samples</p>
            </div>
            <div className="text-3xl" title={report.dominantEmotion}>
              {report.dominantEmotion === 'happy' ? '😊' : report.dominantEmotion === 'sad' ? '😔' : report.dominantEmotion === 'angry' ? '😤' : report.dominantEmotion === 'surprised' ? '😲' : '😐'}
            </div>
          </div>
          {report.riskFlag && (
            <div className="mt-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2 text-sm text-red-700 dark:text-red-400">
              ⚠️ Distress signals detected. Please consider reaching out to iCall: <strong>9152987821</strong>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Summary */}
          <section>
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-2">Summary</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{report.summary}</p>
          </section>

          {/* Topics */}
          <section>
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-2">Topics Discussed</h3>
            <div className="flex flex-wrap gap-2">
              {report.topics.map(t => (
                <span key={t} className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">{t}</span>
              ))}
            </div>
          </section>

          {/* Emotion timeline bar */}
          <section>
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-2">Emotion Timeline</h3>
            <EmotionTimeline timeline={emotionTimeline} durationSec={durationSec} />
          </section>

          {/* Emotion breakdown */}
          {sorted.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3">Emotion Breakdown</h3>
              <div className="space-y-2">
                {sorted.map(([em, n]) => <EmotionBar key={em} emotion={em} count={n} total={total} />)}
              </div>
            </section>
          )}

          {/* Emotion insight */}
          <section>
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-2">Emotion Insight</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{report.emotionInsight}</p>
          </section>

          {/* Wellbeing note */}
          <section className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">💚 Wellbeing tip</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">{report.wellbeingNote}</p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            Close Report
          </button>
          <p className="text-center text-[10px] text-foreground/40 mt-3">
            Report generated by Mistral AI. Not a clinical assessment.
          </p>
        </div>
      </div>
    </div>
  );
}