import * as THREE from 'three';
import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mat} from './Blocky';
import {rng, V3} from './util';

export const LUNCH: V3 = [12, 0, 46];

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
};

const TEX = (() => {
  const sky = canvasTex(4, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#2f6fe0');
    gr.addColorStop(0.55, '#5d9ef0');
    gr.addColorStop(1, '#bfe2ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 512);
  });
  const grass = canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = '#5cbf3c';
      g.fillRect(0, 0, 256, 256);
      const r = rng(7);
      for (let i = 0; i < 2600; i++) {
        const v = r();
        g.fillStyle = v < 0.5 ? 'rgba(40,120,30,0.35)' : 'rgba(150,220,90,0.35)';
        g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 5);
      }
    },
    [90, 90],
  );
  const road = canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = '#4b4e55';
      g.fillRect(0, 0, 256, 256);
      const r = rng(3);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.07)';
        g.fillRect(r() * 256, r() * 256, 2, 2);
      }
      g.fillStyle = '#f2c230';
      g.fillRect(122, 0, 12, 128);
    },
    [1, 50],
  );
  const walk = canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = '#e9dcc2';
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = 'rgba(120,100,70,0.35)';
      g.fillRect(0, 0, 256, 4);
      const r = rng(11);
      for (let i = 0; i < 500; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.12)';
        g.fillRect(r() * 256, r() * 256, 3, 3);
      }
    },
    [1, 150],
  );
  const awning = canvasTex(
    256,
    64,
    (g) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#ffffff' : '#ff4757';
        g.fillRect(i * 32, 0, 32, 64);
      }
    },
  );
  const sign = canvasTex(512, 160, (g) => {
    g.fillStyle = '#fff4d6';
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#ff4757';
    g.font = 'bold 110px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('LUNCH', 256, 86);
  });
  const cloud = canvasTex(256, 128, (g) => {
    const r = rng(5);
    for (let i = 0; i < 9; i++) {
      const x = 50 + r() * 156;
      const y = 60 + r() * 30;
      const rad = 26 + r() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.7, 'rgba(255,255,255,0.9)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
  });
  return {sky, grass, road, walk, awning, sign, cloud};
})();

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  rbox: new RoundedBoxGeometry(1, 1, 1, 2, 0.06),
  roof: new THREE.CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2),
  trunk: new THREE.CylinderGeometry(0.35, 0.45, 3.4, 8),
  leaf: new THREE.IcosahedronGeometry(1, 0),
  plane: new THREE.PlaneGeometry(1, 1),
};

const leafMat = (c: string) => {
  const key = 'leaf' + c;
  return mat(c);
};

const B: React.FC<{p: V3; s: V3; c: string; r?: V3; round?: boolean}> = ({p, s, c, r, round}) => (
  <mesh geometry={round ? GEO.rbox : GEO.box} material={mat(c)} position={p} scale={s} rotation={r} castShadow receiveShadow />
);

const House: React.FC<{p: V3; rotY: number; wall: string; roof: string; door: string}> = ({p, rotY, wall, roof, door}) => (
  <group position={p} rotation-y={rotY}>
    <B p={[0, 3.5, 0]} s={[10, 7, 8]} c={wall} />
    <mesh geometry={GEO.roof} material={mat(roof)} position={[0, 8.75, 0]} scale={[11, 3.6, 5.4]} castShadow />
    <B p={[0, 7.05, 0]} s={[10.6, 0.3, 8.6]} c={roof} />
    <B p={[0, 1.8, 4.05]} s={[1.8, 3.6, 0.2]} c={door} />
    <B p={[0.55, 1.8, 4.18]} s={[0.22, 0.22, 0.1]} c="#f2d16b" />
    {[-3.2, 3.2].map((x) => (
      <group key={x} position={[x, 3.6, 4.02]}>
        <B p={[0, 0, 0]} s={[2.4, 2.2, 0.16]} c="#ffffff" />
        <B p={[0, 0, 0.06]} s={[2.0, 1.8, 0.1]} c="#8fd3ff" />
        <B p={[0, 0, 0.12]} s={[0.12, 1.8, 0.06]} c="#ffffff" />
      </group>
    ))}
    <B p={[0, 0.15, 5.4]} s={[2.4, 0.3, 2.6]} c="#d8d0c0" />
    {/* hedge */}
    <B p={[-3.6, 0.6, 5.2]} s={[4.2, 1.2, 1.1]} c="#3f9a35" round />
    <B p={[3.6, 0.6, 5.2]} s={[4.2, 1.2, 1.1]} c="#3f9a35" round />
  </group>
);

const Tree: React.FC<{p: V3; s?: number; seed: number}> = ({p, s = 1, seed}) => {
  const r = rng(seed);
  const greens = ['#3fae3a', '#58c24a', '#2f9a32'];
  return (
    <group position={p} scale={s}>
      <mesh geometry={GEO.trunk} material={mat('#8a5a35')} position={[0, 1.7, 0]} castShadow />
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          geometry={GEO.leaf}
          material={leafMat(greens[i % 3])}
          position={[(r() - 0.5) * 1.8, 4.2 + r() * 1.6, (r() - 0.5) * 1.8]}
          scale={1.5 + r() * 0.8}
          rotation={[r() * 3, r() * 3, 0]}
          castShadow
        />
      ))}
    </group>
  );
};

const Clouds: React.FC = () => {
  const m = useMemo(
    () => new THREE.MeshBasicMaterial({map: TEX.cloud, transparent: true, fog: false, depthWrite: false}),
    [],
  );
  const r = rng(21);
  const items = Array.from({length: 18}, (_, i) => {
    const a = (i / 18) * Math.PI * 2 + r() * 0.3;
    const rad = 150 + r() * 30;
    return {p: [Math.sin(a) * rad, 38 + r() * 34, Math.cos(a) * rad] as V3, s: 40 + r() * 30, a};
  });
  return (
    <>
      {items.map((c, i) => (
        <mesh key={i} geometry={GEO.plane} material={m} position={c.p} rotation-y={c.a + Math.PI} scale={[c.s, c.s * 0.5, 1]} />
      ))}
    </>
  );
};

const LunchArea: React.FC<{hideTable?: boolean}> = ({hideTable}) => (
  <group position={LUNCH}>
    {/* picnic table, long along x */}
    <group position={[0, 0, 5]} visible={!hideTable}>
      <B p={[0, 2.3, 0]} s={[6.5, 0.3, 2.6]} c="#b5773f" round />
      <B p={[-2.6, 1.15, 0]} s={[0.35, 2.3, 2.0]} c="#8f5a2c" />
      <B p={[2.6, 1.15, 0]} s={[0.35, 2.3, 2.0]} c="#8f5a2c" />
      <B p={[0, 1.2, -2.1]} s={[6.5, 0.25, 1.0]} c="#b5773f" round />
      <B p={[0, 2.55, 0]} s={[0.9, 0.18, 0.9]} c="#ffffff" />
    </group>
    {/* lunch stand */}
    <group position={[0, 0, -8]}>
      <B p={[0, 1.6, 0]} s={[7, 3.2, 2.6]} c="#ffffff" />
      <B p={[0, 3.3, 0.1]} s={[7.2, 0.25, 2.9]} c="#ff4757" />
      <B p={[-3.3, 4.6, 0]} s={[0.3, 2.6, 0.3]} c="#d9d9d9" />
      <B p={[3.3, 4.6, 0]} s={[0.3, 2.6, 0.3]} c="#d9d9d9" />
      <mesh geometry={GEO.box} position={[0, 6.0, 0.6]} scale={[7.6, 0.3, 3.6]} rotation-x={0.2} castShadow>
        <meshStandardMaterial map={TEX.awning} roughness={0.6} />
      </mesh>
      <mesh geometry={GEO.plane} position={[0, 1.8, 1.32]} scale={[4.2, 1.3, 1]}>
        <meshStandardMaterial map={TEX.sign} roughness={0.7} />
      </mesh>
    </group>
    <Tree p={[-9, 0, -4]} seed={101} s={1.2} />
    <Tree p={[9, 0, -5]} seed={102} s={1.1} />
    <Tree p={[-10, 0, 8]} seed={103} />
    <Tree p={[10, 0, 9]} seed={104} s={1.3} />
    <Tree p={[-4, 0, -16]} seed={105} s={1.2} />
    <Tree p={[6, 0, -18]} seed={106} />
  </group>
);

export const Lights: React.FC<{focus: V3}> = ({focus}) => {
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <hemisphereLight args={['#e4f2ff', '#5f8f3a', 1.1]} />
      <ambientLight intensity={0.25} />
      <primitive object={target} position={focus} />
      <directionalLight
        position={[focus[0] + 16, 34, focus[2] + 20]}
        target={target}
        intensity={2.4}
        color="#fff3dd"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
    </>
  );
};

export const World: React.FC<{focus: V3; hideTable?: boolean}> = ({focus, hideTable}) => {
  const {scene} = useThree();
  useLayoutEffect(() => {
    scene.background = TEX.sky;
    scene.fog = new THREE.Fog('#c4e3ff', 60, 185);
  }, [scene]);
  const houses = useMemo(() => {
    const walls = ['#f6e7c8', '#cfe6f7', '#f7d3d3', '#e2f0cf', '#fbe3b8', '#e6dcf7'];
    const roofs = ['#b8483d', '#4a5d7a', '#7a4a3a', '#3f6f5a', '#a8553a', '#5a4a7a'];
    const doors = ['#7a4a2b', '#2f5f8f', '#8f2f3a', '#3a6a3a', '#6b3f8f', '#8a5a2b'];
    const out: {p: V3; rotY: number; i: number}[] = [];
    for (let k = 0; k < 8; k++) out.push({p: [15.5, 0, 6 - k * 17], rotY: -Math.PI / 2, i: k});
    for (let k = 0; k < 8; k++) out.push({p: [-23, 0, 0 - k * 17], rotY: Math.PI / 2, i: k + 3});
    return out.map(({p, rotY, i}) => ({p, rotY, wall: walls[i % 6], roof: roofs[(i + 2) % 6], door: doors[(i + 4) % 6]}));
  }, []);
  return (
    <>
      <Lights focus={focus} />
      <Clouds />
      {/* ground */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial map={TEX.grass} roughness={0.95} />
      </mesh>
      {/* road */}
      <mesh rotation-x={-Math.PI / 2} position={[-7, 0.03, -60]} receiveShadow>
        <planeGeometry args={[7, 300]} />
        <meshStandardMaterial map={TEX.road} roughness={0.9} />
      </mesh>
      <B p={[-3.35, 0.14, -60]} s={[0.4, 0.28, 300]} c="#d4d4d4" />
      {/* sidewalk */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, -60]} receiveShadow>
        <planeGeometry args={[6.3, 300]} />
        <meshStandardMaterial map={TEX.walk} roughness={0.85} />
      </mesh>
      {/* paths to the houses */}
      {houses
        .filter((h) => h.p[0] > 0)
        .map((h, i) => (
          <B key={'p' + i} p={[9.2, 0.07, h.p[2]]} s={[9, 0.06, 2.4]} c="#e2d6bd" />
        ))}
      {houses.map((h, i) => (
        <House key={i} {...h} />
      ))}
      {Array.from({length: 13}, (_, k) => k === 1 || k === 6 || k === 7 ? null : (
        <Tree key={'r' + k} p={[5.4, 0, 22 - k * 9.5]} seed={k + 1} s={1 + ((k * 37) % 5) * 0.06} />
      ))}
      {Array.from({length: 12}, (_, k) => (
        <Tree key={'l' + k} p={[-13, 0, 15 - k * 11]} seed={k + 40} s={1.1} />
      ))}
      <LunchArea hideTable={hideTable} />
    </>
  );
};
