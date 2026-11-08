import React from 'react';
import * as THREE from 'three';
import {Blocky, CharProps} from './Blocky';
import {Shot} from './scenes';
import {clamp, lerp} from './util';

// kindness points as a function of each character's height (scale)
const CURVES: Record<string, [number, number][]> = {
  leo: [[0.58, 7], [0.7, 140], [0.82, 330], [1.0, 620], [1.2, 950]],
  max: [[0.6, 0], [0.74, 90], [0.86, 240], [1.12, 610], [1.3, 900]],
  mia: [[0.88, 420], [1.12, 700]],
  sam: [[1, 520]],
  zoe: [[1, 380]],
  ben: [[1, 560]],
  gran: [[1, 870]],
  newkid: [[1, 230]],
};
const pointsFor = (key: string, s: number) => {
  const c = CURVES[key];
  if (!c) return null;
  if (s <= c[0][0]) return c[0][1];
  for (let i = 0; i < c.length - 1; i++) {
    const [a, va] = c[i];
    const [b, vb] = c[i + 1];
    if (s <= b) return lerp(va, vb, (s - a) / (b - a));
  }
  return c[c.length - 1][1];
};

/** find every <Blocky> in the shot's JSX and read its props */
const collect = (node: React.ReactNode, out: CharProps[]) => {
  React.Children.forEach(node as any, (ch: any) => {
    if (!ch || typeof ch !== 'object') return;
    if (ch.type === Blocky) out.push(ch.props as CharProps);
    else if (ch.props && ch.props.children) collect(ch.props.children, out);
  });
  return out;
};
const values = (shot: Shot) => {
  const m = new Map<string, number>();
  for (const p of collect(shot.node, [])) {
    const v = pointsFor(p.look.key, p.scale ?? 1);
    if (v !== null) m.set(p.look.key, v);
  }
  return m;
};

const cam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.1, 600);
const v3 = new THREE.Vector3();

export const Labels: React.FC<{shot: Shot; before: Shot; after: Shot; width: number; height: number}> = ({shot, before, after, width, height}) => {
  const c = shot.cam;
  cam.fov = c.fov ?? 50;
  cam.aspect = width / height;
  cam.position.set(c.pos[0], c.pos[1], c.pos[2]);
  cam.lookAt(c.look[0], c.look[1] + 0.4, c.look[2]);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const vb = values(before);
  const va = values(after);
  const items = collect(shot.node, []);
  type L = {key: string; val: number; x: number; y: number; size: number; w: number; dist: number; color: string; pop: number};
  const labels: L[] = [];
  items.forEach((p) => {
    const raw = pointsFor(p.look.key, p.scale ?? 1);
    if (raw === null) return;
    const b = vb.get(p.look.key) ?? raw;
    const a = va.get(p.look.key) ?? raw;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const val = Math.round(clamp(raw, lo, hi));
    const rising = a - b > 1 && val > b + 0.5 && val < hi - 0.5;
    const falling = b - a > 1 && val < b - 0.5 && val > lo + 0.5;
    const s = p.scale ?? 1;
    const lean = p.pose?.lean ?? 0;
    const ry = p.rotY ?? 0;
    const hy = 4.72 * Math.cos(lean);
    const hz = 4.72 * Math.sin(lean);
    v3.set(p.pos[0] + Math.sin(ry) * hz * s, p.pos[1] + hy * s + 1.25 * s + 0.55, p.pos[2] + Math.cos(ry) * hz * s);
    const dist = v3.distanceTo(cam.position);
    v3.project(cam);
    if (v3.z > 1 || v3.z < -1) return;
    let x = ((v3.x + 1) / 2) * width;
    let y = ((1 - v3.y) / 2) * height;
    const size = clamp(1150 / dist, 52, 124);
    const text = val.toLocaleString('en-US');
    const w = size * 0.62 * text.length + size * 0.25;
    if (x < -w / 2 || x > width + w / 2 || y > height - 200) return;
    x = clamp(x, w / 2 + 14, width - w / 2 - 14);
    y = Math.max(y, size + 30);
    labels.push({key: p.look.key, val, x, y, size, w, dist, color: rising ? '#5dff7a' : falling ? '#ff4d4d' : '#ffffff', pop: rising || falling ? 1.15 : 1});
  });
  // nearest first; push overlapping labels upward
  labels.sort((p, q) => p.dist - q.dist);
  const placed: L[] = [];
  for (const l of labels) {
    for (let k = 0; k < 4; k++) {
      const hit = placed.find((o) => Math.abs(o.x - l.x) < (o.w + l.w) / 2 && Math.abs(o.y - l.y) < (o.size + l.size) * 0.5);
      if (!hit) break;
      l.y = hit.y - (hit.size + l.size) * 0.52;
    }
    placed.push(l);
  }
  return (
    <>
      {placed.map((l) => (
        <div
          key={l.key}
          style={{
            position: 'absolute',
            left: l.x,
            top: l.y,
            transform: `translate(-50%, -100%) scale(${l.pop})`,
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: l.size,
            lineHeight: 1,
            color: l.color,
            WebkitTextStroke: `${Math.round(l.size * 0.12)}px #000`,
            paintOrder: 'stroke fill',
            textShadow: `0 ${Math.round(l.size * 0.07)}px 0 rgba(0,0,0,0.4)`,
            whiteSpace: 'nowrap',
          }}
        >
          {l.val.toLocaleString('en-US')}
        </div>
      ))}
    </>
  );
};
