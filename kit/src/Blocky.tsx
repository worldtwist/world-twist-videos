import * as THREE from 'three';
import React from 'react';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {rng, V3} from './util';

export type Expr = 'smile' | 'grin' | 'sad' | 'smug' | 'shock' | 'mean' | 'laugh' | 'tired';
export type Hair = 'messy' | 'swept' | 'bun' | 'cap' | 'ponytail' | 'curly' | 'pigtails' | 'spiky';
export type Top = 'hoodie' | 'jacket' | 'dress' | 'suspenders' | 'tee' | 'stripes' | 'cardigan' | 'bolt';
export type Bottom = 'jeans' | 'darkjeans' | 'khaki' | 'black' | 'skirt' | 'longskirt';

export interface Look {
  key: string;
  skin: string;
  top: Top;
  c1: string; // main top colour
  c2: string; // second top colour (stripes, collar, inner shirt...)
  bottom: Bottom;
  shoes: string;
  socks?: string;
  hair: Hair;
  hairColor: string;
  accent?: string; // cap / bow colour
  skirtColor?: string;
  longSleeves?: boolean;
  glasses?: boolean;
  blush?: boolean;
  lashes?: boolean;
}

export interface Pose {
  walk?: number;
  walkAmp?: number;
  armL?: V3;
  armR?: V3;
  legL?: number;
  legR?: number;
  lean?: number;
  roll?: number;
  bob?: number;
  headNod?: number;
  headTurn?: number;
  headTilt?: number;
}

// ---------------------------------------------------------------- materials
const matCache = new Map<string, THREE.Material>();
export const mat = (color: string) => {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({color, roughness: 0.62, metalness: 0});
    matCache.set(color, m);
  }
  return m;
};
const hairMat = (color: string) => {
  const k = 'hair' + color;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({color, roughness: 0.42, metalness: 0});
    matCache.set(k, m);
  }
  return m;
};

const texCache = new Map<string, THREE.Texture>();
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) => {
  let t = texCache.get(key);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    let seed = 0;
    for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
    draw(g, rng(seed));
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texCache.set(key, t);
  }
  return t;
};
const texMatCache = new Map<THREE.Texture, THREE.Material>();
const texMat = (t: THREE.Texture) => {
  let m = texMatCache.get(t);
  if (!m) {
    m = new THREE.MeshStandardMaterial({map: t, roughness: 0.66, metalness: 0});
    texMatCache.set(t, m);
  }
  return m;
};

// ---------------------------------------------------------------- cloth drawing helpers
const folds = (g: CanvasRenderingContext2D, r: () => number, w: number, h: number, n = 7, a = 0.13) => {
  g.save();
  g.filter = 'blur(4px)';
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h * 0.9;
    const dx = (r() - 0.5) * 40;
    const len = 30 + r() * 50;
    g.strokeStyle = `rgba(0,0,0,${a})`;
    g.lineWidth = 7 + r() * 6;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + dx, y + len * 0.5, x + dx * 0.4, y + len);
    g.stroke();
    g.strokeStyle = `rgba(255,255,255,${a * 0.7})`;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x + 9, y + 4);
    g.quadraticCurveTo(x + 9 + dx, y + len * 0.5, x + 9 + dx * 0.4, y + len);
    g.stroke();
  }
  g.restore();
};
const sideShade = (g: CanvasRenderingContext2D, w: number, h: number) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.16)');
  gr.addColorStop(0.18, 'rgba(0,0,0,0)');
  gr.addColorStop(0.82, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
};
const knit = (g: CanvasRenderingContext2D, r: () => number, w: number, h: number) => {
  for (let i = 0; i < 900; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    g.fillRect(r() * w, r() * h, 2, 3);
  }
};

/** fills the base cloth of a top (used on back, sides and sleeves) */
const topBase = (g: CanvasRenderingContext2D, r: () => number, L: Look, w: number, h: number) => {
  if (L.top === 'stripes') {
    for (let y = 0; y < h; y += 36) {
      g.fillStyle = L.c1;
      g.fillRect(0, y, w, 18);
      g.fillStyle = L.c2;
      g.fillRect(0, y + 18, w, 18);
    }
  } else if (L.top === 'suspenders') {
    g.fillStyle = L.c1;
    g.fillRect(0, 0, w, h);
  } else {
    g.fillStyle = L.c1;
    g.fillRect(0, 0, w, h);
  }
  knit(g, r, w, h);
};

const drawTorso = (g: CanvasRenderingContext2D, r: () => number, L: Look, side: 'front' | 'back' | 'side') => {
  const W = 256;
  const H = 256;
  topBase(g, r, L, W, H);
  if (side === 'front') {
    switch (L.top) {
      case 'hoodie': {
        // hood rim and drawstrings
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.beginPath();
        g.ellipse(128, 0, 70, 34, 0, 0, Math.PI);
        g.fill();
        g.strokeStyle = '#f4f4f4';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(108, 28);
        g.lineTo(104, 96);
        g.moveTo(148, 28);
        g.lineTo(152, 96);
        g.stroke();
        g.fillStyle = '#f4f4f4';
        g.fillRect(100, 94, 9, 12);
        g.fillRect(147, 94, 9, 12);
        // pocket
        g.fillStyle = 'rgba(0,0,0,0.14)';
        g.beginPath();
        g.roundRect(56, 150, 144, 74, 14);
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 3;
        g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(0, 236, W, 20);
        break;
      }
      case 'jacket': {
        g.fillStyle = L.c2;
        g.fillRect(104, 0, 48, H);
        g.fillStyle = '#ffffff';
        g.fillRect(118, 6, 20, 30);
        g.strokeStyle = '#d8d8d8';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(103, 0);
        g.lineTo(103, H);
        g.moveTo(153, 0);
        g.lineTo(153, H);
        g.stroke();
        // collar
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.moveTo(70, 0);
        g.lineTo(104, 46);
        g.lineTo(104, 0);
        g.moveTo(186, 0);
        g.lineTo(152, 46);
        g.lineTo(152, 0);
        g.fill();
        // ribbed hem with white stripe
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(0, 226, W, 30);
        g.fillStyle = '#ffffff';
        g.fillRect(0, 236, W, 7);
        break;
      }
      case 'dress': {
        // straps + collar + skirt start
        g.fillStyle = L.c2;
        g.fillRect(62, 0, 26, H);
        g.fillRect(168, 0, 26, H);
        g.fillRect(0, 196, W, 60);
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(0, 196, W, 6);
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.ellipse(100, 8, 32, 26, 0.2, 0, Math.PI * 2);
        g.ellipse(156, 8, 32, 26, -0.2, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.15)';
        g.lineWidth = 3;
        g.stroke();
        g.fillStyle = '#fff3a0';
        g.beginPath();
        g.arc(75, 186, 7, 0, Math.PI * 2);
        g.arc(181, 186, 7, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'suspenders': {
        g.fillStyle = 'rgba(0,0,0,0.08)';
        g.fillRect(124, 0, 8, H);
        for (let y = 50; y < H; y += 46) {
          g.fillStyle = '#e8e8e8';
          g.beginPath();
          g.arc(128, y, 5, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#1d1d1d';
        g.fillRect(52, 0, 18, H);
        g.fillRect(186, 0, 18, H);
        // bow tie
        g.fillStyle = L.c2;
        g.beginPath();
        g.moveTo(128, 30);
        g.lineTo(88, 10);
        g.lineTo(88, 52);
        g.closePath();
        g.moveTo(128, 30);
        g.lineTo(168, 10);
        g.lineTo(168, 52);
        g.closePath();
        g.fill();
        g.beginPath();
        g.arc(128, 30, 11, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.beginPath();
        g.arc(128, 30, 11, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'tee': {
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.beginPath();
        g.ellipse(128, 0, 46, 22, 0, 0, Math.PI);
        g.fill();
        // star logo (original)
        g.fillStyle = L.c2;
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const rr = i % 2 ? 22 : 52;
          g.lineTo(128 + Math.cos(a) * rr, 120 + Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 5;
        g.stroke();
        break;
      }
      case 'bolt': {
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.beginPath();
        g.ellipse(128, 0, 46, 22, 0, 0, Math.PI);
        g.fill();
        g.fillStyle = L.c2;
        g.beginPath();
        g.moveTo(140, 50);
        g.lineTo(96, 132);
        g.lineTo(128, 132);
        g.lineTo(112, 200);
        g.lineTo(164, 108);
        g.lineTo(132, 108);
        g.lineTo(150, 50);
        g.closePath();
        g.fill();
        g.strokeStyle = '#1a1a1a';
        g.lineWidth = 4;
        g.stroke();
        break;
      }
      case 'stripes': {
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.beginPath();
        g.ellipse(128, 0, 50, 24, 0, 0, Math.PI);
        g.fill();
        break;
      }
      case 'cardigan': {
        g.fillStyle = L.c2;
        g.beginPath();
        g.moveTo(84, 0);
        g.lineTo(128, 120);
        g.lineTo(172, 0);
        g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.ellipse(112, 6, 24, 18, 0.3, 0, Math.PI * 2);
        g.ellipse(144, 6, 24, 18, -0.3, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(128, 120);
        g.lineTo(128, H);
        g.stroke();
        g.fillStyle = '#f5e6b8';
        for (let y = 140; y < H; y += 34) {
          g.beginPath();
          g.arc(118, y, 7, 0, Math.PI * 2);
          g.fill();
        }
        // pockets
        g.strokeStyle = 'rgba(0,0,0,0.22)';
        g.strokeRect(36, 170, 54, 46);
        g.strokeRect(166, 170, 54, 46);
        break;
      }
    }
  } else if (side === 'back') {
    if (L.top === 'hoodie') {
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.beginPath();
      g.ellipse(128, 0, 90, 70, 0, 0, Math.PI);
      g.fill();
    }
    if (L.top === 'dress') {
      g.fillStyle = L.c2;
      g.save();
      g.translate(128, 120);
      g.rotate(0.6);
      g.fillRect(-13, -170, 26, 340);
      g.rotate(-1.2);
      g.fillRect(-13, -170, 26, 340);
      g.restore();
      g.fillRect(0, 196, W, 60);
    }
    if (L.top === 'suspenders') {
      g.fillStyle = '#1d1d1d';
      g.save();
      g.translate(128, 130);
      g.rotate(0.45);
      g.fillRect(-9, -170, 18, 340);
      g.rotate(-0.9);
      g.fillRect(-9, -170, 18, 340);
      g.restore();
    }
    if (L.top === 'jacket') {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, 226, W, 30);
      g.fillStyle = '#ffffff';
      g.fillRect(0, 236, W, 7);
    }
  } else {
    if (L.top === 'dress') {
      g.fillStyle = L.c2;
      g.fillRect(0, 196, W, 60);
    }
    if (L.top === 'jacket') {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 236, W, 7);
    }
  }
  folds(g, r, W, H, 6, 0.1);
  sideShade(g, W, H);
};

const pantsBase = (g: CanvasRenderingContext2D, r: () => number, L: Look, w: number, h: number) => {
  const col = {jeans: '#4a6fa8', darkjeans: '#2c3d5c', khaki: '#b9a771', black: '#26272b', skirt: L.skin, longskirt: L.skirtColor ?? L.c2}[L.bottom];
  g.fillStyle = col;
  g.fillRect(0, 0, w, h);
  if (L.bottom === 'jeans' || L.bottom === 'darkjeans') {
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 3 + r() * 6);
    }
    const gr = g.createRadialGradient(w * 0.5, h * 0.35, 4, w * 0.5, h * 0.35, w * 0.7);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,214,140,0.5)';
    g.lineWidth = 2;
    g.setLineDash([6, 5]);
    g.beginPath();
    g.moveTo(w * 0.82, 0);
    g.lineTo(w * 0.82, h);
    g.stroke();
    g.setLineDash([]);
  }
  if (L.bottom !== 'skirt') folds(g, r, w, h, 6, 0.09);
};

const legTex = (L: Look) =>
  canvasTex(`leg|${L.key}`, 128, 256, (g, r) => {
    pantsBase(g, r, L, 128, 256);
    if (L.bottom === 'skirt') {
      // bare legs with socks
      g.fillStyle = L.socks ?? '#ffffff';
      g.fillRect(0, 120, 128, 96);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let y = 140; y < 210; y += 26) {
        for (let x = 14; x < 128; x += 34) {
          g.beginPath();
          g.arc(x + ((y / 26) % 2) * 14, y, 5, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(0, 120, 128, 6);
    }
    // shoe
    g.fillStyle = L.shoes;
    g.fillRect(0, 214, 128, 42);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(0, 246, 128, 10);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 212, 128, 4);
    sideShade(g, 128, 256);
  });

const armTex = (L: Look) =>
  canvasTex(`arm|${L.key}`, 128, 256, (g, r) => {
    g.fillStyle = L.skin;
    g.fillRect(0, 0, 128, 256);
    const sleeve = L.longSleeves ? 214 : L.top === 'dress' ? 52 : 92;
    g.save();
    g.beginPath();
    g.rect(0, 0, 128, sleeve);
    g.clip();
    if (L.top === 'stripes') {
      for (let y = 0; y < 256; y += 36) {
        g.fillStyle = L.c1;
        g.fillRect(0, y, 128, 18);
        g.fillStyle = L.c2;
        g.fillRect(0, y + 18, 128, 18);
      }
    } else {
      g.fillStyle = L.top === 'dress' ? '#ffd3e6' : L.c1;
      g.fillRect(0, 0, 128, sleeve);
    }
    if (L.top === 'jacket') {
      g.fillStyle = '#ffffff';
      g.fillRect(0, sleeve - 26, 128, 7);
    }
    folds(g, r, 128, sleeve, 3, 0.12);
    g.restore();
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(0, sleeve - 8, 128, 8);
    sideShade(g, 128, 256);
  });

const torsoMats = (L: Look) => {
  const front = canvasTex(`tf|${L.key}`, 256, 256, (g, r) => drawTorso(g, r, L, 'front'));
  const back = canvasTex(`tb|${L.key}`, 256, 256, (g, r) => drawTorso(g, r, L, 'back'));
  const side = canvasTex(`ts|${L.key}`, 256, 256, (g, r) => drawTorso(g, r, L, 'side'));
  const top = mat(L.top === 'stripes' ? L.c1 : L.c1);
  // box material order: +x, -x, +y, -y, +z, -z
  return [texMat(side), texMat(side), top, top, texMat(front), texMat(back)];
};

// ---------------------------------------------------------------- faces
const faceCache = new Map<string, THREE.Material>();
const faceMaterial = (expr: Expr, L: Look) => {
  const key = `${expr}|${L.blush}|${L.glasses}|${L.lashes}`;
  let m = faceCache.get(key);
  if (m) return m;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const ink = '#141010';
  const EY = 118;
  const EX = [96, 160];
  // eyes
  EX.forEach((x, i) => {
    const s = i === 0 ? -1 : 1;
    g.strokeStyle = ink;
    g.fillStyle = ink;
    if (expr === 'laugh' || expr === 'grin') {
      g.lineWidth = 8;
      g.beginPath();
      g.arc(x, EY + 8, 13, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();
    } else if (expr === 'tired') {
      g.beginPath();
      g.ellipse(x, EY + 4, 9, 9, 0, 0, Math.PI);
      g.fill();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(x - 13, EY + 2);
      g.lineTo(x + 13, EY + 2);
      g.stroke();
    } else if (expr === 'smug' || expr === 'mean') {
      // half-lidded eyes
      g.beginPath();
      g.ellipse(x, EY + 3, 10, 9, 0, 0, Math.PI);
      g.fill();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(x - 14, EY + 1);
      g.lineTo(x + 14, EY + 1);
      g.stroke();
    } else {
      const ry = expr === 'shock' ? 17 : 14;
      const rx = expr === 'shock' ? 11 : 9;
      g.beginPath();
      g.ellipse(x, EY, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(x - 3, EY - 6, 3.6, 0, Math.PI * 2);
      g.fill();
    }
    if (L.lashes && expr !== 'laugh' && expr !== 'grin') {
      g.strokeStyle = ink;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x + s * 8, EY - 10);
      g.lineTo(x + s * 17, EY - 17);
      g.moveTo(x + s * 11, EY - 4);
      g.lineTo(x + s * 20, EY - 8);
      g.stroke();
    }
    // brows
    g.strokeStyle = ink;
    g.lineWidth = 5;
    g.beginPath();
    // s = -1 for the left eye: x - s*14 is the inner end, x + s*14 the outer end
    if (expr === 'mean') {
      g.moveTo(x - s * 14, EY - 15);
      g.lineTo(x + s * 15, EY - 28);
    } else if (expr === 'smug') {
      g.moveTo(x - s * 14, EY - 22);
      g.lineTo(x + s * 15, EY - 24);
    } else if (expr === 'sad' || expr === 'tired') {
      g.moveTo(x - s * 14, EY - 28);
      g.lineTo(x + s * 15, EY - 17);
    } else if (expr === 'shock') {
      g.arc(x, EY - 22, 14, Math.PI * 1.15, Math.PI * 1.85);
    } else {
      g.arc(x, EY - 14, 15, Math.PI * 1.22, Math.PI * 1.78);
    }
    g.stroke();
  });
  if (L.blush || expr === 'laugh' || expr === 'grin') {
    g.fillStyle = 'rgba(255,105,120,0.38)';
    g.beginPath();
    g.ellipse(74, 150, 15, 8, 0, 0, Math.PI * 2);
    g.ellipse(182, 150, 15, 8, 0, 0, Math.PI * 2);
    g.fill();
  }
  // mouth
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = 6;
  const MY = 160;
  if (expr === 'smile') {
    g.beginPath();
    g.arc(128, MY - 22, 26, Math.PI * 0.25, Math.PI * 0.75);
    g.stroke();
  } else if (expr === 'grin' || expr === 'laugh') {
    g.beginPath();
    g.moveTo(102, MY - 4);
    g.lineTo(154, MY - 4);
    g.quadraticCurveTo(152, MY + 34, 128, MY + 34);
    g.quadraticCurveTo(104, MY + 34, 102, MY - 4);
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(108, MY - 3, 40, 8);
    g.fillStyle = '#ff7484';
    g.beginPath();
    g.ellipse(128, MY + 26, 14, 6, 0, 0, Math.PI * 2);
    g.fill();
  } else if (expr === 'sad' || expr === 'tired') {
    g.beginPath();
    g.arc(128, MY + 20, 18, Math.PI * 1.25, Math.PI * 1.75);
    g.stroke();
  } else if (expr === 'smug' || expr === 'mean') {
    g.beginPath();
    g.moveTo(108, MY + 4);
    g.quadraticCurveTo(136, MY + 10, 152, MY - 8);
    g.stroke();
  } else if (expr === 'shock') {
    g.beginPath();
    g.ellipse(128, MY + 6, 9, 12, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (L.glasses) {
    g.strokeStyle = '#151515';
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(70, EY - 22, 52, 42, 10);
    g.roundRect(134, EY - 22, 52, 42, 10);
    g.moveTo(122, EY - 4);
    g.lineTo(134, EY - 4);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(74, EY - 18, 16, 10);
    g.fillRect(138, EY - 18, 16, 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  m = new THREE.MeshStandardMaterial({map: t, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2});
  faceCache.set(key, m);
  return m;
};

// ---------------------------------------------------------------- geometry
const G = {
  limb: new THREE.BoxGeometry(1, 2, 1).translate(0, -1, 0),
  torso: new THREE.BoxGeometry(2, 2, 1),
  head: new RoundedBoxGeometry(1.32, 1.28, 1.26, 5, 0.34),
  face: new THREE.PlaneGeometry(1.2, 1.2),
  rb: new RoundedBoxGeometry(1, 1, 1, 3, 0.2),
  box: new THREE.BoxGeometry(1, 1, 1),
  ball: new THREE.IcosahedronGeometry(1, 2),
  lump: new THREE.IcosahedronGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 5),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  skirt: new THREE.CylinderGeometry(1.15, 1.4, 1, 4, 1).rotateY(Math.PI / 4),
  bag: new RoundedBoxGeometry(0.95, 1.15, 0.7, 2, 0.06),
  bagFill: new THREE.IcosahedronGeometry(0.32, 0),
  lunch: new RoundedBoxGeometry(0.95, 0.6, 0.75, 2, 0.08),
  handle: new THREE.BoxGeometry(0.12, 0.6, 0.12),
  loaf: new THREE.CylinderGeometry(0.16, 0.16, 1.0, 8),
};

type MP = {g?: THREE.BufferGeometry; m: THREE.Material | THREE.Material[]; p?: V3; r?: V3; s?: V3 | number};
const Mesh: React.FC<MP> = ({g = G.rb, m, p, r, s}) => (
  <mesh geometry={g} material={m as any} position={p} rotation={r} scale={s as any} castShadow receiveShadow />
);

// ---------------------------------------------------------------- hair (relative to head centre)
const HairPiece: React.FC<{L: Look}> = ({L}) => {
  const hm = hairMat(L.hairColor);
  const cap = <Mesh m={hm} p={[0, 0.5, -0.04]} s={[1.5, 0.52, 1.44]} />;
  const back = <Mesh m={hm} p={[0, 0.12, -0.5]} s={[1.48, 1.0, 0.42]} />;
  switch (L.hair) {
    case 'messy':
      return (
        <>
          {cap}
          {back}
          <Mesh m={hm} p={[-0.38, 0.38, 0.58]} r={[0.5, 0, 0.35]} s={[0.55, 0.42, 0.32]} />
          <Mesh m={hm} p={[0.1, 0.42, 0.62]} r={[0.6, 0, -0.15]} s={[0.6, 0.4, 0.3]} />
          <Mesh m={hm} p={[0.5, 0.36, 0.55]} r={[0.5, 0, -0.45]} s={[0.45, 0.42, 0.3]} />
          <Mesh m={hm} p={[-0.68, 0.22, 0.05]} s={[0.12, 0.62, 0.95]} />
          <Mesh m={hm} p={[0.68, 0.22, 0.05]} s={[0.12, 0.62, 0.95]} />
          {[
            [-0.45, 0.92, 0.1, 0.5, -0.4],
            [0.0, 1.0, -0.15, 0.2, 0.1],
            [0.42, 0.9, 0.05, 0.4, 0.5],
            [-0.2, 0.86, -0.55, -0.6, -0.2],
            [0.3, 0.84, -0.5, -0.5, 0.4],
          ].map(([x, y, z, rx, rz], i) => (
            <Mesh key={i} g={G.cone} m={hm} p={[x, y, z]} r={[rx, i, rz]} s={[0.28, 0.6, 0.28]} />
          ))}
        </>
      );
    case 'swept':
      return (
        <>
          <Mesh m={hm} p={[0, 0.56, -0.05]} s={[1.5, 0.6, 1.44]} />
          {back}
          <Mesh m={hm} p={[0.15, 0.72, 0.42]} r={[-0.25, 0, -0.25]} s={[1.3, 0.5, 0.7]} />
          <Mesh m={hm} p={[0.55, 0.48, 0.58]} r={[0.3, 0, -0.5]} s={[0.5, 0.4, 0.3]} />
          <Mesh m={hm} p={[-0.68, 0.22, 0.0]} s={[0.12, 0.55, 0.95]} />
          <Mesh m={hm} p={[0.68, 0.22, 0.0]} s={[0.12, 0.55, 0.95]} />
        </>
      );
    case 'bun':
      return (
        <>
          {cap}
          {back}
          <Mesh g={G.ball} m={hm} p={[0, 0.88, -0.42]} s={0.42} />
          <Mesh m={hm} p={[-0.68, 0.2, -0.05]} s={[0.12, 0.6, 1.0]} />
          <Mesh m={hm} p={[0.68, 0.2, -0.05]} s={[0.12, 0.6, 1.0]} />
          <Mesh m={hm} p={[0, 0.5, 0.6]} r={[0.4, 0, 0]} s={[1.3, 0.3, 0.3]} />
        </>
      );
    case 'cap': {
      const cm = mat(L.accent ?? '#16a35f');
      return (
        <>
          <Mesh m={hm} p={[0, 0.0, -0.5]} s={[1.46, 0.8, 0.4]} />
          <Mesh m={hm} p={[-0.68, 0.12, 0.0]} s={[0.1, 0.45, 0.8]} />
          <Mesh m={hm} p={[0.68, 0.12, 0.0]} s={[0.1, 0.45, 0.8]} />
          <Mesh m={cm} p={[0, 0.56, -0.04]} s={[1.52, 0.6, 1.46]} />
          <Mesh g={G.box} m={cm} p={[0, 0.36, 0.86]} r={[0.15, 0, 0]} s={[1.3, 0.1, 0.75]} />
          <Mesh g={G.ball} m={mat('#ffffff')} p={[0, 0.88, 0]} s={0.1} />
        </>
      );
    }
    case 'ponytail': {
      const bm = mat(L.accent ?? '#ff5fa2');
      return (
        <>
          {cap}
          {back}
          <Mesh m={hm} p={[-0.2, 0.42, 0.6]} r={[0.45, 0, 0.4]} s={[0.95, 0.38, 0.3]} />
          <Mesh m={hm} p={[0.45, 0.4, 0.6]} r={[0.45, 0, -0.3]} s={[0.55, 0.36, 0.28]} />
          <Mesh m={hm} p={[-0.7, -0.1, 0.1]} s={[0.16, 1.15, 0.9]} />
          <Mesh m={hm} p={[0.7, -0.1, 0.1]} s={[0.16, 1.15, 0.9]} />
          <Mesh g={G.cone} m={hm} p={[0.95, 0.55, -0.25]} r={[0, 0, -2.4]} s={[0.4, 1.3, 0.4]} />
          <Mesh g={G.ball} m={hm} p={[0.82, 0.78, -0.2]} s={0.32} />
          <Mesh g={G.cone} m={bm} p={[0.66, 1.0, -0.15]} r={[0, 0, 1.2]} s={[0.22, 0.4, 0.14]} />
          <Mesh g={G.cone} m={bm} p={[0.98, 1.06, -0.15]} r={[0, 0, -1.2]} s={[0.22, 0.4, 0.14]} />
          <Mesh g={G.ball} m={bm} p={[0.82, 1.03, -0.15]} s={0.12} />
        </>
      );
    }
    case 'curly': {
      const r = rng(77);
      const pts: V3[] = [];
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2;
        const e = 0.15 + r() * 1.0;
        pts.push([Math.cos(a) * Math.cos(e) * 0.72, 0.45 + Math.sin(e) * 0.5, Math.sin(a) * Math.cos(e) * 0.7 - 0.08]);
      }
      return (
        <>
          <Mesh m={hm} p={[0, 0.48, -0.06]} s={[1.46, 0.5, 1.4]} />
          {pts
            .filter((p) => !(p[2] > 0.35 && p[1] < 0.62))
            .map((p, i) => (
              <Mesh key={i} g={G.lump} m={hm} p={p} s={0.27 + (i % 3) * 0.04} r={[i, i * 2, 0]} />
            ))}
          {back}
        </>
      );
    }
    case 'pigtails': {
      const r = rng(31);
      const puff = (cx: number) =>
        Array.from({length: 7}, (_, i) => (
          <Mesh key={cx + '_' + i} g={G.lump} m={hm} p={[cx + (r() - 0.5) * 0.4, 0.2 + (r() - 0.5) * 0.6, -0.15 + (r() - 0.5) * 0.4]} s={0.3 + r() * 0.12} r={[i, i, 0]} />
        ));
      return (
        <>
          {cap}
          {back}
          <Mesh m={hm} p={[0, 0.42, 0.6]} r={[0.45, 0, 0]} s={[1.4, 0.34, 0.3]} />
          {puff(-0.95)}
          {puff(0.95)}
        </>
      );
    }
    case 'spiky':
      return (
        <>
          {cap}
          {back}
          <Mesh m={hm} p={[0, 0.44, 0.6]} r={[0.5, 0, 0]} s={[1.4, 0.3, 0.3]} />
          {[-0.5, -0.17, 0.17, 0.5].flatMap((x, i) => [
            <Mesh key={'a' + i} g={G.cone} m={hm} p={[x, 0.95, 0.2]} r={[-0.4, 0, -x * 0.6]} s={[0.24, 0.7, 0.24]} />,
            <Mesh key={'b' + i} g={G.cone} m={hm} p={[x * 0.9, 0.9, -0.35]} r={[0.5, 0, -x * 0.5]} s={[0.24, 0.6, 0.24]} />,
          ])}
        </>
      );
  }
};

// ---------------------------------------------------------------- props
export const Bag: React.FC = () => (
  <group position={[0, -1.95, 0.12]}>
    <Mesh g={G.handle} m={mat('#5b3a22')} p={[0, -0.28, 0]} />
    <Mesh g={G.bag} m={mat('#e3a556')} p={[0, -1.12, 0]} />
    <Mesh g={G.bagFill} m={mat('#3fbf4f')} p={[-0.22, -0.42, 0]} s={1.1} />
    <Mesh g={G.loaf} m={mat('#f2c25a')} p={[0.22, -0.28, -0.05]} r={[0, 0, -0.35]} />
    <Mesh g={G.bagFill} m={mat('#ff4b4b')} p={[0.08, -0.5, 0.22]} s={0.7} />
  </group>
);
export const LunchBox: React.FC = () => (
  <group position={[0, -2.1, 0.05]}>
    <Mesh g={G.lunch} m={mat('#ff4d6d')} />
    <Mesh g={G.box} m={mat('#ffffff')} p={[0, 0.31, 0]} s={[0.6, 0.06, 0.3]} />
  </group>
);

// ---------------------------------------------------------------- character
export interface CharProps {
  look: Look;
  pos: V3;
  rotY?: number;
  scale?: number;
  pose?: Pose;
  expr?: Expr;
  bags?: boolean;
  boxL?: boolean;
  boxR?: boolean;
}

export const Blocky: React.FC<CharProps> = ({look: L, pos, rotY = 0, scale = 1, pose = {}, expr = 'smile', bags, boxL, boxR}) => {
  const w = pose.walk ?? 0;
  const wa = pose.walkAmp ?? 0;
  const legSw = Math.sin(w) * 0.7 * wa;
  const armSw = Math.sin(w) * 0.6 * wa * (bags ? 0.3 : 1);
  const lean = pose.lean ?? 0;
  const roll = pose.roll ?? 0;
  const bob = Math.abs(Math.cos(w)) * 0.12 * wa + (pose.bob ?? 0) + 0.5 * Math.abs(Math.sin(lean)) + 0.5 * Math.abs(Math.sin(roll));
  const aL = pose.armL ?? [0, 0, 0];
  const aR = pose.armR ?? [0, 0, 0];
  const splay = (bags ? 0.3 : 0.1) * (1 - wa * 0.5);
  const legM = texMat(legTex(L));
  const armM = texMat(armTex(L));
  const tM = torsoMats(L);
  const skinM = mat(L.skin);
  return (
    <group position={pos} rotation-y={rotY} scale={scale}>
      <group rotation={[lean, 0, roll]} position-y={bob}>
        <group position={[-0.5, 2, 0]} rotation-x={(pose.legL ?? 0) + legSw}>
          <Mesh g={G.limb} m={legM} />
        </group>
        <group position={[0.5, 2, 0]} rotation-x={(pose.legR ?? 0) - legSw}>
          <Mesh g={G.limb} m={legM} />
        </group>
        {(L.bottom === 'skirt' || L.bottom === 'longskirt') && (
          <Mesh
            g={G.skirt}
            m={mat(L.skirtColor ?? L.c2)}
            p={[0, L.bottom === 'skirt' ? 1.78 : 1.3, 0]}
            s={L.bottom === 'skirt' ? [1.02, 0.62, 0.62] : [1.0, 1.5, 0.6]}
          />
        )}
        <Mesh g={G.torso} m={tM} p={[0, 3, 0]} />
        <group position={[-1.5, 3.92, 0]} rotation={[aL[0] - armSw, aL[1], aL[2] - splay]}>
          <Mesh g={G.limb} m={armM} />
          {bags && <Bag />}
          {boxL && <LunchBox />}
        </group>
        <group position={[1.5, 3.92, 0]} rotation={[aR[0] + armSw, aR[1], aR[2] + splay]}>
          <Mesh g={G.limb} m={armM} />
          {bags && <Bag />}
          {boxR && <LunchBox />}
        </group>
        <Mesh g={G.box} m={skinM} p={[0, 4.06, 0]} s={[0.6, 0.2, 0.5]} />
        <group position={[0, 4.72, 0]} rotation={[pose.headNod ?? 0, pose.headTurn ?? 0, pose.headTilt ?? 0]}>
          <Mesh g={G.head} m={skinM} />
          <mesh geometry={G.face} material={faceMaterial(expr, L)} position={[0, -0.04, 0.636]} />
          <HairPiece L={L} />
        </group>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- the cast
export const CAST: Record<string, Look> = {
  leo: {key: 'leo', skin: '#f2c9a0', top: 'hoodie', c1: '#2f7df6', c2: '#ffffff', bottom: 'jeans', shoes: '#f4f4f4', hair: 'messy', hairColor: '#2e2119', blush: true, longSleeves: true},
  max: {key: 'max', skin: '#efc39b', top: 'jacket', c1: '#d9302f', c2: '#1d1d1f', bottom: 'black', shoes: '#18181a', hair: 'swept', hairColor: '#f0c043'},
  gran: {key: 'gran', skin: '#f3d2b4', top: 'cardigan', c1: '#8e5fc9', c2: '#ffffff', bottom: 'longskirt', skirtColor: '#4b3d63', shoes: '#4a3428', hair: 'bun', hairColor: '#e7e7ea', longSleeves: true, glasses: true, blush: true},
  newkid: {key: 'newkid', skin: '#b8794f', top: 'tee', c1: '#ffb21f', c2: '#ff5a3c', bottom: 'khaki', shoes: '#ffffff', hair: 'cap', hairColor: '#24160d', accent: '#13a35c'},
  mia: {key: 'mia', skin: '#f6d6bd', top: 'dress', c1: '#ffc6dd', c2: '#e2324a', bottom: 'skirt', socks: '#ffb3cf', shoes: '#c81e3a', hair: 'ponytail', hairColor: '#f2c94c', accent: '#ff5fa2', lashes: true, blush: true},
  sam: {key: 'sam', skin: '#8a5a3c', top: 'suspenders', c1: '#f7f7f7', c2: '#e3262e', bottom: 'khaki', shoes: '#3b2a20', hair: 'curly', hairColor: '#1a1412', glasses: true},
  zoe: {key: 'zoe', skin: '#efc6a2', top: 'stripes', c1: '#2f9e4a', c2: '#1d6b33', bottom: 'darkjeans', shoes: '#f4f4f4', hair: 'pigtails', hairColor: '#5b2d8e', lashes: true, longSleeves: true},
  ben: {key: 'ben', skin: '#e4b48c', top: 'bolt', c1: '#7a4fe0', c2: '#ffd23f', bottom: 'darkjeans', shoes: '#f4f4f4', hair: 'spiky', hairColor: '#c9582a'},
};
