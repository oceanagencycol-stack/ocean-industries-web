# El símbolo es simétrico por giro de 180°: se traza la pieza de arriba-izquierda y la otra es su giro exacto.
import numpy as np, sys
from trace import load_mask, to_path, bbox
from skimage import measure
mask, up = load_mask(sys.argv[1], False)
lab = measure.label(mask, connectivity=2)
props = sorted(measure.regionprops(lab), key=lambda p: p.area, reverse=True)[:2]
a, b = sorted(props, key=lambda p: p.bbox[0])  # a = la de arriba
x0,y0,x1,y1 = bbox(mask)
cx, cy = (x0+x1)/2, (y0+y1)/2
A = lab == a.label
B = np.rot90(lab == b.label, 2)  # la de abajo girada, para comparar y promediar
# alinear B girada al centro común
H,W = mask.shape
Bs = np.zeros_like(A)
ys,xs = np.nonzero(lab == b.label)
ys2 = np.round(2*cy - ys - 1).astype(int); xs2 = np.round(2*cx - xs - 1).astype(int)
ok=(ys2>=0)&(ys2<H)&(xs2>=0)&(xs2<W); Bs[ys2[ok], xs2[ok]] = True
inter=(A&Bs).sum(); union=(A|Bs).sum(); print('IoU pieza vs giro de la otra', round(inter/union,4))
from scipy.ndimage import gaussian_filter
M = gaussian_filter((A.astype(float)+Bs.astype(float))/2, up) > 0.5   # promedio de las dos
P=16
sub = np.pad(M[y0:y1, x0:x1], P)
d1 = to_path(sub, up)
W2,H2=(x1-x0)/up+2*P/up,(y1-y0)/up+2*P/up
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W2:.2f} {H2:.2f}"><path id="p" fill="currentColor" d="{d1}"/><use href="#p" transform="rotate(180 {W2/2:.2f} {H2/2:.2f})"/></svg>'
open(sys.argv[2],'w').write(svg); print('ok', W2, H2)
