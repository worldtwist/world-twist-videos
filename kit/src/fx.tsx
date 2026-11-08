import * as THREE from 'three';
import React, {useMemo} from 'react';
import {V3} from './util';

const ring = new THREE.RingGeometry(0.75, 1.0, 48).rotateX(-Math.PI / 2);
const star = new THREE.OctahedronGeometry(1, 0);
const column = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true).translate(0, 0.5, 0);

/** sparkles + ring when a character grows (green/gold) or shrinks (red) */
export const Burst: React.FC<{t: number; te: number; pos: V3; scale: number; kind: 'grow' | 'shrink'}> = ({t, te, pos, scale, kind}) => {
  const grow = kind === 'grow';
  const mats = useMemo(
    () => ({
      ring: new THREE.MeshBasicMaterial({color: grow ? '#6bff7f' : '#ff3d3d', transparent: true, depthWrite: false, side: THREE.DoubleSide}),
      star: new THREE.MeshBasicMaterial({color: grow ? '#ffe45c' : '#ff5a5a', transparent: true, depthWrite: false}),
      col: new THREE.MeshBasicMaterial({color: grow ? '#a8ffb4' : '#ff8a8a', transparent: true, depthWrite: false, side: THREE.DoubleSide}),
    }),
    [grow],
  );
  const dt = t - te;
  if (dt < 0 || dt > 1.4) return null;
  const fade = 1 - dt / 1.4;
  mats.ring.opacity = Math.max(0, 1 - dt / 0.9);
  mats.star.opacity = fade;
  mats.col.opacity = 0.35 * Math.max(0, 1 - dt / 0.8);
  const n = 16;
  return (
    <group position={pos}>
      <mesh geometry={ring} material={mats.ring} position-y={0.15} scale={(1.4 + dt * 5) * scale} />
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + dt * (grow ? 3 : -3);
        const r = (1.6 + 0.5 * Math.sin(i * 2.3)) * scale * (grow ? 1 + dt * 0.4 : 1.4 - dt * 0.5);
        const y = grow ? (0.5 + (i % 4) * 1.2 + dt * 4.5) * scale : (6.5 - (i % 4) * 1.1 - dt * 4.5) * scale;
        const s = 0.22 * scale * (0.6 + 0.4 * Math.sin(i)) * (1.1 - dt / 1.6);
        return <mesh key={i} geometry={star} material={mats.star} position={[Math.cos(a) * r, Math.max(0.2, y), Math.sin(a) * r]} scale={s} rotation={[dt * 6, a, 0]} />;
      })}
    </group>
  );
};
