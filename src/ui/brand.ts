/**
 * La firma del pie (isotipo y logotipo en metal claro) se enciende una vez, cuando entra en pantalla: una franja de luz
 * cruza el metal (src/styles/epilogue.css). Con movimiento reducido el CSS no la anima.
 */
export function initBrand(): void {
  const footer = document.querySelector<HTMLElement>('.footer')
  const brand = footer?.querySelector('.footer__brand')
  if (!footer || !brand || !('IntersectionObserver' in window)) return
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      footer.classList.add('is-lit')
      io.disconnect()
    },
    { threshold: 0.6 },
  )
  io.observe(brand)
}
