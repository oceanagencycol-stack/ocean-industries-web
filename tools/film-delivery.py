"""Encode the graded edit for playback, and all frames for reversible scrubbing.
Usage: python tools/film-delivery.py GRADED_MASTERS [DELIVERY_DIR]
Requires ffmpeg, OpenCV, scipy, numpy. Reads horizonte.mp4 and vertical.mp4.
"""

from pathlib import Path
import subprocess
import sys
import json

import cv2
import numpy as np
from scipy.interpolate import PchipInterpolator

cv2.setNumThreads(2)
root = Path(__file__).resolve().parents[1]
destination = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else root / "public/v3/film"
destination.mkdir(exist_ok=True, parents=True)
masters = Path(sys.argv[1]).resolve()
fps = 24
# Presentation time -> source time, with a longer arc as the lens passes the
# hull, crosses the upper ice shelf and clears the clouds. All joins stay put.
knots = np.array(
    [
        [0, 0],
        [13, 13],
        [13.85, 14.2],
        [14.75, 15.05],
        [15.65, 15.50],
        [16.30, 15.75],
        [16.9, 16.10],
        [17.65, 17.50],
        [18, 18],
        [23, 23],
        [24.35, 24.8],
        [25.25, 25.5],
        [26.60, 26.18],
        [27.25, 27.0],
        [28, 28],
        [29.0, 29.40],
        [29.7, 29.92],
        [30.6, 30.28],
        [31.25, 30.75],
        [32.2, 32.1],
        [33, 33],
        [36, 36],
    ]
)
warp = PchipInterpolator(knots[:, 0], knots[:, 1])
ff = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-filter_threads", "2"]

# Eight seconds per journey between plates. Dwell while the copy is readable;
# travel fastest when the camera owns the screen. Bake this in the footage so
# native playback presents a real frame every 1/24 s throughout the story.
turn = PchipInterpolator([0, 0.25, 0.5, 0.75, 1], [0, 0.16, 0.5, 0.84, 1])
duration = 55
anchors = [0, 11.5, 19.5, 27.5, 35.5, 43.5, 51.5]


def editorial_position(t):
    if t <= 3.5:
        return t * 3 / 3.5
    if t >= 51.5:
        return 33 + (t - 51.5) * 3 / 3.5
    phase = (t - 3.5) / 8
    chapter = int(phase)
    return 3 + 5 * (chapter + float(turn(phase - chapter)))


def encode(name, quality, rate, buf, cell):
    video = cv2.VideoCapture(str(masters / (name + ".mp4")))
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    assert count == fps * 36 and width > 0
    dest = destination / (name + ".mp4")
    command = ff + [
        "-f",
        "rawvideo",
        "-pix_fmt",
        "bgr24",
        "-s",
        f"{width}x{height}",
        "-r",
        str(fps),
        "-i",
        "pipe:0",
        "-an",
        "-c:v",
        "libx264",
        "-threads",
        "3",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "medium",
        "-crf",
        quality,
        "-maxrate",
        rate,
        "-bufsize",
        buf,
        "-g",
        "12",
        "-keyint_min",
        "12",
        "-sc_threshold",
        "0",
        "-bf",
        "0",
        "-movflags",
        "+faststart",
        str(dest),
    ]
    flow = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_FAST)
    gx, gy = np.meshgrid(np.arange(width, dtype="float32"), np.arange(height, dtype="float32"))
    index = -1
    _, following = video.read()
    with subprocess.Popen(command, stdin=subprocess.PIPE) as process:
        for output in range(duration * fps):
            t = editorial_position(output / fps)
            retimed = 13 < t < 18 or 23 < t < 33
            position = min(count - 1, max(0, float(warp(t)) * fps if retimed else t * fps))
            wanted = int(position)
            fraction = position - wanted
            while index < wanted:
                current = following
                ok, following = video.read()
                if not ok:
                    following = current
                index += 1
                fields = None
            image = current
            if fraction > 0.025:
                if fraction > 0.975:
                    image = following
                else:
                    if fields is None:
                        low = [
                            cv2.cvtColor(
                                cv2.resize(f, None, fx=0.35, fy=0.35, interpolation=cv2.INTER_AREA),
                                cv2.COLOR_BGR2GRAY,
                            )
                            for f in (current, following)
                        ]
                        fields = [
                            cv2.resize(flow.calc(a, b, None), (width, height)) / 0.35
                            for a, b in (low, low[::-1])
                        ]
                    a, b = fields
                    c = cv2.remap(
                        current,
                        gx - a[:, :, 0] * fraction,
                        gy - a[:, :, 1] * fraction,
                        cv2.INTER_LINEAR,
                        borderMode=cv2.BORDER_REPLICATE,
                    )
                    d = cv2.remap(
                        following,
                        gx - b[:, :, 0] * (1 - fraction),
                        gy - b[:, :, 1] * (1 - fraction),
                        cv2.INTER_LINEAR,
                        borderMode=cv2.BORDER_REPLICATE,
                    )
                    image = cv2.addWeighted(c, 1 - fraction, d, fraction, 0)
            process.stdin.write(image.tobytes())
        process.stdin.close()
        if process.wait():
            raise RuntimeError("H.264 encoding failed")
    video.release()
    folder = destination / name
    folder.mkdir(exist_ok=True)
    subprocess.run(
        ff
        + [
            "-i",
            str(dest),
            "-vf",
            f"scale={cell},tile=4x2",
            "-an",
            "-fps_mode",
            "passthrough",
            "-start_number",
            "0",
            "-c:v",
            "libwebp",
            "-quality",
            "63",
            "-compression_level",
            "3",
            "-threads",
            "3",
            str(folder / "%03d.webp"),
        ],
        check=True,
    )
    suffix = "" if name == "horizonte" else "-v"
    guide_size = "176:99" if name == "horizonte" else "108:172"
    subprocess.run(
        ff + [
            "-i", str(dest), "-vf",
            f"select='not(mod(n,3))',scale={guide_size},tile=16x28",
            "-frames:v", "1", "-c:v", "mjpeg", "-q:v", "5", "-threads", "2",
            str(folder / "guia.jpg"),
        ],
        check=True,
    )
    for i, t in enumerate(anchors):
        subprocess.run(
            ff
            + [
                "-ss",
                str(t),
                "-i",
                str(dest),
                "-frames:v",
                "1",
                "-c:v",
                "libwebp",
                "-quality",
                "84",
                str(destination / f"cuadro-{i}{suffix}.webp"),
            ],
            check=True,
        )


for settings in [
    ("horizonte", "23.5", "3300k", "4400k", "768:432"),
    ("vertical", "24.5", "1400k", "2000k", "400:642"),
]:
    encode(*settings)

locations = np.linspace(0, duration, duration * fps + 1)
positions = [editorial_position(t) for t in locations]
timing = {
    "anchors": anchors,
    "opening": 3.5,
    "duration": duration,
    "fps": fps,
    "sound": [
        round(float(np.interp(s, positions, locations)), 3)
        for s in (5.4, 10.2, 15.75, 20.7, 26.85, 31.5)
    ],
}
(root / "src/v3/film-timing.json").write_text(json.dumps(timing, indent=2) + "\n")
