import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import timeline from './timeline.json';
import {clamp, easeOutBack} from './util';

type W = {w: string; s: number; e: number; k: string | null; end: boolean; scene: string};
const words = (timeline as any).words as W[];
const COLORS: Record<string, string> = {g: '#22c55e', r: '#ff3b3b', y: '#ffb800', o: '#ff7a1a', b: '#2f8cff', p: '#a855f7'};

const chunks = (() => {
  const out: {words: W[]; s: number; e: number}[] = [];
  let cur: W[] = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const brk =
      cur.length >= 1 ||
      (prev && (prev.end || w.s - prev.e > 0.22 || prev.scene !== w.scene)) ||
      (w.k && cur.length > 0) ||
      (prev && prev.k && cur.length > 0);
    const joinK = prev && prev.k && w.k === prev.k && cur.length === 1;
    if (brk && cur.length && !joinK) {
      out.push({words: cur, s: cur[0].s, e: cur[cur.length - 1].e});
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) out.push({words: cur, s: cur[0].s, e: cur[cur.length - 1].e});
  for (let i = 0; i < out.length; i++) {
    const next = out[i + 1];
    out[i].e = next ? Math.min(next.s, out[i].e + 0.45) : out[i].e + 1.6;
  }
  return out;
})();

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const c = chunks.find((x) => t >= x.s - 0.03 && t < x.e);
  if (!c) return null;
  const p = clamp((t - c.s + 0.03) / 0.14);
  const sc = 0.55 + 0.45 * easeOutBack(p);
  return (
    <div
      style={{
        position: 'absolute',
        top: 1090,
        left: 30,
        right: 30,
        display: 'flex',
        justifyContent: 'center',
        gap: '0 30px',
        transform: `scale(${sc})`,
        transformOrigin: '50% 50%',
        fontFamily: 'Nunito',
        fontWeight: 900,
        fontSize: 132,
        lineHeight: 1.1,
        textAlign: 'center',
      }}
    >
      {c.words.map((w, i) => (
        <span
          key={i}
          style={{
            color: w.k ? '#ffd21f' : '#ffffff',
            WebkitTextStroke: '16px #000000',
            paintOrder: 'stroke fill',
            textShadow: '0 9px 0 rgba(0,0,0,0.45)',
          }}
        >
          {w.w.toLowerCase()}
        </span>
      ))}
    </div>
  );
};
