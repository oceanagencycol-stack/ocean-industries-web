"""Tarjetas de presentación OCEAN (8,5 × 5,5 cm, 3 mm de sangrado), vectoriales y en CMYK.
Marca desde marca/v3 (logo.svg y simbolo-simetrico.svg) dibujada con reportlab; texto en Geist."""
import re, math
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import CMYKColor
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
M = 'marca/v3/'
for w in (400, 500, 600): pdfmetrics.registerFont(TTFont(f'Geist{w}', f'tools/marca/tarjetas/fonts/Geist-{w}.ttf'))
ABYSS = CMYKColor(0.80, 0.45, 0.20, 0.88)     # azul abisal profundo (negro enriquecido frío, 233 % de tinta)
SNOW = CMYKColor(0.05, 0.02, 0.00, 0.04)      # nieve
MIST = CMYKColor(0.20, 0.08, 0.00, 0.25)      # hielo
TW, TH, B = 85 * mm, 55 * mm, 3 * mm

def tokens(d): return re.findall(r'[MLHVCAZ]|-?\d*\.?\d+(?:e-?\d+)?', d)
def draw_path(c, d, tx, fill=True, stroke=False):
    p = c.beginPath(); t = tokens(d); i = 0; cur = (0, 0); cmd = None
    num = lambda: float(t[i])
    while i < len(t):
        if t[i] in 'MLHVCAZ': cmd = t[i]; i += 1
        if cmd == 'M': x, y = float(t[i]), float(t[i+1]); i += 2; p.moveTo(*tx(x, y)); cur = (x, y); cmd = 'L'
        elif cmd == 'L': x, y = float(t[i]), float(t[i+1]); i += 2; p.lineTo(*tx(x, y)); cur = (x, y)
        elif cmd == 'H': x = float(t[i]); i += 1; p.lineTo(*tx(x, cur[1])); cur = (x, cur[1])
        elif cmd == 'V': y = float(t[i]); i += 1; p.lineTo(*tx(cur[0], y)); cur = (cur[0], y)
        elif cmd == 'C':
            v = [float(t[i+k]) for k in range(6)]; i += 6
            p.curveTo(*tx(v[0], v[1]), *tx(v[2], v[3]), *tx(v[4], v[5])); cur = (v[4], v[5])
        elif cmd == 'Z': p.close()
        else: raise ValueError(cmd)
    c.drawPath(p, fill=1 if fill else 0, stroke=1 if stroke else 0)

def logo(c, x, y, width, color, con_r=True):
    s = open(M + ('logo.svg' if con_r else 'logo-sin-r.svg')).read()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    k = width / vb[2]; h = vb[3] * k
    tx = lambda px, py: (x + (px - vb[0]) * k, y + h - (py - vb[1]) * k)
    sw = float(re.search(r'stroke-width="([\d.]+)"', s).group(1)) * k
    c.setStrokeColor(color); c.setFillColor(color); c.setLineWidth(sw); c.setLineCap(1); c.setLineJoin(1)
    cc = re.search(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"', s)
    ccx, ccy = tx(float(cc.group(1)), float(cc.group(2))); c.circle(ccx, ccy, float(cc.group(3)) * k, stroke=1, fill=0)
    arc = re.search(r'<path d="M([\d.]+) ([\d.]+)A([\d.]+) [\d.]+ 0 1 0 ([\d.]+) ([\d.]+)"', s)
    x1, y1, r, x2, y2 = map(float, arc.groups())
    # centro del arco de la C: a la izquierda de la cuerda vertical
    half = abs(y2 - y1) / 2; cxs = x1 - math.sqrt(r * r - half * half); cys = (y1 + y2) / 2
    ang = math.degrees(math.atan2(half, x1 - cxs))
    X, Y = tx(cxs, cys); R = r * k
    p = c.beginPath(); p.arc(X - R, Y - R, X + R, Y + R, startAng=ang, extent=360 - 2 * ang); c.drawPath(p, stroke=1, fill=0)
    for m_ in re.finditer(r'<path d="M([\d.]+) ([\d.]+)H([\d.]+)"', s):
        a, b, e = map(float, m_.groups()); p = c.beginPath(); p.moveTo(*tx(a, b)); p.lineTo(*tx(e, b)); c.drawPath(p, stroke=1, fill=0)
    for m_ in re.finditer(r'<path fill="currentColor"(?: fill-rule="evenodd")? d="([^"]+)"', s):
        draw_path(c, m_.group(1), tx)
    return h

def simbolo(c, x, y, width, color):
    s = open(M + 'simbolo-simetrico.svg').read()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    k = width / vb[2]; h = vb[3] * k
    tx = lambda px, py: (x + (px - vb[0]) * k, y + h - (py - vb[1]) * k)
    c.setFillColor(color)
    for m_ in re.finditer(r' d="([^"]+)"', s): draw_path(c, m_.group(1), tx)
    return h

def tracked(c, text, x, y, font, size, track_em, color):
    c.setFillColor(color); t = c.beginText(x, y); t.setFont(font, size); t.setCharSpace(size * track_em); t.textOut(text); c.drawText(t)

def marcas(c, ox, oy):
    c.setStrokeColor(CMYKColor(0, 0, 0, 1)); c.setLineWidth(0.25)
    L, G = 5 * mm, 1.5 * mm
    for (x, y) in [(ox, oy), (ox + TW, oy), (ox, oy + TH), (ox + TW, oy + TH)]:
        sx = -1 if x == ox else 1; sy = -1 if y == oy else 1
        c.line(x + sx * (B + G), y, x + sx * (B + G + L), y); c.line(x, y + sy * (B + G), x, y + sy * (B + G + L))

def cara_frente(c, ox, oy):
    c.setFillColor(ABYSS); c.rect(ox - B, oy - B, TW + 2 * B, TH + 2 * B, stroke=0, fill=1)
    w = 44 * mm; s = open(M + 'logo.svg').read(); vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    h = vb[3] * w / vb[2]
    logo(c, ox + (TW - w) / 2, oy + (TH - h) / 2, w, SNOW)

def cara_dorso(c, ox, oy, nombre, cargo, lineas):
    c.setFillColor(ABYSS); c.rect(ox - B, oy - B, TW + 2 * B, TH + 2 * B, stroke=0, fill=1)
    m = 6.5 * mm
    simbolo(c, ox + TW - m - 7 * mm, oy + TH - m - 7 * 588.75 / 687.5 * mm, 7 * mm, SNOW)
    tracked(c, nombre, ox + m, oy + TH - m - 10, 'Geist600', 12.5, -0.01, SNOW)
    tracked(c, cargo.upper(), ox + m, oy + TH - m - 10 - 12.5, 'Geist500', 6.2, 0.18, MIST)
    y = oy + m + (len(lineas) - 1) * 10.5
    for l in lineas:
        tracked(c, l, ox + m, y, 'Geist400', 7.8, 0.0, SNOW); y -= 10.5

def tarjeta(archivo, nombre, cargo, lineas, con_marcas):
    pad = (B + 8.5 * mm) if con_marcas else B
    W, H = TW + 2 * pad, TH + 2 * pad
    c = canvas.Canvas(archivo, pagesize=(W, H), initialFontName='Geist400', initialFontSize=8)
    c.setTitle(f'OCEAN · Tarjeta · {nombre}'); c.setAuthor('OCEAN'); c.setSubject(f'85 × 55 mm, sangrado 3 mm, CMYK')
    for cara in ('frente', 'dorso'):
        ox = oy = pad
        if cara == 'frente': cara_frente(c, ox, oy)
        else: cara_dorso(c, ox, oy, nombre, cargo, lineas)
        if con_marcas:
            # el fondo se recorta a la zona de sangrado y las marcas van en blanco de papel
            c.setFillColor(CMYKColor(0, 0, 0, 0))
            c.rect(0, 0, W, pad - B, stroke=0, fill=1); c.rect(0, H - pad + B, W, pad - B, stroke=0, fill=1)
            c.rect(0, 0, pad - B, H, stroke=0, fill=1); c.rect(W - pad + B, 0, pad - B, H, stroke=0, fill=1)
            marcas(c, ox, oy)
        c.showPage()
    c.save()

PERSONAS = [('juan-cuero', 'Juan Cuero', 'CEO', ['oceanagencycol@gmail.com', 'oceanindustries.com.co']),
            ('mary-meza', 'Mary Meza', 'Directora Comercial Colombia', ['oceanagencycol@gmail.com', 'oceanindustries.com.co'])]
if __name__ == '__main__':
    import os; pass
    for slug, n, cg, ls in PERSONAS:
        tarjeta(f'marca/v3/tarjetas/OCEAN-tarjeta-{slug}-85x55-sangrado.pdf', n, cg, ls, False)
        tarjeta(f'marca/v3/tarjetas/OCEAN-tarjeta-{slug}-85x55-marcas-de-corte.pdf', n, cg, ls, True)
    print('ok')
