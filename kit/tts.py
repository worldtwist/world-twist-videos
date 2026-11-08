import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro('/root/tools/kokoro/kokoro-v1.0.onnx', '/root/tools/kokoro/voices-v1.0.bin')
lines = json.load(open('/root/work/itw/script.json'))
voice = sys.argv[1] if len(sys.argv) > 1 else 'am_michael'
tot = 0
for l in lines:
    s, sr = k.create(l['text'], voice=voice, speed=1.05, lang='en-us')
    sf.write(f"/root/work/itw/audio/{l['id']}.wav", s, sr)
    d = len(s)/sr; tot += d
    print(f"{l['id']:8s} {d:5.2f}s")
print('total', round(tot,2))
