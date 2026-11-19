// QA del sonido de la v3. node qa/sonido.cjs <url>   (npm run build && npx vite preview --port 4181)
// Chromium de Playwright (sin --autoplay-policy: el sonido arranca con un clic de verdad, como en un teléfono).
// Lee el estado por window.__oceanSound (solo con ?qa). La CSP de vercel.json se aplica a la página (sin
// upgrade-insecure-requests, que en http://localhost rompería las pruebas). Termina en «sonido en verde».
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const TRAMOS = ['espacio', 'satelite', 'mar', 'agua', 'maquina', 'emerge', 'cumbre']

;(async () => {
  const url = (process.argv[2] || 'http://localhost:4181/').replace(/\/?$/, '/')
  const vercel = fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8')
  const csp = vercel.match(/"Content-Security-Policy",\s*"value":\s*"([^"]+)"/)[1].replace(/;?\s*upgrade-insecure-requests/, '')
  const b = await chromium.launch({ args: ['--mute-audio'] })
  const fails = []
  const ok = (c, m) => {
    if (!c) fails.push(m)
    console.log(`${c ? '✓' : '✗'} ${m}`)
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  async function open({ viewport = { width: 1440, height: 900 }, touch = false, pref, saveData = false, query = '?qa=1&noworld' } = {}) {
    const ctx = await b.newContext({ viewport, hasTouch: touch, isMobile: touch })
    await ctx.addInitScript(
      ([pref, saveData]) => {
        try {
          localStorage.setItem('ocean-v3-intro-at', String(Date.now()))
          if (pref !== undefined && pref !== null) localStorage.setItem('ocean-v3-sound', pref)
        } catch (e) {}
        if (saveData) Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' } })
      },
      [pref, saveData],
    )
    const p = await ctx.newPage()
    const rec = { errors: [], audio: [] }
    p.on('pageerror', (e) => rec.errors.push(e.message))
    p.on('console', (m) => {
      if (m.type() === 'error' && !/Permissions-Policy|sentry|cal\.com|ERR_|Failed to load resource/i.test(m.text())) rec.errors.push(m.text().slice(0, 200))
      if (/Content Security Policy|Refused to/i.test(m.text())) rec.errors.push('CSP: ' + m.text().slice(0, 200))
    })
    p.on('request', (r) => /\/v3\/audio\//.test(r.url()) && rec.audio.push(r.url().split('/v3/audio/')[1]))
    await p.route(url + '**', async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue()
      const resp = await route.fetch()
      await route.fulfill({ response: resp, headers: { ...resp.headers(), 'content-security-policy': csp } })
    })
    await p.goto(url + query, { waitUntil: 'load' })
    await p.waitForTimeout(1200)
    return { ctx, p, rec }
  }
  const st = (p) => p.evaluate(() => window.__oceanSound.state)
  const to = (p, tramo) =>
    p.evaluate((t) => {
      const el = document.querySelector(`[data-tramo="${t}"]`)
      window.__ocean.to(el.getBoundingClientRect().top + window.scrollY)
    }, tramo)
  const waitFor = async (p, fn, ms = 5000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) {
      if (fn(await st(p))) return true
      await sleep(150)
    }
    return false
  }

  // ================= escritorio =================
  {
    const { ctx, p, rec } = await open()
    ok(rec.audio.length === 0, 'en la carga no se descarga ni un byte de audio')
    ok((await st(p)).started === false, 'el motor no está cargado antes del primer gesto')
    ok((await p.$$eval('script[src], link[rel="modulepreload"]', (a) => a.map((x) => x.src || x.href))).every((u) => !/sound-/.test(u)), 'el motor (sound-*.js) no se precarga')
    ok((await p.getAttribute('[data-sound-toggle]', 'aria-pressed')) === 'false', 'el botón de sonido está en la barra y apagado')

    // teclas: no encienden
    await p.keyboard.press('Space')
    await p.keyboard.press('Enter')
    await p.keyboard.press('ArrowDown')
    await p.keyboard.press('Tab')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(500)
    ok((await st(p)).started === false && rec.audio.length === 0, 'una tecla (Espacio, Enter, flecha, Tab+Enter) no enciende el sonido')
    // idioma (ratón y teclado): no enciende
    await p.click('.nav [data-lang="en"]')
    await p.focus('.nav [data-lang="es"]')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(400)
    ok((await st(p)).started === false && rec.audio.length === 0, 'tocar el idioma no enciende el sonido')

    // el botón de sonido en los tres idiomas
    for (const [l, word] of [['es', 'Sonido'], ['en', 'Sound'], ['pt', 'Som']]) {
      await p.click(`.nav [data-lang="${l}"]`)
      await p.waitForTimeout(150)
      const name = await p.$eval('[data-sound-toggle] .vh', (e) => e.textContent.trim())
      ok(name === word, `el botón de sonido dice «${word}» en ${l.toUpperCase()}`)
    }
    await p.click('.nav [data-lang="es"]')

    // las teclas de antes (Espacio, flechas) pueden haber bajado la página: se vuelve a la portada antes del clic
    await p.evaluate(() => { window.__ocean?.to ? window.__ocean.to(0) : window.scrollTo(0, 0) })
    await p.waitForTimeout(1200)
    // un clic de verdad enciende
    await p.mouse.click(700, 450)
    ok(await waitFor(p, (s) => s.started && s.ctx === 'running'), 'un clic en la página enciende el sonido (AudioContext en marcha)')
    ok((await p.getAttribute('[data-sound-toggle]', 'aria-pressed')) === 'true', 'el botón queda activo (aria-pressed)')
    await p.waitForTimeout(1500)
    let s = await st(p)
    ok(s.ambient === 'amb-espacio' && s.tramo === 'espacio', 'en la portada suena el ambiente del espacio')
    ok(rec.audio.every((f) => /^(amb-espacio|amb-oceano|sfx-satelite)\./.test(f)), 'solo se descargó el ambiente actual, el siguiente y el efecto próximo: ' + [...new Set(rec.audio)].join(', '))
    ok((await p.$eval('[data-sound-toggle]', (e) => e.classList.contains('is-playing'))), 'las ondas del botón se animan mientras suena')
    ok(s.filterHz > 10000, 'en el espacio el paso bajo está abierto (' + Math.round(s.filterHz) + ' Hz)')

    // por los tramos
    const expectAmb = { espacio: 'amb-espacio', satelite: 'amb-espacio', mar: 'amb-oceano', agua: 'amb-oceano', maquina: 'amb-oceano', emerge: 'amb-cumbre', cumbre: 'amb-cumbre' }
    const expectSfx = { satelite: 'sfx-satelite', mar: 'sfx-atmosfera', agua: 'sfx-agua-entra', maquina: 'sfx-sumergible', emerge: 'sfx-agua-sale', cumbre: 'sfx-rafaga' }
    for (const t of TRAMOS.slice(1)) {
      await to(p, t)
      const got = await waitFor(p, (x) => x.tramo === t && x.ambient === expectAmb[t] && (x.ambGains[expectAmb[t]] ?? 0) > 0.95, 7000)
      s = await st(p)
      ok(got, `tramo ${t}: ambiente activo ${expectAmb[t]} (a pleno tras el fundido)`)
      const n = s.fired.filter((f) => f.sfx === expectSfx[t]).length
      ok(n === 1, `tramo ${t}: ${expectSfx[t]} suena una vez (${n})`)
      if (t === 'agua' || t === 'maquina') {
        await waitFor(p, (x) => x.filterHz < 3000, 4000)
        ok((await st(p)).filterHz < 3000, `tramo ${t}: bajo el agua el paso bajo se cierra (${Math.round((await st(p)).filterHz)} Hz)`)
      }
      if (t === 'emerge') {
        await waitFor(p, (x) => x.filterHz > 8000, 5000)
        ok((await st(p)).filterHz > 8000, `tramo ${t}: al emerger el paso bajo se abre (${Math.round((await st(p)).filterHz)} Hz)`)
      }
      await p.waitForTimeout(700)
    }
    ok(Object.values((await st(p)).ambGains).filter((g) => g > 0.05).length === 1, 'tras el fundido solo queda un ambiente sonando')

    // antirrebote: ida y vuelta rápida no dispara ráfagas
    const before = (await st(p)).fired.length
    for (let i = 0; i < 6; i++) {
      await to(p, i % 2 ? 'agua' : 'maquina')
      await p.waitForTimeout(140)
    }
    await to(p, 'cumbre')
    await p.waitForTimeout(1800)
    s = await st(p)
    ok(s.fired.length === before, `el scroll rápido de ida y vuelta no dispara efectos (${s.fired.length - before} nuevos)`)
    ok(s.fired.length === 6, 'seis cruces, seis efectos en total')

    // el chat lo silencia
    await to(p, 'maquina')
    await p.waitForTimeout(1500)
    await p.click('.fab')
    ok(await waitFor(p, (x) => x.suppressed && x.duckGain < 0.05, 3000), 'abrir el chat silencia el sonido')
    ok((await p.getAttribute('[data-sound-toggle]', 'aria-pressed')) === 'true', 'la elección de la persona no cambia con el chat')
    await p.click('.chat__close')
    ok(await waitFor(p, (x) => !x.suppressed && x.duckGain > 0.95, 4000), 'cerrar el chat devuelve el sonido')
    // un reel con sonido
    await p.evaluate(() => document.querySelector('.reel').scrollIntoView())
    await p.waitForTimeout(500)
    await p.click('.reel .reel__sound')
    ok(await waitFor(p, (x) => x.suppressed && x.duckGain < 0.05, 3000), 'un reel con sonido silencia el sonido de la página')
    await p.click('.reel .reel__sound')
    ok(await waitFor(p, (x) => !x.suppressed && x.duckGain > 0.95, 4000), 'al silenciar el reel vuelve el sonido de la página')

    // pestaña oculta
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    ok(await waitFor(p, (x) => x.ctx === 'suspended', 3000), 'con la pestaña oculta el AudioContext se suspende')
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    ok(await waitFor(p, (x) => x.ctx === 'running', 3000), 'al volver la pestaña se reanuda')

    // el botón apaga y enciende, y recuerda
    await p.click('[data-sound-toggle]')
    ok(await waitFor(p, (x) => !x.on && x.master < 0.05 && x.ctx === 'suspended', 4000), 'el botón apaga (volumen a 0 y contexto suspendido)')
    ok((await st(p)).pref === '0' && (await p.getAttribute('[data-sound-toggle]', 'aria-pressed')) === 'false', 'la elección «apagado» se guarda y el botón lo dice')
    ok(!(await p.$eval('[data-sound-toggle]', (e) => e.classList.contains('is-playing'))), 'apagado, las ondas no se mueven')
    await p.click('[data-sound-toggle]')
    ok(await waitFor(p, (x) => x.on && x.ctx === 'running' && x.master > 0.9, 4000), 'el botón vuelve a encender')
    ok((await st(p)).pref === '1', 'la elección «encendido» se guarda')
    ok(rec.errors.length === 0, 'consola y CSP limpias en escritorio' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''))
    await ctx.close()
  }

  // ================= elección recordada: apagado =================
  {
    const { ctx, p, rec } = await open({ pref: '0' })
    await p.mouse.click(700, 450)
    await p.waitForTimeout(800)
    ok((await st(p)).started === false && rec.audio.length === 0, 'con «apagado» recordado, un clic en la página no lo enciende')
    await p.click('[data-sound-toggle]')
    ok(await waitFor(p, (x) => x.started && x.ctx === 'running'), 'pero el botón sí lo enciende')
    await ctx.close()
  }

  // ================= ahorro de datos =================
  {
    const { ctx, p, rec } = await open({ saveData: true })
    await p.mouse.click(700, 450)
    await p.waitForTimeout(800)
    ok((await st(p)).started === false && rec.audio.length === 0, 'con ahorro de datos el sonido nace apagado (un clic no lo enciende)')
    await p.click('[data-sound-toggle]')
    ok(await waitFor(p, (x) => x.started), 'con ahorro de datos, el botón lo enciende si la persona lo pide')
    await ctx.close()
  }

  // ================= teléfono =================
  {
    const { ctx, p, rec } = await open({ viewport: { width: 390, height: 844 }, touch: true })
    const box = await p.$eval('[data-sound-toggle]', (e) => {
      const r = e.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth }
    })
    ok(box.w >= 40 && box.h >= 40 && box.x >= 0 && box.x + box.w <= box.vw, 'en el teléfono el botón de sonido es visible, de 40 px o más y cabe')
    ok(rec.audio.length === 0, 'teléfono: nada de audio en la carga')
    await p.touchscreen.tap(200, 500)
    ok(await waitFor(p, (x) => x.started && x.ctx === 'running'), 'un toque en el teléfono enciende el sonido')
    ok(rec.errors.length === 0, 'consola y CSP limpias en el teléfono' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''))
    await ctx.close()
  }

  await b.close()
  if (fails.length) {
    console.log(`\n${fails.length} fallo(s):\n - ` + fails.join('\n - '))
    process.exit(1)
  }
  console.log('\nsonido en verde')
})()
