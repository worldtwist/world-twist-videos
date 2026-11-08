import React, {useLayoutEffect} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {World, LUNCH} from './World';
import {Blocky, CAST, Expr} from './Blocky';

const Cam: React.FC<{pos: [number, number, number]; look: [number, number, number]}> = ({pos, look}) => {
  const {camera} = useThree();
  useLayoutEffect(() => {
    camera.position.set(...pos);
    (camera as THREE.PerspectiveCamera).fov = 50;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    camera.lookAt(...look);
  });
  return null;
};
export const Lineup: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const names = Object.keys(CAST);
  const exprs: Expr[] = ['smile', 'smug', 'tired', 'grin', 'smile', 'shock', 'laugh', 'mean'];
  // frame 0: front of all, frame 1: close-up of 4 left, frame 2: close of 4 right, frame 3: back view
  const views: [number, number, number][][] = [
    [[0, 3.6, 24], [0, 3.0, 0]],
    [[-7.2, 3.9, 11.5], [-7.2, 3.4, 0]],
    [[7.2, 3.9, 11.5], [7.2, 3.4, 0]],
    [[-5.4, 6.0, -9.5], [-5.4, 3.6, 0]],
    [[0, 4.0, -18], [0, 3.0, 0]],
  ] as any;
  const v0 = views[f % 5];
  const v = [[v0[0][0] + LUNCH[0], v0[0][1], v0[0][2] + LUNCH[2] + 13], [v0[1][0] + LUNCH[0], v0[1][1], v0[1][2] + LUNCH[2] + 13]] as any;
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} shadows flat gl={{antialias: true, preserveDrawingBuffer: true}}>
        <Cam pos={v[0]} look={v[1]} />
        <World focus={[LUNCH[0], 0, LUNCH[2] + 13]} hideTable />
        <group position={[LUNCH[0], 0, LUNCH[2] + 13]}>
        {names.map((n, i) => (
          <Blocky key={n} look={CAST[n]} pos={[(i - 3.5) * 3.6, 0, 0]} rotY={f === 4 ? 2.5 : 0} expr={exprs[i]} scale={1} />
        ))}
        </group>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
