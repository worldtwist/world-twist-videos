import React from 'react';
import {Blocky, CAST, Expr, Pose} from './Blocky';
import {Burst} from './fx';
import {LUNCH} from './World';
import {add, clamp, easeIn, kf, kf3, step, V3} from './util';

export interface Shot {
  cam: {pos: V3; look: V3; fov?: number};
  focus: V3;
  node: React.ReactNode;
}

const PI = Math.PI;
const walkPose = (t: number, speed: number, scale: number, amp = 1): Pose => ({
  walk: (t * speed * 2.3) / Math.max(0.5, scale),
  walkAmp: amp,
});
const idle = (t: number, seed = 0): Pose => ({bob: Math.sin(t * 2.2 + seed) * 0.03, headTilt: Math.sin(t * 1.3 + seed) * 0.04});
const laugh = (t: number, seed = 0): Pose => ({
  bob: Math.abs(Math.sin(t * 16 + seed)) * 0.16,
  headNod: -0.25 + Math.sin(t * 16 + seed) * 0.05,
  armL: [-0.55, 0, -0.35],
  armR: [-0.55, 0, 0.35],
});
const expr = (t: number, keys: [number, Expr][]): Expr => {
  let e = keys[0][1];
  for (const [k, v] of keys) if (t >= k) e = v;
  return e;
};

// ---------- 1. hook ----------
const hook = (t: number): Shot => {
  const v = 1.3;
  const miaS = step(t, 3.22, 0.88, 1.12);
  const miaPos: V3 = [0, 0, -4 + v * t];
  return {
    cam: {pos: [1.4, 3.6, 14.5 - 0.3 * t], look: [0, 3.0, -3 + 0.4 * t]},
    focus: [0, 0, 0],
    node: (
      <>
        <Blocky look={CAST.mia} pos={miaPos} scale={miaS} pose={walkPose(t, v, miaS)} expr={t > 3.3 ? 'grin' : 'smile'} />
        <Blocky look={CAST.sam} pos={[-2.3, 0, -7.5 + v * t]} scale={1.0} pose={walkPose(t + 0.3, v, 1)} />
        <Blocky look={CAST.zoe} pos={[2.2, 0, -9 + v * t]} scale={0.82} pose={walkPose(t + 0.7, v, 0.82)} />
        <Blocky look={CAST.ben} pos={[-0.7, 0, -12.5 + v * t]} scale={1.08} pose={walkPose(t + 1.1, v, 1.08)} />
        <Burst t={t} te={3.22} pos={miaPos} scale={miaS} kind="grow" />
      </>
    ),
  };
};

// ---------- 2. Leo is the shortest ----------
const leo = (t: number): Shot => ({
  cam: {pos: [0, 1.7, 12.5 - 0.6 * t], look: [0, 2.7, 0]},
  focus: [0, 0, 0],
  node: (
    <>
      <Blocky look={CAST.leo} pos={[0, 0, 0.6]} scale={0.58} pose={{...idle(t), headNod: -0.32}} expr="smile" />
      <Blocky look={CAST.sam} pos={[-2.4, 0, -0.5]} rotY={0.55} scale={1.0} pose={{...idle(t, 1), headNod: 0.32, headTurn: 0.2}} expr={t > 1.2 ? 'smug' : 'smile'} />
      <Blocky look={CAST.zoe} pos={[2.3, 0, -0.4]} rotY={-0.55} scale={0.98} pose={{...idle(t, 2), headNod: 0.32, headTurn: -0.2}} expr="smile" />
    </>
  ),
});

// ---------- 3. Max is the tallest ----------
const max = (t: number): Shot => {
  const laughing = t > 1.83;
  const point = clamp((t - 1.83) / 0.25);
  const mp: Pose = laughing
    ? {...laugh(t), armL: [-1.4 * point, 0, 0], armR: [-0.5, 0, 0.35]}
    : {...idle(t), armL: [0, 0, -0.25], armR: [0, 0, 0.25], headNod: -0.08};
  return {
    cam: {pos: [0.8, 1.0, 10.5 - 0.45 * t], look: [-0.6, 4.6, 0]},
    focus: [0, 0, 0],
    node: (
      <>
        <Blocky look={CAST.max} pos={[1.3, 0, -0.6]} rotY={-0.32} scale={1.3} pose={mp} expr={laughing ? 'laugh' : 'smug'} />
        <Blocky
          look={CAST.leo}
          pos={[-1.1, 0, 2.4]}
          rotY={0.55}
          scale={0.58}
          pose={{...idle(t), headNod: -0.45, headTurn: 0.25}}
          expr={laughing ? 'sad' : 'smile'}
        />
      </>
    ),
  };
};

// ---------- 4. the old lady ----------
const lady = (t: number): Shot => {
  const stumble = kf(t, [[2.4, 0], [2.6, 0.18], [3.0, 0]]);
  const leoZ = -7.5 + 1.3 * Math.min(t, 1.0);
  const leoTurn = kf(t, [[1.1, 0], [1.5, 0.75]]);
  return {
    cam: {pos: [3.0, 3.2, 12.5 - 0.4 * t], look: [-0.6, 2.5, -2.5]},
    focus: [0, 0, -2],
    node: (
      <>
        <Blocky
          look={CAST.gran}
          pos={[2.0, 0, -1.2 + 0.28 * t]}
          scale={0.95}
          pose={{...walkPose(t, 0.5, 0.95, 0.35), lean: 0.1 + stumble, roll: stumble * 0.6, headTilt: Math.sin(t * 2.4) * 0.07, headNod: 0.12}}
          expr="tired"
          bags
        />
        <Blocky
          look={CAST.leo}
          pos={[-3.0, 0, leoZ]}
          rotY={leoTurn * 0.6}
          scale={0.58}
          pose={t < 1.0 ? walkPose(t, 1.3, 0.58) : {...idle(t), headTurn: leoTurn * 0.4}}
          expr={t > 2.4 ? 'sad' : 'smile'}
        />
      </>
    ),
  };
};

// ---------- 5. carrying the bags ----------
const carry = (t: number): Shot => {
  const v = 1.0;
  const zc = -3 + v * t;
  return {
    cam: {pos: [0.9, 2.6, zc + 10.5], look: [0.1, 2.2, zc]},
    focus: [0, 0, zc],
    node: (
      <>
        <Blocky look={CAST.leo} pos={[-1.05, 0, zc]} scale={0.58} pose={walkPose(t, v, 0.58, 0.9)} expr="grin" bags />
        <Blocky look={CAST.gran} pos={[1.15, 0, zc - 0.3]} scale={0.95} pose={{...walkPose(t + 0.4, v, 0.95, 0.45), headTurn: -0.35, headNod: 0.15}} expr="smile" />
      </>
    ),
  };
};

// ---------- 6. he grew ----------
const grow1 = (t: number): Shot => {
  const s = step(t, 0.54, 0.58, 0.7);
  const hop = kf(t, [[1.1, 0], [1.25, 0.35], [1.45, 0]]);
  const leoPos: V3 = [7.4, 0, 7.4];
  return {
    cam: {pos: [-1.2 + 0.25 * t, 3.3, 14.0 - 0.25 * t], look: [8.8, 2.4, 5.2]},
    focus: [9, 0, 6],
    node: (
      <>
        <Blocky look={CAST.leo} pos={leoPos} rotY={-1.15} scale={s} pose={{...idle(t), bob: hop}} expr={expr(t, [[0, 'smile'], [0.54, 'shock'], [1.05, 'grin']])} />
        <Blocky
          look={CAST.gran}
          pos={[10.7, 0, 3.4]}
          rotY={-1.05}
          scale={0.95}
          pose={{...idle(t, 1), armR: [-2.75, 0, 0.25 + Math.sin(t * 9) * 0.25]}}
          expr="grin"
        />
        <Burst t={t} te={0.54} pos={leoPos} scale={s} kind="grow" />
      </>
    ),
  };
};

// ---------- 7. lunch ----------
const lunch = (t: number): Shot => {
  const O = LUNCH;
  const s = step(t, 2.98, 0.7, 0.82);
  const give = kf(t, [[0.55, 0], [0.95, -1.5], [2.25, -1.5], [2.6, 0]]);
  const take = kf(t, [[1.75, 0], [2.1, -1.5], [2.5, -1.5], [2.9, -0.6]]);
  const leoPos = add(O, [-1.6, 0, 7.6]);
  return {
    cam: {pos: add(O, [0.2, 2.5, 16.2 - 0.4 * t]), look: add(O, [0, 2.0, 6.5])},
    focus: O,
    node: (
      <>
        <Blocky
          look={CAST.leo}
          pos={leoPos}
          rotY={PI / 2 - 0.55}
          scale={s}
          pose={{...idle(t), armL: [give, 0, 0]}}
          boxL={t < 2.2}
          expr={expr(t, [[0, 'smile'], [1.8, 'grin']])}
        />
        <Blocky
          look={CAST.newkid}
          pos={add(O, [1.5, 0, 7.6])}
          rotY={-PI / 2 + 0.55}
          scale={0.78}
          pose={{...idle(t, 2), headNod: kf(t, [[1.5, 0.38], [1.8, -0.05]]), armR: [take, 0, 0]}}
          boxR={t >= 2.2}
          expr={expr(t, [[0, 'sad'], [1.8, 'smile'], [2.4, 'grin']])}
        />
        <Burst t={t} te={2.98} pos={leoPos} scale={s} kind="grow" />
      </>
    ),
  };
};

// ---------- 8. Max pushes ----------
const push = (t: number): Shot => {
  const O = LUNCH;
  const mx = kf(t, [[0, -5.4], [0.75, -1.8], [1.1, -1.2], [1.7, -0.1]]);
  const mz = kf(t, [[0, 1.4], [1.1, 1.0], [1.7, 0.7]]);
  const mrot = kf(t, [[0, PI / 2], [1.15, PI / 2], [1.7, PI]]);
  const shove = kf(t, [[0.75, 0], [0.95, -1.55], [1.25, -1.55], [1.5, 0]]);
  const walking = t < 0.75 || (t > 1.15 && t < 1.7);
  const s = step(t, 2.08, 1.3, 1.12);
  const benX = kf(t, [[0.95, 0], [1.4, 2.9]], (x) => 1 - Math.pow(1 - x, 2));
  const benRoll = kf(t, [[0.95, 0], [1.2, 0.5], [1.7, 0.12]]);
  const maxPos = add(O, [mx, 0, mz]);
  return {
    cam: {pos: add(O, [10.5, 6.0, 15.0]), look: add(O, [-0.6, 2.2, -1.8])},
    focus: O,
    node: (
      <>
        <Blocky look={CAST.zoe} pos={add(O, [0, 0, -4.6])} rotY={PI} scale={0.9} pose={idle(t)} />
        <Blocky look={CAST.sam} pos={add(O, [0, 0, -2.0])} rotY={PI} scale={1.0} pose={{...idle(t, 1), headTurn: t > 1 ? 0.6 : 0}} expr={t > 1 ? 'shock' : 'smile'} />
        <Blocky
          look={CAST.ben}
          pos={add(O, [benX, 0, 0.7])}
          rotY={PI - kf(t, [[1.0, 0], [1.5, 0.9]])}
          scale={0.9}
          pose={{...idle(t, 2), roll: benRoll}}
          expr={t > 0.95 ? (t > 1.6 ? 'sad' : 'shock') : 'smile'}
        />
        <Blocky
          look={CAST.max}
          pos={maxPos}
          rotY={mrot}
          scale={s}
          pose={{...(walking ? walkPose(t, 3, s) : idle(t)), armL: [shove, 0, 0], armR: [shove, 0, 0], lean: -shove * 0.12}}
          expr={t < 2.08 ? 'mean' : 'shock'}
        />
        <Burst t={t} te={2.08} pos={maxPos} scale={s} kind="shrink" />
      </>
    ),
  };
};

// ---------- 9. every day ----------
const montage = (t: number): Shot => {
  const Z = -20;
  const ls = step(t, 1.53, step(t, 0.93, 0.82, 1.0), 1.2);
  const ms = step(t, 3.28, step(t, 2.82, 1.12, 0.86), 0.6);
  const lp: V3 = [-1.8, 0, Z];
  const mp: V3 = [2.0, 0, Z];
  return {
    cam: {pos: [0, 3.4, Z + 17.5 - 0.5 * t], look: [0, 3.5, Z]},
    focus: [0, 0, Z],
    node: (
      <>
        <Blocky look={CAST.leo} pos={lp} rotY={0.12} scale={ls} pose={idle(t)} expr={expr(t, [[0, 'smile'], [0.93, 'grin']])} />
        <Blocky look={CAST.max} pos={mp} rotY={-0.12} scale={ms} pose={idle(t, 1)} expr={expr(t, [[0, 'mean'], [2.82, 'shock'], [3.6, 'sad']])} />
        <Burst t={t} te={0.93} pos={lp} scale={ls} kind="grow" />
        <Burst t={t} te={1.53} pos={lp} scale={ls} kind="grow" />
        <Burst t={t} te={2.82} pos={mp} scale={ms} kind="shrink" />
        <Burst t={t} te={3.28} pos={mp} scale={ms} kind="shrink" />
      </>
    ),
  };
};

// ---------- 10. Max trips ----------
const TZ = -40;
const MAX_FALL_Z = TZ - 5 + 1.8 * 1.18;
const tripMax = (t: number) => {
  const z = t < 1.18 ? TZ - 5 + 1.8 * t : MAX_FALL_Z + 0.4 * clamp((t - 1.18) / 0.3);
  const lean = kf(t, [[1.18, 0], [1.5, PI / 2]], easeIn);
  return {z, lean};
};
const kids = (t: number, laughing: boolean, shocked: boolean) => (
  <>
    <Blocky look={CAST.sam} pos={[-2.7, 0, TZ - 7]} rotY={0.25} scale={1.0} pose={laughing ? laugh(t) : idle(t)} expr={laughing ? 'laugh' : shocked ? 'shock' : 'smile'} />
    <Blocky look={CAST.zoe} pos={[-0.3, 0, TZ - 8]} rotY={0.05} scale={0.9} pose={laughing ? laugh(t, 1) : idle(t, 1)} expr={laughing ? 'laugh' : shocked ? 'shock' : 'smile'} />
    <Blocky look={CAST.ben} pos={[1.9, 0, TZ - 7.4]} rotY={-0.2} scale={0.95} pose={laughing ? laugh(t, 2) : idle(t, 2)} expr={laughing ? 'laugh' : shocked ? 'shock' : 'smile'} />
  </>
);
const trip = (t: number): Shot => {
  const {z, lean} = tripMax(t);
  const laughing = t > 2.4;
  const leoNode = (
    <Blocky look={CAST.leo} pos={[4.3, 0, TZ - 6.2]} rotY={-0.45} scale={1.2} pose={{...idle(t), headNod: 0.15}} expr={t > 3.3 ? 'sad' : 'shock'} />
  );
  const maxNode = (
    <Blocky
      look={CAST.max}
      pos={[0, 0, z]}
      scale={0.6}
      pose={t < 1.18 ? walkPose(t, 1.8, 0.6) : {lean, armL: [-2.6 * clamp((t - 1.18) / 0.3), 0, 0], armR: [-2.6 * clamp((t - 1.18) / 0.3), 0, 0]}}
      expr={t < 1.18 ? 'smile' : t < 1.6 ? 'shock' : 'sad'}
    />
  );
  let cam: Shot['cam'];
  if (t < 2.3) cam = {pos: [2.4, 2.5, TZ + 6], look: [0, 1.3, TZ - 3]};
  else if (t < 3.3) cam = {pos: [-0.6, 3.2, TZ + 3 - 0.6 * (t - 2.3)], look: [-0.3, 2.7, TZ - 7.5]};
  else cam = {pos: kf3(t, [[3.3, [2.4, 3.6, TZ + 2.5]], [5.5, [3.5, 4.4, TZ - 0.6]]]), look: [4.2, 4.9, TZ - 6.2]};
  return {
    cam,
    focus: [0, 0, TZ - 3],
    node: (
      <>
        {t < 3.3 && maxNode}
        {t < 3.3 && kids(t, laughing, t > 1.4)}
        {leoNode}
      </>
    ),
  };
};

// ---------- 11. Leo helps ----------
const help = (t: number): Shot => {
  const lean = kf(t, [[1.18, PI / 2], [1.95, 0]]);
  const leoLean = kf(t, [[0, 0.05], [0.45, 0.3], [1.7, 0.3], [2.1, 0.05]]);
  const reach = kf(t, [[0.2, 0], [0.7, -1.25], [1.8, -1.25], [2.2, -0.2]]);
  return {
    cam: {pos: [-5.5, 4.4, TZ + 10 - 0.4 * t], look: [0.6, 2.8, TZ - 1.5]},
    focus: [0, 0, TZ - 2],
    node: (
      <>
        <Blocky
          look={CAST.max}
          pos={[0, 0, MAX_FALL_Z + 0.4]}
          scale={0.6}
          pose={{lean, armL: [-2.6 * clamp((1.6 - t) / 0.5), 0, 0], armR: [-2.6 * clamp((1.4 - t) / 0.4) + (t > 1.0 && t < 2.0 ? -0.8 : 0), 0, 0]}}
          expr={expr(t, [[0, 'sad'], [1.0, 'shock'], [1.95, 'smile']])}
        />
        <Blocky look={CAST.leo} pos={[2.1, 0, TZ - 1.4]} rotY={-PI / 2 + 0.15} scale={1.2} pose={{lean: leoLean, armR: [reach, 0, 0], headNod: 0.3}} expr="smile" />
        {kids(t, false, true)}
      </>
    ),
  };
};

// ---------- 12. thank you ----------
const thanks = (t: number): Shot => {
  const ms = step(t, 2.05, 0.6, 0.74);
  const mp: V3 = [-1.1, 0, TZ - 2.0];
  return {
    cam: {pos: [0.3, 3.0, TZ + 9.8 - 0.4 * t], look: [0.3, 3.0, TZ - 2.2]},
    focus: [0, 0, TZ - 2],
    node: (
      <>
        <Blocky
          look={CAST.max}
          pos={mp}
          rotY={0.55}
          scale={ms}
          pose={{...idle(t), headNod: kf(t, [[0.95, -0.38], [1.2, 0.2], [1.5, -0.38]])}}
          expr={expr(t, [[0, 'smile'], [2.05, 'shock'], [2.55, 'grin']])}
        />
        <Blocky look={CAST.leo} pos={[1.8, 0, TZ - 2.7]} rotY={-0.55} scale={1.2} pose={{...idle(t, 1), headNod: 0.28}} expr={t > 2.1 ? 'grin' : 'smile'} />
        <Burst t={t} te={2.05} pos={mp} scale={ms} kind="grow" />
      </>
    ),
  };
};

// ---------- 13. ending ----------
const end = (t: number): Shot => {
  const v = 1.5;
  const zc = -66 + v * t;
  return {
    cam: {pos: [1.0, 3.9, zc + 12.5], look: [0, 3.5, zc]},
    focus: [0, 0, zc],
    node: (
      <>
        <Blocky look={CAST.leo} pos={[-1.35, 0, zc]} scale={1.2} pose={{...walkPose(t, v, 1.2), headTurn: 0.25}} expr="grin" />
        <Blocky look={CAST.max} pos={[1.45, 0, zc + 0.2]} scale={0.74} pose={{...walkPose(t + 0.3, v, 0.74), headTurn: -0.3, headNod: -0.15}} expr="grin" />
        <Blocky look={CAST.mia} pos={[-1.2, 0, zc - 7]} scale={1.1} pose={walkPose(t + 0.6, v, 1.1)} />
        <Blocky look={CAST.newkid} pos={[1.4, 0, zc - 8.5]} scale={0.95} pose={walkPose(t + 0.9, v, 0.95)} expr="grin" />
      </>
    ),
  };
};

export const SCENES: Record<string, (t: number) => Shot> = {hook, leo, max, lady, carry, grow1, lunch, push, montage, trip, help, thanks, end};
