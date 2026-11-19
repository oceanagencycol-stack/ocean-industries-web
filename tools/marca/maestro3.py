"""Λ y N del logotipo final como contornos: trazo de grosor w con remates redondos, uniones en ángulo y esquinas
convexas redondeadas con radio R (apertura morfológica). Se ajustan ay_top, R_A, R_N contra la fuente."""
import numpy as np, json, io, cairosvg
from shapely.geometry import LineString
from scipy.optimize import minimize
import maestro2 as m
p = json.load(open('maestro2.json'))
w, cy, r, ox, cx, cang, ey0, egap, ex0, ex1, ax0, ax1, ay_top, ay_bot, nx0, nx1, ny_top, ny_bot = p

def shape_A(ay_top, R):
    am = (ax0 + ax1) / 2
    g = LineString([(ax0, ay_bot), (am, ay_top), (ax1, ay_bot)]).buffer(w/2, cap_style='round', join_style='mitre', mitre_limit=10, quad_segs=32)
    return g.buffer(-R, quad_segs=32).buffer(R, quad_segs=32)
def shape_N(R):
    g = LineString([(nx0, ny_bot), (nx0, ny_top), (nx1, ny_bot), (nx1, ny_top)]).buffer(w/2, cap_style='round', join_style='mitre', mitre_limit=10, quad_segs=32)
    return g.buffer(-R, quad_segs=32).buffer(R, quad_segs=32)
def path(g):
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    d = ''
    for pg in polys:
        for ring in [pg.exterior] + list(pg.interiors):
            c = list(ring.coords); d += 'M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in c) + 'Z'
    return d
def raster(d, x0, x1):
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%"/>'
         f'<path fill="#fff" fill-rule="evenodd" d="{d}"/></svg>')
    from PIL import Image
    a = np.asarray(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode()))).convert('L')) > 128
    return a[:, x0:x1]
def iouA(q):
    R = raster(path(shape_A(q[0], max(q[1], 0.5))), 905, 1110); S = m.src[:, 905:1110]
    return (R & S).sum() / (R | S).sum()
def iouN(q):
    R = raster(path(shape_N(max(q[0], 0.5))), 1118, 1305); S = m.src[:, 1118:1305]
    return (R & S).sum() / (R | S).sum()
if __name__ == '__main__':
    ra = minimize(lambda q: -iouA(q), [ay_top, 8], method='Nelder-Mead', options={'xatol': .05, 'fatol': 1e-6})
    rn = minimize(lambda q: -iouN(q), [6], method='Nelder-Mead', options={'xatol': .05, 'fatol': 1e-6})
    print('Λ IoU %.4f' % iouA(ra.x), ra.x, ' N IoU %.4f' % iouN(rn.x), rn.x)
    json.dump({'ay_top': float(ra.x[0]), 'RA': float(ra.x[1]), 'RN': float(rn.x[0])}, open('maestro3.json', 'w'))

import math
from shapely.geometry import Polygon, Point
def shape_A2(ay_top, R):
    am = (ax0 + ax1) / 2
    g = LineString([(ax0, ay_bot), (am, ay_top), (ax1, ay_bot)]).buffer(w/2, cap_style='round', join_style='mitre', mitre_limit=20, quad_segs=32)
    # vértice exterior de la unión en ángulo: el punto más alto
    ys = [c[1] for c in g.exterior.coords]; top = min(ys)
    vx, vy = am, top
    # dirección de las piernas (de la base al vértice)
    hx, hy = am - ax0, ay_top - ay_bot; L = math.hypot(hx, hy); ux, uy = hx/L, hy/L
    half = math.atan2(abs(ux), abs(uy))           # medio ángulo del vértice respecto de la vertical
    d = R / math.sin(half)                         # distancia vértice → centro del redondeo
    ccx, ccy = vx, vy + d
    t = R / math.tan(half)                         # distancia vértice → puntos de tangencia sobre cada borde
    p1 = (vx - ux * t, vy - uy * t); p2 = (vx + ux * t, vy - uy * t)
    cut = Polygon([(vx, vy - 1), p1, (ccx, ccy), p2])
    return g.difference(cut.difference(Point(ccx, ccy).buffer(R, quad_segs=64)))
def iouA2(q):
    R = raster(path(shape_A2(q[0], max(q[1], 1))), 905, 1110); S = m.src[:, 905:1110]
    return (R & S).sum() / (R | S).sum()
if __name__ == '__main__':
    best = None
    for R0 in (20, 30, 40):
        ra = minimize(lambda q: -iouA2(q), [ay_top, R0], method='Nelder-Mead', options={'xatol': .05, 'fatol': 1e-6})
        if best is None or ra.fun < best.fun: best = ra
    print('Λ (redondeo exterior) IoU %.4f' % iouA2(best.x), best.x)
    j = json.load(open('maestro3.json')); j.update({'ay_top2': float(best.x[0]), 'RA2': float(best.x[1])}); json.dump(j, open('maestro3.json', 'w'))
