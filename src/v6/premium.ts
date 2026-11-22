/**
 * v6 · Detalle premium (estilos en src/styles/v6-premium.css).
 *
 *  - Botones vivos: atracción magnética hacia el puntero, una luz que lo sigue (y en los de contorno, el borde que se
 *    enciende donde está el puntero), el texto que rueda al pasar, el ícono que se mueve y una onda de luz al presionar.
 *  - Luz que sigue al puntero en las filas de servicios, los casos y las preguntas.
 *  - Entrada del epílogo: los titulares suben desde su máscara, lo secundario entra con un barrido de luz, las filas y
 *    los casos en cascada (la línea se dibuja, la foto se abre con un acercamiento lento).
 *  - Las preguntas abren y cierran con altura animada.
 *  - Un cursor fino (anillo) que crece sobre lo que se puede tocar.
 *
 * Todo con transform/opacity; nada corre en reposo. Movimiento reducido: todo quieto y visible desde el primer cuadro.
 * Sin JS no se esconde nada (el estado oculto solo existe con html.p-ready). Salida de seguridad a los 4 s.
 */

const EASE = 'cubic-bezier(.16,1,.3,1)'

export function initPremium(reduced: boolean): void {
  const html = document.documentElement
  wrapLabels()
  if (reduced || !('animate' in Element.prototype)) return
  html.classList.add('p-ready')
  entrances()
  faq()
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!fine) return
  magnetic()
  spotlights()
  cursor()
}

/** El texto de cada botón va en una ventana de una línea: al pasar, rueda y entra su copia (text-shadow). */
function wrapLabels(): void {
  document.querySelectorAll<HTMLElement>('.btn').forEach((btn) => {
    if (btn.querySelector('.btn__lbl')) return
    const label = [...btn.children].find((c) => c.tagName === 'SPAN' && !c.classList.contains('ico')) as HTMLElement | undefined
    if (!label) return
    const box = document.createElement('span')
    box.className = 'btn__lbl'
    label.replaceWith(box)
    box.append(label)
    label.classList.add('btn__txt')
  })
}

/* ---------------------------------------------------------------- botones */
function magnetic(): void {
  const buttons = [...document.querySelectorAll<HTMLElement>('.btn:not(:disabled)')]
  for (const b of buttons) {
    let raf = 0
    let tx = 0, ty = 0, mx = 0, my = 0
    const apply = () => {
      raf = 0
      b.style.setProperty('--mx', `${mx}px`)
      b.style.setProperty('--my', `${my}px`)
      b.style.setProperty('--tx', `${tx.toFixed(2)}px`)
      b.style.setProperty('--ty', `${ty.toFixed(2)}px`)
    }
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect()
      mx = e.clientX - r.left
      my = e.clientY - r.top
      const k = Math.min(1, 46 / Math.max(r.width, 46))
      tx = Math.max(-6, Math.min(6, (mx - r.width / 2) * 0.22 * k))
      ty = Math.max(-4, Math.min(4, (my - r.height / 2) * 0.3))
      b.classList.add('is-hot')
      raf ||= requestAnimationFrame(apply)
    })
    b.addEventListener('pointerleave', () => {
      tx = ty = 0
      b.classList.remove('is-hot')
      raf ||= requestAnimationFrame(apply)
    })
    b.addEventListener('pointerdown', (e) => {
      const r = b.getBoundingClientRect()
      const s = document.createElement('span')
      s.className = 'btn__ripple'
      const d = Math.hypot(r.width, r.height) * 2
      s.style.cssText = `left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px;width:${d}px;height:${d}px`
      b.append(s)
      s.animate([{ transform: 'scale(0)', opacity: 0.38 }, { transform: 'scale(1)', opacity: 0 }], { duration: 720, easing: EASE }).finished.then(
        () => s.remove(),
        () => s.remove(),
      )
    })
  }
}

/** Filas, casos y preguntas: una luz suave donde está el puntero. */
function spotlights(): void {
  const sel = '.svcx__list a, .epi .case, .faqx__list details, .lt, .footer__nav a'
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = (e.target as Element | null)?.closest?.(sel) as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--sx', `${(e.clientX - r.left).toFixed(0)}px`)
      el.style.setProperty('--sy', `${(e.clientY - r.top).toFixed(0)}px`)
    },
    { passive: true },
  )
}

/* ---------------------------------------------------------------- entradas */
function entrances(): void {
  const groups: [string, string][] = [
    ['.epi .work__title, .epi .reels__title, .epi .snow__title', 'title'],
    ['.epi .work__head > p, .epi .reels__head > p, .epi .snow__head > p, .epi .svcx__more, .epi .cases__more', 'sweep'],
    ['.epi .svcx__list > li, .epi .faqx__list > details', 'row'],
    ['.epi .case', 'case'],
    ['.epi .reel, .epi .book__frame, .epi .book__alt, .epi .pay form, .epi .pay .sum', 'rise'],
    ['.footer__brand, .footer__cols > *', 'rise'],
  ]
  const items: HTMLElement[] = []
  for (const [sel, kind] of groups) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      if (el.dataset.p) return
      el.dataset.p = kind
      // cascada: el índice dentro de su lista
      const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => (c as HTMLElement).dataset?.p === kind) : []
      el.style.setProperty('--i', String(Math.max(0, sibs.indexOf(el))))
      items.push(el)
    })
  }
  const pending = new Set(items)
  let raf = 0
  const check = () => {
    raf = 0
    const vh = innerHeight
    for (const el of pending) {
      const r = el.getBoundingClientRect()
      if (r.top < vh * 0.9 && r.height + r.top > 0) {
        el.classList.add('p-in')
        pending.delete(el)
      } else if (r.bottom <= 0) {
        // quedó arriba por un salto: entra quieto
        el.classList.add('p-in', 'p-now')
        pending.delete(el)
      }
    }
    if (!pending.size) removeEventListener('scroll', onScroll)
  }
  const onScroll = () => (raf ||= requestAnimationFrame(check))
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onScroll, { passive: true })
  check()
  // salida de seguridad: lo que está en pantalla nunca se queda escondido
  setTimeout(check, 4000)
}

/* ---------------------------------------------------------------- preguntas */
function faq(): void {
  document.querySelectorAll<HTMLDetailsElement>('.faqx__list details').forEach((d) => {
    const summary = d.querySelector('summary')
    if (!summary) return
    let anim: Animation | null = null
    summary.addEventListener('click', (e) => {
      e.preventDefault()
      anim?.cancel()
      const start = d.offsetHeight
      const opening = !d.open
      if (opening) d.open = true
      const end = opening ? d.scrollHeight : summary.offsetHeight
      d.style.overflow = 'hidden'
      anim = d.animate([{ height: `${start}px` }, { height: `${end}px` }], { duration: opening ? 520 : 380, easing: EASE })
      const body = d.querySelector('p')
      if (opening && body) body.animate([{ opacity: 0, transform: 'translate3d(0,8px,0)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 80, easing: EASE, fill: 'backwards' })
      const done = () => {
        if (!opening) d.open = false
        d.style.overflow = ''
        anim = null
      }
      anim.onfinish = done
    })
  })
}

/* ---------------------------------------------------------------- cursor */
function cursor(): void {
  const ring = document.createElement('div')
  ring.className = 'cursor'
  ring.setAttribute('aria-hidden', 'true')
  document.body.append(ring)
  let x = -100, y = -100, cx = -100, cy = -100, raf = 0, shown = false
  const tick = () => {
    cx += (x - cx) * 0.22
    cy += (y - cy) * 0.22
    ring.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`
    raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(tick) : 0
  }
  const hot = 'a, button, summary, [role="button"], label, select, .reel'
  const text = 'input, textarea, [contenteditable="true"]'
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      if (!shown) {
        cx = x
        cy = y
        ring.classList.add('is-on')
        shown = true
      }
      const t = e.target as Element
      ring.classList.toggle('is-hot', !!t.closest?.(hot))
      ring.classList.toggle('is-text', !!t.closest?.(text))
      raf ||= requestAnimationFrame(tick)
    },
    { passive: true },
  )
  // al salir de la ventana o entrar en un marco (la agenda de Cal.com) el anillo se apaga
  document.addEventListener('mouseout', (e) => {
    if (e.relatedTarget) return
    ring.classList.remove('is-on')
    shown = false
  })
  addEventListener('pointerdown', () => ring.classList.add('is-down'), { passive: true })
  addEventListener('pointerup', () => ring.classList.remove('is-down'), { passive: true })
}
