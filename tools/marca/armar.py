"""Arma logo.svg y logo-sin-r.svg desde maestro.json (salida de maestro.py + registrada.py).
El viewBox sale de la tinta real renderizada (antes salía de la O y recortaba 2,5 unidades de la ®)."""
import io, json, re, cairosvg, numpy as np
from PIL import Image

def tinta_bbox(body, w, h, S=8, M=10):
    doc = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{int((w + 2 * M) * S)}" height="{int((h + 2 * M) * S)}">'
           f'<rect width="100%" height="100%"/><g transform="scale({S}) translate({M},{M})">'
           + body.replace('currentColor', '#fff') + '</g></svg>')
    a = np.asarray(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=doc.encode()))).convert('L')) > 127
    ys, xs = np.nonzero(a)
    return xs.min() / S - M, ys.min() / S - M, (xs.max() + 1) / S - M, (ys.max() + 1) / S - M

M = json.load(open('maestro.json'))
for nombre, titulo, body in [
    ('logo.svg', 'OCEAN®', f'<path fill="currentColor" d="{M["d"]}"/><path fill="currentColor" fill-rule="evenodd" d="{M["r"]}"/>'),
    ('logo-sin-r.svg', 'OCEAN', f'<path fill="currentColor" d="{M["d"]}"/>'),
]:
    x0, y0, x1, y1 = tinta_bbox(body, M['Wr'] + 2, M['H'] + 2)
    open(nombre, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.2f} {y0:.2f} {x1 - x0:.2f} {y1 - y0:.2f}">'
                            f'<title>{titulo}</title>{body}</svg>')
    print(nombre, f'{x0:.2f} {y0:.2f} {x1 - x0:.2f} {y1 - y0:.2f}')
