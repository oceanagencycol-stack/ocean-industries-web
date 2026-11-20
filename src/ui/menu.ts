/**
 * The phone menu (≤ 760 px): a full-screen disclosure under the bar. The bar's button opens and closes it
 * (aria-expanded). While it is open the rest of the page is `inert` and doesn't scroll; Escape, a link, or going back
 * to a wider screen closes it. Links are plain anchors (native scroll, scroll-padding under the bar).
 */
export interface Menu {
  close: (restoreFocus?: boolean) => void
}

export function initMenu(): Menu {
  const html = document.documentElement
  const btn = document.querySelector<HTMLButtonElement>('.nav__menu')
  const menu = document.getElementById('menu')
  if (!btn || !menu) return { close: () => {} }
  let open = false

  const outside = () => [document.querySelector('main'), document.querySelector('.footer'), document.querySelector('.fab'), document.querySelector('.skip')].filter(Boolean) as HTMLElement[]

  function show(): void {
    if (open) return
    open = true
    menu!.hidden = false
    btn!.setAttribute('aria-expanded', 'true')
    html.classList.add('is-menu-open', 'is-locked')
    outside().forEach((el) => (el.inert = true))
    menu!.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true })
  }

  function close(restoreFocus = true): void {
    if (!open) return
    open = false
    const hadFocus = menu!.contains(document.activeElement)
    menu!.hidden = true
    btn!.setAttribute('aria-expanded', 'false')
    html.classList.remove('is-menu-open', 'is-locked')
    outside().forEach((el) => (el.inert = false))
    if (restoreFocus && hadFocus) btn!.focus({ preventScroll: true })
  }

  btn.addEventListener('click', () => (open ? close() : show()))
  menu.addEventListener('click', (e) => {
    const a = (e.target as Element).closest('a')
    if (a) close(false)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      close()
    }
  })
  matchMedia('(min-width: 1081px)').addEventListener('change', (e) => e.matches && close(false))

  return { close }
}
