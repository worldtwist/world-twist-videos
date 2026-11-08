import json, numpy as np, soundfile as sf
SR = 44100
tl = json.load(open('src/timeline.json')); ev = json.load(open('src/events.json'))
T = tl['frames'] / tl['fps']
start = {s['id']: s['from'] / tl['fps'] for s in tl['scenes']}
N = int(T * SR) + SR
t_all = np.arange(N) / SR

def note(freq, dur, amp=0.2, decay=3.0, harm=(1, .45, .25, .12)):
    n = int(dur * SR); t = np.arange(n) / SR
    w = sum(a * np.sin(2*np.pi*freq*(k+1)*t) * np.exp(-decay*(k+1)*0.6*t) for k, a in enumerate(harm))
    env = np.minimum(1, t / 0.006) * np.exp(-decay * t)
    return amp * w * env

def midi(m): return 440 * 2 ** ((m - 69) / 12)

# ---------- music: warm piano arpeggios, I-V-vi-IV in C ----------
bpm = 92; beat = 60 / bpm; bar = 4 * beat
prog = [[48, 55, 60, 64, 67], [43, 50, 55, 59, 62], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60]]
music = np.zeros(N)
sad_a, sad_b = start['trip'], start['thanks']   # quieter, sparser while Max falls
nbars = int(T / bar) + 2
for b in range(nbars):
    t0 = b * bar
    ch = prog[b % 4]
    sad = sad_a - 0.2 <= t0 < sad_b - bar * 0.5
    # bass
    seg = note(midi(ch[0] - 12 + 12), bar * 1.1, amp=0.16, decay=1.2, harm=(1, .3, .1))
    i = int(t0 * SR); music[i:i+len(seg)] += seg[:max(0, N-i)]
    # arpeggio in eighths
    pattern = [1, 2, 3, 4, 3, 2, 3, 4] if not sad else [2, None, 4, None, 3, None, None, None]
    for k, p in enumerate(pattern):
        if p is None: continue
        m = ch[p] + 12
        seg = note(midi(m), beat * 1.6, amp=0.075 if not sad else 0.06, decay=2.6)
        i = int((t0 + k * beat / 2) * SR); music[i:i+len(seg)] += seg[:max(0, N-i)]
    # soft pad (detuned sines, slow attack)
    n = int(bar * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / 0.5) * np.minimum(1, (bar - t) / 0.4)
    pad = sum(np.sin(2*np.pi*midi(m)*t) + 0.6*np.sin(2*np.pi*midi(m)*1.004*t) for m in ch[1:4]) * env * (0.012 if not sad else 0.02)
    i = int(t0 * SR); music[i:i+n] += pad[:max(0, N-i)]
# little bell melody on the ending
mel = [76, 74, 72, 74, 76, 79, 76, 72]
for k, m in enumerate(mel):
    seg = note(midi(m), 1.2, amp=0.05, decay=2.2, harm=(1, .2, .5, .1))
    i = int((start['end'] + 0.3 + k * beat) * SR); music[i:i+len(seg)] += seg[:max(0, N-i)]
# fade in/out
music *= np.minimum(1, t_all / 0.4) * np.clip((T - t_all) / 1.5, 0, 1)

# ---------- sound effects ----------
sfx = np.zeros(N)
rng = np.random.default_rng(1)
def put(seg, at):
    i = int(at * SR); sfx[i:i+len(seg)] += seg[:max(0, N-i)]
def sweep(f0, f1, dur, amp, shape=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / dur) ** shape
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.01) * np.exp(-3.5 * t / dur)
    return amp * (np.sin(ph) + 0.3 * np.sin(2 * ph)) * env
def grow_fx():
    s = sweep(500, 1400, 0.32, 0.22)
    out = np.zeros(int(0.9 * SR)); out[:len(s)] += s
    for k, m in enumerate([84, 88, 91, 96]):
        c = note(midi(m), 0.6, amp=0.07, decay=6, harm=(1, .3))
        i = int((0.12 + k * 0.06) * SR); out[i:i+len(c)] += c[:len(out)-i]
    return out
def shrink_fx(): return sweep(700, 160, 0.45, 0.25, shape=0.7)
def thud():
    n = int(0.35 * SR); t = np.arange(n) / SR
    return 0.45 * np.sin(2*np.pi*(70 + 60*np.exp(-20*t))*t) * np.exp(-12*t) + 0.15 * rng.standard_normal(n) * np.exp(-40*t)
def whoosh():
    n = int(0.3 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    sm = np.convolve(noise, np.ones(30) / 30, mode='same')
    return 0.5 * sm * np.sin(np.pi * t / 0.3) ** 2
for sid, items in ev.items():
    for e in items:
        at = start[sid] + e['t']
        if e['type'] == 'grow': put(grow_fx(), at)
        elif e['type'] == 'shrink': put(shrink_fx(), at)
        elif e['type'] == 'thud': put(thud(), at)
        elif e['type'] == 'push': put(whoosh(), at - 0.1); put(thud() * 0.6, at + 0.12)
sf.write('music.wav', music.astype(np.float32), SR)
sf.write('sfx.wav', sfx.astype(np.float32), SR)
print('music peak', np.abs(music).max(), 'sfx peak', np.abs(sfx).max(), 'dur', T)
