"""qa/marca.py — el vector de la marca coincide con los archivos que entregó Juan.

Uso (desde la raíz del repo): python3 qa/marca.py
Necesita: pip install cairosvg scikit-image scipy pillow
Mide, para el logotipo y el símbolo:
  - IoU de la tinta contra el archivo fuente, a la resolución de la fuente, con el mejor encaje subpíxel
    (traslación ±1,5 px y escala ±0,4 %, búsqueda en rejilla);
  - qué parte del borde del vector queda a ≤ 2 px del borde de la fuente.
Pasa si IoU ≥ 0,98 y ≥ 99 % del borde a ≤ 2 px. Termina en «marca en verde» o lista los fallos.
"""
import io, re, sys, itertools
import numpy as np, cairosvg
from PIL import Image
from scipy.ndimage import distance_transform_edt, binary_erosion

CASOS = [  # (svg, fuente, la tinta es clara)
    ('marca/v3/logo.svg', 'marca/v3/fuente/logotipo-ocean-final.jpg', True),
    ('marca/v3/simbolo.svg', 'marca/v3/fuente/simbolo-estrella-fluida.png', False),
    ('marca/v3/simbolo-cuadrado.svg', 'marca/v3/fuente/simbolo-estrella-fluida.png', False),
]

def tinta(path, clara):
    a = np.asarray(Image.open(path).convert('L')).astype(float)
    return a > 128 if clara else a < 128

def bbox(m):
    ys, xs = np.nonzero(m); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def render(svg, shape, x0, y0, sx, sy):
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split()]
    body = re.sub(r'^<svg[^>]*>|</svg>$', '', svg).replace('currentColor', '#fff')
    doc = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{shape[1]}" height="{shape[0]}">'
           f'<rect width="100%" height="100%" fill="#000"/>'
           f'<g transform="translate({x0},{y0}) scale({sx},{sy}) translate({-vb[0]},{-vb[1]})">{body}</g></svg>')
    png = cairosvg.svg2png(bytestring=doc.encode())
    return np.asarray(Image.open(io.BytesIO(png)).convert('L')) > 128

def borde(m): return m & ~binary_erosion(m)

def medir(svg_path, src_path, clara):
    src = tinta(src_path, clara)
    svg = open(svg_path).read()
    # primer encaje: la caja de la tinta del vector sobre la caja de la tinta de la fuente
    probe = render(svg, (2000, 4000), 0, 0, 1, 1)
    px0, py0, px1, py1 = bbox(probe); sx0, sy0, sx1, sy1 = bbox(src)
    kx = (sx1 - sx0) / (px1 - px0); ky = (sy1 - sy0) / (py1 - py0)
    best = (0, None)
    for dx, dy, ds in itertools.product(np.linspace(-1.5, 1.5, 7), np.linspace(-1.5, 1.5, 7), (0.996, 1.0, 1.004)):
        r = render(svg, src.shape, sx0 - px0 * kx * ds + dx, sy0 - py0 * ky * ds + dy, kx * ds, ky * ds)
        iou = (r & src).sum() / (r | src).sum()
        if iou > best[0]: best = (iou, r)
    iou, r = best
    d = distance_transform_edt(~borde(src))
    cerca = (d[borde(r)] <= 2).mean()
    return iou, cerca

fallos = []
for svg, src, clara in CASOS:
    iou, cerca = medir(svg, src, clara)
    ok = iou >= 0.98 and cerca >= 0.99
    print(f'{svg}: IoU {iou:.4f} · borde a ≤ 2 px {cerca * 100:.2f} % · {"ok" if ok else "FALLA"}')
    if not ok: fallos.append(svg)
print('marca en verde' if not fallos else 'fallan: ' + ', '.join(fallos))
sys.exit(1 if fallos else 0)
