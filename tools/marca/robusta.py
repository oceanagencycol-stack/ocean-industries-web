"""Logotipo OCEAN robusto (20-nov-2026): más grueso, más ancho y con terminales planos, como la foto del logotipo que
compartió Juan Diego (marca/v3/fuente/logotipo-ocean-robusto-foto.png). Las medidas salen del ajuste por IoU guardado en
robusta.json (px de la foto); aquí se limpian (centros alineados, un solo grosor de trazo) y se llevan a unidades:
alto de las letras planas (Λ, N) = 100, borde izquierdo de la O = 0.

  O  anillo elíptico (exterior menos interior a un grosor constante)
  C  el mismo anillo abierto a la derecha con cortes horizontales (terminales planos)
  E  tres barras con remates redondos, algo más finas que el trazo
  Λ  trapecio con la cumbre plana menos su contraforma; pies planos sobre la línea de base
  N  astas y diagonal con terminales planos arriba y abajo, uniones en inglete
  ®  la del maestro del 18-nov, en el mismo tamaño y a la misma distancia de la N

Escribe marca/v3/logo.svg, logo-sin-r.svg y logo-trazos.svg (los ejes de cada letra para la firma animada).
Uso: python3 tools/marca/robusta.py (desde la raíz del repo; necesita shapely)."""
import json, math, re
from shapely.geometry import LineString, box

J = json.load(open('tools/marca/robusta.json'))
TOP, BASE = J['top'], J['base']
k = 100 / (BASE - TOP)
W = 26.4          # trazo de O, C (px de la foto)
WN = 27.4         # la N: su diagonal pesa un poco más en la foto
WE = J['E']['we']
O = J['O']; a, b, cy = O['a'], 54.2, (TOP + BASE) / 2
XL = O['cx'] - a
X = lambda x: (x - XL) * k
Y = lambda y: (y - TOP) * k
n2 = lambda v: f'{v:.2f}'
pt = lambda x, y: f'{n2(X(x))} {n2(Y(y))}'

def ring(cx):
    A, B, Ai, Bi = a * k, b * k, (a - W) * k, (b - W) * k
    c, m = X(cx), Y(cy)
    e = lambda rx, ry: f'M{n2(c - rx)} {n2(m)}A{n2(rx)} {n2(ry)} 0 1 0 {n2(c + rx)} {n2(m)}A{n2(rx)} {n2(ry)} 0 1 0 {n2(c - rx)} {n2(m)}Z'
    return e(A, B) + e(Ai, Bi)
def letter_c(cx, gap):
    A, B, Ai, Bi = a, b, a - W, b - W
    xo = cx + A * math.sqrt(1 - (gap / B) ** 2)
    xi = cx + Ai * math.sqrt(1 - (gap / Bi) ** 2)
    return (f'M{pt(xo, cy - gap)}A{n2(A * k)} {n2(B * k)} 0 1 0 {pt(xo, cy + gap)}'
            f'L{pt(xi, cy + gap)}A{n2(Ai * k)} {n2(Bi * k)} 0 1 1 {pt(xi, cy - gap)}Z')
E = J['E']; ex0, ex1 = E['x0'], E['x1']; inset = 3.0
bars = [TOP + inset + WE / 2, cy, BASE - inset - WE / 2]
def bar(y):
    h = WE / 2 * k
    return (f'M{n2(X(ex0))} {n2(Y(y) - h)}A{n2(h)} {n2(h)} 0 0 0 {n2(X(ex0))} {n2(Y(y) + h)}'
            f'H{n2(X(ex1))}A{n2(h)} {n2(h)} 0 0 0 {n2(X(ex1))} {n2(Y(y) - h)}Z')
A_ = J['A']; L, R, t, f, hi = A_['L'], A_['R'], A_['t'], A_['f'], A_['hi']; am = (L + R) / 2
lam = (f'M{pt(L, BASE)}L{pt(am - t, TOP)}L{pt(am + t, TOP)}L{pt(R, BASE)}L{pt(R - f, BASE)}'
       f'L{pt(am, TOP + hi)}L{pt(L + f, BASE)}Z')
N = J['N']; nx0, nx1 = N['nx0'], N['nx1']
g = LineString([(nx0, BASE + 200), (nx0, TOP), (nx1, BASE), (nx1, TOP - 200)]).buffer(WN / 2, cap_style='flat', join_style='mitre', mitre_limit=20)
g = g.intersection(box(-1e4, TOP, 1e4, BASE)).simplify(0.01)
en = 'M' + 'L'.join(pt(x, y) for x, y in list(g.exterior.coords)[:-1]) + 'Z'
n_right = X(max(x for x, _ in g.exterior.coords))

# ® del maestro anterior: mismo tamaño, misma distancia a la N (5,93) y misma altura (su borde de arriba en −8,75)
old = open('marca/v3/anterior/logo-18nov.svg').read()
reg = re.search(r'<path fill="currentColor" fill-rule="evenodd" d="([^"]+)"', old).group(1)
nums = [float(v) for v in re.findall(r'-?\d+\.\d+|-?\d+', reg)]
dx = n_right + 5.93 - min(nums[0::2])
it = iter(range(10 ** 6))
reg = re.sub(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', lambda m: f'{float(m.group(1)) + dx:.2f} {m.group(2)}', reg)
reg_right = max(float(v) for v in re.findall(r'(-?\d+\.\d+) -?\d+\.\d+', reg))

body_sin = (f'<path fill="currentColor" fill-rule="evenodd" d="{ring(O["cx"])}"/>'
            f'<path fill="currentColor" d="{letter_c(J["C"]["cx"], J["C"]["gap"])}{"".join(bar(y) for y in bars)}{lam}{en}"/>')
body = body_sin + f'<path fill="currentColor" fill-rule="evenodd" d="{reg}"/>'
oy0, oy1 = Y(cy - b), Y(cy + b)
right = X(nx1 + WN / 2)
def svg(title, body, x1, y0):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0.00 {y0:.2f} {x1:.2f} {oy1 - y0:.2f}"><title>{title}</title>{body}</svg>\n'
open('marca/v3/logo.svg', 'w').write(svg('OCEAN®', body, reg_right, min(oy0, -8.75)))
open('marca/v3/logo-sin-r.svg', 'w').write(svg('OCEAN', body_sin, right, oy0))

# ejes para la firma animada: cada letra un trazo (data-l), del grosor que la máscara de la tinta necesita
ac, bc = (a - W / 2) * k, (b - W / 2) * k
c0, m0 = X(O['cx']), Y(cy)
gc = J['C']['gap']; cxc = J['C']['cx']
xcen = cxc + (a - W / 2) * math.sqrt(1 - (gc / (b - W / 2)) ** 2)
ejes = {
    'O': f'M{n2(c0 + ac)} {n2(m0)}A{n2(ac)} {n2(bc)} 0 1 0 {n2(c0 - ac)} {n2(m0)}A{n2(ac)} {n2(bc)} 0 1 0 {n2(c0 + ac)} {n2(m0)}',
    'C': f'M{pt(xcen, cy - gc)}A{n2(ac)} {n2(bc)} 0 1 0 {pt(xcen, cy + gc)}',
    'E1': f'M{pt(ex0, bars[0])}H{n2(X(ex1))}', 'E2': f'M{pt(ex0, bars[1])}H{n2(X(ex1))}', 'E3': f'M{pt(ex0, bars[2])}H{n2(X(ex1))}',
    'A': f'M{pt(L + f / 2, BASE)}L{pt(am, TOP + 8)}L{pt(R - f / 2, BASE)}',
    'N': f'M{pt(nx0, BASE)}V{n2(Y(TOP))}L{pt(nx1, BASE)}V{n2(Y(TOP))}',
}
vb = re.search(r'viewBox="([^"]+)"', open('marca/v3/logo.svg').read()).group(1)
axes = ''.join(f'<path data-l="{n}" d="{d}"/>' for n, d in ejes.items())
open('marca/v3/logo-trazos.svg', 'w').write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><title>OCEAN (ejes para animar)</title>'
    f'<g fill="none" stroke="currentColor" stroke-width="{W * k:.2f}" stroke-linecap="round" stroke-linejoin="round">{axes}</g>'
    f'<path fill="currentColor" fill-rule="evenodd" d="{reg}"/></svg>\n')
print('logo.svg', vb, '· trazo', round(W * k, 2), '· barras', round(WE * k, 2), '· ancho/alto', round(float(vb.split()[2]) / float(vb.split()[3]), 3))
