#!/bin/bash
# render each scene to its own file, then they get joined with -c copy
cd /root/work/itw
npx remotion bundle src/index.ts --out-dir=out/bundle --log=error >/dev/null 2>&1 || { echo "BUNDLE FAILED"; exit 1; }
python3 -c "
import json
d=json.load(open('src/timeline.json'))
for i,s in enumerate(d['scenes']): print(i, s['id'], s['from'], s['from']+s['frames']-1)
" | while read i id a b; do
  f=$(printf "out/scenes/%02d_%s.mp4" $i $id)
  [ -f "$f" ] && { echo "skip $f"; continue; }
  tmp="${f%.mp4}.tmp.mp4"
  start=$(date +%s)
  if npx remotion render out/bundle ITW "$tmp" --frames=$a-$b --crf=18 --log=error > /tmp/render_$id.log 2>&1; then
    mv "$tmp" "$f"; echo "done $f $(( $(date +%s) - start ))s"
  else
    echo "FAILED $id"; tail -5 /tmp/render_$id.log
  fi
done
echo ALL_FINISHED
