// QA del mundo de la v3 (película de placas sobre la toma de scroll): dev-world.html.
//
//   node qa/maqueta.cjs [url-base] [--film] [--no-video] [--no-captures]
//
// Sin url-base arma el sitio (npm run build) y lo sirve con `vite preview` en el puerto 4187. Prueba:
//   1. capturas: 20 puntos de la toma (cada placa quieta y cada cruce a 30 % y 70 %) con ?qa=seek= en escritorio
//      (1440×900) y teléfono (390×844, DPR 3), dos corridas que deben dar capturas idénticas byte a byte;
//   2. ida y vuelta con la rueda (Lenis) y con el teclado (End, Home, PageDown) en escritorio, y con gesto táctil real
//      (CDP Input.dispatchTouchEvent, scroll nativo) en el teléfono: la toma avanza de forma monótona y sin saltos (el
//      paso de `s` por cuadro no pasa del tope del resorte);
//   3. reposo: sin scroll ni puntero baja a 30 fps y a los 4 s no pide cuadros (requestAnimationFrame contado);
//   3b. respaldos: con movimiento reducido, la versión quieta (html.world-still, sin lienzo, las placas en <picture>);
//      sin JavaScript, las placas en <picture>;
//   4. videos de la toma completa con recordVideo de Playwright (escritorio y teléfono) y, con --film, una película
//      cuadro a cuadro (seek + ffmpeg) que muestra la coreografía sin el atraso de SwiftShader.
// Todo queda en qa/out/maqueta/. Termina en «maqueta en verde» o lista los fallos.
const { chromium, devices } = require('playwright')
const sharp = require('sharp')
const { spawn, execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'qa/out/maqueta')
const args = process.argv.slice(2)
const FILM = args.includes('--film')
const VIDEO = !args.includes('--no-video')
const CAPTURES = !args.includes('--no-captures')
let BASE = args.find((a) => /^https?:/.test(a))
const LAUNCH = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] }
const DESK = { name: 'escritorio', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }
const PHONE = { name: 'telefono', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent }
// p = s · 6: cada placa quieta (p = 0…6), cada cruce a 30 % y 70 % (p = i + 0,42 e i + 0,58) y el movimiento de la
// primera (p = 0,2)
const POINTS = [...[0, 0.2, 1, 2, 3, 4, 5, 6], ...[0, 1, 2, 3, 4, 5].flatMap((i) => [i + 0.42, i + 0.58])]
  .sort((a, b) => a - b)
  .map((p) => +(p / 6).toFixed(5))
/** las capturas corren el mundo en SwiftShader: ?q= lo permite (sin él, WebGL por software va a la versión quieta) */
const Q = 'q=high'
/** el tope del resorte (camera.ts: vmax 0,4 tomas/s, dt ≤ 0,05 s por paso) */
const STEP_MAX = 0.4 * 0.05 + 1e-6

const fails = []
const fail = (m) => {
  fails.push(m)
  console.log('  ✗', m)
}
const ok = (m) => console.log('  ✓', m)
const ctxOpts = (dev, extra = {}) => {
  const { name, ...o } = dev
  return { ...o, ...extra }
}

/** cuenta cada requestAnimationFrame de la página (ninguna otra cosa en dev-world pide cuadros) */
const RAF_COUNTER = () => {
  window.__rafCalls = 0
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => {
    window.__rafCalls++
    return raf(cb)
  }
}

async function open(ctx, query, errors) {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`)
  })
  await page.goto(`${BASE}/dev-world?${Q}&${query}`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__world && (window.__world.ready || window.__world.error), null, { timeout: 300000 })
  await page.evaluate(() => document.fonts.ready)
  const err = await page.evaluate(() => window.__world.error || '')
  if (err) throw new Error(`el mundo no arrancó: ${err}`)
  return page
}

/* ---------------- 1 · capturas ---------------- */
async function captures(browser) {
  console.log('\n1 · capturas de 20 puntos (dos corridas)')
  const bench = {}
  for (const dev of [DESK, PHONE]) {
    const errors = []
    const dirs = [path.join(OUT, dev.name), path.join(OUT, 'corrida-2', dev.name)]
    dirs.forEach((d) => fs.mkdirSync(d, { recursive: true }))
    for (let run = 0; run < 2; run++) {
      const ctx = await browser.newContext(ctxOpts(dev))
      for (let i = 0; i < POINTS.length; i++) {
        const s = POINTS[i]
        const page = await open(ctx, `qa=seek=${s}`, errors)
        await page.screenshot({ path: path.join(dirs[run], `${String(i).padStart(2, '0')}-p${(s * 6).toFixed(2)}.png`), timeout: 120000 })
        if (run === 0 && (i === 0 || i % 3 === 2)) bench[`${dev.name} p=${(s * 6).toFixed(2)}`] = await page.evaluate(() => window.__world.world.bench(5))
        if (run === 0 && i === 0) bench[`${dev.name} dpr`] = await page.evaluate(() => window.__world.world.pixelRatio)
        await page.close()
      }
      await ctx.close()
    }
    // idéntica byte a byte; o, donde SwiftShader redondea distinto entre corridas (bordes, degradados), a lo sumo
    // 3/255 en a lo sumo el 0,05 % de los píxeles (se informa)
    let same = 0
    const near = []
    for (const f of fs.readdirSync(dirs[0])) {
      const a = fs.readFileSync(path.join(dirs[0], f))
      const b = fs.readFileSync(path.join(dirs[1], f))
      if (a.equals(b)) {
        same++
        continue
      }
      const [ra, rb] = await Promise.all([sharp(a).raw().toBuffer({ resolveWithObject: true }), sharp(b).raw().toBuffer({ resolveWithObject: true })])
      let n = 0
      let max = 0
      for (let j = 0; j < ra.data.length; j += ra.info.channels) {
        const d = Math.max(Math.abs(ra.data[j] - rb.data[j]), Math.abs(ra.data[j + 1] - rb.data[j + 1]), Math.abs(ra.data[j + 2] - rb.data[j + 2]))
        if (d) n++
        if (d > max) max = d
      }
      const share = n / (ra.info.width * ra.info.height)
      if (max <= 3 && share <= 0.0005) near.push(`${f} (${n} px, ≤ ${max}/255)`)
      else fail(`${dev.name}: ${f} cambia entre corridas (${n} px, hasta ${max}/255)`)
    }
    if (same + near.length === POINTS.length)
      ok(`${dev.name}: ${same}/${POINTS.length} capturas idénticas byte a byte${near.length ? `; ${near.length} con ruido de redondeo de SwiftShader: ${near.join(', ')}` : ''}`)
    if (errors.length) fail(`${dev.name}: errores en la consola: ${[...new Set(errors)].slice(0, 3).join(' | ')}`)
  }
  return bench
}

/* ---------------- 2 · ida y vuelta ---------------- */
/** espera a que el scroll se quede quieto (el teclado de Chrome y Lenis animan) y la toma llegue a su objetivo */
async function settle(page, timeout = 60000) {
  await page.waitForTimeout(150)
  const t0 = Date.now()
  let lastY = -1
  let still = 0
  while (Date.now() - t0 < timeout) {
    const r = await page.evaluate(() => {
      const w = window.__world.world
      return { y: scrollY, gap: Math.abs(w.shot - window.__world.track.shotAt(scrollY)) }
    })
    still = r.y === lastY ? still + 1 : 0
    lastY = r.y
    if (still >= 4 && r.gap < 1e-4) break
    await page.waitForTimeout(100)
  }
  await page.waitForTimeout(250)
}

/** cuánto de la toma vale 1 px de scroll (la pendiente mayor entre anclas): el navegador redondea el scroll */
const pxTolerance = (page) =>
  page.evaluate(() => {
    const A = window.__world.track.anchors()
    let m = 0
    for (let i = 1; i < A.length; i++) if (A[i].y > A[i - 1].y) m = Math.max(m, (A[i].s - A[i - 1].s) / (A[i].y - A[i - 1].y))
    return m
  })

const mark = (page) => page.evaluate(() => window.__world.world.samples.length)

/** revisa un tramo de cuadros: monótono en la dirección pedida y sin pasos de `s` mayores al tope del resorte */
function analyze(label, samples, dir, expectEnd, pxTol = 0) {
  let worstStep = 0
  let back = 0
  let worstBack = 0
  let tiny = 0
  let jumps = 0
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]
    const b = samples[i]
    const ds = b.s - a.s
    // tolerancia: lo que vale 1 px de scroll (el navegador redondea el scroll a píxeles de pantalla al empezar un
    // gesto y la toma lo sigue); nunca más que eso
    if (dir * ds < -Math.max(1e-6, pxTol)) {
      back++
      worstBack = Math.max(worstBack, -dir * ds)
    } else if (dir * ds < -1e-6) tiny++
    worstStep = Math.max(worstStep, Math.abs(ds))
    if (Math.abs(ds) > STEP_MAX) jumps++
  }
  const end = samples.length ? samples[samples.length - 1].s : NaN
  const detail = `${samples.length} cuadros, paso máx. de s ${worstStep.toFixed(4)} (tope ${STEP_MAX.toFixed(4)})${tiny ? `, ${tiny} retrocesos de menos de 1 px de scroll` : ''}`
  if (samples.length < 5) return fail(`${label}: casi no hubo cuadros (${samples.length})`)
  if (back) fail(`${label}: la toma retrocedió en ${back} cuadros (hasta ${worstBack.toExponential(2)} de s; ${detail})`)
  if (jumps) fail(`${label}: ${jumps} saltos (${detail})`)
  if (expectEnd !== undefined && Math.abs(end - expectEnd) > 1e-3) fail(`${label}: terminó en s = ${end.toFixed(4)}, no en ${expectEnd}`)
  if (!back && !jumps && (expectEnd === undefined || Math.abs(end - expectEnd) <= 1e-3)) ok(`${label}: monótona y sin saltos · ${detail}`)
}

async function wheelTrip(browser) {
  console.log('\n2a · escritorio: rueda (Lenis) y teclado, ida y vuelta')
  const errors = []
  const ctx = await browser.newContext(ctxOpts(DESK))
  await ctx.addInitScript(RAF_COUNTER)
  // la ida y vuelta mide la toma, no la imagen: un lienzo chico va más rápido en SwiftShader y no cambia s
  const page = await open(ctx, 'qa=trace&dpr=0.5', errors)
  const pxTol = await pxTolerance(page)
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  await page.mouse.move(720, 450)

  // ida: ráfagas rápidas y tramos lentos
  let m0 = await mark(page)
  for (let i = 0; i < 600 && (await page.evaluate(() => scrollY)) < maxScroll - 1; i++) {
    const fast = Math.floor(i / 12) % 2 === 0
    await page.mouse.wheel(0, fast ? 520 : 90)
    await page.waitForTimeout(fast ? 30 : 70)
  }
  await settle(page)
  let m1 = await mark(page)
  let S = await page.evaluate(([a, b]) => window.__world.world.samples.slice(a, b), [m0, m1])
  analyze('rueda, ida', S, +1, 1, pxTol)

  // vuelta
  m0 = m1
  for (let i = 0; i < 600 && (await page.evaluate(() => scrollY)) > 0; i++) {
    const fast = Math.floor(i / 10) % 2 === 1
    await page.mouse.wheel(0, fast ? -700 : -120)
    await page.waitForTimeout(fast ? 25 : 60)
  }
  await settle(page)
  m1 = await mark(page)
  S = await page.evaluate(([a, b]) => window.__world.world.samples.slice(a, b), [m0, m1])
  analyze('rueda, vuelta', S, -1, 0, pxTol)

  // el teclado necesita el foco en la página (la rueda no lo da): un clic en un lugar sin enlaces
  await page.mouse.click(1300, 120)
  await settle(page)
  // teclado: End (salto al final), Home (salto al principio), PageDown ×6
  for (const [key, dir, end, times] of [
    ['End', +1, 1, 1],
    ['Home', -1, 0, 1],
    ['PageDown', +1, undefined, 6],
  ]) {
    m0 = await mark(page)
    for (let k = 0; k < times; k++) {
      await page.keyboard.press(key)
      await page.waitForTimeout(120)
    }
    await settle(page)
    m1 = await mark(page)
    S = await page.evaluate(([a, b]) => window.__world.world.samples.slice(a, b), [m0, m1])
    analyze(`teclado ${key}${times > 1 ? ` ×${times}` : ''}`, S, dir, end, pxTol)
  }

  await rest(page, 'escritorio')
  if (errors.length) fail(`escritorio: errores en la consola: ${[...new Set(errors)].slice(0, 3).join(' | ')}`)
  await ctx.close()
}

async function swipe(cdp, page, fromY, toY, ms) {
  const steps = Math.max(4, Math.round(ms / 16))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: fromY }] })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: fromY + ((toY - fromY) * i) / steps }] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function touchTrip(browser) {
  console.log('\n2b · teléfono: gesto táctil real (CDP), ida y vuelta')
  const errors = []
  const ctx = await browser.newContext(ctxOpts(PHONE))
  await ctx.addInitScript(RAF_COUNTER)
  const page = await open(ctx, 'qa=trace&dpr=0.5', errors)
  const cdp = await ctx.newCDPSession(page)
  const pxTol = await pxTolerance(page)
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)

  let m0 = await mark(page)
  for (let i = 0; i < 120 && (await page.evaluate(() => scrollY)) < maxScroll - 1; i++) {
    // gestos lentos y lanzados (con inercia)
    if (i % 3 === 2) await swipe(cdp, page, 760, 160, 110)
    else await swipe(cdp, page, 700, 300, 380)
    await page.waitForTimeout(120)
  }
  await settle(page)
  let m1 = await mark(page)
  let S = await page.evaluate(([a, b]) => window.__world.world.samples.slice(a, b), [m0, m1])
  analyze('táctil, ida', S, +1, 1, pxTol)

  m0 = m1
  for (let i = 0; i < 120 && (await page.evaluate(() => scrollY)) > 0; i++) {
    if (i % 2 === 0) await swipe(cdp, page, 160, 780, 100)
    else await swipe(cdp, page, 300, 700, 300)
    await page.waitForTimeout(120)
  }
  await settle(page)
  m1 = await mark(page)
  S = await page.evaluate(([a, b]) => window.__world.world.samples.slice(a, b), [m0, m1])
  analyze('táctil, vuelta', S, -1, 0, pxTol)

  await rest(page, 'teléfono')
  if (errors.length) fail(`teléfono: errores en la consola: ${[...new Set(errors)].slice(0, 3).join(' | ')}`)
  await ctx.close()
}

/* ---------------- 3 · reposo ---------------- */
async function rest(page, label) {
  // una última actividad, y luego nada
  await page.evaluate(() => window.__world.world.wake())
  const t0 = Date.now()
  const r0 = await page.evaluate(() => ({ raf: window.__rafCalls, renders: window.__world.world.renders }))
  await page.waitForTimeout(600)
  const r1 = await page.evaluate(() => ({ raf: window.__rafCalls, renders: window.__world.world.renders }))
  await page.waitForTimeout(2800)
  const r2 = await page.evaluate(() => ({ raf: window.__rafCalls, renders: window.__world.world.renders }))
  await page.waitForFunction(() => window.__world.world.isSleeping, null, { timeout: 15000 }).catch(() => {})
  const slept = Date.now() - t0
  const a = await page.evaluate(() => ({ raf: window.__rafCalls, renders: window.__world.world.renders, sleeping: window.__world.world.isSleeping }))
  await page.waitForTimeout(3000)
  const b = await page.evaluate(() => ({ raf: window.__rafCalls, renders: window.__world.world.renders }))
  const idleRaf = r2.raf - r1.raf
  const idleRenders = r2.renders - r1.renders
  const half = idleRaf > 0 ? idleRenders / idleRaf : 0
  if (!a.sleeping) fail(`${label}: el bucle no se durmió`)
  else if (b.raf !== a.raf || b.renders !== a.renders) fail(`${label}: en reposo siguió pidiendo cuadros (${b.raf - a.raf} rAF en 3 s)`)
  else ok(`${label}: se durmió a los ${(slept / 1000).toFixed(1)} s; en 3 s de reposo, 0 cuadros pedidos`)
  if (idleRaf > 2 && half > 0.65) fail(`${label}: quieto no bajó a 30 fps (${idleRenders} cuadros de ${idleRaf} rAF)`)
  else if (idleRaf > 2) ok(`${label}: quieto pinta ${idleRenders} de ${idleRaf} rAF (~${Math.round(half * 100)} %: un cuadro de cada dos)`)
  void r0
}

/* ---------------- 3b · respaldos ---------------- */
async function fallbacks(browser) {
  console.log('\n3b · respaldos: versión quieta y sin JavaScript')
  for (const [label, extra] of [
    ['movimiento reducido', { reducedMotion: 'reduce' }],
    ['sin JavaScript', { javaScriptEnabled: false }],
  ]) {
    for (const dev of [DESK, PHONE]) {
      const ctx = await browser.newContext(ctxOpts(dev, extra))
      const page = await ctx.newPage()
      // sin ?q=: en SwiftShader también iría a la versión quieta; aquí lo que se prueba es la razón pedida
      await page.goto(`${BASE}/dev-world`, { waitUntil: 'load' })
      if (extra.javaScriptEnabled !== false) await page.waitForFunction(() => window.__world && window.__world.ready, null, { timeout: 60000 })
      await page.evaluate(() => document.fonts.ready)
      const r = await page.evaluate(async () => {
        const img = document.querySelector('[data-tramo] .still img')
        if (img && !img.complete) await new Promise((res) => img.addEventListener('load', res, { once: true }))
        const cv = getComputedStyle(document.getElementById('world'))
        const shown = [...document.querySelectorAll('.still')].filter((p) => getComputedStyle(p).display !== 'none').length
        return { still: document.documentElement.classList.contains('world-still'), on: document.documentElement.classList.contains('world-on'), canvas: cv.display !== 'none' && cv.opacity !== '0', shown, src: img && img.currentSrc.split('/').pop(), w: img && img.naturalWidth }
      })
      const okJs = extra.javaScriptEnabled === false ? !r.on : r.still && !r.canvas
      if (okJs && r.shown === 7 && r.w > 0) ok(`${label}, ${dev.name}: las 7 placas en <picture> (la primera: ${r.src}, ${r.w} px)`)
      else fail(`${label}, ${dev.name}: ${JSON.stringify(r)}`)
      await page.screenshot({ path: path.join(OUT, `quieta-${label.split(' ')[0]}-${dev.name}.png`) })
      await ctx.close()
    }
  }
}

/* ---------------- 4 · videos ---------------- */
async function videos(browser) {
  console.log('\n4 · videos de la toma completa (recordVideo)')
  const tmp = path.join(OUT, 'video-tmp')
  fs.mkdirSync(tmp, { recursive: true })
  for (const dev of [DESK, PHONE]) {
    const errors = []
    const ctx = await browser.newContext(ctxOpts(dev, { recordVideo: { dir: tmp, size: dev.viewport } }))
    // el video mide lo que el sandbox alcanza a pintar (SwiftShader, sin GPU): la fluidez real se mide en un teléfono
    const page = await open(ctx, 'qa=video', errors)
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    await page.waitForTimeout(1200)
    if (dev === DESK) {
      await page.mouse.move(720, 450)
      for (let i = 0; i < 1500 && (await page.evaluate(() => scrollY)) < maxScroll - 1; i++) {
        await page.mouse.wheel(0, 36)
        await page.waitForTimeout(30)
      }
    } else {
      const cdp = await ctx.newCDPSession(page)
      for (let i = 0; i < 200 && (await page.evaluate(() => scrollY)) < maxScroll - 1; i++) {
        await swipe(cdp, page, 640, 420, 420)
        await page.waitForTimeout(80)
      }
    }
    await page.waitForTimeout(3500)
    const v = page.video()
    await ctx.close()
    const dst = path.join(OUT, `toma-${dev.name}.webm`)
    fs.renameSync(await v.path(), dst)
    ok(`${dev.name}: ${path.relative(ROOT, dst)} (${(fs.statSync(dst).size / 1e6).toFixed(1)} MB)`)
    if (errors.length) fail(`video ${dev.name}: errores en la consola: ${[...new Set(errors)].slice(0, 3).join(' | ')}`)
  }
  fs.rmSync(tmp, { recursive: true, force: true })
}

/** --film: la toma cuadro a cuadro (seek con su reloj) a 25 fps, con el scroll a velocidad constante, en H.264. */
async function film(browser) {
  console.log('\n4b · película cuadro a cuadro (--film)')
  const FPS = 25
  const SECONDS = 22
  for (const dev of [DESK, PHONE]) {
    const errors = []
    const ctx = await browser.newContext(ctxOpts(dev))
    const page = await open(ctx, 'qa=seek=0', errors)
    const dst = path.join(OUT, `pelicula-${dev.name}.mp4`)
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', dst], { stdio: ['pipe', 'inherit', 'inherit'] })
    const N = FPS * SECONDS
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    for (let i = 0; i < N; i++) {
      // un segundo quieto al principio y otro al final; en medio, scroll a velocidad constante
      const u = Math.min(1, Math.max(0, (i / FPS - 1) / (SECONDS - 2)))
      const e = u * u * (3 - 2 * u) * 0.12 + u * 0.88
      const s = await page.evaluate((y) => window.__world.track.shotAt(y), e * maxScroll)
      await page.evaluate(([s, t]) => window.__world.world.seek(s, t), [s, 12 + i / FPS])
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 })
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
      if (i % 100 === 0) process.stdout.write(`  ${dev.name} ${i}/${N}\n`)
    }
    ff.stdin.end()
    await new Promise((r) => ff.on('close', r))
    await ctx.close()
    ok(`${dev.name}: ${path.relative(ROOT, dst)} (${(fs.statSync(dst).size / 1e6).toFixed(1)} MB, ${SECONDS} s a ${FPS} fps)`)
    if (errors.length) fail(`película ${dev.name}: errores en la consola: ${[...new Set(errors)].slice(0, 3).join(' | ')}`)
  }
}

/* ---------------- servidor ---------------- */
async function serve() {
  if (BASE) return null
  console.log('arma el sitio y lo sirve en :4187')
  execSync('npm run build', { cwd: ROOT, stdio: 'ignore' })
  const srv = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4187', '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
  BASE = 'http://localhost:4187'
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${BASE}/dev-world`)
      if (r.ok) return srv
    } catch {
      /* todavía no */
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('vite preview no respondió')
}

;(async () => {
  const srv = await serve()
  BASE = BASE.replace(/\/$/, '')
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch(LAUNCH)
  const t0 = Date.now()
  try {
    const bench = CAPTURES ? await captures(browser) : {}
    await wheelTrip(browser)
    await touchTrip(browser)
    await fallbacks(browser)
    if (VIDEO) await videos(browser)
    if (FILM) await film(browser)
    console.log('\nms por cuadro en este equipo (SwiftShader, placa o cruce + partículas, mediana de 5):')
    for (const [k, v] of Object.entries(bench)) console.log(`  ${k}: ${typeof v === 'number' ? v.toFixed(1) : v}`)
    fs.writeFileSync(path.join(OUT, 'bench.json'), JSON.stringify(bench, null, 2))
  } catch (e) {
    fail(`error: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e}`)
  } finally {
    await browser.close()
    if (srv) srv.kill()
  }
  console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`)
  if (fails.length) {
    console.log(`\n${fails.length} fallo(s):`)
    fails.forEach((f) => console.log(' -', f))
    process.exit(1)
  }
  console.log('\nmaqueta en verde')
})()
