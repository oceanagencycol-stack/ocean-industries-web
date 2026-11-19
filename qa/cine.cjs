// node qa/cine.cjs http://localhost:4175/
const assert = require('node:assert/strict')
const { chromium } = require('playwright')

const base = process.argv[2] ?? 'http://localhost:4175/'
const chapters = [
  ['inicio', 'espacio'],
  ['senal', 'satelite'],
  ['mar', 'mar'],
  ['agentes', 'agua'],
  ['maquina', 'maquina'],
  ['trabajo', 'emerge'],
  ['hablemos', 'cumbre'],
]

async function waitForShot(page, name) {
  await page.waitForFunction((file) => {
    const video = document.querySelector('.plate__frame.is-playing video')
    return video?.currentSrc.endsWith(`/${file}.mp4`) && video.currentTime > 0
  }, name)
}

async function run() {
  const browser = await chromium.launch()
  try {
    const requests = new Set()
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = []
    desktop.on('pageerror', (error) => errors.push(error.message))
    desktop.on('request', (request) => {
      if (/\/v3\/cine\/[^/]+\.mp4$/.test(request.url())) requests.add(new URL(request.url()).pathname)
    })
    await desktop.goto(new URL('?qa=1', base).href)
    await waitForShot(desktop, 'espacio')
    assert.deepEqual([...requests], ['/v3/cine/espacio.mp4'], 'solo la portada pide video al inicio')
    assert.equal(await desktop.locator('.plate__motion').evaluate((v) => v.muted && v.playsInline), true)
    const frame = desktop.locator('#inicio .plate__frame')
    const scale = await frame.evaluate((el) => Number(el.style.getPropertyValue('--scene-scale')))
    await desktop.mouse.wheel(0, 200)
    await desktop.waitForFunction(
      (before) => Number(document.querySelector('#inicio .plate__frame').style.getPropertyValue('--scene-scale')) > before,
      scale,
    )

    for (const [id, shot] of chapters.slice(1)) {
      await desktop.locator('#' + id).evaluate((el) => el.scrollIntoView({ behavior: 'instant' }))
      await waitForShot(desktop, shot)
      assert.equal(await desktop.locator('.plate__motion').count(), 1, `una sola toma en ${id}`)
      assert.equal(await desktop.locator('#' + id + ' .plate img').evaluate((img) => img.complete && img.naturalWidth > 0), true)
    }
    assert.equal(requests.size, chapters.length)

    const pause = desktop.locator('.nav [data-motion-toggle]')
    await pause.click()
    assert.equal(await pause.getAttribute('aria-pressed'), 'true')
    assert.equal(await desktop.locator('.nav [data-sound-toggle]').getAttribute('aria-pressed'), 'false')
    assert.equal(await desktop.locator('.plate__motion').count(), 0)
    await desktop.goto(new URL('?qa=1#hablemos', base).href)
    await desktop.reload()
    await pause.waitFor()
    assert.equal(await pause.getAttribute('aria-pressed'), 'true', 'la pausa persiste al recargar')
    await pause.click()
    await waitForShot(desktop, 'cumbre')
    assert.deepEqual(errors, [])

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await mobile.goto(new URL('?qa=1#agentes', base).href)
    await waitForShot(mobile, 'agua-v')
    assert.equal(await mobile.locator('#agentes .plate img').evaluate((img) => /-v\./.test(img.currentSrc)), true)
    await mobile.emulateMedia({ reducedMotion: 'reduce' })
    await mobile.waitForFunction(() => !document.querySelector('.plate__motion'))
    assert.equal(await mobile.locator('.nav [data-motion-toggle]').isVisible(), false)

    const reduced = await browser.newPage({ reducedMotion: 'reduce' })
    let loadedVideo = false
    reduced.on('request', (request) => { loadedVideo ||= /\/v3\/cine\/[^/]+\.mp4$/.test(request.url()) })
    await reduced.goto(new URL('?qa=1', base).href)
    await reduced.locator('#inicio .plate img').evaluate((img) => img.decode())
    assert.equal(loadedVideo, false, 'movimiento reducido conserva la placa desde la primera visita')

    const saver = await browser.newPage()
    await saver.addInitScript(() => Object.defineProperty(navigator, 'connection', {
      value: { saveData: true, effectiveType: '4g' },
    }))
    await saver.goto(new URL('?qa=1', base).href)
    await saver.locator('#inicio .plate img').evaluate((img) => img.decode())
    assert.equal(await saver.locator('.plate__motion').count(), 0, 'ahorro de datos conserva la placa')

    console.log('cine: siete tomas, una sola activa, encuadre vertical, pausa y movimiento reducido')
  } finally {
    await browser.close()
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
