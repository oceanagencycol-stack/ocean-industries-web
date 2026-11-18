import numpy as np, sys
from trace import load_mask, to_path, bbox
from skimage import measure
mask, up = load_mask(sys.argv[1], True)
lab = measure.label(mask, connectivity=2)
big = max(measure.regionprops(lab), key=lambda p:p.area).label
W_ = mask & (lab==big); R_ = mask & (lab!=big)
x0,y0,x1,y1 = bbox(mask); P=16
def path(m): return to_path(np.pad(m[y0:y1,x0:x1],P), up)
W=(x1-x0+2*P)/up; H=(y1-y0+2*P)/up
dw, dr = path(W_), path(R_)
open('logo.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.2f} {H:.2f}"><title>OCEAN®</title><path fill="currentColor" d="{dw}"/><path fill="currentColor" fill-rule="evenodd" d="{dr}"/></svg>')
wx0,wy0,wx1,wy1 = bbox(W_)
vw=(wx1-x0+P)/up + P/up
open('logo-sin-r.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw:.2f} {H:.2f}"><title>OCEAN</title><path fill="currentColor" d="{dw}"/></svg>')
print('ok', W, H, vw)
