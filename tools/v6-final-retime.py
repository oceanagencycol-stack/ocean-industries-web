#!/usr/bin/env python3
"""Remapea los data-t (segundos del máster) de index.html de los cortes viejos a los nuevos, toma por toma:
cada rótulo queda en el mismo punto relativo de su toma. Uso: python3 tools/v6-final-retime.py VIEJOS NUEVOS
(listas de 8 cuadros separadas por comas). Idempotente solo si se corre una vez por cambio de cortes."""
import re, sys, os
FPS = 24
old = [int(x) for x in sys.argv[1].split(',')]
new = [int(x) for x in sys.argv[2].split(',')]
def m(s):
    f = float(s) * FPS
    k = max(i for i in range(7) if old[i] <= f) if f < old[7] else 6
    frac = (f - old[k]) / (old[k + 1] - old[k])
    return round((new[k] + frac * (new[k + 1] - new[k])) / FPS, 2)
p = os.path.join(os.path.dirname(__file__), '..', 'index.html')
t = open(p).read()
def sub(mo):
    a, b = mo.group(1).split(':')
    return f'data-t="{m(a):g}:{m(b):g}"'
t2, n = re.subn(r'data-t="([\d.]+:[\d.]+)"', sub, t)
open(p, 'w').write(t2)
print(n, 'rótulos remapeados')
