/**
 * The calendar (Cal.com): its iframe loads only when the section comes near (it weighs, and most visitors never get
 * there). The fallback inside the frame (open the calendar, book on WhatsApp) stays until it is loaded, and stays for
 * good if it can't be.
 */
import { track } from './analytics'

export function initBooking(): void {
  const frame = document.getElementById('calFrame')
  const url = frame?.dataset.cal
  if (!frame || !url) return
  let iframe: HTMLIFrameElement | null = null

  const load = () => {
    if (iframe) return
    iframe = document.createElement('iframe')
    iframe.src = `${url}${url.includes('?') ? '&' : '?'}theme=dark`
    iframe.title = 'Cal.com'
    iframe.loading = 'lazy'
    iframe.allow = 'fullscreen'
    iframe.addEventListener('load', () => frame.classList.add('is-loaded'), { once: true })
    frame.appendChild(iframe)
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        load()
      },
      { rootMargin: '80% 0px' },
    )
    io.observe(frame)
  } else load()

  // the iframe eats the clicks: the signal available is the focus moving into it
  window.addEventListener('blur', () => {
    if (iframe && document.activeElement === iframe) track('booking_interaction', { source: 'book_iframe' })
  })
}
