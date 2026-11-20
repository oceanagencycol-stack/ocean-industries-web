/**
 * La única gramática de entrada de la v3 (docs/v3/CONCEPTO.md, «Movimiento»): la luz revela la forma.
 *
 *  - Titulares ([data-reveal]): cada línea (.ln > span) sube desde detrás de su máscara mientras su interletra se
 *    asienta (de 0,04 em a la final del titular). Una línea tras otra, 110 ms.
 *  - Lo secundario ([data-rv]): 120 ms después del titular de su bloque, un barrido de luz lo descubre de izquierda a
 *    derecha (una máscara que corre, .rv-sweep). Nada de fundido genérico hacia arriba.
 *  - Las cifras ([data-count]) cuentan hasta su valor (el HTML ya dice el número real).
 *
 * Web Animations e IntersectionObserver; nada corre fuera de vista ni después de entrar (cero cuadros en reposo).
 * Movimiento reducido: todo está desde el primer cuadro. Sin JS, también (el CSS solo esconde con html.js, y tiene
 * su salida de seguridad si este módulo no llega).
 */

const EASE = 'cubic-bezier(.16,1,.3,1)'
const LINE_MS = 1300
const LINE_GAP = 110
const SECOND_DELAY = 120
const SWEEP_MS = 1100

let held = false
const waiting = new Set<Element>()

function revealTitle(el: HTMLElement, delay = 0): number {
  el.classList.add('is-in')
  const final = getComputedStyle(el).letterSpacing
  const lines = Array.from(el.querySelectorAll<HTMLElement>('.ln > span'))
  lines.forEach((ln, i) => {
    ln.animate(
      [
        { transform: 'translate3d(0,108%,0)', letterSpacing: '0.04em' },
        { transform: 'translate3d(0,0,0)', letterSpacing: final },
      ],
      { duration: LINE_MS, delay: delay + i * LINE_GAP, easing: EASE, fill: 'backwards' },
    )
  })
  return delay + Math.max(0, lines.length - 1) * LINE_GAP
}

function revealSecond(el: HTMLElement, delay: number): void {
  el.classList.add('rv-sweep')
  const a = el.animate(
    [
      { opacity: 0, maskPosition: '100% 0', webkitMaskPosition: '100% 0' },
      { opacity: 1, offset: 0.18 },
      { opacity: 1, maskPosition: '0% 0', webkitMaskPosition: '0% 0' },
    ] as Keyframe[],
    { duration: SWEEP_MS, delay, easing: EASE, fill: 'backwards' },
  )
  el.classList.add('is-in')
  const done = () => el.classList.remove('rv-sweep')
  a.finished.then(done, done)
  el.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => count(n, delay))
}

function count(el: HTMLElement, delay: number): void {
  const to = Number(el.dataset.count) || 0
  if (!to) return
  const start = performance.now() + delay
  const dur = 1400
  const tick = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / dur))
    const e = 1 - Math.pow(1 - t, 4)
    el.textContent = String(Math.round(to * e))
    if (t < 1) requestAnimationFrame(tick)
  }
  el.textContent = '0'
  requestAnimationFrame(tick)
}

/** Un bloque: su titular y, 120 ms después del arranque de su última línea, lo secundario del mismo bloque. */
function revealBlock(block: Element): void {
  const title = block.querySelector<HTMLElement>('[data-reveal]:not(.is-in)')
  let t = 0
  if (title) t = revealTitle(title) + SECOND_DELAY
  const seconds = Array.from(block.querySelectorAll<HTMLElement>('[data-rv]:not(.is-in)'))
  if (block instanceof HTMLElement && block.matches('[data-rv]:not(.is-in)')) seconds.unshift(block)
  seconds.forEach((el, i) => revealSecond(el, t + i * 90))
}

export function initReveal(): void {
  const html = document.documentElement
  html.classList.add('rv-ready')
  if (html.classList.contains('no-motion') || !('IntersectionObserver' in window) || !('animate' in Element.prototype)) {
    document.querySelectorAll('[data-reveal], [data-rv]').forEach((el) => el.classList.add('is-in'))
    return
  }
  // un bloque = la cabecera de un tramo, su pausa o la portada; lo que está fuera de esos bloques entra solo
  const blocks = Array.from(document.querySelectorAll('.hero, .head, .pause, .key'))
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        io.unobserve(e.target)
        if (held && e.target.closest('#inicio')) {
          waiting.add(e.target)
          continue
        }
        revealBlock(e.target)
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  )
  blocks.forEach((b) => io.observe(b))

  // un salto (un ancla, el menú) puede pasar por encima de un bloque sin que llegue a cruzar la pantalla: lo que
  // quedó arriba entra quieto, sin animación, para que nunca quede escondido
  const pending = new Set(blocks)
  let raf = 0
  const sweep = () => {
    raf = 0
    for (const b of pending) {
      if (b.classList.contains('is-in') || b.querySelector('[data-reveal].is-in, [data-rv].is-in')) {
        pending.delete(b)
        continue
      }
      if (b.getBoundingClientRect().bottom < 0 && !(held && b.closest('#inicio'))) {
        io.unobserve(b)
        pending.delete(b)
        b.querySelectorAll('[data-reveal], [data-rv]').forEach((el) => el.classList.add('is-in'))
        if (b.matches('[data-rv]')) b.classList.add('is-in')
      }
    }
    if (!pending.size) window.removeEventListener('scroll', onScroll)
  }
  const onScroll = () => (raf ||= requestAnimationFrame(sweep))
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

/** La portada espera a la intro: su entrada empieza cuando el negro se abre (release). */
export function holdHero(): void {
  held = true
}

export function releaseHero(): void {
  held = false
  waiting.forEach((b) => revealBlock(b))
  waiting.clear()
}
