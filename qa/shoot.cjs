// QA visual de la v3: una captura por tramo (y por los bloques que importan) en escritorio 1440×900 y teléfono
// 390×844, con los errores de consola, de red y el desborde horizontal.
// node qa/shoot.cjs <url> <carpeta> [desktop|mobile|both] [--lang=en|pt] [--world] [--full]
//   sin --world la página corre sin el mundo (?qa=1&noworld): en el sandbox sin GPU el WebGL va por software.
//   --full además guarda la página entera.
const { chromium } = require('playwright')
const fs = require('fs')

const SHOTS = ['inicio', 'senal', 'ugc', 'mar', 'agentes', 'agente-vivo', 'maquina', 'software', 'trabajo', 'work', 'hablemos', 'book', 'pay', 'footer']
const SIZES = {
  desktop: { width: 1440, height: 900, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
}

;(async () => {
  const [, , url, out, which = 'both', ...flags] = process.argv
  fs.mkdirSync(out, { recursive: true })
  const withWorld = flags.includes('--world')
  const full = flags.includes('--full')
  const lang = (flags.find((f) => f.startsWith('--lang=')) || '').slice(7)
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const problems = []
  for (const name of which === 'both' ? ['desktop', 'mobile'] : [which]) {
    const S = SIZES[name]
    const ctx = await b.newContext({ viewport: { width: S.width, height: S.height }, isMobile: S.isMobile, hasTouch: !!S.hasTouch, deviceScaleFactor: S.deviceScaleFactor || 1 })
    await ctx.addInitScript((l) => {
      try {
        localStorage.setItem('ocean-v3-intro-at', String(Date.now()))
        if (l) localStorage.setItem('ocean-lang', l)
      } catch (e) {}
    }, lang)
    const p = await ctx.newPage()
    p.on('console', (m) => {
      const t = m.text()
      const from = (m.location() && m.location().url) || ''
      if (/cal\.com|google|wompi/.test(from)) return
      if (/Permissions-Policy header: Unrecognized feature/.test(t)) return
      if ((m.type() === 'error' || m.type() === 'warning') && !/deprecated|GPU stall|WebGL|swiftshader/i.test(t)) problems.push(`[${name}] consola ${m.type()}: ${t.slice(0, 240)}`)
    })
    p.on('pageerror', (e) => problems.push(`[${name}] pageerror: ${e.message}`))
    p.on('requestfailed', (r) => {
      const u = r.url()
      const why = r.failure()?.errorText || ''
      if (/\.(webm|mp4)(\?|$)/.test(u) && /ERR_ABORTED/.test(why)) return
      if (!/google|wompi|cal\.com|er-api/.test(u)) problems.push(`[${name}] requestfailed: ${u} ${why}`)
    })
    const q = withWorld ? '?qa=1&world' : '?qa=1&noworld'
    // el idioma va en la URL (/en, /pt), que manda sobre lo guardado
    await p.goto(new URL(lang || '.', url.replace(/\/?$/, '/')).href + q, { waitUntil: 'load' })
    await p.waitForTimeout(withWorld ? 6000 : 1800)
    const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (sx > 1) problems.push(`[${name}] desborde horizontal: ${sx}px`)
    // la portada: su entrada debe haber terminado (el titular visible)
    const heroIn = await p.evaluate(() => !!document.querySelector('#hero-title.is-in'))
    if (!heroIn) problems.push(`[${name}] el titular de la portada no entró`)
    for (const id of SHOTS) {
      const y = await p.evaluate((id) => {
        const el = id === 'footer' ? document.querySelector('.footer') : document.getElementById(id)
        if (!el) return -1
        const nav = id === 'inicio' ? 0 : document.querySelector('.nav').getBoundingClientRect().height
        const top = el.getBoundingClientRect().top + window.scrollY
        return Math.max(0, id === 'footer' ? document.documentElement.scrollHeight - window.innerHeight : top - nav)
      }, id)
      if (y < 0) {
        problems.push(`[${name}] falta #${id}`)
        continue
      }
      await p.evaluate((y) => window.__ocean.to(y), y)
      // la entrada de cada bloque dura ~1,6 s
      await p.waitForTimeout(withWorld ? 3500 : 1900)
      await p.screenshot({ path: `${out}/${name}-${id}.png` })
    }
    // nada quedó escondido por la entrada (todo lo que está en el documento entró al pasar)
    const hidden = await p.evaluate(() =>
      Array.from(document.querySelectorAll('[data-reveal]:not(.is-in), [data-rv]:not(.is-in)')).map((e) => e.id || e.className || e.tagName),
    )
    if (hidden.length) problems.push(`[${name}] bloques sin entrar tras el recorrido: ${hidden.join(', ')}`)
    if (full) {
      await p.evaluate(() => window.__ocean.to(0))
      await p.waitForTimeout(400)
      await p.screenshot({ path: `${out}/${name}-pagina.png`, fullPage: true })
    }
    await ctx.close()
  }
  await b.close()
  console.log(problems.length ? problems.join('\n') : 'sin problemas')
  process.exit(problems.length ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
