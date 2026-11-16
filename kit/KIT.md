# World Twist video kit

Everything needed to make one "In this world…" short (vertical 1080×1920, 30 fps, ~45–55 s)
for the World Twist channel. The first video (2026-11-08, "the kinder you are, the taller you
grow") was made with exactly these files; `src/scenes.tsx`, `src/events.json`, `src/Labels.tsx`
(CURVES) and `script.json` are that story's versions — use them as the model for new stories.

## 0. Before anything else (skip days and duplicates)
- **Skipped days (owner's choice): 2026-11-16.** If today's date (Africa/Casablanca) is listed here, do NOT make
  or post a video; end the run after a one-line report.
- If `stories.md` already has a row for today's date, today's video already exists or is being made elsewhere
  (for example by the backup in the owner's chat): do NOT make or post another one; end after a one-line report.
- Right before posting, `git pull` and check `stories.md` again; if another row for today appeared meanwhile, do not post.

## 1. Rebuild the workspace (fresh cloud session)
Scripts use absolute paths under `/root/work/itw`, so copy the kit there:
```
mkdir -p /root/work && cp -r kit /root/work/itw && cd /root/work/itw && npm ci
mkdir -p audio out/scenes
```
Then install the voice/transcription tools (the `video-editor-setup` skill describes it):
- Kokoro: `pip install --break-system-packages kokoro-onnx soundfile librosa`, models from
  `https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx`
  and `.../voices-v1.0.bin` into `/root/tools/kokoro/`.
- whisper.cpp built in `/root/tools/whisper.cpp` with `ggml-base.en.bin`
  (from `npm pack whisper-addon`, file `package/models/ggml-base.en.bin`, SHA1 137c40403d78fd54d454da0f9bd998f78703390c).
- Headless Chrome: `remotion.config.ts` points at
  `/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`.
  If that path is missing, use `ls /opt/pw-browsers/*/chrome-headless-shell-linux64/chrome-headless-shell`
  and update `remotion.config.ts`, `stills.mjs`, `stills2.mjs`.

## 2. Pipeline
1. **Story** → `script.json`: list of `{id, text}` lines, one per scene. Start with "In this world…".
   Voice: Kokoro `am_michael`, speed 1.05 (the channel's "normal voice"; `python3 tts.py`).
2. **Word timings**: for each `audio/<id>.wav`, convert to 16 kHz mono and run
   `whisper-cli -m models/ggml-base.en.bin -f x.wav -ml 1 -sow -oj -of audio/<id>`.
   `build_timeline.py` needs the same word count in script and Whisper output for each line
   (fix the script text if Whisper splits/merges a word). Edit its `tail` (extra seconds after a
   line, for actions) and `KEY` (keywords shown in yellow) for the new story, then run it →
   `src/timeline.json` + `voice.wav`.
3. **Scenes** → `src/scenes.tsx`: one function per script id returning `{cam, focus, node}`.
   Reuse the cast in `Blocky.tsx` (`CAST`: leo, max, gran, newkid, mia, sam, zoe, ben), the town in
   `World.tsx` (sidewalk along z at x≈0, road at x≈-7, houses at x=15.5/-23, lunch area at `LUNCH`),
   `Burst` from `fx.tsx` for grow/shrink sparkles. Helpers: `step`, `kf`, `kf3`, `walkPose`, `idle`, `laugh`.
   Keep trees/props out of the camera line; keep heads below y≈1050 px only if captions would cover faces.
4. **Numbers over heads** (`Labels.tsx`): CURVES maps character key → value by scale. For a story
   without a counter, set `CURVES = {}` (no numbers). For a story with a counter, map it there.
5. **Captions** (`Captions.tsx`): one word at a time, lower-middle, keywords yellow. Automatic.
6. **Sound** (owner's choice since 2026-11-12: the sound of the trending "In this world…" shorts —
   upbeat, plucky synth-pop / chiptune at ~122 BPM with kick, clap, hi-hats and bass, a soft whoosh
   on every scene cut and a sound effect on every twist). `make_audio.py` builds it from
   `src/timeline.json` + `src/events.json` and needs NO edits per story — only write `src/events.json`:
   `{scene_id: [{"t": local_seconds, "type": ...}]}` with types `grow` (good thing / number up),
   `shrink` or `drop` (glitchy pitch-drop: bad thing / number plunges), `thud`, `push`, `pop`
   (something appears), `ding` (idea, "correct!"), `sparkle` (magic change), `whoosh` (fast move).
   Put an effect on every twist and reveal, like the trending shorts do. For a sad or emotional
   beat add `{"type": "calm"}` (whole scene) or `{"t": x, "type": "calm"}` (from x to the scene's end;
   optional `"until"`): drums stop and the music goes soft. Cut whooshes and the opening hit are
   automatic. `python3 make_audio.py` makes `music.wav` + `sfx.wav`; mix with:
   `ffmpeg -i voice.wav -i music.wav -i sfx.wav -filter_complex "[0:a]aresample=44100,aformat=channel_layouts=mono,asplit=2[v][vk];[1:a]volume=0.55[m];[m][vk]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[md];[2:a]volume=0.8[s];[v][md][s]amix=inputs=3:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[out]" -map "[out]" -c:a aac -b:a 192k -ac 2 mix.m4a`
7. **Check before rendering**: `node stills.mjs <frames…>` renders full-size stills to `out/st_*.png`;
   `python3 sheet.py out/sheet.jpg out/st_*.png` makes a contact sheet. Look at the key moment of
   every scene. Fix framing, blocked shots, clipping, unreadable captions.
8. **Render**: `./render_all.sh` (≈1.9 s per frame on 2 cores → ~50 min for 53 s). One file per scene
   in `out/scenes/`; rerunning skips finished scenes. Join and add sound:
   `ls out/scenes/*.mp4 | grep -v tmp | sed "s/^/file '/; s/$/'/" > out/list.txt`
   `ffmpeg -f concat -safe 0 -i out/list.txt -c copy out/video_only.mp4`
   `ffmpeg -i out/video_only.mp4 -i mix.m4a -map 0:v -map 1:a -c:v copy -c:a copy -shortest -movflags +faststart out/final.mp4`
   Web copy (<20 MB, for GitHub/My videos): `ffmpeg -i out/final.mp4 -c:v libx264 -crf 24 -preset veryfast -pix_fmt yuv420p -c:a copy -movflags +faststart out/web.mp4`
9. **Final check**: 1 fps contact sheet of the whole video, frame count = timeline frames, audio
   present (`ebur128` integrated loudness around -14 to -16 LUFS).

## 3. Publishing (Buffer since 2026-11-15; Metricool Free stopped at 20 posts/month)
- Commit the web copy to this repo as `videos/YYYY-MM-DD-<slug>.mp4` and push to `main`.
  Public URL: `https://raw.githubusercontent.com/worldtwist/world-twist-videos/main/videos/<file>`.
  Buffer fetches the video from that URL (tested 2026-11-15, all 3 networks published).
- Post with the **Buffer** connector (NOT Metricool). Organization "My organization" id `6af9842cb8d434e1d6d03c30`,
  timezone Africa/Casablanca. One `create_post` per channel, `schedulingType` "automatic",
  `assets` = [{video: {url: <public URL>}}].
  **Post time: 9:30 AM owner's time every day** (owner's choice, 2026-11-15): take `currentTime` from `get_account`;
  if it is before 09:25, use `mode` "customScheduled" + `dueAt` = today 09:30:00 with the same UTC offset;
  if the video is late (09:25 or later), use `mode` "shareNow".
  - YouTube channel `6af98537ece6dfde5fd048bf` ("World twist"): `text` = description;
    `metadata.youtube` {title, categoryId "1" (Film & Animation), privacy "public", madeForKids false, isAiGenerated false}.
    No thumbnailOffset on YouTube.
  - TikTok channel `6af984deece6dfde5fd0448e` (world.twist6): `text` = caption; `metadata.tiktok` {title, isAiGenerated false};
    optional video `metadata.thumbnailOffset` (ms) for the cover.
  - Instagram channel `6af98489ece6dfde5fd0408f` (wor_ldtwist, business): `text` = caption;
    `metadata.instagram` {type "reel", shouldShareToFeed true, isAiGenerated false}; optional `thumbnailOffset`.
  - Never guess channel ids: if a call says a channel is unknown, run `list_channels` for the organization.
  - A few minutes later, `get_post` on each post id: `status` "sent" and `externalLink` = the public link.
    YouTube/TikTok take ~1-2 min, Instagram ~3 min. Status "error" has an `error` field: report it.
  - Buffer Free: 3 channels, max 10 *queued* posts per channel (shareNow posts don't wait in the queue), no monthly cap.
    YouTube unverified channels: max 10 posts per 24 h.
- Metricool (blogId 7969308) is no longer used for posting: its Free plan allows only 20 posts per calendar month.
- Owner's choices: no AI label on TikTok/Instagram, YouTube "made for kids" = NO (changed 2026-11-09 so comments stay on), same voice every time,
  upbeat synth-pop sound from `make_audio.py` (changed 2026-11-12; replaced the slow piano).
- Add the video (web copy) to the "My videos" artifact page (slug 49b9c475-b8cd-4352-8795-9ea6d7b2dfb0):
  read its index.html, add a new card at the top of the grid, `publish_files` index.html + the mp4.

## 4. Story log
See `stories.md`. Never repeat a rule that is already listed there.
