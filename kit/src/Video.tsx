import React, {useLayoutEffect, useState, useEffect} from 'react';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import '@fontsource/nunito/900.css';
import timeline from './timeline.json';
import {SCENES} from './scenes';
import {World} from './World';
import {Captions} from './Captions';
import {Labels} from './Labels';
import {V3} from './util';

const scenes = (timeline as any).scenes as {id: string; from: number; frames: number; dur: number}[];

const CameraRig: React.FC<{pos: V3; look: V3; fov?: number}> = ({pos, look, fov = 50}) => {
  const {camera} = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(pos[0], pos[1], pos[2]);
    cam.fov = fov;
    cam.near = 0.1;
    cam.far = 600;
    cam.updateProjectionMatrix();
    cam.lookAt(look[0], look[1] + 0.4, look[2]);
  });
  return null;
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const [handle] = useState(() => delayRender('font'));
  useEffect(() => {
    document.fonts.load('900 128px Nunito').then(() => continueRender(handle));
  }, [handle]);
  const sc = scenes.find((s) => frame >= s.from && frame < s.from + s.frames) ?? scenes[scenes.length - 1];
  const t = (frame - sc.from) / fps;
  const shot = SCENES[sc.id](t);
  return (
    <AbsoluteFill style={{backgroundColor: '#5d9ef0'}}>
      <ThreeCanvas width={width} height={height} shadows flat gl={{antialias: true, preserveDrawingBuffer: true}} camera={{fov: 50, position: [0, 3, 15]}}>
        <CameraRig {...shot.cam} />
        <World focus={shot.focus} hideTable={sc.id === 'push'} />
        {shot.node}
      </ThreeCanvas>
      <Labels shot={shot} before={SCENES[sc.id](t - 0.6)} after={SCENES[sc.id](t + 0.6)} width={width} height={height} />
      <Captions />
    </AbsoluteFill>
  );
};
