export type V3 = [number, number, number];

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeOutBack = (t: number) => {
  const c1 = 2.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** value that jumps from `from` to `to` starting at te, with an overshoot */
export const step = (t: number, te: number, from: number, to: number, dur = 0.55, ease = easeOutBack) =>
  t <= te ? from : t >= te + dur ? to : lerp(from, to, ease((t - te) / dur));

/** keyframes [[time, value], ...], eased between */
export const kf = (t: number, keys: [number, number][], ease = easeInOut) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, va] = keys[i];
    const [tb, vb] = keys[i + 1];
    if (t <= tb) return lerp(va, vb, ease((t - ta) / (tb - ta)));
  }
  return keys[keys.length - 1][1];
};

export const kf3 = (t: number, keys: [number, V3][], ease = easeInOut): V3 => [
  kf(t, keys.map(([k, v]) => [k, v[0]] as [number, number]), ease),
  kf(t, keys.map(([k, v]) => [k, v[1]] as [number, number]), ease),
  kf(t, keys.map(([k, v]) => [k, v[2]] as [number, number]), ease),
];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** deterministic random, so every render tab draws the same textures */
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
