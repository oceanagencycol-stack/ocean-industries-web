"""Dibujo maestro del logotipo OCEAN® (final de Juan, 18-nov-2026) con geometría exacta.
Medidas tomadas del archivo final (2576×1438 px) por líneas de barrido y ajuste de superelipses
(error < 0,7 px). Unidades = píxeles del archivo fuente; el SVG se normaliza a una altura de mayúscula de 100.
"""
import numpy as np, math, sys
from scipy.optimize import minimize

# --- medidas (px del archivo fuente) ---
TOP, BASE = 541.0, 897.0             # altura de mayúscula: 356
# O y C: anillo de superelipses n = 2,1 (rebasan 9 px arriba y abajo, como debe ser)
N_EXP = 2.1
OX, OY = 396.5, 718.6
RO = (207.8, 187.2); RI = (114.75, 107.5)
C_DX = 444.0                         # la C es el mismo anillo corrido a la derecha
C_CUT = 28.2                         # corte radial de la C, grados desde la horizontal
# E: tres barras sin asta
E_X = 1072.0; E_W = (384.0, 325.0, 384.0); E_T = 76.0; E_GAP = (BASE - TOP - 3 * E_T) / 2
# Λ: tope plano, piernas paralelas
A_POLY = [(1656, TOP), (1750, TOP), (1924, BASE), (1825, BASE), (1703, 642.5), (1581, BASE), (1481, BASE)]
# N: astas de 93, diagonal de pendiente 0,9 (dx/dy)
N_POLY = [(1951, TOP), (2041, TOP), (2250, 773.2), (2250, TOP), (2343, TOP), (2343, BASE), (2245, BASE), (2044, 673.3), (2044, BASE), (1951, BASE)]

def se(t, c, r, n=N_EXP):
    ct, st = math.cos(t), math.sin(t)
    return np.array([c[0] + r[0] * math.copysign(abs(ct) ** (2 / n), ct),
                     c[1] - r[1] * math.copysign(abs(st) ** (2 / n), st)])  # y hacia arriba = ángulo positivo

def t_for_angle(deg, r, n=N_EXP):
    # parámetro t cuyo punto está en la dirección polar `deg` (y hacia arriba)
    th = math.radians(deg); tt = math.tan(th)
    # |sin|^(2/n) r1 / (|cos|^(2/n) r0) = tan(th)  -> resolver en (0, pi/2)
    lo, hi = 1e-9, math.pi / 2 - 1e-9
    for _ in range(80):
        m = (lo + hi) / 2
        v = (r[1] * math.sin(m) ** (2 / n)) / (r[0] * math.cos(m) ** (2 / n))
        lo, hi = (m, hi) if v < tt else (lo, m)
    return (lo + hi) / 2

def bez(p0, p1, p2, p3, s):
    s = s[:, None]
    return (1 - s) ** 3 * p0 + 3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s ** 2 * p2 + s ** 3 * p3

def fit_arc(f, t0, t1):
    ts = np.linspace(t0, t1, 41); pts = np.array([f(t) for t in ts])
    e = 1e-5
    d0 = f(t0 + e * np.sign(t1 - t0)) - f(t0); d0 /= np.linalg.norm(d0)
    d1 = f(t1) - f(t1 - e * np.sign(t1 - t0)); d1 /= np.linalg.norm(d1)
    L = np.linalg.norm(pts[-1] - pts[0])
    p0, p3 = pts[0], pts[-1]
    def err(h):
        b = bez(p0, p0 + h[0] * d0, p3 - h[1] * d1, p3, np.linspace(0, 1, 400))
        return sum(np.min(np.linalg.norm(b - q, axis=1)) ** 2 for q in pts)
    h = minimize(err, [L / 3, L / 3], method='Nelder-Mead', options={'xatol': 1e-4, 'fatol': 1e-8}).x
    b = bez(p0, p0 + h[0] * d0, p3 - h[1] * d1, p3, np.linspace(0, 1, 400))
    worst = max(np.min(np.linalg.norm(b - q, axis=1)) for q in pts)
    return (p0 + h[0] * d0, p3 - h[1] * d1, p3), worst

WORST = [0.0]
def arc_path(c, r, t0, t1, first=True):
    # t de t0 a t1 cortado en tramos de ≤ 45°
    k = max(1, math.ceil(abs(t1 - t0) / (math.pi / 4) - 1e-9))
    ts = np.linspace(t0, t1, k + 1); out = []
    f = lambda t: se(t, c, r)
    if first: out.append(('M', [f(ts[0])]))
    for a, b in zip(ts[:-1], ts[1:]):
        cps, w = fit_arc(f, a, b); WORST[0] = max(WORST[0], w); out.append(('C', list(cps)))
    return out

def poly(points):
    out = [('M', [np.array(points[0], float)])] + [('L', [np.array(p, float)]) for p in points[1:]]
    return out + [('Z', [])]

def ring(c, ro, ri):
    # exterior en un sentido, interior en el contrario (para que el hueco quede vacío con nonzero)
    return (arc_path(c, ro, 0, 2 * math.pi) + [('Z', [])] +
            arc_path(c, ri, 0, -2 * math.pi) + [('Z', [])])

def c_shape(c, ro, ri, cut):
    to = t_for_angle(cut, ro); ti = t_for_angle(cut, ri)
    p = arc_path(c, ro, to, 2 * math.pi - to)
    p += [('L', [se(-ti, c, ri)])]
    p += arc_path(c, ri, 2 * math.pi - ti, ti, first=False)
    return p + [('Z', [])]

def e_shape():
    out = []; y = TOP
    for w in E_W:
        out += poly([(E_X, y), (E_X + w, y), (E_X + w, y + E_T), (E_X, y + E_T)]); y += E_T + E_GAP
    return out

def to_d(cmds, ox, oy, k):
    q = lambda p: f"{(p[0] - ox) * k:.2f} {(p[1] - oy) * k:.2f}".replace('.00', '')
    s = []
    for op, pts in cmds:
        s.append(op + (' '.join(q(p) for p in pts) if pts else ''))
    return ''.join(s)

if __name__ == '__main__':
    import json
    R_PATH = open(sys.argv[1]).read().strip() if len(sys.argv) > 1 else ''  # trazo de la ® (px fuente)
    letters = {'O': ring((OX, OY), RO, RI), 'C': c_shape((OX + C_DX, OY), RO, RI, C_CUT),
               'E': e_shape(), 'A': poly(A_POLY), 'N': poly(N_POLY)}
    k = 100 / (BASE - TOP)            # altura de mayúscula = 100
    ox, oy = OX - RO[0], OY - RO[1]   # esquina: borde izquierdo de la O, tope de su rebase
    d = ''.join(to_d(v, ox, oy, k) for v in letters.values())
    W = (2343 - ox) * k; H = (OY + RO[1] - oy) * k
    json.dump({'d': d, 'k': k, 'ox': ox, 'oy': oy, 'W': W, 'H': H, 'worst_fit_px': WORST[0]}, open('maestro.json', 'w'))
    print('ajuste peor de las curvas: %.3f px fuente' % WORST[0], 'W %.2f H %.2f' % (W, H))
