import React, {useLayoutEffect, useMemo, useState, useEffect} from 'react';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import '@fontsource/nunito/900.css';
import {Blocky, CAST, Expr} from './Blocky';

type Variant = {who: string; expr: Expr; bg: [string, string]; num?: string; numColor?: string; headTurn: number; armR?: [number, number, number]};
const VARIANTS: Variant[] = [
  {who: 'leo', expr: 'grin', bg: ['#7fd3ff', '#1f6fe0'], num: '950', numColor: '#5dff7a', headTurn: -0.12},
  {who: 'leo', expr: 'grin', bg: ['#ffe680', '#ff9f1c'], headTurn: -0.12},
  {who: 'mia', expr: 'grin', bg: ['#ffc2e2', '#c04bd8'], num: '700', numColor: '#ffffff', headTurn: 0.15},
];

const Rig: React.FC<{bg: [string, string]}> = ({bg}) => {
  const {camera, scene} = useThree();
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(256, 210, 20, 256, 256, 380);
    gr.addColorStop(0, bg[0]);
    gr.addColorStop(1, bg[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [bg]);
  useLayoutEffect(() => {
    scene.background = tex;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = 40;
    cam.position.set(0.9, 4.75, 6.4);
    cam.updateProjectionMatrix();
    cam.lookAt(0, 4.65, 0);
  });
  return null;
};

export const Avatar: React.FC = () => {
  const f = useCurrentFrame();
  const v = VARIANTS[f % VARIANTS.length];
  const [h] = useState(() => delayRender('font'));
  useEffect(() => {
    document.fonts.load('900 100px Nunito').then(() => continueRender(h));
  }, [h]);
  return (
    <AbsoluteFill>
      <ThreeCanvas width={1080} height={1080} flat gl={{antialias: true, preserveDrawingBuffer: true}}>
        <Rig bg={v.bg} />
        <hemisphereLight args={['#ffffff', '#8aa0c8', 1.6]} />
        <directionalLight position={[4, 8, 9]} intensity={2.2} />
        <directionalLight position={[-6, 3, -4]} intensity={0.8} color="#cfe6ff" />
        <Blocky look={CAST[v.who]} pos={[0, 0, 0]} rotY={0.1} expr={v.expr} pose={{headTurn: v.headTurn, headTilt: 0.06}} />
      </ThreeCanvas>
      {[[170, 300, 34], [880, 260, 26], [210, 760, 22], [900, 700, 30], [760, 150, 18]].map(([x, y, s], i) => (
        <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, background: 'white', opacity: 0.85, transform: 'rotate(45deg)', borderRadius: 4, boxShadow: '0 0 18px rgba(255,255,255,0.9)'}} />
      ))}
      {v.num && (
        <div
          style={{
            position: 'absolute',
            top: 52,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: 150,
            color: v.numColor,
            WebkitTextStroke: '18px #000',
            paintOrder: 'stroke fill',
            textShadow: '0 10px 0 rgba(0,0,0,0.4)',
          }}
        >
          {v.num}
        </div>
      )}
    </AbsoluteFill>
  );
};
