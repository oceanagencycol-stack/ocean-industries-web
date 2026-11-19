/**
 * La barra de la v3: toma su fondo cuando la página se mueve, marca el enlace del tramo en pantalla, enciende la
 * barra de la E del tramo actual (los tres horizontes; en la cumbre, las tres) y se vuelve clara sobre la nieve.
 * Todo por IntersectionObserver y un solo listener de scroll pasivo que solo escribe cuando cambia algo.
 */

export function initChrome(): void {
  const html = document.documentElement
  const nav = document.querySelector<HTMLElement>('.nav')
  if (!nav) return

  // ---- el fondo de la barra ----
  let scrolled: boolean | null = null
  const paint = () => {
    const s = window.scrollY > 24
    if (s === scrolled) return
    scrolled = s
    nav.classList.toggle('is-scrolled', s)
  }
  window.addEventListener('scroll', paint, { passive: true })
  paint()

  const year = document.getElementById('year')
  if (year) year.textContent = String(new Date().getFullYear())

  if (!('IntersectionObserver' in window)) return

  // ---- el tramo en el centro de la pantalla: el enlace actual y la E ----
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('.nav__links a'))
  const horizon = document.querySelector<HTMLElement>('.horizon')
  const tramos = Array.from(document.querySelectorAll<HTMLElement>('[data-tramo]'))
  let current: HTMLElement | null = null
  const setCurrent = (el: HTMLElement) => {
    if (el === current) return
    current = el
    if (horizon) horizon.dataset.horizon = el.dataset.horizon || '0'
    const id = el.id
    links.forEach((a) => (a.getAttribute('href') === `#${id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')))
  }
  const center = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) setCurrent(e.target as HTMLElement)
    },
    { rootMargin: '-50% 0px -50% 0px' },
  )
  tramos.forEach((t) => center.observe(t))

  // ---- sobre la nieve, la barra se vuelve clara (lo que hay bajo la barra: la franja de arriba) ----
  const lights = Array.from(document.querySelectorAll<HTMLElement>('[data-light]'))
  const under = new Set<Element>()
  const top = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? under.add(e.target) : under.delete(e.target)
      html.classList.toggle('nav-light', under.size > 0)
    },
    { rootMargin: '0px 0px -94% 0px' },
  )
  lights.forEach((l) => top.observe(l))
}
