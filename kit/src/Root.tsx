import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import timeline from './timeline.json';
import {Lineup} from './Lineup';
import {Avatar} from './Avatar';

export const Root: React.FC = () => (
  <>
    <Composition id="ITW" component={Video} durationInFrames={(timeline as any).frames} fps={30} width={1080} height={1920} />
    <Composition id="Lineup" component={Lineup} durationInFrames={5} fps={30} width={1920} height={1080} />
    <Composition id="Avatar" component={Avatar} durationInFrames={3} fps={30} width={1080} height={1080} />
  </>
);
