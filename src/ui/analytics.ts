/**
 * OceanAnalytics: one measuring layer (GA4, G-X204J5B0PQ, anonymize_ip). It measures behaviour and never feeds a
 * number shown on the site. The event names are the first site's, so the reports carry on: page_view (GA's own),
 * section_view, cta_click, contact_interaction and booking_interaction; plus chat_open, payment_start and
 * payment_approved. gtag loads after the page is painted (a module, no inline script: the CSP stays strict).
 */
type Gtag = (...args: unknown[]) => void
const GA_ID = 'G-X204J5B0PQ'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

export function track(name: string, params: Record<string, unknown>): void {
  window.gtag?.('event', name, params)
}

export function initAnalytics(): void {
  // only the real site measures: previews, local runs and QA don't pollute Ocean's numbers
  const host = location.hostname
  if (new URLSearchParams(location.search).has('qa') || !/(^|\.)oceanindustries\.com\.co$/.test(host)) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { anonymize_ip: true })
  const load = () => {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    document.head.appendChild(s)
  }
  if (document.readyState === 'complete') window.setTimeout(load, 0)
  else window.addEventListener('load', () => window.setTimeout(load, 0), { once: true })

  // section_view: once per section, when 40 % of it is on screen
  const seen = new Set<string>()
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          const id = (e.target as HTMLElement).id
          if (!e.isIntersecting || seen.has(id)) return
          seen.add(id)
          io.unobserve(e.target)
          track('section_view', { section: id })
        }),
      { threshold: 0.4 },
    )
    document.querySelectorAll('main section[id]').forEach((s) => io.observe(s))
  }

  // one listener for every click (it also covers what arrives later: the reels, the chat)
  document.addEventListener(
    'click',
    (ev) => {
      const a = (ev.target as Element | null)?.closest?.<HTMLElement>('a, button')
      if (!a) return
      const section = a.closest('section[id]')
      const where = section ? section.id : a.closest('.nav, .menu') ? 'nav' : a.closest('.footer') ? 'footer' : 'floating'
      const label = (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
      const href = a.getAttribute('href') || ''
      if (/wa\.me|api\.whatsapp/.test(href)) return track('contact_interaction', { channel: 'whatsapp', location: where })
      if (href.startsWith('tel:')) return track('contact_interaction', { channel: 'phone', location: where })
      if (href.startsWith('mailto:')) return track('contact_interaction', { channel: 'email', location: where })
      if (where === 'book' || /cal\.com/i.test(href)) return track('booking_interaction', { source: where })
      if (a.classList.contains('btn') || a.classList.contains('fab')) track('cta_click', { location: where, label })
    },
    { passive: true },
  )
}
