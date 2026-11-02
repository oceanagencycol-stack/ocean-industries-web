// QA del mar y el cristal: posa el escenario (dev-stage.html) y toma capturas.
// node qa/stage_shot.cjs <url> <outdir> [w] [h] [poses...]
const { chromium } = require('playwright')
const POSES = {
  hero: { },
  intro0: { layout: 0, rise: 0, sea: 0.15, swell: 0, crest: 0, dolly: 0, interactive: 0, settle: 0, sweep: 0, env: 0.4, backdrop: 0.25 },
  introSwell: { layout: 0, rise: 0, sea: 0.8, swell: 0.85, crest: 0.85, dolly: 0.3, interactive: 0, settle: 0, env: 0.7, backdrop: 0.3 },
  introBreak: { layout: 0, rise: 0.55, sea: 1, swell: 0.6, crest: 1, breaking: 0.9, dolly: 0.5, interactive: 0, env: 1, backdrop: 1, flash: 0.5 },
  introRisen: { layout: 0, rise: 1, sea: 1, swell: 0, crest: 1, breaking: 0.2, dolly: 0.9, interactive: 0, settle: 0.8, sweep: 1, env: 1, backdrop: 1, wordShift: 1 },
  dive1: { away: 1, dive: 1, swell: 0.35, crest: 0.2, layout: 1 },
  dive2: { away: 1, dive: 1, swell: 1, crest: 0.62, layout: 1 },
  dive3: { away: 1, dive: 1, swell: 0.8, crest: 0.85, breaking: 1, layout: 1 },
  result: { result: 1 },
}
;(async () => {
  const [, , url, out, w = '1280', h = '720', ...poses] = process.argv
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const p = await b.newPage({ viewport: { width: +w, height: +h } })
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 300)) })
  p.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await p.goto(url, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 240000 })
  for (const name of poses.length ? poses : Object.keys(POSES)) {
    const pose = POSES[name]
    await p.evaluate((pose) => {
      const st = window.__st
      Object.assign(st.state, { sea: 1, rise: 1, sweep: 1, env: 1, backdrop: 1, settle: 1, dolly: 1, layout: 1, interactive: 1, swell: 0, crest: 0, breaking: 0, away: 0, dive: 0, flash: 0, result: 0, wordShift: 0, calm: 0 }, pose)
    }, pose)
    await p.waitForTimeout(2500)
    await p.screenshot({ path: `${out}/${name}-${w}x${h}.png` })
    console.log('shot', name)
  }
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
