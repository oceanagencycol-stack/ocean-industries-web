#!/usr/bin/env python3
"""
El máster de la película v6 final (28-nov-2026, docs/v6/PLAN-FINAL.md). Uso:
    python3 tools/v6-final-film.py CARPETA [--vertical]
CARPETA trae las siete tomas de Veo 3.1 (8 s, 1080p, 24 cps) t12.mp4 … t78.mp4, encadenadas por sus placas (el último
cuadro de una es el primero de la siguiente). Cada toma es una toma del guion (src/v4/script.ts,
en unidades de toma), a su velocidad natural (sin cuadros inventados):
  S0 = 2 s quietos en órbita + t12 (240)   S3 = t45 aterrizaje → bajo el agua (191)
  S1 = t23 reentrada → nubes (191)         S4 = t56 bajo el agua → rayos (191)
  S2 = t34 nubes → atardecer (191)         S5 = t67 rayos → abismo (191)
                                           S6 = t78 abismo → roca + 3,9 s quietos para la marca (285)
El primer cuadro de cada toma se quita (repite la placa). Los rótulos (data-t) se remapean toma por toma con
tools/v6-final-retime.py. El grano se limpia (hqdn3d): la web pone el suyo encima.
"""
import json
import os
import subprocess
import sys
import tempfile

FPS = 24
SRC = sys.argv[1]
VERT = '--vertical' in sys.argv
W, H = (1080, 1920) if VERT else (1920, 1080)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'public', 'v6')
LENS = [240, 191, 191, 191, 191, 191, 285]
HOLD0, HOLD6 = 48, 94
TAKES = ['t12', 't23', 't34', 't45', 't56', 't67', 't78']

tmp = tempfile.mkdtemp()
parts = []
for i, t in enumerate(TAKES):
    src = os.path.join(SRC, f'{t}.mp4')
    n = LENS[i] - (HOLD0 if i == 0 else 0) - (HOLD6 if i == 6 else 0)
    skip = 0 if i == 0 else 1
    # 192 cuadros de origen (menos el repetido) estirados a n con interpolación
    vf = [f'trim=start_frame={skip}', 'setpts=PTS-STARTPTS']
    vf += [f'scale={W}:{H}:flags=lanczos', 'setsar=1', f'fps={FPS}']
    if i == 0:
        vf += [f'tpad=start_duration={HOLD0 / FPS}:start_mode=clone']
    if i == 6:
        vf += [f'tpad=stop_duration={HOLD6 / FPS + 1}:stop_mode=clone']
    out = os.path.join(tmp, f'{i}.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', ','.join(vf), '-frames:v', str(LENS[i]), '-an',
                    '-c:v', 'libx264', '-crf', '12', '-preset', 'fast', '-pix_fmt', 'yuv420p', out], check=True)
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries',
                        'stream=nb_read_frames', '-of', 'csv=p=0', out], capture_output=True, text=True, check=True)
    print(t, 'cuadros', r.stdout.strip(), 'de', LENS[i], flush=True)
    parts.append(out)

lista = os.path.join(tmp, 'lista.txt')
with open(lista, 'w') as fh:
    fh.writelines(f"file '{p}'\n" for p in parts)
master = os.path.join(tmp, 'master.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', master], check=True)

frames = [sum(LENS[:i]) for i in range(8)]
common = ['-an', '-g', '8', '-keyint_min', '8', '-bf', '0', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-tune', 'film',
          '-movflags', '+faststart']
suf = '-v' if VERT else ''
sizes = [('hd', '1080:1920' if VERT else '1920:1068', '30'), ('sd', '720:1280' if VERT else '1024:570', '29')]
for name, sc, crf in sizes:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', master, '-vf', f'hqdn3d=1.2:1.2:5:5,scale={sc}:flags=lanczos',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, *common, os.path.join(OUT, f'film{suf}-{name}.mp4')],
                   check=True)
# carteles: primer cuadro (portada) y último (el fondo con la roca, para el epílogo)
def cuadro(t, dst, scale):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', master, '-frames:v', '1', '-vf', f'scale={scale}:flags=lanczos',
                    '-c:v', 'libwebp', '-quality', '82', dst], check=True)
if VERT:
    cuadro(0, os.path.join(OUT, 'poster-v.webp'), '720:1280')
else:
    cuadro(0, os.path.join(OUT, 'poster.webp'), '1920:1068')
    cuadro((frames[7] - 2) / FPS, os.path.join(OUT, 'fondo-1920.webp'), '1920:1068')
    cuadro((frames[7] - 2) / FPS, os.path.join(OUT, 'fondo-1280.webp'), '1280:712')
    with open(os.path.join(ROOT, 'src', 'v4', 'film.json'), 'w') as fh:
        json.dump({'fps': FPS, 'frames': frames,
                   'src': {'hd': '/v6/film-hd.mp4', 'sd': '/v6/film-sd.mp4', 'vhd': '/v6/film-v-hd.mp4', 'vsd': '/v6/film-v-sd.mp4'},
                   '_': 'frames: el primer cuadro de cada toma S0–S6 y el total (tools/v6-final-film.py)'}, fh, ensure_ascii=False)
        fh.write('\n')
for name, _, _ in sizes:
    p = os.path.join(OUT, f'film{suf}-{name}.mp4')
    print(os.path.basename(p), os.path.getsize(p) // 1024, 'KB')
print('cortes', frames)
