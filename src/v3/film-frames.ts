import timing from './film-timing.json'

const framesPerSheet = 8
const count = timing.duration * timing.fps
/** A reversible eight-frame window into the same film as the native player.
 * Decoded sheets are bounded. A quick fling cancels requests left behind. */
export function frameWindow(canvas: HTMLCanvasElement, edition: string, repaint: () => void) {
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) return null
  const cache = new Map<number, HTMLImageElement>()
  const pending = new Map<number, HTMLImageElement>()
  const failures = new Map<number, number>()
  const guide = new Image()
  guide.decoding = 'async'
  guide.fetchPriority = 'low'
  let guideReady = false
  let sharp = false
  let group = -1,
    lastFrame = -1,
    direction = 1,
    drawn = -1,
    disposed = false
  const path = '/v3/film/' + edition + '/'
  const w = edition === 'vertical' ? 400 : 768
  const h = edition === 'vertical' ? 642 : 432
  const frameAt = (time: number) => Math.min(count - 1, Math.max(0, Math.round(time * timing.fps)))
  canvas.width = w
  canvas.height = h
  function warm() {
    if (guide.hasAttribute('src')) return
    guide.src = path + 'guia.jpg'
    guide.decode().then(
      () => {
        if (disposed) return
        guideReady = true
        repaint()
      },
      () => { /* The native film and detailed sheets are independently available. */ },
    )
  }
  function load(index: number) {
    if (
      index < 0 ||
      index >= Math.ceil(count / framesPerSheet) ||
      pending.has(index) ||
      cache.has(index) ||
      performance.now() - (failures.get(index) ?? -6000) < 5000
    )
      return
    const image = new Image()
    image.decoding = 'async'
    image.fetchPriority = index === group ? 'high' : 'auto'
    pending.set(index, image)
    image.src = path + String(index).padStart(3, '0') + '.webp'
    image
      .decode()
      .then(() => {
        if (disposed || pending.get(index) !== image) return
        pending.delete(index)
        if (Math.abs(group - index) <= 1) cache.set(index, image)
        if (group === index) repaint()
      })
      .catch(() => {
        if (pending.get(index) === image) {
          pending.delete(index)
          failures.set(index, performance.now())
        }
      })
  }
  function prime(n: number) {
    const index = Math.floor(n / framesPerSheet)
    if (lastFrame !== n) direction = n > lastFrame ? 1 : -1
    lastFrame = n
    if (index !== group) {
      group = index
      for (const k of cache.keys()) if (Math.abs(k - index) > 1) cache.delete(k)
      for (const [k, image] of pending) {
        if (Math.abs(k - index) <= 1) continue
        pending.delete(k)
        image.removeAttribute('src')
      }
    }
    load(index)
    load(index + direction)
    load(index - direction)
    return index
  }
  function seek(time: number): boolean {
    const n = frameAt(time)
    const index = prime(n)
    const image = cache.get(index)
    if (!image && !guideReady) return false
    // A fling can cross a cold sheet before it decodes. The small contact
    // sheet covers the whole edit, including reverse travel on a cold cache.
    const precise = !!image
    const source = image ?? guide
    const cell = precise ? n % framesPerSheet : Math.floor(n / 3)
    const columns = precise ? 4 : 16
    const sw = source.naturalWidth / columns
    const sh = source.naturalHeight / (precise ? 2 : 28)
    const actual = precise ? n : cell * 3
    if (drawn !== actual || sharp !== precise) {
      context!.drawImage(source, (cell % columns) * sw, Math.floor(cell / columns) * sh, sw, sh, 0, 0, w, h)
      drawn = actual
      sharp = precise
      canvas.dataset.frame = String(actual)
    }
    return true
  }
  return {
    warm,
    primeAt(time: number) {
      prime(frameAt(time))
    },
    seek,
    dispose() {
      disposed = true
      guide.removeAttribute('src')
      pending.forEach((image) => image.removeAttribute('src'))
      pending.clear()
      cache.clear()
      canvas.hidden = true
      delete canvas.dataset.frame
      canvas.width = canvas.height = 1
    },
  }
}
