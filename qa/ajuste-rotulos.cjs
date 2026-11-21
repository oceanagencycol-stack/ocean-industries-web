// ¿Cabe cada rótulo de la película entre la barra y la telemetría? node qa/ajuste-rotulos.cjs <url> [--lang=en]
const { chromium } = require('playwright')
const lang = (process.argv.find(f => f.startsWith('--lang=')) || '').slice(7)
const SIZES = (process.env.SIZES ? JSON.parse(process.env.SIZES) : [[360, 640, 1], [375, 667, 1], [390, 844, 1], [412, 915, 1], [768, 1024, 1], [1024, 768, 0], [1280, 610, 0], [1280, 720, 0], [1366, 657, 0], [1536, 730, 0], [1440, 789, 0], [1440, 900, 0], [1920, 1080, 0]])
;(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  let bad = 0
  for (const [w, h, mobile] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: !!mobile, hasTouch: !!mobile })
    await ctx.addInitScript(l => { try { sessionStorage.setItem('ocean-v4-film', '1'); if (l) localStorage.setItem('ocean-lang', l) } catch {} }, lang)
    const p = await ctx.newPage()
    // el idioma va en la URL (/en, /pt), que manda sobre lo guardado
    await p.goto(new URL(lang || '.', process.argv[2].replace(/\/?$/, '/')).href + '?qa=1', { waitUntil: 'load' })
    await p.waitForFunction(() => window.__film && __film.intro >= 1, null, { timeout: 60000 }).catch(() => {})
    const beats = await p.evaluate(() => [...document.querySelectorAll('.beat[data-t]')].map(b => b.dataset.t))
    const out = []
    const levels = []
    for (const t of beats) {
      const [a, z] = t.split(':').map(Number)
      await p.evaluate(s => scrollTo({ top: __film.reelTop + s * __film.sps, behavior: 'instant' }), a + (z - a) * 0.6)
      await p.waitForTimeout(250)
      const r = await p.evaluate(t => {
        const beat = document.querySelector(`.beat[data-t="${t}"] .beat__in`)
        const nav = document.querySelector('.nav').getBoundingClientRect().bottom
        const hud = Math.min(...[...document.querySelectorAll('.scrub, .alti')].map(e => e.getBoundingClientRect()).filter(r => r.height && r.top > innerHeight * 0.6).map(r => r.top), innerHeight)
        let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity
        for (const el of beat.querySelectorAll('.kicker, .title, .hero__title, .mega, .deck, .actions, .where, .lt, .figs, .stat, .berg p, .phone-ov, .valeria-open')) {
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || el.closest('[hidden]')) continue
          const box = el.getBoundingClientRect()
          if (!box.width || !box.height) continue
          top = Math.min(top, box.top); bottom = Math.max(bottom, box.bottom); left = Math.min(left, box.left); right = Math.max(right, box.right)
        }
        const id = beat.parentElement.id || beat.parentElement.getAttribute('aria-label')
        const marks = [...beat.querySelectorAll('.berg__low > *, .berg__top > *')].map(e => e.getBoundingClientRect()).filter(r => r.height)
        const text = [...beat.querySelectorAll('.low__l .kicker > span, .low__l .w, .low__l .lt')].map(e => e.getBoundingClientRect()).filter(r => r.height)
        const clash = marks.some(m => text.some(r => m.left < r.right && r.left < m.right && m.top < r.bottom && r.top < m.bottom))
        const level = beat.style.getPropertyValue('--fit') ? 'fit ' + beat.style.getPropertyValue('--fit') : beat.classList.contains('is-tight') ? 'tight' : beat.classList.contains('is-snug') ? 'snug' : ''
        return { clash, level, id, nav: Math.round(nav), hud: Math.round(hud), top: Math.round(top), bottom: Math.round(bottom), left: Math.round(left), right: Math.round(right), W: innerWidth }
      }, t)
      const msgs = []
      if (r.top < r.nav + 4) msgs.push(`arriba ${r.nav + 4 - r.top}px bajo la barra`)
      if (r.bottom > r.hud - 4) msgs.push(`abajo ${r.bottom - r.hud + 4}px sobre la telemetría`)
      if (r.left < 0 || r.right > r.W) msgs.push(`se sale de lado (${r.left}…${r.right})`)
      if (r.clash) msgs.push('la leyenda del iceberg choca con el capítulo')
      if (msgs.length) out.push(`${r.id}: ${msgs.join(', ')}`)
      if (r.level) levels.push(`${r.id}=${r.level}`)
    }
    bad += out.length
    console.log(`${w}×${h}${lang ? ' ' + lang : ''}: ${out.length ? '\n  ' + out.join('\n  ') : 'todo cabe'}${levels.length ? '   [' + levels.join(' · ') + ']' : ''}`)
    await ctx.close()
  }
  console.log(bad ? `${bad} rótulos no caben` : 'todo cabe en todos los tamaños')
  await b.close()
})()
