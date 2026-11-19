"""Arma el logotipo final OCEAN® (18-nov 20:56) desde los ajustes: O, C y E como trazos (círculo, arco y barras con
remates redondos), Λ y N como contornos (uniones en ángulo con esquinas redondeadas), ® calcada.
Escala: la altura de la E = 100 unidades. Escribe logo.svg, logo-sin-r.svg y logo-trazos.svg (solo los ejes, para
animar el dibujo)."""
import json, math, io, re, numpy as np, cairosvg, potrace
from PIL import Image
from scipy.ndimage import gaussian_filter
import maestro2 as m, maestro3 as m3
p = json.load(open('maestro2.json')); j = json.load(open('maestro3.json'))
w, cy, r, ox, cx, cang, ey0, egap, ex0, ex1, ax0, ax1, ay_top, ay_bot, nx0, nx1, ny_top, ny_bot = p
top_cap = ey0 - w/2; k = 100 / ((ey0 + 2*egap + w/2) - top_cap)
X0 = ox - r - w/2                      # borde izquierdo de la O
T = lambda x, y: ((x - X0) * k, (y - top_cap) * k)
f = lambda x, y: '%.2f %.2f' % T(x, y)
W = w * k
a = math.radians(cang)
O = f'<circle cx="{T(ox,cy)[0]:.2f}" cy="{T(ox,cy)[1]:.2f}" r="{r*k:.2f}"/>'
C = (f'<path d="M{f(cx + r*math.cos(a), cy - r*math.sin(a))}A{r*k:.2f} {r*k:.2f} 0 1 0 {f(cx + r*math.cos(a), cy + r*math.sin(a))}"/>')
E = ''.join(f'<path d="M{f(ex0, ey0 + i*egap)}H{T(ex1,0)[0]:.2f}"/>' for i in range(3))
def poly_path(g):
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms); d = ''
    for pg in polys:
        for ring in [pg.exterior] + list(pg.interiors):
            c = list(ring.coords)[:-1]
            # simplifica puntos casi colineales sin perder curvas
            d += 'M' + 'L'.join(f(x, y) for x, y in c) + 'Z'
    return d
A = poly_path(m3.shape_A2(j['ay_top2'], j['RA2']).simplify(0.08))
N = poly_path(m3.shape_N(j['RN']).simplify(0.08))
# ® calcada
x0, y0, x1, y1 = 1300, 325, 1360, 385; up = 10
im = Image.open(m.SRC).convert('L').crop((x0, y0, x1, y1))
arr = gaussian_filter(np.asarray(im.resize((im.width*up, im.height*up), Image.LANCZOS)).astype(float), 0.7*up) > 128
pl = potrace.Bitmap(~arr).trace(turdsize=60, alphamax=1.1, opticurve=True, opttolerance=0.3)
g = lambda pt: f(pt.x/up + x0, pt.y/up + y0)
R = ''
for c in pl:
    R += 'M' + g(c.start_point)
    for s in c.segments:
        R += ('L' + g(s.c) + 'L' + g(s.end_point)) if s.is_corner else ('C' + g(s.c1) + ' ' + g(s.c2) + ' ' + g(s.end_point))
    R += 'Z'
trazos = f'<g fill="none" stroke="currentColor" stroke-width="{W:.2f}" stroke-linecap="round" stroke-linejoin="round">{O}{C}{E}</g>'
rellenos = f'<path fill="currentColor" d="{A}{N}"/>'
reg = f'<path fill="currentColor" fill-rule="evenodd" d="{R}"/>'
def tinta(body, w_, h_, S=8, Mg=12):
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{int((w_+2*Mg)*S)}" height="{int((h_+2*Mg)*S)}"><rect width="100%" height="100%"/>'
         f'<g transform="scale({S}) translate({Mg},{Mg})" color="#fff">{body}</g></svg>')
    arr = np.asarray(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode()))).convert('L')) > 127
    ys, xs = np.nonzero(arr); return xs.min()/S - Mg, ys.min()/S - Mg, (xs.max()+1)/S - Mg, (ys.max()+1)/S - Mg
for name, title, body in [('logo.svg', 'OCEAN®', trazos + rellenos + reg), ('logo-sin-r.svg', 'OCEAN', trazos + rellenos)]:
    bx0, by0, bx1, by1 = tinta(body, 800, 130)
    open(name, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{bx0:.2f} {by0:.2f} {bx1-bx0:.2f} {by1-by0:.2f}"><title>{title}</title>{body}</svg>')
    print(name, f'{bx0:.2f} {by0:.2f} {bx1-bx0:.2f} {by1-by0:.2f}', len(open(name).read()), 'bytes')
# ejes para la animación del dibujo: cada letra un trazo
am = (ax0 + ax1) / 2
ejes = {'O': O, 'C': C, 'E1': f'<path d="M{f(ex0, ey0)}H{T(ex1,0)[0]:.2f}"/>', 'E2': f'<path d="M{f(ex0, ey0+egap)}H{T(ex1,0)[0]:.2f}"/>',
        'E3': f'<path d="M{f(ex0, ey0+2*egap)}H{T(ex1,0)[0]:.2f}"/>',
        'A': f'<path d="M{f(ax0, ay_bot)}L{f(am, j["ay_top2"])}L{f(ax1, ay_bot)}"/>',
        'N': f'<path d="M{f(nx0, ny_bot)}V{T(0,ny_top)[1]:.2f}L{f(nx1, ny_bot)}V{T(0,ny_top)[1]:.2f}"/>'}
vb = re.search(r'viewBox="([^"]+)"', open('logo.svg').read()).group(1)
body = ''.join(e.replace('<circle', f'<circle data-l="{n}"').replace('<path', f'<path data-l="{n}"') for n, e in ejes.items())
open('logo-trazos.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><title>OCEAN (ejes para animar)</title>'
    f'<g fill="none" stroke="currentColor" stroke-width="{W:.2f}" stroke-linecap="round" stroke-linejoin="round">{body}</g>{reg}</svg>')
json.dump({'k': k, 'X0': X0, 'top': top_cap}, open('escala.json', 'w'))
