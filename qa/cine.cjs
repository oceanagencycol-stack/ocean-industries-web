// Checks the actual decoded time of the one master as the visitor scrolls,
// including reverse motion, native playback, deep links and static fallbacks.
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const timing = require('../src/v3/film-timing.json')
const at = (i) => timing.opening + (timing.anchors[1] - timing.opening) * i
const base = process.argv[2] || 'http://localhost:4175/'

async function run() {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(base)
    await page.waitForSelector('html.has-world')
    assert.equal(await page.locator('#film').evaluate((v) => v.videoWidth), 1440)
    const go = async (i, t) => {
      await page.evaluate(
        (i) =>
          window.scrollTo({ top: i * document.querySelector('.film-shot').offsetHeight, behavior: 'instant' }),
        i,
      )
      await page.waitForFunction((t) => {
        const v = document.getElementById('film')
        return v.readyState >= 2 && !v.seeking && Math.abs(t - v.currentTime) < 0.18
      }, t)
    }
    await page.mouse.wheel(0, 150)
    await page.waitForFunction(() => scrollY > 75)
    for (const i of [1, 2.2, 2.6, 3, 5, 4.2, 1.85]) await go(i, at(i))
    // Verify visible reverse frames, not just a requested HTMLMediaElement time.
    await go(2.4, at(2.4))
    const reverse = await page.evaluate(async () => {
      const surface = document.querySelector('.film-frames')
      const initial = scrollY
      const frames = new Set()
      let first, last
      await new Promise((resolve) => {
        const begin = performance.now()
        function scrub(now) {
          const progress = Math.min(1, (now - begin) / 1200)
          window.scrollTo({ top: initial - progress * innerHeight * 0.23, behavior: 'instant' })
          if (!surface.hidden && surface.dataset.frame) {
            last = Number(surface.dataset.frame)
            first ??= last
            frames.add(last)
          }
          if (progress < 1) requestAnimationFrame(scrub)
          else resolve()
        }
        requestAnimationFrame(scrub)
      })
      return { count: frames.size, first, last }
    })
    assert.ok(reverse.count >= 8 && reverse.first > reverse.last, 'la lente muestra el recorrido inverso')
    await go(1.2, at(1.2))
    await page.locator('.transport-play').click()
    await page.waitForFunction(() => !document.querySelector('#film').paused)
    const beforeWheel = await page.evaluate(() => scrollY)
    await page.mouse.wheel(0, 270)
    await page.waitForFunction((y) => document.querySelector('#film').paused && scrollY > y + 150, beforeWheel)
    await go(3, at(3))
    await page.locator('#agentes .film-link').click()
    assert.ok(await page.locator('#agente-vivo').isVisible())
    assert.equal(await page.locator('[data-dossier]:visible').count(), 1)
    await page.locator('[data-dossier]:visible .film-back').click()
    assert.equal(await page.locator('[data-dossier]:visible').count(), 0)
    await page.waitForFunction(() => document.querySelector('#agentes .on-camera'))
    await page.locator('.nav [data-motion-toggle]').click()
    assert.equal(await page.locator('#film').getAttribute('src'), null)
    await page.reload()
    await page.locator('.nav [data-motion-toggle]').click()
    await page.waitForSelector('html.has-world')
    assert.deepEqual(errors, [])

    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    await phone.goto(new URL('#agentes', base).href)
    await phone.waitForFunction((t) => Math.abs(document.querySelector('#film').currentTime - t) < 0.18, at(3))
    assert.ok((await phone.locator('#film').getAttribute('src')).endsWith('vertical.mp4'))
    await phone.emulateMedia({ reducedMotion: 'reduce' })
    await phone.waitForFunction(() => !document.querySelector('#film').hasAttribute('src'))
    await phone.goto(new URL('#pay', base).href)
    assert.ok(await phone.locator('#pay').isVisible())
    const saver = await browser.newPage()
    await saver.addInitScript(() =>
      Object.defineProperty(navigator, 'connection', { value: { saveData: true } }),
    )
    await saver.goto(base)
    assert.equal(await saver.locator('#film').getAttribute('src'), null)
    await saver.locator('#inicio .plate img').evaluate((i) => i.decode())
    console.log(
      'Máster H.264, reloj nativo, avance y retroceso, lectura, anclas, móvil, pausa y ahorro de datos.',
    )
  } finally {
    await browser.close()
  }
}
run().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
