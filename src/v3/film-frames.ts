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
  let group = -1,
    lastFrame = -1,
    direction = 1,
    drawn = -1,
    disposed = false
  const path = '/v3/film/' + edition + '/'
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
  function seek(time: number): boolean {
    const n = Math.min(count - 1, Math.max(0, Math.round(time * timing.fps)))
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
    const image = cache.get(index)
    if (!image) return false
    if (drawn !== n) {
      const w = image.naturalWidth / 4,
        h = image.naturalHeight / 2
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      context!.drawImage(image, (n % 4) * w, Math.floor((n % framesPerSheet) / 4) * h, w, h, 0, 0, w, h)
      drawn = n
      canvas.dataset.frame = String(n)
    }
    return true
  }
  return {
    seek,
    dispose() {
      disposed = true
      pending.forEach((image) => image.removeAttribute('src'))
      pending.clear()
      cache.clear()
      canvas.hidden = true
      delete canvas.dataset.frame
      canvas.width = canvas.height = 1
    },
  }
}
