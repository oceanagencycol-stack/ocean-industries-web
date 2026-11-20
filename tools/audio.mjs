#!/usr/bin/env node
/**
 * Prepara el sonido de la v3 (docs/v3/SONIDO, src/v3/SONIDO.md) con ffmpeg. Entrada: media/v3/sonido/*.mp3 (tomas de
 * ElevenLabs, ya generadas: este script NO genera nada con IA ni gasta créditos). Salida: public/v3/audio/<pieza>.webm
 * (Opus) y <pieza>.m4a (AAC, respaldo de Safari).
 *
 * Por pieza:
 *   1. recorta el silencio del principio y del final (umbral −55 dB);
 *   2. lazos (ambientes): fundido cruzado de igual potencia del final sobre el principio DENTRO del archivo, de modo que
 *      el último cuadro empalma con el primero (la pieza dura 3 s menos; `loop = true` en el navegador no deja costura);
 *      el tema y los efectos llevan una entrada de 4 ms y una salida corta para que no haya clics;
 *   3. sonoridad EBU R128 en dos pasadas (loudnorm lineal): ambientes −23 LUFS, tema −18, efectos −20; pico real
 *      ≤ −1 dBTP, medido DESPUÉS de codificar (si el códec lo pasa, baja el objetivo y repite);
 *   4. exporta Opus/WebM y AAC/M4A y verifica presupuestos de peso.
 *
 * Uso: node tools/audio.mjs            (todo)      node tools/audio.mjs --only amb-oceano,sfx-logo
 *      node tools/audio.mjs --report   (solo mide los originales)
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, statSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'media/v3/sonido')
const OUT = join(ROOT, 'public/v3/audio')

const LOOP_XFADE = 3 // s
/** kind: amb (lazo, −23 LUFS) · theme (−18) · sfx (−20). kbps: Opus; el M4A usa lo mismo. */
const PIECES = [
  { name: 'tema', src: 'tema-a', kind: 'theme', kbps: 64, budgetKB: 300 },
  { name: 'amb-espacio', src: 'amb-espacio-b', kind: 'amb', kbps: 64, budgetKB: 400 },
  { name: 'amb-oceano', src: 'amb-oceano-b', kind: 'amb', kbps: 64, budgetKB: 400 },
  { name: 'amb-cumbre', src: 'amb-cumbre-a', kind: 'amb', kbps: 64, budgetKB: 400 },
  { name: 'sfx-estrella', src: 'sfx-estrella-a', kind: 'sfx', kbps: 56, budgetKB: 40 },
  { name: 'sfx-logo', src: 'sfx-logo-a', kind: 'sfx', kbps: 56, budgetKB: 40 },
  { name: 'sfx-atmosfera', src: 'sfx-atmosfera-a', kind: 'sfx', kbps: 56, budgetKB: 40 },
  { name: 'sfx-agua-entra', src: 'sfx-agua-entra-a', kind: 'sfx', kbps: 56, budgetKB: 40 },
  { name: 'sfx-sumergible', src: 'sfx-sumergible-a', kind: 'sfx', kbps: 56, budgetKB: 40 },
  { name: 'sfx-agua-sale', src: 'sfx-agua-sale-a', kind: 'sfx', kbps: 56, budgetKB: 40 },
  { name: 'sfx-rafaga', src: 'sfx-rafaga-a', kind: 'sfx', kbps: 48, budgetKB: 40 },
  { name: 'sfx-satelite', src: 'sfx-satelite-a', kind: 'sfx', kbps: 56, budgetKB: 40 },
]
const TARGET_LUFS = { amb: -23, theme: -18, sfx: -20 }

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null
const reportOnly = args.includes('--report')

function ff(argv, { capture = false } = {}) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...argv], { encoding: 'utf8', maxBuffer: 1 << 28 })
  if (r.status !== 0) throw new Error('ffmpeg falló: ' + argv.join(' ') + '\n' + r.stderr.slice(-1500))
  return capture ? r.stderr : ''
}
const dur = (f) => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout)

/** Mide sonoridad integrada, pico real y rango con loudnorm (solo mide). */
function measure(file, extra = '') {
  const err = ff(['-i', file, '-af', `loudnorm=I=-23:TP=-1.5:LRA=20:print_format=json${extra}`, '-f', 'null', '-'], { capture: true })
  const j = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1))
  return { i: Number(j.input_i), tp: Number(j.input_tp), lra: Number(j.input_lra), thr: Number(j.input_thresh), offset: Number(j.target_offset) }
}

const TRIM = 'silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.01,areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.01,areverse'

function prepare(p, tmp) {
  const src = join(SRC, p.src + '.mp3')
  const trimmed = join(tmp, p.name + '-trim.wav')
  ff(['-i', src, '-af', TRIM, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_f32le', trimmed])
  const d = dur(trimmed)
  let out = trimmed
  if (p.kind === 'amb') {
    const X = LOOP_XFADE
    out = join(tmp, p.name + '-loop.wav')
    // salida = (cola ⨯ cabeza) + medio; el final (src D−X) empalma con el principio (cola, src D−X)
    const fc =
      `[0:a]atrim=0:${X},asetpts=PTS-STARTPTS,afade=t=in:d=${X}:curve=qsin[h];` +
      `[0:a]atrim=${d - X}:${d},asetpts=PTS-STARTPTS,afade=t=out:d=${X}:curve=qsin[t];` +
      `[0:a]atrim=${X}:${d - X},asetpts=PTS-STARTPTS[m];` +
      `[t][h]amix=inputs=2:duration=longest:normalize=0[x];[x][m]concat=n=2:v=0:a=1[o]`
    ff(['-i', trimmed, '-filter_complex', fc, '-map', '[o]', '-c:a', 'pcm_f32le', out])
  } else {
    const d2 = dur(trimmed)
    const fout = p.kind === 'theme' ? 1.2 : Math.min(0.12, d2 / 4)
    const fin = p.kind === 'theme' ? 0.02 : 0.004
    out = join(tmp, p.name + '-fade.wav')
    ff(['-i', trimmed, '-af', `afade=t=in:d=${fin},afade=t=out:st=${Math.max(0, d2 - fout)}:d=${fout}`, '-c:a', 'pcm_f32le', out])
  }
  return out
}

function normalizeAndEncode(p, prepared, tmp) {
  const I = TARGET_LUFS[p.kind]
  let tp = -1.5
  for (let attempt = 0; attempt < 4; attempt++) {
    const m = measure(prepared)
    const norm = join(tmp, p.name + '-norm.wav')
    const af = `loudnorm=I=${I}:TP=${tp}:LRA=20:measured_I=${m.i}:measured_TP=${m.tp}:measured_LRA=${m.lra}:measured_thresh=${m.thr}:offset=${m.offset}:linear=true`
    ff(['-i', prepared, '-af', af, '-ar', '48000', '-c:a', 'pcm_f32le', norm])
    const webm = join(OUT, p.name + '.webm')
    const m4a = join(OUT, p.name + '.m4a')
    ff(['-i', norm, '-c:a', 'libopus', '-b:a', p.kbps + 'k', '-vbr', 'on', '-application', 'audio', '-f', 'webm', webm])
    ff(['-i', norm, '-c:a', 'aac', '-b:a', p.kbps + 'k', '-movflags', '+faststart', '-f', 'ipod', m4a])
    const mw = measure(webm)
    const ma = measure(m4a)
    const worst = Math.max(mw.tp, ma.tp)
    if (worst <= -1.0) return { webm, m4a, norm, mw, ma, tp }
    tp -= worst + 1.0 + 0.3 // el códec se pasó del techo: baja el objetivo y repite
  }
  throw new Error(p.name + ': no logré pico ≤ −1 dBTP')
}

/** El salto en la costura de un lazo frente a la mayor diferencia entre muestras vecinas del resto de la pieza. */
function seam(file) {
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], { maxBuffer: 1 << 29 }).stdout
  const f = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4))
  let maxD = 0
  let rms = 0
  for (let i = 1; i < f.length; i++) {
    const d = Math.abs(f[i] - f[i - 1])
    if (d > maxD) maxD = d
    rms += d * d
  }
  rms = Math.sqrt(rms / f.length)
  const jump = Math.abs(f[0] - f[f.length - 1])
  return { jump, maxD, rms, ratio: jump / (rms || 1e-9) }
}

mkdirSync(OUT, { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'ocean-audio-'))
const rows = []
try {
  for (const p of PIECES) {
    if (only && !only.includes(p.name)) continue
    const srcFile = join(SRC, p.src + '.mp3')
    const before = measure(srcFile)
    if (reportOnly) {
      console.log(`${p.name.padEnd(16)} orig ${dur(srcFile).toFixed(2)}s  ${before.i.toFixed(1)} LUFS  pico ${before.tp.toFixed(1)} dBTP`)
      continue
    }
    const prepared = prepare(p, tmp)
    const r = normalizeAndEncode(p, prepared, tmp)
    const kbW = statSync(r.webm).size / 1024
    const kbA = statSync(r.m4a).size / 1024
    const row = {
      name: p.name,
      dur: dur(r.webm),
      lufs: r.mw.i,
      tp: r.mw.tp,
      kbW,
      kbA,
      ok: kbW <= p.budgetKB,
      seam: p.kind === 'amb' ? seam(r.norm) : null,
    }
    rows.push(row)
    console.log(
      `${p.name.padEnd(16)} ${row.dur.toFixed(2).padStart(6)}s  ${row.lufs.toFixed(1).padStart(6)} LUFS  ${row.tp.toFixed(1).padStart(5)} dBTP  opus ${kbW.toFixed(0).padStart(4)} KB  aac ${kbA.toFixed(0).padStart(4)} KB  ${row.ok ? 'ok' : 'FUERA DE PRESUPUESTO (' + p.budgetKB + ' KB)'}` +
        (row.seam ? `  costura ${row.seam.ratio.toFixed(1)}× la diferencia típica` : ''),
    )
  }
  if (rows.some((r) => !r.ok)) process.exitCode = 1
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
