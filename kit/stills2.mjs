import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';
const frames = process.argv.slice(2).map(Number);
const CH = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: process.env.COMP || 'ITW', browserExecutable: CH, chromiumOptions: {gl: 'angle'}});
for (const f of frames) {
  await renderStill({serveUrl, composition, frame: f, output: `out/st_${String(f).padStart(4,'0')}.png`, browserExecutable: CH, chromiumOptions: {gl: 'angle'}});
  console.log('done', f);
}
