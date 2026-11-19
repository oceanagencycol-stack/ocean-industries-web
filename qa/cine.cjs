// node qa/cine.cjs http://localhost:4175/
const assert = require('node:assert/strict')
const { chromium } = require('playwright')

const base = process.argv[2] ?? 'http://localhost:4175/'

async function run() {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = []
    const requests = new Set()
    desktop.on('pageerror', (error) => errors.push(error.message))
    desktop.on('request', (request) => {
      if (/\/v3\/secuencia\/[^/]+\.webp$/.test(request.url())) requests.add(new URL(request.url()).pathname)
    })
    await desktop.goto(new URL('?qa=1', base).href)
    await desktop.locator('html.has-world').waitFor()
    await desktop.waitForFunction(() => window.__ocean.world.isSleeping)
    assert.ok(requests.has('/v3/secuencia/espacio.webp'))
    assert.ok(requests.size <= 2, 'la portada difiere los fotogramas lejanos')
    assert.equal(await desktop.locator('canvas.world').count(), 1)
    assert.equal(await desktop.locator('.plate video').count(), 0)

    const cursor = () => desktop.evaluate(() => window.__ocean.world.shot)
    const to = (progress) => desktop.evaluate((position) => {
      const track = window.__ocean.world.scrollTrack
      window.__ocean.to(track.scrollFor(position))
    }, progress)
    const near = (progress) => desktop.waitForFunction(
      (position) => Math.abs(window.__ocean.world.shot - position) < 0.007,
      progress,
    )

    // Medir varias posiciones dentro del mismo cruce, ida y vuelta, sin posar
    // el motor con su API de pruebas. Así se verifica el control real por scroll.
    for (const position of [0.12, 0.35, 0.39, 0.42, 0.47, 0.58, 0.74, 0.94, 0.44, 0.41, 0.37, 0]) {
      await to(position)
      await near(position)
    }
    assert.ok(await cursor() < 0.007)
    assert.equal(await desktop.locator('canvas.world').count(), 1)
    assert.deepEqual(errors, [])

    const pause = desktop.locator('.nav [data-motion-toggle]')
    await pause.click()
    await desktop.locator('html.motion-paused').waitFor()
    await desktop.locator('html.has-world').waitFor({ state: 'detached' })
    assert.equal(await pause.getAttribute('aria-pressed'), 'true')
    assert.equal(await desktop.locator('.nav [data-sound-toggle]').getAttribute('aria-pressed'), 'false')
    await desktop.reload()
    await pause.waitFor()
    assert.equal(await pause.getAttribute('aria-pressed'), 'true', 'la pausa persiste al recargar')
    await pause.click()
    await desktop.locator('html.has-world').waitFor()

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const portrait = mobile.waitForResponse((res) => /\/v3\/secuencia\/agua-v\.webp$/.test(res.url()) && res.ok())
    await mobile.goto(new URL('?qa=1#agentes', base).href)
    await mobile.locator('html.has-world').waitFor()
    await portrait
    await mobile.waitForFunction(() => Math.abs(window.__ocean.world.shot - 0.5) < 0.025)
    await mobile.emulateMedia({ reducedMotion: 'reduce' })
    await mobile.locator('html.has-world').waitFor({ state: 'detached' })
    assert.equal(await mobile.locator('.nav [data-motion-toggle]').isVisible(), false)

    const saver = await browser.newPage()
    await saver.addInitScript(() => Object.defineProperty(navigator, 'connection', {
      value: { saveData: true, effectiveType: '4g' },
    }))
    await saver.goto(new URL('?qa=1', base).href)
    await saver.locator('#inicio .plate img').evaluate((img) => img.decode())
    assert.equal(await saver.locator('html.has-world').count(), 0, 'ahorro de datos conserva la placa')
    console.log('Cámara continua, posiciones de scroll reversibles, carga cercana, retrato, pausa y respaldos.')
  } finally {
    await browser.close()
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
