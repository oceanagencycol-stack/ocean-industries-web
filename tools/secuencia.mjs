import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const media = fileURLToPath(new URL('../public/v3/', import.meta.url))
const output = resolve(media, 'secuencia')
const shots = ['espacio', 'satelite', 'mar', 'agua', 'maquina', 'emerge', 'cumbre']
const times = [0, 0.57, 1.14, 1.71, 2.29, 2.86, 3.43, 4]
const formats = [
  { suffix: '', width: 944, height: 531 },
  { suffix: '-v', width: 432, height: 648 },
]

await mkdir(output, { recursive: true })
for (const shot of shots) {
  for (const { suffix, width, height } of formats) {
    const source = resolve(media, 'cine', `${shot}${suffix}.mp4`)
    const frames = times.map((time, index) => ({
      input: execFileSync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-ss', String(time), '-threads', '1', '-i', source,
        '-filter_threads', '1', '-vf', `scale=${width}:${height}:flags=lanczos`, '-frames:v', '1',
        '-threads', '1', '-c:v', 'png', '-f', 'image2pipe', 'pipe:1',
      ], { maxBuffer: 5 * 1024 * 1024 }),
      left: (index % 4) * width,
      top: Math.floor(index / 4) * height,
    }))
    await sharp({ create: { width: width * 4, height: height * 2, channels: 3, background: '#060b14' } })
      .composite(frames)
      .webp({ quality: 77, effort: 5 })
      .toFile(resolve(output, `${shot}${suffix}.webp`))
  }
}
