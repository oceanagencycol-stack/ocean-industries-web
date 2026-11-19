#!/usr/bin/env python3
"""
Medios de la página v3 (todo por código, en local y gratis; nada de IA):

  public/v3/pagina/<placa>-{960,1600}.{avif,webp}   las placas de respaldo de cada tramo (16:9)
  public/v3/pagina/<placa>-v.{avif,webp}            su encuadre vertical para el teléfono (720×1280)
  public/v3/grano-pagina.png                         la tesela de grano de película (256 px, sin costuras)
  public/favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png
  public/og.jpg                                      1200×630: el logotipo OCEAN® sobre M1a

La marca sale de marca/v3/ (no se redibuja): el símbolo simétrico (la elección de Juan) en el lienzo cuadrado de
simbolo-cuadrado.svg, y logo.svg para la imagen para compartir.

    python3 tools/medios_pagina.py            # todo
    python3 tools/medios_pagina.py placas     # solo las placas
"""
import io
import re
import sys
from pathlib import Path

import cairosvg
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'media/v3/direccion'
OUT = ROOT / 'public/v3/pagina'
MARCA = ROOT / 'marca/v3'

SNOW = '#E0E7ED'
ABYSS = '#06141D'

# placa → (tramo, foco horizontal del encuadre vertical 0..1)
PLACAS = {
    'M1a': ('espacio', 0.30),  # la estrella de cuatro puntas arriba; la luna queda fuera (no cruza el texto)
    'M1sb': ('satelite', 0.60),
    'M2b': ('mar', 0.49),
    'M3b': ('agua', 0.66),
    'M4v2a': ('maquina', 0.47),
    'M5a': ('emerge', 0.60),
    'M6a': ('cumbre', 0.62),
}


def save(im: Image.Image, stem: Path, q_avif: int, q_webp: int) -> None:
    im.save(stem.with_suffix('.avif'), 'AVIF', quality=q_avif, speed=4)
    im.save(stem.with_suffix('.webp'), 'WEBP', quality=q_webp, method=6)


def placas() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (_tramo, fx) in PLACAS.items():
        im = Image.open(SRC / f'{name}.jpg').convert('RGB')
        W, H = im.size
        low = name.lower()
        for w, q in ((960, 62), (1600, 60), (2400, 56)):
            h = round(H * w / W)
            save(im.resize((w, h), Image.LANCZOS), OUT / f'{low}-{w}', q, 76)
        # vertical 9:16 a la altura completa, centrado en el foco
        cw = round(H * 9 / 16)
        x0 = int(min(max(fx * W - cw / 2, 0), W - cw))
        v = im.crop((x0, 0, x0 + cw, H)).resize((720, 1280), Image.LANCZOS)
        save(v, OUT / f'{low}-v', 60, 76)
        print('placa', low, 'listo')


def grano() -> None:
    """Grano fino de alta frecuencia, sin costuras (ruido periódico), centrado en el gris medio (soft-light)."""
    rng = np.random.default_rng(1811)
    n = rng.normal(0, 1, (256, 256))
    # un toque de cuerpo: dos octavas, la fina domina (35 mm escaneado, no ruido sucio)
    coarse = np.fft.ifft2(np.fft.fft2(rng.normal(0, 1, (256, 256))) * _lowpass(256, 0.33)).real
    g = n * 0.82 + coarse / (coarse.std() + 1e-9) * 0.35
    g = (g - g.mean()) / g.std()
    # 32 niveles: a opacidad 0,06 no se distinguen de 256 y la tesela pesa la mitad
    px = (np.clip(128 + g * 46, 0, 255) / 8).round().astype(np.uint8) * 8
    Image.fromarray(px, 'L').quantize(32).save(ROOT / 'public/v3/grano-pagina.png', optimize=True)
    print('grano listo')


def _lowpass(n: int, cut: float) -> np.ndarray:
    f = np.fft.fftfreq(n)
    r = np.sqrt(f[None, :] ** 2 + f[:, None] ** 2) / 0.5
    return (r < cut).astype(float)


def _symbol_square_svg(color: str, bg: str | None, pad: float = 0.0) -> str:
    """El símbolo simétrico en el lienzo cuadrado de simbolo-cuadrado.svg (mismo encuadre)."""
    sq = (MARCA / 'simbolo-cuadrado.svg').read_text()
    sym = (MARCA / 'simbolo-simetrico.svg').read_text()
    x, y, w, h = map(float, re.search(r'viewBox="([^"]+)"', sq).group(1).split())
    sx, sy, sw, sh = map(float, re.search(r'viewBox="([^"]+)"', sym).group(1).split())
    d = re.search(r'<path[^>]*\sd="([^"]+)"', sym).group(1)
    # el símbolo centrado en el cuadrado (como en simbolo-cuadrado.svg), con un margen opcional
    side = w * (1 + 2 * pad)
    vx = sx + sw / 2 - side / 2
    vy = sy + sh / 2 - side / 2
    rect = f'<rect x="{vx:.2f}" y="{vy:.2f}" width="{side:.2f}" height="{side:.2f}" fill="{bg}"/>' if bg else ''
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.2f} {vy:.2f} {side:.2f} {side:.2f}">'
        f'{rect}<path fill="{color}" d="{d}"/></svg>'
    )


def png(svg: str, size: int) -> Image.Image:
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size))).convert('RGBA')


def iconos() -> None:
    pub = ROOT / 'public'
    # favicon.svg: el símbolo en nieve sobre un cuadrado abisal redondeado (se lee en pestañas claras y oscuras)
    sym = _symbol_square_svg(SNOW, None, pad=0.16)
    vb = re.search(r'viewBox="([^"]+)"', sym).group(1)
    vx, vy, side, _ = map(float, vb.split())
    d = re.search(r'\sd="([^"]+)"', sym).group(1)
    fav = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.1f} {vy:.1f} {side:.1f} {side:.1f}">'
        f'<rect x="{vx:.1f}" y="{vy:.1f}" width="{side:.1f}" height="{side:.1f}" rx="{side * 0.22:.1f}" fill="{ABYSS}"/>'
        f'<path fill="{SNOW}" d="{d}"/></svg>'
    )
    (pub / 'favicon.svg').write_text(fav)
    png(fav, 32).save(pub / 'favicon-32.png', optimize=True)
    # los íconos de pantalla de inicio: lienzo lleno (iOS y Android redondean por su cuenta)
    full = _symbol_square_svg(SNOW, ABYSS, pad=0.2)
    png(full, 180).convert('RGB').save(pub / 'apple-touch-icon.png', optimize=True)
    png(full, 192).convert('RGB').save(pub / 'icon-192.png', optimize=True)
    png(full, 512).convert('RGB').save(pub / 'icon-512.png', optimize=True)
    print('íconos listos')


def og() -> None:
    W, H = 1200, 630
    im = Image.open(SRC / 'M1a.jpg').convert('RGB')
    iw, ih = im.size
    # el encuadre: la luna y el borde de la Tierra; el logotipo en el aire oscuro de arriba a la izquierda
    s = W / (iw * 0.86)
    im = im.resize((round(iw * s), round(ih * s)), Image.LANCZOS)
    x0 = round(im.width * 0.08)
    y0 = round(im.height * 0.04)
    im = im.crop((x0, y0, x0 + W, y0 + H))
    # oscurece un poco la zona del logotipo (sin bandas: degradado suave + grano)
    a = np.asarray(im).astype(np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W]
    shade = np.clip(1 - 0.38 * np.exp(-(((xx - 330) / 520) ** 2 + ((yy - 250) / 300) ** 2)), 0, 1)
    a *= shade[..., None]
    rng = np.random.default_rng(7)
    a += rng.normal(0, 0.012, a.shape)
    base = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    logo = (MARCA / 'logo.svg').read_text().replace('currentColor', SNOW)
    lw = 560
    vb = list(map(float, re.search(r'viewBox="([^"]+)"', logo).group(1).split()))
    lh = round(lw * vb[3] / vb[2])
    L = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=logo.encode(), output_width=lw * 2, output_height=lh * 2)))
    L = L.resize((lw, lh), Image.LANCZOS)
    base.paste(L, (84, 200), L)
    base.save(ROOT / 'public/og.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
    print('og listo')


if __name__ == '__main__':
    what = sys.argv[1:] or ['placas', 'grano', 'iconos', 'og']
    for w in what:
        {'placas': placas, 'grano': grano, 'iconos': iconos, 'og': og}[w]()
