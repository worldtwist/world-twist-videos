import json, re, numpy as np, soundfile as sf
FPS = 30
base = '/root/work/itw'
script = json.load(open(f'{base}/script.json'))
# extra time after narration (seconds) for scenes that need action to finish
tail = {'hook':0.55,'grow1':1.1,'thanks':0.9,'end':1.8,'trip':0.5,'help':0.6,'push':0.7,'montage':0.6}
lead = 0.12
KEY = {'kinder':'g','taller':'g','grow':'g','grew':'g','kind':'g','kindest':'y','helped':'g','thank':'g','you':None,
       'shortest':'b','tallest':'o','mean':'r','shrank':'r','pushed':'r','laughed':'r','tripped':'r','struggling':'p','heavy':'p','shared':'g'}
scenes=[]; t0=0.0; full=[]; sr=24000
for s in script:
    a, sr = sf.read(f"{base}/audio/{s['id']}.wav")
    words_s = s['text'].replace('...', ' ... ').split()
    words_s = [w for w in words_s if w != '...']
    wj = json.load(open(f"{base}/audio/{s['id']}.json"))
    ws = [(x['text'].strip(), x['offsets']['from']/1000, x['offsets']['to']/1000) for x in wj['transcription'] if x['text'].strip()]
    assert len(ws)==len(words_s), (s['id'], len(ws), len(words_s), ws, words_s)
    pad_insert = None
    if s['id']=='hook':
        # dramatic pause after "In this world"
        cut = ws[2][2]  # end of "world,"
        ci = int(cut*sr); pause = np.zeros(int(0.45*sr))
        a = np.concatenate([a[:ci], pause, a[ci:]]); pad_insert=(cut,0.45)
    words=[]
    for (wt,fa,fb),w in zip(ws,words_s):
        if pad_insert and fa >= pad_insert[0]-0.01: fa+=pad_insert[1]; fb+=pad_insert[1]
        clean = re.sub(r"[^\w']", '', w)
        k = KEY.get(clean.lower())
        if clean.lower()=='you' and words and words[-1]['w'].lower()=='thank': k='g'
        words.append({'w':clean,'s':round(t0+lead+fa,3),'e':round(t0+lead+fb,3),'k':k,'end':bool(re.search(r'[.,!?]$',w))})
    dur = lead + len(a)/sr + tail.get(s['id'],0.45)
    nf = int(round(dur*FPS)); dur = nf/FPS
    seg = np.zeros(int(round(dur*sr))); st=int(lead*sr); seg[st:st+len(a)] = a[:len(seg)-st]
    full.append(seg)
    scenes.append({'id':s['id'],'from':int(round(t0*FPS)),'frames':nf,'start':round(t0,3),'dur':round(dur,3),
                   'wordsLocal':[{'w':w['w'],'s':round(w['s']-t0,3)} for w in words]})
    for w in words: w['scene']=s['id']
    scenes[-1]['words']=words
    t0 += dur
total = sum(sc['frames'] for sc in scenes)
voice = np.concatenate(full)
sf.write(f'{base}/voice.wav', voice, sr)
allwords=[w for sc in scenes for w in sc['words']]
json.dump({'fps':FPS,'frames':total,'scenes':[{k:v for k,v in sc.items() if k!='words'} for sc in scenes],'words':allwords},
          open(f'{base}/src/timeline.json','w'), indent=1)
print('total frames', total, 'sec', total/FPS)
for sc in scenes: print(sc['id'], sc['from'], sc['frames'], [ (w['w'], w['s']) for w in sc['wordsLocal']])
