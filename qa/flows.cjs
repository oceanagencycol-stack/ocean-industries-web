// QA de los flujos (sin el 3D): idioma, conversación con el agente (simulado en vite), calculadora de pagos,
// menú del teléfono, escenas y la 404. node qa/flows.cjs <url>
const { chromium } = require('playwright')

;(async () => {
  const [, , url] = process.argv
  const b = await chromium.launch()
  const fails = []
  const ok = (cond, msg) => {
    if (!cond) fails.push(msg)
    console.log(`${cond ? '✓' : '✗'} ${msg}`)
  }

  // ---------- escritorio ----------
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('ocean-intro-at', String(Date.now()))
    } catch (e) {}
  })
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !/Permissions-Policy|sentry|cal\.com/i.test(m.text()) && errors.push(m.text().slice(0, 200)))
  await p.goto(url + '?qa=1&noglass', { waitUntil: 'load' })
  await p.waitForTimeout(800)

  // idioma
  ok((await p.getAttribute('html', 'lang')) === 'es', 'el documento abre en español')
  await p.click('.nav [data-lang="en"]')
  await p.waitForTimeout(200)
  ok((await p.getAttribute('html', 'lang')) === 'en', 'EN cambia <html lang>')
  ok((await p.textContent('.hero__title')).includes('We turn'), 'EN cambia el titular')
  ok((await p.title()).includes('AI and automation'), 'EN cambia el título de la pestaña')
  const wa = await p.getAttribute('.hero__actions a[data-wa]', 'href')
  ok(wa.includes('wa.me/573138721665') && decodeURIComponent(wa).includes('Hi Ocean'), 'el enlace de WhatsApp sigue el idioma')
  await p.click('.nav [data-lang="pt"]')
  await p.waitForTimeout(200)
  ok((await p.textContent('.hero__title')).includes('Transformamos'), 'PT cambia el titular')
  await p.reload({ waitUntil: 'load' })
  await p.waitForTimeout(600)
  ok((await p.getAttribute('html', 'lang')) === 'pt', 'el idioma elegido se recuerda')
  await p.click('.nav [data-lang="es"]')
  await p.waitForTimeout(200)

  // conversación con el agente (en vite responde un simulado)
  await p.evaluate(() => window.__ocean.to(document.getElementById('services').offsetTop))
  await p.waitForTimeout(700)
  ok(!(await p.$eval('.fab', (el) => el.classList.contains('is-hidden'))), 'el botón «Habla con Ocean» se ve fuera del hero')
  await p.click('.fab')
  await p.waitForTimeout(500)
  ok(await p.isVisible('#chat'), 'la conversación se abre')
  ok((await p.textContent('#chatLog')).includes('asistente de Ocean'), 'saluda el agente')
  await p.fill('#chatInput', 'Tengo una ferretería en Cali')
  await p.press('#chatInput', 'Enter')
  await p.waitForTimeout(1600)
  const log = await p.textContent('#chatLog')
  ok(log.includes('Tengo una ferretería') && log.includes('(simulado)'), 'el mensaje va y la respuesta llega')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)
  ok(!(await p.isVisible('#chat')), 'Escape cierra la conversación')

  // calculadora de pagos
  await p.evaluate(() => window.__ocean.to(document.getElementById('pay').offsetTop))
  await p.waitForTimeout(500)
  ok(await p.isDisabled('#payBtn'), 'sin monto, el botón de pago está apagado')
  await p.fill('#payAmount', '100000')
  await p.waitForTimeout(150)
  const total = await p.textContent('#sumTotal')
  ok(total.replace(/\s/g, '') === '$104.344COP', `el total suma la comisión y su IVA (${total})`)
  ok(!(await p.isDisabled('#payBtn')), 'con monto, el botón se enciende')
  await p.click('[data-cur="USD"]')
  await p.waitForTimeout(300)
  ok((await p.textContent('#amountLabel')).includes('USD'), 'USD cambia la etiqueta del monto')
  await p.click('[data-cur="COP"]')

  // escenas: una escena en vista avanza sola
  await p.evaluate(() => {
    const el = document.getElementById('omnicanal')
    window.__ocean.to(el.getBoundingClientRect().top + window.scrollY - 80)
  })
  await p.waitForTimeout(4200)
  const step = await p.$eval('#omnicanal .demo', (el) => Number(el.dataset.step || 0))
  ok(step >= 1, `la escena avanza en vista (paso ${step})`)
  ok(await p.$eval('#omnicanal .demo', (el) => el.classList.contains('is-playing')), 'la escena dice que está corriendo')

  // reels: el que entra en vista baja y suena en silencio; fuera de vista se pausa
  await p.evaluate(() => {
    const el = document.querySelector('#reelsGrid .reel__video')
    window.__ocean.to(el.getBoundingClientRect().top + window.scrollY - 120)
  })
  await p.waitForFunction(() => {
    const v = document.querySelector('#reelsGrid .reel__video')
    return v && v.readyState >= 2 && !v.paused
  }, null, { timeout: 15000 }).catch(() => {})
  const reel = await p.$eval('#reelsGrid .reel__video', (v) => ({ ready: v.readyState, paused: v.paused, muted: v.muted, src: (v.currentSrc || '').split('/').pop() }))
  ok(reel.ready >= 2 && !reel.paused && reel.muted, `el reel en vista corre en silencio (${reel.src}, readyState ${reel.ready})`)
  await p.evaluate(() => window.__ocean.to(0))
  await p.waitForTimeout(600)
  ok(await p.$eval('#reelsGrid .reel__video', (v) => v.paused), 'fuera de vista el reel se pausa')

  ok(errors.length === 0, `sin errores de consola${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await ctx.close()

  // ---------- teléfono ----------
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await m.addInitScript(() => {
    try {
      localStorage.setItem('ocean-intro-at', String(Date.now()))
    } catch (e) {}
  })
  const mp = await m.newPage()
  await mp.goto(url + '?qa=1&noglass', { waitUntil: 'load' })
  await mp.waitForTimeout(600)
  ok(await mp.isVisible('.nav__menu'), 'en el teléfono se ve el botón de menú')
  await mp.tap('.nav__menu')
  await mp.waitForTimeout(250)
  ok(await mp.isVisible('#menu'), 'el menú se abre')
  ok((await mp.getAttribute('.nav__menu', 'aria-expanded')) === 'true', 'aria-expanded sigue el menú')
  await mp.tap('#menu a[href="#work"]')
  await mp.waitForTimeout(1200)
  ok(!(await mp.isVisible('#menu')), 'un enlace cierra el menú')
  const top = await mp.$eval('#work', (el) => Math.round(el.getBoundingClientRect().top))
  ok(top >= -4 && top < 140, `el enlace lleva a la sección (top ${top})`)
  const sx = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(sx <= 0, `sin scroll horizontal en el teléfono (${sx})`)
  await m.close()

  // ---------- 404 ----------
  const lp = await b.newPage()
  const r = await lp.goto(url.replace(/\/$/, '') + '/404.html', { waitUntil: 'load' })
  ok(r.status() === 200 && (await lp.textContent('h1')).includes('no llegó'), 'la 404 se arma')
  await b.close()

  console.log(fails.length ? `\n${fails.length} fallo(s)` : '\ntodo en verde')
  process.exit(fails.length ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
