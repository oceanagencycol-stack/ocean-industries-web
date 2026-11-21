"""Master the OCEAN scroll film. Usage: python tools/film.py SOURCE_DIR MASTER_DIR

Sources: bridge0.mp4 ... bridge5.mp4 (ElevenLabs takes in procedencia.json)
and intro.mp4 (orbit take). Requires FFmpeg, numpy, Pillow and scipy.
"""

from pathlib import Path
import math
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from scipy.interpolate import PchipInterpolator

src = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
fps = 24
w, h = 1440, 810
lw, lh = 800, 450
seconds = 36
out.mkdir(parents=True, exist_ok=True)
base = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-filter_threads", "2"]
encoder = ["-an", "-c:v", "libx264", "-threads", "4", "-pix_fmt", "yuv420p", "-preset", "fast"]


def ff(*args):
    subprocess.run(base + list(map(str, args)), check=True)


# Positions in the shot, in image space. The key does not change identity at
# a join. Its path is continuous through both camera turns at the waterline.
keys = np.array(
    [
        [-4, 0.27, 0.90],
        [0, 0.72, 0.49],
        [3, 0.79, 0.425],
        [5, 0.75, 0.37],
        [8, 0.67, 0.43],
        [9.4, 0.57, 0.55],
        [11.5, 0.38, 0.48],
        [13, 0.50, 0.68],
        [14.4, 0.55, 0.73],
        [16, 0.60, 0.43],
        [18, 0.73, 0.60],
        [20, 0.66, 0.67],
        [21.5, 0.48, 0.58],
        [23, 0.54, 0.55],
        [25, 0.64, 0.40],
        [26.6, 0.56, 0.46],
        [28, 0.63, 0.62],
        [30, 0.65, 0.44],
        [31.7, 0.71, 0.40],
        [33, 0.65, 0.29],
        [36, 0.665, 0.275],
    ]
)
path = PchipInterpolator(keys[:, 0], keys[:, 1:], axis=0)


def light(t):
    pos = path(t)
    tail = 2.4 if t < 6 else 1.2
    if t > 31:
        tail = max(0.36, 1.2 - (t - 31) * 0.2)
    k = np.linspace(0, 1, 45)
    q = path(t - (1 - k) * tail)
    # A small diffraction halo and staggered filaments give the moving source a
    # legible direction even when projected against bright glacial highlights.
    head = (int(pos[0] * lw), int(pos[1] * lh))
    raw = Image.new("RGB", (lw, lh))
    draw = ImageDraw.Draw(raw)
    fade = 1 - min(0.43, max(0, (t - 27) * 0.10))
    for strand in range(3):
        phase = strand * 2.1
        pts = [
            (
                int(x * lw),
                int(y * lh + (1 - f) * math.sin(f * 6 + phase + t * 0.6) * (3 + strand * 3)),
            )
            for (x, y), f in zip(q, k)
        ]
        for n in range(1, len(pts)):
            v = float(k[n] ** 1.4 * fade / (1 + strand * 0.65))
            draw.line(
                [pts[n - 1], pts[n]],
                fill=(int(78 * v), int(240 * v), int(238 * v)),
                width=2 if strand == 0 else 1,
            )
    x, y = head
    draw.ellipse((x - 4, y - 3, x + 4, y + 3), fill=(95, 239, 220))
    bloom = ImageChops.add(
        raw.filter(ImageFilter.GaussianBlur(6)), raw.filter(ImageFilter.GaussianBlur(2))
    )
    lightmap = ImageChops.add(raw, bloom)
    draw = ImageDraw.Draw(lightmap)
    for r, c in [(12, (33, 95, 100)), (8, (88, 165, 162)), (4, (172, 242, 214))]:
        draw.line((x - r, y, x + r, y), fill=c)
        draw.line((x, y - r // 2, x, y + r // 2), fill=c)
    draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(248, 255, 235))
    return lightmap


with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    size = f"fps={fps},scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1"

    def scene(n, args, vf, count):
        ff(*args, "-vf", vf, "-frames:v", count, *encoder, "-crf", "14", tmp / f"{n}.mp4")

    scene(0, ["-t", "3", "-i", src / "intro.mp4"], size + ",reverse,setpts=PTS-STARTPTS", 72)
    for i in range(6):
        scene(
            i + 1,
            ["-i", src / f"bridge{i}.mp4"],
            size + ",tpad=stop_mode=clone:stop_duration=0.2",
            120,
        )
    end = tmp / "end.png"
    ff("-sseof", "-0.08", "-i", src / "bridge5.mp4", "-vf", size, "-frames:v", 1, end)
    scene(
        7,
        ["-loop", "1", "-i", end],
        f"scale=2880:-2,zoompan=z='1+0.00028*on':x='iw*.65*(1-1/zoom)':y='ih*.29*(1-1/zoom)':d=1:s={w}x{h}:fps={fps}",
        72,
    )
    (tmp / "edit.txt").write_text("".join(f"file '{n}.mp4'\n" for n in range(8)))
    ff("-f", "concat", "-safe", "0", "-i", tmp / "edit.txt", "-c", "copy", tmp / "camera.mp4")
    grade = "curves=r='0/0 .18/.12 .50/.48 .83/.90 1/1':g='0/.008 .18/.22 .50/.62 .83/.91 1/1':b='0/.022 .18/.32 .50/.78 .83/.98 1/1'"
    composition = f"[0:v]{grade}[world];[1:v]scale={w}:{h}:flags=bicubic,format=gbrp[light];[world][light]blend=all_mode=screen:shortest=1,format=yuv420p[v]"
    cmd = (
        base
        + [
            "-i",
            str(tmp / "camera.mp4"),
            "-f",
            "rawvideo",
            "-vcodec",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-s",
            f"{lw}x{lh}",
            "-r",
            str(fps),
            "-i",
            "pipe:0",
            "-filter_complex_threads",
            "3",
            "-filter_complex",
            composition,
            "-map",
            "[v]",
        ]
        + encoder
        + [
            "-crf",
            "20",
            "-g",
            "8",
            "-keyint_min",
            "8",
            "-sc_threshold",
            "0",
            "-bf",
            "0",
            "-movflags",
            "+faststart",
            str(out / "horizonte.mp4"),
        ]
    )
    with subprocess.Popen(cmd, stdin=subprocess.PIPE) as master:
        for n in range(seconds * fps):
            master.stdin.write(light(n / fps).tobytes())
        master.stdin.close()
        if master.wait():
            raise RuntimeError("Master encode failed")
    # Track the subject through each turn of the camera for the phone edit.
    centres = [
        (0, 0.66),
        (3, 0.72),
        (8, 0.62),
        (13, 0.52),
        (18, 0.69),
        (23, 0.51),
        (28, 0.62),
        (33, 0.60),
        (36, 0.60),
    ]
    expr = str(centres[-1][1])
    for (a, x), (b, y) in reversed(list(zip(centres, centres[1:]))):
        u = f"((t-{a})/{b-a})"
        expr = f"if(lt(t,{b}),{x}+({y}-{x})*{u}*{u}*(3-2*{u}),{expr})"
    ff(
        "-i",
        out / "horizonte.mp4",
        "-vf",
        f"crop=504:810:x='max(0,min(iw-ow,iw*({expr})-ow/2))':y=0,scale=640:1028",
        *encoder,
        "-crf",
        21,
        "-g",
        8,
        "-keyint_min",
        8,
        "-sc_threshold",
        0,
        "-bf",
        0,
        "-movflags",
        "+faststart",
        out / "vertical.mp4",
    )
