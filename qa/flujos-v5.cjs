// QA de los recorridos de la v5 (la película por scroll y su epílogo): idioma y WhatsApp, la película (rótulos que
// entran), servicios y preguntas, los siete casos, el chat (simulado en vite), Valeria, reels, agenda, pagos sin
// pagar, el pie, el menú del teléfono, movimiento reducido, sin JavaScript, 404, privacidad y servicios.
//   node qa/flujos-v5.cjs http://localhost:4175/
// Termina en «todo en verde». La de la v3 (qa/flows.cjs) queda como historia: busca las placas que la v5 no tiene.
const { chromium } = require('playwright')

;(async () => {
  const base = (process.argv[2] || 'http://localhost:4175/').replace(/\/$/, '')
  const b = await chromium.launch()
  const fails = []
  const ok = (cond, msg) => {
    if (!cond) fails.push(msg)
    console.log(`${cond ? '✓' : '✗'} ${msg}`)
  }
  const ruido = /Permissions-Policy|sentry|cal\.com|ERR_|Failed to load resource|WebGL|GPU stall|GL Driver/i
  const into = async (p, sel, block = 'center') => {
    await p.evaluate(
      ([s, bl]) => document.querySelector(s).scrollIntoView({ block: bl, behavior: 'instant' }),
      [sel, block],
    )
    await p.waitForTimeout(450)
  }

  // ---------- escritorio ----------
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !ruido.test(m.text()) && errors.push(m.text().slice(0, 200)))
  await p.goto(base + '/?qa=1', { waitUntil: 'load' })
  // la apertura de la marca (estrella → isotipo → logotipo) termina y deja la portada
  await p.waitForFunction(() => !document.documentElement.classList.contains('pre-on'), null, { timeout: 12000 }).catch(() => {})
  await p.waitForTimeout(600)

  ok((await p.getAttribute('html', 'lang')) === 'es', 'el documento abre en español')
  ok(await p.isVisible('#hero-title'), 'el titular de la portada se ve')
  ok((await p.textContent('.hero__top .kicker, .kicker')).includes('Software e ingeniería con IA'), 'la portada dice «Software e ingeniería con IA»')
  ok((await p.title()).startsWith('OCEAN | Empresa de software e ingeniería con IA'), 'el título de la pestaña es el de software e ingeniería')
  const nav = await p.$$eval('.nav__links a', (a) => a.map((x) => x.getAttribute('href')))
  ok(nav.includes('/servicios') && nav[0] === '#maquina', `la barra empieza por Software y lleva a /servicios (${nav.join(' ')})`)

  // idioma y WhatsApp
  await p.click('.nav [data-lang="en"]')
  await p.waitForTimeout(400)
  ok((await p.getAttribute('html', 'lang')) === 'en', 'EN cambia <html lang>')
  ok((await p.textContent('#servicios .work__title')).includes('Software and engineering'), 'EN cambia los textos del epílogo')
  const wa = decodeURIComponent((await p.getAttribute('.nav a[data-wa]', 'href')) || '')
  ok(wa.includes('wa.me/573138721665') && wa.includes('Hi OCEAN'), 'el WhatsApp de la barra sigue el idioma y lleva el mensaje escrito')
  ok((await p.$eval('#work img[data-es-alt]', (i) => i.alt)).startsWith('The '), 'EN cambia el texto alternativo de las capturas')
  await p.click('.nav [data-lang="pt"]')
  await p.waitForTimeout(300)
  await p.reload({ waitUntil: 'load' })
  await p.waitForTimeout(1500)
  ok((await p.getAttribute('html', 'lang')) === 'pt', 'el idioma elegido se recuerda (PT)')
  await p.click('.nav [data-lang="es"]')
  await p.waitForTimeout(300)

  // la película: al bajar, los rótulos de cada tramo entran
  const film = await p.evaluate(() => document.documentElement.classList.contains('no-stage') ? 'sin escenario' : 'escenario')
  for (const id of ['senal', 'agentes', 'maquina', 'trabajo']) {
    await p.evaluate((sel) => {
      // los rótulos van fijos sobre la película: se baja por la pista hasta la mitad de su tiempo (data-t)
      const [a, b] = document.getElementById(sel).dataset.t.split(':').map(Number)
      const f = window.__film
      scrollTo(0, f.reelTop + ((a + b) / 2) * f.sps)
    }, id)
    await p.waitForTimeout(900)
    const vis = await p.evaluate((sel) => {
      const el = document.getElementById(sel)
      const r = el.getBoundingClientRect()
      let o = 1
      for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
      return { o: Math.round(o * 100) / 100, onScreen: r.bottom > 0 && r.top < innerHeight }
    }, id)
    ok(vis.onScreen && vis.o > 0.5, `${film}: el rótulo #${id} entra al llegar a su tramo (opacidad ${vis.o})`)
  }

  // el chat (en vite responde un simulado)
  // se queda en el último tramo de la película (la máquina/la punta), donde flota «Habla con OCEAN»
  ok(!(await p.$eval('.fab', (el) => el.classList.contains('is-hidden'))), '«Habla con OCEAN» se ve fuera de la portada')
  await p.click('.fab')
  await p.waitForTimeout(500)
  ok(await p.isVisible('#chat'), 'la conversación se abre')
  await p.fill('#chatInput', 'Tengo una ferretería en Cali')
  await p.press('#chatInput', 'Enter')
  await p.waitForFunction(() => document.querySelector('#chatLog').textContent.includes('(simulado)'), null, { timeout: 6000 }).catch(() => {})
  const log = await p.textContent('#chatLog')
  ok(log.includes('Tengo una ferretería') && log.includes('(simulado)'), 'el mensaje va y la respuesta llega (simulada)')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(250)
  ok(!(await p.isVisible('#chat')), 'Escape cierra la conversación')

  // servicios y preguntas
  ok((await p.$$eval('#servicios a[href^="/servicios/"]', (a) => a.length)) === 5, 'el epílogo enlaza los cinco servicios')
  await into(p, '#preguntas')
  await p.click('#preguntas details summary')
  ok(await p.$eval('#preguntas details', (d) => d.open), 'una pregunta frecuente abre')
  ok(await p.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => s.textContent.includes('"FAQPage"'))), 'la home declara sus preguntas (FAQPage)')

  // los siete casos, cada uno con su enlace y su captura
  const casos = await p.$$eval('#work .case', (cs) => cs.map((c) => ({ name: c.querySelector('.case__name').textContent, link: !!c.querySelector('.case__link') })))
  ok(casos.length === 7, `siete casos (${casos.map((c) => c.name).join(', ')})`)
  ok(casos.every((c) => c.link), `cada caso enlaza su sitio (${casos.filter((c) => !c.link).map((c) => c.name).join(', ') || 'todos'})`)
  for (const i of [0, 3, 6]) {
    await into(p, `#work .case:nth-of-type(${(i % 4) + 1})`)
  }
  await p.evaluate(() => document.querySelectorAll('#work .case img').forEach((i) => (i.loading = 'eager')))
  await p.waitForFunction(() => [...document.querySelectorAll('#work .case img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 }).catch(() => {})
  ok(await p.$$eval('#work .case img', (is) => is.every((i) => i.complete && i.naturalWidth === 1440)), 'las siete capturas cargan a 1440 px')

  // Valeria (de ejemplo)
  const valeria = await p.$('.valeria-open')
  if (valeria) {
    await p.evaluate(() => document.querySelector('.valeria-open').scrollIntoView({ block: 'center', behavior: 'instant' }))
    await p.evaluate(() => document.getElementById('valeria-demo').showPopover?.())
    await p.waitForTimeout(400)
    ok(await p.evaluate(() => document.getElementById('valeria-demo').matches(':popover-open')), 'la conversación de Valeria abre')
    ok((await p.textContent('#valeria-demo')).includes('ejemplo'), 'la conversación ampliada de Valeria dice que es de ejemplo')
    ok((await p.textContent('.live__tag')).includes('Ejemplo'), 'la tarjeta de Valeria dice «Ejemplo»')
    await p.evaluate(() => document.getElementById('valeria-demo').hidePopover?.())
  }

  // reels: el que entra en vista corre en silencio
  await into(p, '#reelsGrid .reel__video')
  await p.waitForFunction(() => {
    const v = document.querySelector('#reelsGrid .reel__video')
    return v && v.readyState >= 2 && !v.paused
  }, null, { timeout: 15000 }).catch(() => {})
  const reel = await p.$eval('#reelsGrid .reel__video', (v) => ({ ready: v.readyState, paused: v.paused, muted: v.muted }))
  ok(reel.ready >= 2 && !reel.paused && reel.muted, `el reel en vista corre en silencio (readyState ${reel.ready})`)

  // la agenda (computador: Cal.com incrustado, en claro) y la barra clara sobre la nieve
  await into(p, '#book', 'start')
  await p.waitForTimeout(900)
  ok(((await p.getAttribute('html', 'class')) || '').split(/\s+/).includes('nav-light'), 'sobre la nieve la barra se vuelve clara')
  const cal = await p.$eval('#calFrame iframe', (f) => f.src).catch(() => '')
  ok(cal.includes('cal.com/ocean-industries-2e5al7/agenda-demo-gratuita') && cal.includes('theme=light'), 'Cal.com se incrusta en el computador, en claro')

  // pagos (sin pagar)
  await into(p, '#pay', 'start')
  ok(await p.isDisabled('#payBtn'), 'sin monto, el botón de pago está apagado')
  await p.fill('#payAmount', '100000')
  await p.waitForTimeout(150)
  const total = (await p.textContent('#sumTotal')).replace(/\s/g, '')
  ok(total === '$104.344COP', `el total suma la comisión y su IVA (${total})`)
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
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await p.waitForTimeout(800)
  ok((await p.textContent('.footer__legal')).includes('Ocean Industries'), 'el nombre legal va en el pie')
  ok(await p.$eval('.fab', (el) => el.classList.contains('is-hidden')), 'en el pie no flota «Habla con OCEAN»')
  ok((await p.$$eval('.footer a[href^="/servicios/"]', (a) => a.length)) === 5, 'el pie enlaza los cinco servicios')

  ok(errors.length === 0, `sin errores de consola${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await ctx.close()

  // ---------- teléfono ----------
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const mp = await m.newPage()
  await mp.goto(base + '/?qa=1', { waitUntil: 'load' })
  await mp.waitForTimeout(1500)
  ok(await mp.isVisible('.nav__menu'), 'en el teléfono se ve el botón del índice')
  ok(!(await mp.isVisible('.fab')), 'en el teléfono no está «Habla con OCEAN» (WhatsApp ya está en la barra)')
  await mp.tap('.nav__menu')
  await mp.waitForTimeout(300)
  ok(await mp.isVisible('#menu'), 'el índice se abre')
  ok((await mp.getAttribute('.nav__menu', 'aria-expanded')) === 'true', 'aria-expanded sigue el índice')
  ok(await mp.$eval('main', (el) => el.inert), 'con el índice abierto el resto de la página queda inerte')
  ok(await mp.$('#menu a[href="/servicios"]'), 'el índice lleva a los servicios')
  await mp.tap('#menu a[href="#book"]')
  await mp.waitForTimeout(1500)
  ok(!(await mp.isVisible('#menu')), 'un enlace cierra el índice')
  const top = await mp.$eval('#book', (el) => Math.round(el.getBoundingClientRect().top))
  ok(top > -200 && top < 400, `el enlace lleva a la agenda (top ${top})`)
  ok(await mp.$eval('#calFrame', (el) => el.classList.contains('is-phone')), 'en el teléfono la agenda abre en la página de Cal.com')
  const sx = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok(sx <= 0, `sin scroll horizontal en el teléfono (${sx})`)
  await m.close()

  // ---------- movimiento reducido ----------
  const rc = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const rp = await rc.newPage()
  await rp.goto(base + '/', { waitUntil: 'load' })
  await rp.waitForTimeout(800)
  ok(await rp.evaluate(() => document.documentElement.classList.contains('no-motion')), 'movimiento reducido: la página lo sabe (no-motion)')
  ok(await rp.isVisible('#hero-title'), 'movimiento reducido: el titular se ve')
  await rc.close()

  // ---------- sin JavaScript ----------
  const nc = await b.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false })
  const np = await nc.newPage()
  await np.goto(base + '/', { waitUntil: 'load' })
  ok(await np.isVisible('#hero-title'), 'sin JavaScript el titular se ve')
  const sinJs = await np.evaluate(() =>
    ['#maquina-title', '#servicios .work__title', '#preguntas .work__title', '#work .case__name'].map((s) => {
      const el = document.querySelector(s)
      let o = 1
      for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
      return [s, o]
    }),
  )
  ok(sinJs.every(([, o]) => o > 0.5), `sin JavaScript nada queda escondido (${sinJs.map(([s, o]) => s + ' ' + o).join(', ')})`)
  await nc.close()

  // ---------- 404, privacidad y servicios ----------
  const lp = await b.newPage()
  const r = await lp.goto(base + '/404.html', { waitUntil: 'load' })
  ok(r.status() === 200 && (await lp.$('a[href="/servicios"]')) !== null, 'la 404 se sirve y lleva a los servicios')
  const pr = await lp.goto(base + '/privacidad', { waitUntil: 'load' })
  ok(pr.status() === 200 && (await lp.textContent('main')).includes('Ocean Industries'), 'la privacidad se sirve y nombra a Ocean Industries')
  const sv = await lp.goto(base + '/servicios/agentes-de-ia', { waitUntil: 'load' })
  ok(sv.status() === 200 && (await lp.textContent('h1')).includes('Agentes de IA'), 'una página de servicio se sirve')
  await b.close()

  console.log(fails.length ? `\n${fails.length} fallo(s)` : '\ntodo en verde')
  process.exit(fails.length ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
