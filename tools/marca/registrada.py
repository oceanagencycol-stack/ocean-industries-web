# Traza la ® del logotipo final (es pequeña: se amplía ×8 y se suaviza antes de calcar).
import numpy as np, json, potrace
from PIL import Image
from scipy.ndimage import gaussian_filter
X0, Y0, X1, Y1 = 2360, 510, 2460, 610
im = Image.open('marca/v3/fuente/logotipo-ocean-final.jpg').convert('L').crop((X0, Y0, X1, Y1))
up = 8
a = np.asarray(im.resize((im.width * up, im.height * up), Image.LANCZOS)).astype(float)
m = gaussian_filter(a, 0.8 * up) > 128
pl = potrace.Bitmap(~m).trace(turdsize=50, alphamax=1.1, opticurve=True, opttolerance=0.3)
M = json.load(open('maestro.json')); k, ox, oy = M['k'], M['ox'], M['oy']
f = lambda p: f"{((p.x / up + X0) - ox) * k:.2f} {((p.y / up + Y0) - oy) * k:.2f}"
d = []
for c in pl:
    d.append('M' + f(c.start_point))
    for s in c.segments:
        d.append('L' + f(s.c) + 'L' + f(s.end_point) if s.is_corner else 'C' + f(s.c1) + ' ' + f(s.c2) + ' ' + f(s.end_point))
    d.append('Z')
M['r'] = ''.join(d); M['Wr'] = ((X1 - 8) - ox) * k
json.dump(M, open('maestro.json', 'w')); print('® ok', len(pl), 'contornos')
