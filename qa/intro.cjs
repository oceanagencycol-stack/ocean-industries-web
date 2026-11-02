// La intro en cuadros: congela la cinemática (?qa=seek) y la recorre en el tiempo.
// node qa/intro.cjs <url> <carpeta> [w] [h]
const { chromium } = require('playwright')
const TIMES = [0.3, 1.0, 1.8, 2.5, 2.85, 3.3, 3.9, 4.6, 5.4, 6.6, 7.6]
;(async () => {
  const [, , url, out, w = '1280', h = '720'] = process.argv
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const p = await b.newPage({ viewport: { width: +w, height: +h } })
  const problems = []
  p.on('pageerror', (e) => problems.push('pageerror: ' + e.message))
  p.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text().slice(0, 200)))
  await p.goto(url + `?qa=seek&q=mid&dpr=${process.env.DPR || '0.5'}`, { waitUntil: 'load' })
  await p.waitForFunction(() => !!window.__oceanTl, null, { timeout: 300000, polling: 1000 })
  console.log('intro ready')
  for (const t of TIMES) {
    await p.evaluate((t) => window.__oceanTl.seek(t, false), t)
    await p.waitForTimeout(1800)
    await p.screenshot({ path: `${out}/intro-${String(t).replace('.', '_')}-${w}x${h}.png`, timeout: 120000 })
    console.log('shot', t)
  }
  await b.close()
  console.log(problems.length ? problems.join('\n') : 'sin problemas')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
