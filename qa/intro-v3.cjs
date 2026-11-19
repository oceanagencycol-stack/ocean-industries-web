// QA de la intro v3 (src/intro-v3/, dev-intro.html). Sirve dist/ con las cabeceras de vercel.json (CSP incluida) o
// prueba una URL dada. Requiere `npm run build` antes.
//   node qa/intro-v3.cjs [url-base]          → termina en «intro en verde» o lista los fallos
// Hace: 16 instantes posados con ?qa=intro=<p> en escritorio (1440×900) y teléfono (390×844), dos corridas idénticas;
// las tareas largas (> 50 ms) durante la intro real; «Saltar»; el aterrizaje exacto en la barra; movimiento reducido;
// una vez cada 7 días; el texto de «Saltar» en ES/EN/PT; errores de consola y violaciones de CSP; un video por tamaño.
// Salida en qa/out/intro-v3/.
const { chromium } = require('playwright')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const OUT = path.join(ROOT, 'qa/out/intro-v3')
const TOTAL = 4500
const SIZES = {
  escritorio: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  telefono: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}
// los instantes clave, con nombre (ms)
const KEY = { estrella: 700, 'simbolo-trazado': 1250, 'e-entrando': 2250, 'palabra-barrido': 3300, vuelo: 4000, 'logo-en-la-barra': 4500 }

// ---------- servidor estático con las cabeceras de vercel.json ----------
function serve() {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
  const rules = vercel.headers.map((h) => ({
    re: new RegExp('^' + h.source.replace(/:(\w+)/g, '[^/]+') + '$'),
    headers: h.headers,
  }))
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.avif': 'image/avif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml', '.jpg': 'image/jpeg' }
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    let p = decodeURIComponent(url.pathname)
    let file = path.join(DIST, p)
    if (p === '/') file = path.join(DIST, 'index.html')
    else if (!path.extname(p)) file = path.join(DIST, p + '.html') // cleanUrls
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(fs.readFileSync(path.join(DIST, '404.html')))
    }
    for (const r of rules) if (r.re.test(p)) for (const h of r.headers) res.setHeader(h.key, h.value)
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
    res.end(fs.readFileSync(file))
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)))
}

;(async () => {
  let server = null
  let base = process.argv[2]
  if (!base) {
    if (!fs.existsSync(path.join(DIST, 'dev-intro.html'))) throw new Error('falta dist/dev-intro.html: corre npm run build')
    server = await serve()
    base = `http://127.0.0.1:${server.address().port}`
  }
  base = base.replace(/\/$/, '')
  fs.mkdirSync(OUT, { recursive: true })
  const fails = []
  const notes = []
  const b = await chromium.launch()

  /** Contexto nuevo con escucha de consola, errores y CSP. */
  async function open(size, extra = {}) {
    const ctx = await b.newContext({ ...SIZES[size], ...extra })
    await ctx.addInitScript(() => {
      window.__csp = []
      window.__lt = []
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`))
      try {
        new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push({ start: e.startTime, dur: e.duration }))).observe({ type: 'longtask', buffered: true })
      } catch (e) {}
      window.__done = null
      // intervalos entre cuadros mientras la intro está en pantalla (informativo: headless y grabando video)
      window.__frames = []
      let last = 0
      const tick = (t) => {
        if (document.querySelector('[data-intro]')) {
          if (last) window.__frames.push(t - last)
          last = t
        } else last = 0
        if (!window.__done) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      addEventListener('ocean:intro-done', (e) => (window.__done = { at: performance.now(), ...e.detail }))
    })
    const p = await ctx.newPage()
    p.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') fails.push(`[${size}] consola ${m.type()}: ${m.text().slice(0, 200)}`)
    })
    p.on('pageerror', (e) => fails.push(`[${size}] pageerror: ${e.message}`))
    p.on('requestfailed', (r) => fails.push(`[${size}] requestfailed: ${r.url()} ${r.failure()?.errorText}`))
    return { ctx, p }
  }
  const csp = async (p, size) => {
    const v = await p.evaluate(() => window.__csp)
    if (v.length) fails.push(`[${size}] CSP: ${v.join(' | ')}`)
  }

  for (const size of Object.keys(SIZES)) {
    // ---- 1 · 16 instantes posados, dos corridas idénticas ----
    const runs = []
    for (let run = 0; run < 2; run++) {
      const { ctx, p } = await open(size)
      const shots = []
      for (let i = 0; i < 16; i++) {
        const pr = i / 15
        await p.goto(`${base}/dev-intro?qa=intro=${pr.toFixed(4)}`, { waitUntil: 'load' })
        await p.waitForFunction(() => !!window.__oceanIntro)
        await p.evaluate(() => document.fonts.ready)
        await p.waitForTimeout(150)
        const buf = await p.screenshot()
        shots.push(buf)
        if (run === 0) fs.writeFileSync(path.join(OUT, `${size}-${String(i).padStart(2, '0')}-${Math.round(pr * TOTAL)}ms.png`), buf)
      }
      await csp(p, size)
      runs.push(shots)
      await ctx.close()
    }
    const diff = runs[0].map((s, i) => (s.equals(runs[1][i]) ? null : i)).filter((i) => i !== null)
    if (diff.length) fails.push(`[${size}] las dos corridas no son idénticas en los instantes ${diff.join(', ')}`)
    else notes.push(`[${size}] 16 instantes × 2 corridas: idénticos`)

    // ---- 2 · instantes clave y aterrizaje exacto en la barra ----
    {
      const { ctx, p } = await open(size)
      await p.goto(`${base}/dev-intro?qa=intro=0`, { waitUntil: 'load' })
      await p.waitForFunction(() => !!window.__oceanIntro)
      for (const [name, ms] of Object.entries(KEY)) {
        await p.evaluate((x) => window.__oceanIntro.seek(x), ms / TOTAL)
        await p.waitForTimeout(150)
        await p.screenshot({ path: path.join(OUT, `clave-${size}-${name}.png`) })
      }
      // al final de la línea de tiempo, las letras de la intro caen sobre las del ancla (sin la ®)
      const m = await p.evaluate(() => {
        const u = (els) => els.map((e) => e.getBoundingClientRect()).reduce((a, r) => ({ l: Math.min(a.l, r.left), t: Math.min(a.t, r.top), r: Math.max(a.r, r.right), b: Math.max(a.b, r.bottom) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 })
        const intro = u([...document.querySelectorAll('.oi-word svg > g[fill] > g path, .oi-word .oi-e')])
        const dock = u([...document.querySelectorAll('[data-intro-dock] svg path')])
        return { intro, dock }
      })
      const err = Math.max(...['l', 't', 'r', 'b'].map((k) => Math.abs(m.intro[k] - m.dock[k])))
      if (err > 0.75) fails.push(`[${size}] el logotipo no aterriza sobre la barra: desvío ${err.toFixed(2)} px (${JSON.stringify(m)})`)
      else notes.push(`[${size}] aterrizaje en la barra: desvío ${err.toFixed(2)} px`)
      await csp(p, size)
      await ctx.close()
    }

    // ---- 3 · la intro de verdad: tareas largas, ganchos, final, video, y una vez cada 7 días ----
    {
      const dir = path.join(OUT, `video-${size}`)
      const { ctx, p } = await open(size, { recordVideo: { dir, size: SIZES[size].viewport } })
      await p.goto(`${base}/dev-intro`, { waitUntil: 'load' })
      const started = await p.waitForFunction(() => !!document.querySelector('[data-intro]') || window.__done).then(() => p.evaluate(() => !!document.querySelector('[data-intro]')))
      if (!started) fails.push(`[${size}] la primera visita no mostró la intro`)
      await p.waitForFunction(() => window.__done, null, { timeout: 15000 })
      await p.waitForTimeout(600)
      const r = await p.evaluate(() => {
        const t0 = performance.getEntriesByType('navigation')[0]
        const done = window.__done
        const start = done.at - 4500 - 200
        const dock = document.querySelector('[data-intro-dock]')
        return {
          done,
          long: window.__lt.filter((e) => e.start >= start && e.start <= done.at),
          gone: !document.querySelector('[data-intro]'),
          dockVisible: getComputedStyle(dock).visibility === 'visible' && !document.documentElement.classList.contains('oi-running'),
          inert: [...document.querySelectorAll('[data-intro-inert]')].some((e) => e.inert),
          seen: !!localStorage.getItem('ocean-v3-intro-at'),
          nav: t0 ? Math.round(t0.duration) : null,
          frames: window.__frames.slice().sort((a, b) => a - b),
        }
      })
      if (!r.done.played || r.done.skipped) fails.push(`[${size}] ocean:intro-done sin la intro completa: ${JSON.stringify(r.done)}`)
      if (r.long.length) fails.push(`[${size}] ${r.long.length} tareas largas durante la intro: ${r.long.map((e) => Math.round(e.dur) + ' ms').join(', ')}`)
      else notes.push(`[${size}] 0 tareas largas > 50 ms durante la intro`)
      if (r.frames.length) {
        const q = (x) => r.frames[Math.min(r.frames.length - 1, Math.floor(r.frames.length * x))].toFixed(1)
        notes.push(`[${size}] cuadros durante la intro: ${r.frames.length}, mediana ${q(0.5)} ms, p95 ${q(0.95)} ms, máx ${q(1)} ms (headless, grabando)`)
      }
      if (!r.gone || !r.dockVisible || r.inert) fails.push(`[${size}] al terminar: intro retirada ${r.gone}, logotipo de la barra visible ${r.dockVisible}, inert ${r.inert}`)
      if (!r.seen) fails.push(`[${size}] no guardó la fecha de la intro`)
      await csp(p, size)
      // segunda visita: no hay intro
      await p.reload({ waitUntil: 'load' })
      await p.waitForFunction(() => window.__done)
      const again = await p.evaluate(() => ({ intro: !!document.querySelector('[data-intro]'), veil: !!document.querySelector('[data-intro-veil]'), done: window.__done }))
      if (again.intro || again.veil || again.done.played) fails.push(`[${size}] la intro volvió a salir dentro de los 7 días: ${JSON.stringify(again)}`)
      const video = p.video()
      await ctx.close()
      const dest = path.join(OUT, `intro-${size}.webm`)
      await video.saveAs(dest)
      fs.rmSync(dir, { recursive: true, force: true })
      notes.push(`[${size}] video: ${path.relative(ROOT, dest)}`)
    }

    // ---- 4 · «Saltar» en el primer segundo ----
    for (const [lang, label] of [['es', 'Saltar intro'], ['en', 'Skip intro'], ['pt', 'Pular intro']]) {
      const { ctx, p } = await open(size)
      await p.goto(`${base}/dev-intro?lang=${lang}`, { waitUntil: 'load' })
      const btn = p.getByRole('button', { name: label })
      try {
        await btn.waitFor({ state: 'visible', timeout: 3000 })
      } catch {
        fails.push(`[${size}] no aparece el botón «${label}»`)
        await ctx.close()
        continue
      }
      if (lang === 'es') {
        await p.waitForTimeout(950) // desde el primer segundo
        const op = await btn.evaluate((e) => Number(getComputedStyle(e).opacity))
        if (op < 0.95) fails.push(`[${size}] «Saltar» no está visible al primer segundo (opacidad ${op.toFixed(2)})`)
        await btn.click()
        await p.waitForFunction(() => window.__done, null, { timeout: 3000 })
        await p.waitForTimeout(700)
        const r = await p.evaluate(() => {
          const dock = document.querySelector('[data-intro-dock]')
          const rc = dock.getBoundingClientRect()
          return { done: window.__done, gone: !document.querySelector('[data-intro]'), vis: getComputedStyle(dock).visibility, op: getComputedStyle(dock).opacity, inBar: rc.top < 80 && rc.left < 80, at: Math.round(performance.now()) }
        })
        if (!r.done.skipped || !r.gone || r.vis !== 'visible' || Number(r.op) < 0.99 || !r.inBar) fails.push(`[${size}] «Saltar» no deja el logotipo en la barra: ${JSON.stringify(r)}`)
        else notes.push(`[${size}] «Saltar» al primer segundo: logotipo en la barra`)
        await p.screenshot({ path: path.join(OUT, `saltar-${size}.png`) })
        // la tecla Escape también salta
      }
      await csp(p, size)
      await ctx.close()
    }
    {
      const { ctx, p } = await open(size)
      await p.goto(`${base}/dev-intro`, { waitUntil: 'load' })
      await p.waitForSelector('[data-intro]')
      await p.waitForTimeout(500)
      await p.keyboard.press('Escape')
      await p.waitForFunction(() => window.__done, null, { timeout: 3000 }).catch(() => fails.push(`[${size}] Escape no salta la intro`))
      await ctx.close()
    }

    // ---- 5 · movimiento reducido: sin intro, el logotipo quieto en su lugar desde el primer cuadro ----
    {
      const { ctx, p } = await open(size, { reducedMotion: 'reduce' })
      await p.goto(`${base}/dev-intro`, { waitUntil: 'commit' })
      await p.waitForSelector('[data-intro-dock] svg', { state: 'attached' })
      const first = await p.evaluate(() => {
        const v = document.querySelector('[data-intro-veil]')
        return { veil: v ? getComputedStyle(v).display : 'retirado', dock: getComputedStyle(document.querySelector('[data-intro-dock]')).visibility }
      })
      await p.waitForLoadState('load')
      await p.waitForTimeout(800)
      const r = await p.evaluate(() => ({ intro: !!document.querySelector('[data-intro]'), anims: document.getAnimations().length, done: window.__done }))
      if (first.veil !== 'none' && first.veil !== 'retirado') fails.push(`[${size}] movimiento reducido: el velo se pinta (${first.veil})`)
      if (first.dock !== 'visible') fails.push(`[${size}] movimiento reducido: el logotipo no está en la barra desde el principio`)
      if (r.intro || r.anims || !r.done || r.done.played) fails.push(`[${size}] movimiento reducido: hubo intro ${JSON.stringify(r)}`)
      else notes.push(`[${size}] movimiento reducido: sin intro, logotipo quieto en la barra`)
      await p.screenshot({ path: path.join(OUT, `reducido-${size}.png`) })
      await csp(p, size)
      await ctx.close()
    }
  }
  await b.close()
  if (server) server.close()
  console.log(notes.join('\n'))
  console.log(fails.length ? `\nFALLOS (${fails.length}):\n` + [...new Set(fails)].join('\n') : '\nintro en verde')
  process.exit(fails.length ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
