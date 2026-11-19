"""Logotipo final OCEAN® (Juan, 18-nov 20:56): monolínea de grosor constante con remates redondos.
Se construye con trazos (centro + grosor) y se ajusta al archivo fuente. Unidades: px de la fuente (1600×900)."""
import numpy as np, io, cairosvg, math, json, sys
from PIL import Image
from scipy.optimize import minimize
SRC = sys.argv[1] if len(sys.argv) > 1 else 'marca/v3/fuente/logotipo-ocean-final.jpg'
src = np.asarray(Image.open(SRC).convert('L')) > 128
src[300:400, 1305:1360] = False   # fuera la ®: se mide aparte

def svg_letters(p):
    w, cy, r, ox, cx, cang, ey0, egap, ex0, ex1, ax0, ax1, ay_top, ay_bot, nx0, nx1, ny_top, ny_bot = p
    a = math.radians(cang)
    d = {}
    d['O'] = f'<circle cx="{ox:.2f}" cy="{cy:.2f}" r="{r:.2f}"/>'
    x1, y1 = cx + r*math.cos(a), cy - r*math.sin(a); x2, y2 = cx + r*math.cos(a), cy + r*math.sin(a)
    d['C'] = f'<path d="M{x1:.2f} {y1:.2f}A{r:.2f} {r:.2f} 0 1 0 {x2:.2f} {y2:.2f}"/>'
    d['E'] = ''.join(f'<path d="M{ex0:.2f} {ey0+i*egap:.2f}H{ex1:.2f}"/>' for i in range(3))
    am = (ax0 + ax1) / 2
    top = ny_top - w / 2   # el tope de la Λ y de la N es plano, a la altura de las mayúsculas
    d['A'] = (f'<path clip-path="url(#cap)" stroke-linejoin="miter" stroke-miterlimit="10" '
              f'd="M{ax0:.2f} {ay_bot:.2f}L{am:.2f} {ay_top:.2f}L{ax1:.2f} {ay_bot:.2f}"/>')
    d['N'] = (f'<path clip-path="url(#cap)" stroke-linejoin="miter" stroke-miterlimit="10" '
              f'd="M{nx0:.2f} {ny_bot:.2f}V{ny_top:.2f}L{nx1:.2f} {ny_bot:.2f}V{ny_top:.2f}"/>')
    d['_clip'] = f'<clipPath id="cap"><rect x="0" y="{top:.2f}" width="4000" height="4000"/></clipPath>'
    return w, d

def render(p, W=1600, H=900):
    w, d = svg_letters(p)
    body = ''.join(d.values())
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="100%" height="100%"/>'
         f'<g fill="none" stroke="#fff" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>')
    return np.asarray(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode()))).convert('L')) > 128

def iou(p):
    r = render(p); return (r & src).sum() / (r | src).sum()

p0 = [40, 442, 79.5, 396.5, 610.5, 40, 371, 71.5, 741, 874, 933, 1084, 369, 517, 1145, 1280, 369, 517]
if __name__ == '__main__':
    print('IoU inicial %.4f' % iou(p0))
    res = minimize(lambda p: -iou(p), p0, method='Powell', options={'maxiter': 3000, 'xtol': 0.05, 'ftol': 1e-6})
    p = res.x; print('IoU ajustado %.4f' % iou(p))
    json.dump(list(map(float, p)), open('maestro2.json', 'w'))
    print([round(v, 2) for v in p])
