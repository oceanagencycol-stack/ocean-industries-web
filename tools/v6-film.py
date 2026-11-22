#!/usr/bin/env python3
"""
El máster de la película v6 · La nave (docs/v6/GUION.md). Uso:

    python3 tools/v6-film.py CARPETA   # CARPETA con placas/placa1…8-*.webp (2752 × 1536) y tomas/toma56|67|78.mp4

Siete tomas, como la v5, para reutilizar el motor (src/v4):
  S0 órbita (placa 1, acercamiento lento)          S4 entrada al agua (placa 5 → toma 5→6)
  S1 reentrada (placa 2)                           S5 rayos → abismo (toma 6→7)
  S2 sobre las nubes (placa 3)                     S6 abismo → roca (toma 7→8 + 4 s quietos para la marca)
  S3 rasante sobre el mar (placa 4)

Las placas se mueven con un acercamiento de cámara calculado con precisión de subpíxel desde el original HD (nada de
zoompan, que salta de a un píxel) y se funden entre sí en 1,2 s. Las tomas encadenan por sus placas: se quitan los 2
primeros cuadros de 6→7 y 7→8 (repiten la placa). Escribe public/v6/film-hd.mp4, film-sd.mp4, poster.webp,
poster-v.webp y la lista de cortes para src/v6/film.json.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

FPS = 24
W, H = 1920, 1068
XF = 29  # cuadros de fundido entre placas (1,2 s)

SRC = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'public', 'v6')
os.makedirs(OUT, exist_ok=True)


def ease(t):
    return t * t * (3 - 2 * t)


def placa(n):
    d = os.path.join(SRC, 'placas')
    f = next(x for x in sorted(os.listdir(d)) if x.startswith(f'placa{n}-'))
    return Image.open(os.path.join(d, f)).convert('RGB')


def kenburns(img, frames, w0, w1, c0, c1):
    """Ventana de cámara: ancho relativo w (1 = toda la placa) y centro c (0–1), interpolados con suavidad."""
    IW, IH = img.size
    for i in range(frames):
        t = ease(i / max(1, frames - 1))
        w = (w0 + (w1 - w0) * t) * IW
        h = w * H / W
        if h > IH:  # la placa es apenas más alta que el cuadro: se limita por alto
            h = IH
            w = h * W / H
        cx = (c0[0] + (c1[0] - c0[0]) * t) * IW
        cy = (c0[1] + (c1[1] - c0[1]) * t) * IH
        x0 = min(max(cx - w / 2, 0), IW - w)
        y0 = min(max(cy - h / 2, 0), IH - h)
        frame = img.transform((W, H), Image.AFFINE, (w / W, 0, x0, 0, h / H, y0), resample=Image.BICUBIC)
        yield np.asarray(frame, dtype=np.uint8)


def video(path, skip=0, hold=0):
    """Cuadros de una toma, uno por uno (sin cargarla entera); hold repite el último."""
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H}:flags=lanczos,setsar=1',
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n, last = 0, None
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        last = np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3)
        if n >= skip:
            yield last
        n += 1
    p.wait()
    for _ in range(hold):
        yield last


def contar(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries',
                        'stream=nb_read_frames', '-of', 'csv=p=0', path], check=True, capture_output=True, text=True)
    return int(r.stdout.strip())


T = os.path.join(SRC, 'tomas')
n56, n67, n78 = (contar(os.path.join(T, f'toma{k}.mp4')) for k in ('56', '67', '78'))
HOLD = 96  # 4 s quietos al final: la marca se graba en la roca

# (cuadros, generador, fundido con la anterior)
SEG = [
    (240 + XF // 2, lambda n: kenburns(placa(1), n, 1.0, 0.8, (0.5, 0.5), (0.57, 0.47)), 0),      # órbita
    (216 + XF, lambda n: kenburns(placa(2), n, 0.94, 0.78, (0.48, 0.48), (0.53, 0.53)), XF),      # reentrada
    (216 + XF, lambda n: kenburns(placa(3), n, 0.82, 0.96, (0.5, 0.56), (0.5, 0.5)), XF),         # nubes
    (216 + XF, lambda n: kenburns(placa(4), n, 0.9, 0.78, (0.44, 0.56), (0.57, 0.55)), XF),       # rasante
    (60 + XF, lambda n: kenburns(placa(5), n, 0.9, 1.0, (0.5, 0.56), (0.5, 0.5)), XF),            # entrada (placa)
    (n56, lambda n: video(os.path.join(T, 'toma56.mp4')), 12),                                     # entrada → rayos
    (n67 - 2, lambda n: video(os.path.join(T, 'toma67.mp4'), skip=2), 0),                          # rayos → abismo
    (n78 - 2 + HOLD, lambda n: video(os.path.join(T, 'toma78.mp4'), skip=2, hold=HOLD), 0),        # abismo → roca
]

tmp = tempfile.mkdtemp()
master = os.path.join(tmp, 'master.mp4')
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                        '-i', '-', '-c:v', 'libx264', '-crf', '12', '-preset', 'fast', '-pix_fmt', 'yuv420p', master],
                       stdin=subprocess.PIPE)
escritos = 0
inicio = []  # el cuadro donde arranca cada segmento (mitad del fundido)
pend = []    # los últimos cuadros del segmento anterior, para fundirlos con el siguiente
first = last = None
for k, (n, gen, fade_in) in enumerate(SEG):
    sig = SEG[k + 1][2] if k + 1 < len(SEG) else 0
    inicio.append(escritos + len(pend) - fade_in // 2 if fade_in else escritos + len(pend))
    for i, f in enumerate(gen(n)):
        if i < fade_in:
            a = pend.pop(0)
            t = ease((i + 1) / (fade_in + 1))
            f = (a * (1 - t) + f * t).astype(np.uint8)
        if i >= n - sig:
            pend.append(f)
            continue
        enc.stdin.write(f.tobytes())
        escritos += 1
        if first is None:
            first = f
        last = f
enc.stdin.close()
enc.wait()
total = escritos
# S0–S6: la v5 tiene siete tomas; la placa de la entrada y la toma 5→6 forman juntas S4
cortes = [inicio[0], inicio[1], inicio[2], inicio[3], inicio[4], inicio[6], inicio[7]]
frames = cortes + [total]
print('cuadros por toma:', [frames[i + 1] - frames[i] for i in range(7)], 'total', total, f'({total / FPS:.1f} s)')

common = ['-an', '-g', '8', '-keyint_min', '8', '-bf', '0', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-tune', 'film',
          '-movflags', '+faststart']
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', master, '-vf', 'scale=1600:890:flags=lanczos', '-c:v', 'libx264',
                '-preset', 'slow', '-crf', '22', *common, os.path.join(OUT, 'film-hd.mp4')], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', master, '-vf', 'scale=1024:570:flags=lanczos', '-c:v', 'libx264',
                '-preset', 'slow', '-crf', '25', *common, os.path.join(OUT, 'film-sd.mp4')], check=True)
seq = [first, last]

im = Image.fromarray(seq[0])
im.save(os.path.join(OUT, 'poster.webp'), quality=80, method=6)
cw = int(H * 9 / 16)
cx = int(W * 0.6) - cw // 2
im.crop((cx, 0, cx + cw, H)).resize((720, 1280), Image.LANCZOS).save(os.path.join(OUT, 'poster-v.webp'), quality=80, method=6)
# el último cuadro (el fondo con la roca) para el epílogo, en dos anchos
last = Image.fromarray(seq[1])
last.save(os.path.join(OUT, 'fondo-1920.webp'), quality=82, method=6)
last.resize((1280, 712), Image.LANCZOS).save(os.path.join(OUT, 'fondo-1280.webp'), quality=82, method=6)

with open(os.path.join(ROOT, 'src', 'v6', 'film.json'), 'w') as fh:
    json.dump({'fps': FPS, 'frames': frames, 'src': {'hd': '/v6/film-hd.mp4', 'sd': '/v6/film-sd.mp4'},
               '_': 'frames: el primer cuadro de cada toma S0–S6 y el total (tools/v6-film.py)'}, fh, ensure_ascii=False)
    fh.write('\n')
for n in ('film-hd.mp4', 'film-sd.mp4'):
    print(n, os.path.getsize(os.path.join(OUT, n)) // 1024, 'KB')
print('listo:', OUT)
