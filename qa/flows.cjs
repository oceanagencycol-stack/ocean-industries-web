// QA de los flujos de la v3 (sin el mundo): idioma, WhatsApp, entrada, la E, barra clara en la nieve, conversación
// con el agente (simulada en vite), escenas, Valeria, reels, agenda, pagos sin pagar, menú del teléfono, la intro
// (velo y salida segura), sin JavaScript, la 404 y la privacidad. node qa/flows.cjs <url>
const { chromium } = require('playwright')

;(async () => {
  const [, , url] = process.argv
  const base = url.replace(/\/$/, '')
  const b = await chromium.launch()
  const fails = []
  const ok = (cond, msg) => {
    if (!cond) fails.push(msg)
    console.log(`${cond ? '✓' : '✗'} ${msg}`)
  }
  const seen = () => {
    try {
      localStorage.setItem('ocean-v3-intro-at', String(Date.now()))
    } catch (e) {}
  }
  const to = (p, sel, off = 0) =>
    p.evaluate(
      ([sel, off]) => {
        const el = document.querySelector(sel)
        const pane = el.closest('[data-dossier]')
        if (pane?.hidden) {
          const id = el.closest('[id]')?.id || pane.querySelector('[id]').id
          history.replaceState(null, "", "#" + id)
          window.dispatchEvent(new HashChangeEvent('hashchange'))
        }
        window.__ocean.to(el.getBoundingClientRect().top + window.scrollY - off)
      },
      [sel, off],
    )

  // ---------- escritorio ----------
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(seen)
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !/Permissions-Policy|sentry|cal\.com|ERR_|Failed to load resource/i.test(m.text()) && errors.push(m.text().slice(0, 200)))
  await p.goto(url + '?qa=1&noworld', { waitUntil: 'load' })
  await p.waitForTimeout(1800)

  ok((await p.getAttribute('html', 'lang')) === 'es', 'el documento abre en español')
  ok(await p.$eval('#hero-title', (el) => getComputedStyle(el).visibility === 'visible'), 'el titular de la portada entra')
  ok(!(await p.$('[data-intro-veil]')) || !(await p.isVisible('[data-intro-veil]')), 'sin intro pendiente no hay velo')
  ok((await p.$$eval('.plate img', (a) => a.length)) === 7, 'cada tramo trae su placa de respaldo (7)')
  ok((await p.$eval('.plate--m1a img', (i) => i.complete && i.naturalWidth > 0)), 'la placa de la portada cargó')
  ok((await p.$eval('.nav__logo', (s) => s.closest('a').hasAttribute('data-intro-dock'))), 'el logotipo de la barra es el ancla de la intro')
  ok((await p.$$eval('[data-tramo]', (s) => s.map((x) => x.dataset.tramo).join())) === 'espacio,satelite,mar,agua,maquina,emerge,cumbre', 'los siete tramos en orden')

  // idioma
  await p.click('.nav__menu')
  await p.click('#menu [data-lang="en"]')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)
  ok((await p.getAttribute('html', 'lang')) === 'en', 'EN cambia <html lang>')
  ok((await p.textContent('#hero-title')).includes('signal.'), 'EN cambia el titular')
  ok((await p.title()).includes('Technology studio'), 'EN cambia el título de la pestaña')
  const wa = await p.getAttribute('.nav a[data-wa]', 'href')
  ok(wa.includes('wa.me/573138721665') && decodeURIComponent(wa).includes('Hi OCEAN'), 'el WhatsApp sigue el idioma y lleva el mensaje escrito')
  await p.click('.nav__menu')
  await p.click('#menu [data-lang="pt"]')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)
  ok((await p.textContent('#hero-title')).includes('sinal.'), 'PT cambia el titular')
  await p.reload({ waitUntil: 'load' })
  await p.waitForTimeout(800)
  ok((await p.getAttribute('html', 'lang')) === 'pt', 'el idioma elegido se recuerda')
  await p.click('.nav__menu')
  await p.click('#menu [data-lang="es"]')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)

  // la E y el enlace actual
  await to(p, '#maquina .film-shot', -200)
  await p.waitForTimeout(500)
  ok((await p.getAttribute('.horizon', 'data-horizon')) === '2', 'en la máquina se enciende la barra de en medio de la E')
  ok((await p.getAttribute('.nav__links a[href="#maquina"]', 'aria-current')) === 'true', 'la barra marca «Máquina»')

  // conversación con el agente (en vite responde un simulado)
  await to(p, '#ugc', 80)
  await p.waitForTimeout(700)
  ok(!(await p.$eval('.fab', (el) => el.classList.contains('is-hidden'))), 'el botón «Habla con OCEAN» se ve fuera de la portada')
  await p.click('.fab')
  await p.waitForTimeout(500)
  ok(await p.isVisible('#chat'), 'la conversación se abre')
  ok((await p.textContent('#chatLog')).includes('asistente de OCEAN'), 'saluda el agente')
  await p.fill('#chatInput', 'Tengo una ferretería en Cali')
  await p.press('#chatInput', 'Enter')
  await p.waitForTimeout(1600)
  const log = await p.textContent('#chatLog')
  ok(log.includes('Tengo una ferretería') && log.includes('(simulado)'), 'el mensaje va y la respuesta llega (simulada)')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)
  ok(!(await p.isVisible('#chat')), 'Escape cierra la conversación')

  // La escena cuenta el mismo progreso que el scroll y se puede posar por teclado.
  await to(p, '#omnicanal .demo', 620)
  await p.waitForTimeout(180)
  const firstStep = await p.$eval('#omnicanal .demo', (el) => Number(el.dataset.step || 0))
  await to(p, '#omnicanal .demo', 140)
  await p.waitForTimeout(180)
  const step = await p.$eval('#omnicanal .demo', (el) => Number(el.dataset.step || 0))
  ok(step > firstStep, `la escena avanza con el scroll (${firstStep} → ${step})`)
  await p.locator('#omnicanal .demo__steps li').last().getByRole('button').click()
  ok(await p.$eval('#omnicanal .demo', (el) => el.dataset.step === '4'), 'se puede posar el ejemplo en un paso')

  // Valeria (de ejemplo)
  await to(p, '#agente-vivo', 80)
  await p.waitForTimeout(3000)
  ok((await p.textContent('.live__tag')).trim() === 'Ejemplo', 'Valeria está rotulada como ejemplo')
  ok((await p.$$eval('#liveChat .msg', (m) => m.length)) >= 1, 'la conversación de Valeria corre')

  // reels: el que entra en vista baja y corre en silencio; fuera de vista se pausa
  await to(p, '#reelsGrid .reel__video', 120)
  await p.waitForFunction(() => {
    const v = document.querySelector('#reelsGrid .reel__video')
    return v && v.readyState >= 2 && !v.paused
  }, null, { timeout: 15000 }).catch(() => {})
  const reel = await p.$eval('#reelsGrid .reel__video', (v) => ({ ready: v.readyState, paused: v.paused, muted: v.muted }))
  ok(reel.ready >= 2 && !reel.paused && reel.muted, `el reel en vista corre en silencio (readyState ${reel.ready})`)

  // la agenda (computador: Cal.com incrustado, en claro)
  await to(p, '#book', 80)
  await p.waitForTimeout(900)
  ok(html_has(await p.getAttribute('html', 'class'), 'nav-light'), 'sobre la nieve la barra se vuelve clara')
  const cal = await p.$eval('#calFrame iframe', (f) => f.src).catch(() => '')
  ok(cal.includes('cal.com/ocean-industries-2e5al7/agenda-demo-gratuita') && cal.includes('theme=light'), 'Cal.com se incrusta en el computador, en claro')

  // pagos (sin pagar)
  await to(p, '#pay', 80)
  await p.waitForTimeout(400)
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
  await p.fill('#payEmail', 'no-es-correo')
  await p.click('#payBtn')
  await p.waitForTimeout(200)
  ok((await p.getAttribute('#payEmail', 'aria-invalid')) === 'true', 'un correo mal escrito se marca y no abre el pago')

  // el pie
  await p.evaluate(() => window.__ocean.to(document.documentElement.scrollHeight))
  await p.waitForTimeout(500)
  ok((await p.$eval('.footer__logo', (s) => s.querySelectorAll('path').length > 2)), 'el pie lleva el logotipo grande con ®')
  ok((await p.textContent('.footer__legal')).includes('Ocean Industries'), 'el nombre legal va en el pie')
  ok(await p.$eval('.fab', (el) => el.classList.contains('is-hidden')), 'en el pie no flota «Habla con OCEAN»')

  ok(errors.length === 0, `sin errores de consola${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await ctx.close()

  // ---------- teléfono ----------
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await m.addInitScript(seen)
  const mp = await m.newPage()
  await mp.goto(url + '?qa=1&noworld', { waitUntil: 'load' })
  await mp.waitForTimeout(800)
  ok(await mp.isVisible('.nav__menu'), 'en el teléfono se ve el botón de menú')
  ok(!(await mp.isVisible('.fab')), 'en el teléfono no está «Habla con OCEAN» (WhatsApp ya está en la barra)')
  ok((await mp.$eval('.plate--m1a img', (i) => i.currentSrc)).includes('cuadro-0-v.'), 'en el teléfono la placa es la vertical')
  await mp.tap('.nav__menu')
  await mp.waitForTimeout(250)
  ok(await mp.isVisible('#menu'), 'el menú se abre')
  ok((await mp.getAttribute('.nav__menu', 'aria-expanded')) === 'true', 'aria-expanded sigue el menú')
  ok(await mp.$eval('main', (el) => el.inert), 'con el menú abierto el resto de la página queda inerte')
  await mp.tap('#menu a[href="#trabajo"]')
  await mp.waitForTimeout(1400)
  ok(!(await mp.isVisible('#menu')), 'un enlace cierra el menú')
  const top = await mp.$eval('#trabajo', (el) => Math.round(el.getBoundingClientRect().top))
  ok(top >= -4 && top < 140, `el enlace lleva al tramo (top ${top})`)
  ok(await mp.$eval('#calFrame', (el) => el.classList.contains('is-phone')), 'en el teléfono la agenda abre en la página de Cal.com')
  const sx = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(sx <= 0, `sin scroll horizontal en el teléfono (${sx})`)
  await m.close()

  // ---------- la intro: el velo cubre y nunca deja la página tapada ----------
  const ic = await b.newContext({ viewport: { width: 1280, height: 800 } })
  await ic.addInitScript(() => {
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'interactive') window.__due = document.documentElement.classList.contains('intro-due')
    })
  })
  const ip = await ic.newPage()
  await ip.goto(url + '?qa=intro', { waitUntil: 'load' })
  ok(await ip.evaluate(() => window.__due === true), 'primera visita: el script de arranque marca la intro antes de pintar')
  await ip.waitForTimeout(10000)
  ok(!(await ip.evaluate(() => document.querySelector('[data-intro-veil]') && getComputedStyle(document.querySelector('[data-intro-veil]')).visibility !== 'hidden')), 'el velo se va (con intro o sin ella)')
  ok(await ip.$eval('#hero-title', (el) => getComputedStyle(el).visibility === 'visible'), 'después de la intro entra la portada')
  await ic.close()

  // ---------- movimiento reducido ----------
  const rc = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const rp = await rc.newPage()
  await rp.goto(url, { waitUntil: 'load' })
  await rp.waitForTimeout(500)
  ok(await rp.evaluate(() => document.documentElement.classList.contains('no-motion') && !document.documentElement.classList.contains('intro-due')), 'movimiento reducido: sin intro')
  ok(await rp.$eval('#senal-title > span', (el) => getComputedStyle(el).transform === 'none'), 'movimiento reducido: los titulares están desde el primer cuadro')
  ok(!(await rp.evaluate(() => document.documentElement.classList.contains('has-world'))), 'movimiento reducido: sin mundo, quedan las placas')
  await rc.close()

  // ---------- sin JavaScript ----------
  const nc = await b.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false })
  const np = await nc.newPage()
  await np.goto(url, { waitUntil: 'load' })
  ok(await np.isVisible('#hero-title'), 'sin JavaScript el titular se ve')
  ok(await np.$eval('#maquina-title > span', (el) => getComputedStyle(el).transform === 'none'), 'sin JavaScript nada queda escondido por la entrada')
  ok((await np.$eval('#omnicanal .chip--ok', (el) => getComputedStyle(el).opacity)) === '1', 'sin JavaScript cada escena muestra su cuadro final')
  await nc.close()

  // ---------- 404 y privacidad ----------
  const lp = await b.newPage()
  const r = await lp.goto(base + '/404.html', { waitUntil: 'load' })
  ok(r.status() === 200 && (await lp.textContent('h1')).includes('profundo'), 'la 404 se arma con la estética nueva')
  const pr = await lp.goto(base + '/privacidad', { waitUntil: 'load' })
  ok(pr.status() === 200 && (await lp.textContent('main')).includes('Ocean Industries'), 'la privacidad se sirve y nombra a Ocean Industries')
  await b.close()

  console.log(fails.length ? `\n${fails.length} fallo(s)` : '\ntodo en verde')
  process.exit(fails.length ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})

function html_has(cls, c) {
  return (cls || '').split(/\s+/).includes(c)
}
