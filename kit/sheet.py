import sys
from PIL import Image, ImageDraw
files = sys.argv[2:]; out = sys.argv[1]
w, h = 360, 640; cols = min(4, len(files)); rows = (len(files)+cols-1)//cols
S = Image.new('RGB', (cols*w, rows*(h+30)), 'white'); d = ImageDraw.Draw(S)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h))
    x, y = (i%cols)*w, (i//cols)*(h+30)
    S.paste(im, (x, y+30)); d.text((x+8, y+8), f.split('/')[-1], fill='black')
S.save(out, quality=88)
