#!/usr/bin/env bash
# El máster de la película v4 (docs/v4/PELICULA.md). Uso: tools/v4-film.sh CARPETA_CON_s0..s6.mp4
# s0–s6 son las siete tomas de ElevenLabs (Kling 3 Pro, 1080p, sin audio), encadenadas por sus placas: cada toma
# empieza exactamente en el cuadro donde termina la anterior. Por eso se quitan los 2 primeros cuadros de s1–s6
# (repiten la placa) y la unión no se nota. Los cortes resultantes van a src/v4/film.json («frames»).
set -euo pipefail
SRC="$1"; OUT="$(cd "$(dirname "$0")/.." && pwd)/public/v4"; TMP="$(mktemp -d)"
: > "$TMP/list.txt"
for i in 0 1 2 3 4 5 6; do
  ss=0; [ "$i" = 0 ] || ss=0.0834
  ffmpeg -v error -y -ss "$ss" -i "$SRC/s$i.mp4" -an -vf "fps=24,scale=1920:1068:flags=lanczos,setsar=1" \
    -c:v libx264 -crf 12 -preset fast -pix_fmt yuv420p "$TMP/t$i.mp4"
  echo "file '$TMP/t$i.mp4'" >> "$TMP/list.txt"
  ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$TMP/t$i.mp4"
done
ffmpeg -v error -y -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/master.mp4"
# para buscar con el scroll: un cuadro clave cada 8, sin cuadros B (cada búsqueda decodifica ≤ 7 cuadros)
ffmpeg -v error -y -i "$TMP/master.mp4" -an -vf "scale=1600:890:flags=lanczos" -c:v libx264 -preset slow -crf 24 \
  -g 8 -keyint_min 8 -bf 0 -sc_threshold 0 -pix_fmt yuv420p -tune film -movflags +faststart "$OUT/film-hd.mp4"
ffmpeg -v error -y -i "$TMP/master.mp4" -an -vf "scale=1024:570:flags=lanczos" -c:v libx264 -preset slow -crf 26 \
  -g 8 -keyint_min 8 -bf 0 -sc_threshold 0 -pix_fmt yuv420p -tune film -movflags +faststart "$OUT/film-sd.mp4"
# la portada (el primer cuadro) en 16:9 y en vertical
ffmpeg -v error -y -i "$TMP/master.mp4" -frames:v 1 "$TMP/f0.png"
python3 - "$TMP/f0.png" "$OUT" <<'PY'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); out = sys.argv[2] + '/'
im.save(out + 'poster.webp', quality=78, method=6)
W, H = im.size; cw = int(H * 9 / 16); cx = int(W * 0.6) - cw // 2
im.crop((cx, 0, cx + cw, H)).resize((720, 1280), Image.LANCZOS).save(out + 'poster-v.webp', quality=78, method=6)
PY
echo "listo: $OUT"
