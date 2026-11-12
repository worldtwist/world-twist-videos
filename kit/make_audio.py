"""World Twist sound: upbeat, plucky synth-pop / chiptune bed (~122 BPM) + sound effects synced to cuts.

Style target (owner's choice, 2026-11-12): the sound of the trending "In this world…" shorts —
bouncy plucked-synth music with kick, clap, hi-hats and sub-bass, a soft whoosh on every scene
cut, and a pop / ding / pitch-drop / thud on every twist.

Story-agnostic: reads src/timeline.json and src/events.json; nothing in this file needs editing
for a new story. Only write src/events.json:
    {scene_id: [{"t": <local seconds>, "type": <type>, ...}, ...]}
Types:
    grow     rising sweep + sparkle (something good / a number goes up)
    shrink   glitchy pitch-drop hit (something bad / a number plunges)   (alias: drop)
    thud     impact (a fall, a bump, a hit on a machine)
    push     whoosh + thud
    pop      bubble pop (something appears, a reveal)
    ding     bell (an idea, a "correct!", a counter tick)
    sparkle  magic shimmer (a transformation, a glow)
    whoosh   extra swish (fast movement)
    calm     no "t": the WHOLE scene's music goes soft and sparse (sad / emotional beat);
             with "t" (and optional "until"), only that part of the scene
Every scene cut automatically gets a soft whoosh; the video opens with a whoosh + downbeat hit.
Unknown types (e.g. "laugh") are ignored.
Writes music.wav + sfx.wav (44.1 kHz mono); mix them with the ffmpeg command in KIT.md.
"""
import json, numpy as np, soundfile as sf

SR = 44100
tl = json.load(open('src/timeline.json')); ev = json.load(open('src/events.json'))
FPS = tl['fps']; T = tl['frames'] / FPS
scenes = tl['scenes']
start = {s['id']: s['from'] / FPS for s in scenes}
end = {s['id']: (s['from'] + s['frames']) / FPS for s in scenes}
N = int(T * SR) + SR
t_all = np.arange(N) / SR
rng = np.random.default_rng(7)


def midi(m): return 440 * 2 ** ((m - 69) / 12)


def add(buf, seg, at):
    i = int(round(at * SR))
    if i >= len(buf): return
    if i < 0: seg = seg[-i:]; i = 0
    n = min(len(seg), len(buf) - i)
    buf[i:i + n] += seg[:n]


def pluck(freq, dur, amp, duty=0.25, decay=7.0, bright=1.0):
    """Band-limited pulse wave; higher harmonics die faster (natural pluck filter)."""
    n = int(dur * SR); t = np.arange(n) / SR
    K = max(1, min(24, int(7000 * bright / freq)))
    w = np.zeros(n)
    for k in range(1, K + 1):
        a = (2 / (k * np.pi)) * np.sin(k * np.pi * duty)
        if abs(a) < 1e-4: continue
        w += a * np.cos(2 * np.pi * k * freq * t) * np.exp(-decay * (0.5 + 0.25 * k) * t)
    env = np.minimum(1, t / 0.003) * np.exp(-decay * 0.5 * t)
    return amp * w * env


def bell(freq, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    parts = [(1, 1, 3.0), (2.76, .4, 6.0), (5.4, .2, 9.0), (2.0, .3, 4.0)]
    w = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-d * t) for r, a, d in parts)
    return amp * w * np.minimum(1, t / 0.002)


def noise(n): return rng.standard_normal(n)


def hp_noise(n):  # crude high-pass: first difference of white noise
    x = noise(n + 1); return np.diff(x) / 2


def smooth(x, k):
    return np.convolve(x, np.ones(k) / k, mode='same')


# ---------- drums ----------
def kick(amp=0.7):
    n = int(0.32 * SR); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-28 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    click = 0.25 * noise(n) * np.exp(-400 * t)
    return amp * (np.sin(ph) * np.exp(-9 * t) + click)


def clap(amp=0.45):
    n = int(0.25 * SR); t = np.arange(n) / SR
    bursts = sum(np.exp(-90 * np.clip(t - d, 0, None)) * (t >= d) for d in (0, 0.009, 0.018))
    body = smooth(noise(n), 3) * (0.6 * bursts + 0.5 * np.exp(-22 * t))
    tone = 0.35 * np.sin(2 * np.pi * 190 * t) * np.exp(-30 * t)
    return amp * (body + tone)


def hat(amp=0.12, open_=False):
    n = int((0.16 if open_ else 0.045) * SR); t = np.arange(n) / SR
    return amp * hp_noise(n) * np.exp(-(18 if open_ else 95) * t)


# ---------- music ----------
bpm = 122; beat = 60 / bpm; s16 = beat / 4; bar = 4 * beat
# I - V - vi - IV in C (bass root, chord tones)
PROG = [(36, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [60, 64, 69, 72]), (41, [60, 65, 69, 72])]
ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2]           # 16th-note pluck pattern
STAB = [0, 3, 6, 10, 12]                                          # bouncy chord-stab rhythm (16ths)
HOOK = [(0, 76), (3, 79), (6, 76), (8, 74), (10, 72), (12, 74)]  # little lead answer every 4th bar

# calm spans (sad / emotional beats)
calm = []
for sid, items in ev.items():
    if sid not in start: continue
    for e in items:
        if e.get('type') != 'calm': continue
        a = start[sid] + e.get('t', 0.0)
        b = start[sid] + e['until'] if 'until' in e else end[sid]
        calm.append((a, b))


def is_calm(t): return any(a - 0.05 <= t < b for a, b in calm)


drums = np.zeros(N); bass = np.zeros(N); keys = np.zeros(N)
nbars = int(T / bar) + 2
for b in range(nbars):
    t0 = b * bar
    root, ch = PROG[b % 4]
    for k in range(16):
        t = t0 + k * s16
        if t >= T: break
        c = is_calm(t)
        # drums (full mode only; calm keeps a soft tick)
        if not c:
            if k in (0, 8) or (k == 10 and b % 2 == 1): add(drums, kick(), t)
            if k in (4, 12): add(drums, clap(), t)
            if k % 2 == 0: add(drums, hat(0.10 if k % 4 else 0.07), t)
            elif k in (7, 15): add(drums, hat(0.05), t)
            if k == 14 and b % 4 == 3: add(drums, hat(0.09, open_=True), t)
        elif k in (0, 8):
            add(drums, hat(0.035), t)
        # sub-bass: staccato eighths, octave bounce on the off-beat
        if k % 2 == 0:
            m = root + (12 if k in (6, 14) else 0)
            if c and k % 8: continue
            d = s16 * (1.7 if not c else 7.5)
            n = int(d * SR); tt = np.arange(n) / SR
            env = np.minimum(1, tt / 0.004) * np.minimum(1, (d - tt) / 0.02) * (np.exp(-2.5 * tt) if c else 1)
            f = midi(m)  # sine + harmonics so the bass line is audible on phone speakers
            seg = (np.sin(2 * np.pi * f * tt) + 0.45 * np.sin(4 * np.pi * f * tt) + 0.2 * np.sin(6 * np.pi * f * tt)) * env
            add(bass, seg * (0.17 if not c else 0.12), t)
        # plucked arpeggio (16ths; calm: sparse eighths, softer and darker)
        if not c or k % 4 == 0:
            m = ch[ARP[k]] + 12 + (12 if (k % 8 == 7 and not c) else 0)
            add(keys, pluck(midi(m), 0.28 if not c else 0.6, 0.15 if not c else 0.1,
                            duty=0.25, decay=9 if not c else 4, bright=1.0 if not c else 0.5), t)
        # chord stabs
        if k in STAB and not c:
            for m in ch[:3]:
                add(keys, pluck(midi(m), 0.22, 0.065, duty=0.5, decay=12, bright=0.8), t)
        # lead answer phrase every 4th bar
        if b % 4 == 3 and not c:
            for kk, m in HOOK:
                if kk == k: add(keys, pluck(midi(m), 0.4, 0.13, duty=0.125, decay=5, bright=0.9), t)
    # calm pad (soft, slow)
    if is_calm(t0) or is_calm(t0 + bar / 2):
        n = int(bar * SR); tt = np.arange(n) / SR
        env = np.minimum(1, tt / 0.4) * np.minimum(1, (bar - tt) / 0.4)
        pad = sum(np.sin(2 * np.pi * midi(m) * tt) + 0.5 * np.sin(2 * np.pi * midi(m) * 1.005 * tt) for m in ch[:3])
        mask = np.array([is_calm(t0 + x) for x in tt[::441]]).repeat(441)[:n]
        add(keys, 0.022 * pad * env * smooth(mask.astype(float), 2205), t0)

# side-chain "pump" from the kick (classic synth-pop bounce)
pump = np.ones(N)
for b in range(nbars):
    for k in (0, 8):
        t = b * bar + k * s16
        if t >= T or is_calm(t): continue
        i = int(t * SR); n = min(int(0.22 * SR), N - i)
        if n > 0: pump[i:i + n] = np.minimum(pump[i:i + n], 0.55 + 0.45 * (np.arange(n) / n) ** 0.6)
music = drums + (bass + keys) * pump

# ending: last scene's tail resolves on the tonic and fades
last_end = T
add(music, sum(pluck(midi(m), 1.6, 0.06, duty=0.5, decay=2.2, bright=0.8) for m in (60, 64, 67, 72)),
    max(0, last_end - 1.7))
music *= np.minimum(1, t_all / 0.05) * np.clip((T - t_all) / 1.3, 0, 1)

# ---------- sound effects ----------
sfx = np.zeros(N)


def sweep(f0, f1, dur, amp, shape=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / dur) ** shape
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.01) * np.exp(-3.5 * t / dur)
    return amp * (np.sin(ph) + 0.3 * np.sin(2 * ph)) * env


def whoosh(dur=0.36, amp=0.45):
    n = int(dur * SR); t = np.arange(n) / SR
    x = smooth(noise(n), 18) - 0.6 * smooth(noise(n), 120)
    return amp * x * np.sin(np.pi * t / dur) ** 2


def pop_fx():
    n = int(0.09 * SR); t = np.arange(n) / SR
    f = 1500 * np.exp(-38 * t) + 280
    return 0.32 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-30 * t)


def ding_fx():
    out = bell(midi(91), 0.9, 0.12)
    add(out, bell(midi(96), 0.7, 0.05), 0.0)
    return out


def grow_fx():
    s = sweep(500, 1400, 0.32, 0.2)
    out = np.zeros(int(0.9 * SR)); out[:len(s)] += s
    out[:int(0.09 * SR)] += pop_fx()[:int(0.09 * SR)] * 0.6
    for k, m in enumerate([84, 88, 91, 96]):
        c = bell(midi(m), 0.6, 0.05)
        add(out, c, 0.12 + k * 0.06)
    return out


def shrink_fx():  # dramatic pitch-drop + bit-crush glitch
    s = sweep(950, 70, 0.6, 0.28, shape=0.55)
    hold = 220  # sample-and-hold every 220 samples -> crunchy glitch
    g = np.repeat(s[::hold], hold)[:len(s)]
    t = np.arange(len(s)) / SR
    stutter = (np.floor(t / 0.045) % 2 == 0) | (t > 0.25)
    return 0.55 * s + 0.45 * g * stutter


def thud():
    n = int(0.35 * SR); t = np.arange(n) / SR
    return 0.5 * np.sin(2 * np.pi * (60 + 70 * np.exp(-20 * t)) * t) * np.exp(-11 * t) + 0.15 * noise(n) * np.exp(-40 * t)


def sparkle_fx():
    out = np.zeros(int(1.0 * SR))
    for k, m in enumerate([88, 91, 95, 98, 100, 103]):
        add(out, bell(midi(m), 0.5, 0.035), k * 0.05 + rng.uniform(0, 0.02))
    return out


# opening: whoosh into a downbeat hit
add(sfx, whoosh(0.3, 0.4), 0.0)
add(sfx, 0.25 * hp_noise(int(0.6 * SR)) * np.exp(-6 * np.arange(int(0.6 * SR)) / SR), 0.0)
# soft whoosh on every scene cut (peak lands on the cut)
for s in scenes[1:]:
    add(sfx, whoosh(0.34, 0.3), start[s['id']] - 0.2)

for sid, items in ev.items():
    if sid not in start: continue
    for e in items:
        typ = e.get('type')
        if typ == 'calm' or 't' not in e: continue
        at = start[sid] + e['t']
        if typ == 'grow': add(sfx, grow_fx(), at)
        elif typ in ('shrink', 'drop'): add(sfx, shrink_fx(), at)
        elif typ == 'thud': add(sfx, thud(), at)
        elif typ == 'push': add(sfx, whoosh(0.3, 0.5), at - 0.1); add(sfx, thud() * 0.6, at + 0.12)
        elif typ == 'pop': add(sfx, pop_fx(), at)
        elif typ == 'ding': add(sfx, ding_fx(), at)
        elif typ == 'sparkle': add(sfx, sparkle_fx(), at)
        elif typ == 'whoosh': add(sfx, whoosh(), at - 0.15)

# levels: music peak 0.5 (the ffmpeg mix ducks it under the voice), sfx peak 0.8
music *= 0.5 / max(1e-9, np.abs(music).max())
sfx *= 0.8 / max(1e-9, np.abs(sfx).max())
sf.write('music.wav', music.astype(np.float32), SR)
sf.write('sfx.wav', sfx.astype(np.float32), SR)
print(f'music rms {np.sqrt(np.mean(music[:int(T*SR)]**2)):.3f}  sfx peak {np.abs(sfx).max():.2f}  '
      f'dur {T:.2f}s  bpm {bpm}  calm spans {[(round(a,1), round(b,1)) for a, b in calm]}')
