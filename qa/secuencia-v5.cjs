// node qa/secuencia-v5.cjs http://localhost:4175/
// Measures the frame actually submitted to the compositor by the v5 shader.
const { chromium } = require('playwright')

function observeStage() {
  const native = WebGL2RenderingContext.prototype
  const uniforms = new WeakMap()
  const frames = new WeakMap()
  const bindings = []
  let unit = 0
  let mix = 0
  let velocity = 0
  window.stageSamples = null

  function observe(name, callback) {
    const call = native[name]
    native[name] = function (...args) {
      const result = call.apply(this, args)
      callback(this, args, result)
      return result
    }
  }

  observe('getUniformLocation', (_, args, location) => {
    if (location) uniforms.set(location, args[1])
  })
  observe('activeTexture', (gl, args) => { unit = args[0] - gl.TEXTURE0 })
  observe('bindTexture', (_, args) => { bindings[unit] = args[1] })
  observe('uniform1f', (_, [location, value]) => {
    if (uniforms.get(location) === 'uMix') mix = value
    if (uniforms.get(location) === 'uVel') velocity = value
  })
  for (const upload of ['texImage2D', 'texSubImage2D']) {
    observe(upload, (_, args) => {
      const source = args.at(-1)
      if (source instanceof HTMLVideoElement) frames.set(bindings[unit], Math.floor(source.currentTime * 24 + 0.001))
    })
  }
  observe('drawArrays', (gl, args) => {
    if (!window.stageSamples || args[0] !== gl.TRIANGLES) return
    const first = frames.get(bindings[0]) ?? -1
    const next = frames.get(bindings[1]) ?? first
    const target = Math.min(67.5, Math.max(0, (scrollY - __film.reelTop) / __film.sps))
    window.stageSamples.push([performance.now(), first + (next - first) * mix, Math.abs(__film.t - target), Math.abs(velocity)])
  })
}

async function measure(page, from, to, seconds) {
  await page.evaluate(t => scrollTo({ top: __film.reelTop + t * __film.sps, behavior: 'instant' }), from)
  await page.waitForTimeout(900)
  return page.evaluate(async ({ from, to, seconds }) => {
    window.stageSamples = []
    const start = performance.now()
    await new Promise(resolve => {
      function move(now) {
        const progress = Math.min(1, Math.max(0, (now - start) / (seconds * 1000)))
        const t = from + (to - from) * progress
        scrollTo({ top: __film.reelTop + t * __film.sps, behavior: 'instant' })
        if (progress < 1) requestAnimationFrame(move)
        else resolve()
      }
      requestAnimationFrame(move)
    })
    const samples = window.stageSamples
    window.stageSamples = null
    let changed = start
    let prior = samples[0]?.[1]
    let longest = 0
    let updates = 0
    let error = 0
    let blur = 0
    for (const [now, position, diff, speed] of samples) {
      error = Math.max(error, diff)
      blur = Math.max(blur, speed)
      if (Math.abs(position - prior) < 0.01) continue
      updates++
      longest = Math.max(longest, now - changed)
      changed = now
      prior = position
    }
    return { from, to, draws: samples.length, updates, maxHoldMs: Math.round(Math.max(longest, performance.now() - changed)), maxClockError: error, maxBlur: blur }
  }, { from, to, seconds })
}

async function main() {
  const url = new URL(process.argv[2] || 'http://localhost:4175/')
  url.searchParams.set('qa', '1')
  const browser = await chromium.launch()
  try {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 })
      await page.addInitScript(observeStage)
      await page.goto(url.href)
      await page.waitForFunction(() => window.__film?.intro === 1)
      await page.waitForSelector('.pre', { state: 'detached' })
      for (const [from, to, seconds] of [[12, 16, 5], [16, 12, 5], [12, 50, 4], [50, 12, 4]]) {
        console.log(width, await measure(page, from, to, seconds))
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
