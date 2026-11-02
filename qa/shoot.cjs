// QA visual de la página: capturas por sección en escritorio y teléfono, con los errores de consola.
// node qa/shoot.cjs <url> <carpeta> [desktop|mobile|both] [--glass] [--lang=en]
// Sin --glass la página corre sin el mar 3D (?qa=1&noglass): en el sandbox sin GPU el WebGL va lento.
const { chromium } = require('playwright')

const SECTIONS = ['hero', 'about', 'services', 'omnicanal', 'software', 'agente-vivo', 'work', 'talk', 'book', 'pay']
const SIZES = { desktop: { width: 1440, height: 900, isMobile: false }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }

;(async () => {
  const [, , url, out, which = 'both', ...flags] = process.argv
  const glass = flags.includes('--glass')
  const lang = (flags.find((f) => f.startsWith('--lang=')) || '').slice(7)
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const problems = []
  for (const name of which === 'both' ? ['desktop', 'mobile'] : [which]) {
    const ctx = await b.newContext({ viewport: { width: SIZES[name].width, height: SIZES[name].height }, isMobile: SIZES[name].isMobile, hasTouch: !!SIZES[name].hasTouch, deviceScaleFactor: SIZES[name].deviceScaleFactor || 1 })
    // the intro was seen already: straight to the page
    await ctx.addInitScript((l) => {
      try {
        localStorage.setItem('ocean-intro-at', String(Date.now()))
        if (l) localStorage.setItem('ocean-lang', l)
      } catch (e) {}
    }, lang)
    const p = await ctx.newPage()
    p.on('console', (m) => {
      const t = m.text()
      if ((m.type() === 'error' || m.type() === 'warning') && !/deprecated|GPU stall|WebGL/i.test(t)) problems.push(`[${name}] console ${m.type()}: ${t.slice(0, 240)}`)
    })
    p.on('pageerror', (e) => problems.push(`[${name}] pageerror: ${e.message}`))
    p.on('requestfailed', (r) => {
      const u = r.url()
      if (!/google|wompi|cal\.com|er-api/.test(u)) problems.push(`[${name}] requestfailed: ${u} ${r.failure()?.errorText}`)
    })
    const q = glass ? '?qa=1&q=mid&dpr=0.75' : '?qa=1&noglass'
    await p.goto(url + q, { waitUntil: 'load' })
    await p.waitForTimeout(glass ? 9000 : 1500)
    // horizontal scroll check
    const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (sx > 1) problems.push(`[${name}] horizontal overflow: ${sx}px`)
    for (const id of SECTIONS) {
      const y = await p.evaluate((id) => {
        const el = document.getElementById(id)
        if (!el) return -1
        const nav = document.querySelector('.nav')?.getBoundingClientRect().height || 0
        return Math.max(0, el.getBoundingClientRect().top + window.scrollY - (id === 'hero' ? 0 : nav))
      }, id)
      if (y < 0) {
        problems.push(`[${name}] missing #${id}`)
        continue
      }
      await p.evaluate((y) => (window.__ocean ? window.__ocean.to(y) : window.scrollTo(0, y)), y)
      await p.waitForTimeout(glass ? 3500 : 900)
      await p.screenshot({ path: `${out}/${name}-${id}.png` })
    }
    // the wave scene: one capture per step
    if (glass) {
      const steps = [0.05, 0.25, 0.48, 0.7, 0.9]
      for (const [i, f] of steps.entries()) {
        const y = await p.evaluate((f) => {
          const el = document.querySelector('.wave')
          const top = el.getBoundingClientRect().top + window.scrollY
          return top + (el.offsetHeight - window.innerHeight) * f
        }, f)
        await p.evaluate((y) => window.__ocean.to(y), y)
        await p.waitForTimeout(4000)
        await p.screenshot({ path: `${out}/${name}-wave-${i}.png` })
      }
    }
    await ctx.close()
  }
  await b.close()
  console.log(problems.length ? problems.join('\n') : 'sin problemas')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
