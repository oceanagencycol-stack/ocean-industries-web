// La imagen para compartir (public/og.jpg, 1200×630): el mar con la firma de cristal, centrada.
// node qa/og.cjs <url de dev-stage.html> <salida.png>   (luego se pasa a JPG)
const { chromium } = require('playwright')
;(async () => {
  const [, , url, out] = process.argv
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
  await p.goto(url + '?q=mid&dpr=1', { waitUntil: 'load' })
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 300000, polling: 1000 })
  await p.evaluate(() => {
    const st = window.__st
    Object.assign(st.state, { sea: 1, rise: 1, sweep: 1, env: 1, backdrop: 1, settle: 1, dolly: 1, layout: 0, wordShift: 0.35, interactive: 0, swell: 0, crest: 0, breaking: 0, away: 0, dive: 0, flash: 0, result: 0, calm: 0 })
  })
  await p.waitForTimeout(6000)
  await p.screenshot({ path: out, timeout: 120000 })
  await b.close()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
