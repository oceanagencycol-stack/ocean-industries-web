/**
 * Three languages, one page, three URLs. Every element that changes carries its own words: data-es / data-en / data-pt
 * for the text, data-*-aria for an accessible name, data-*-ph for a placeholder. The build (tools/seo.ts) serves each
 * language already written at its own URL: `/` Spanish (x-default), `/en`, `/pt`. The URL decides the language, over
 * anything saved; picking another language changes the text in place and moves the address to that language's URL
 * (history, no reload: the film keeps its place). Never guessed from the browser: that left <html lang="en"> over
 * Spanish content (the 2-sep audit). The tab title is a [data-es] element like any other (<title data-es …>).
 */
import { store } from '../core/storage'

export type Lang = 'es' | 'en' | 'pt'
const KEY = 'ocean-lang'
const LANGS: Lang[] = ['es', 'en', 'pt']
/** Same paths as tools/seo.ts (no trailing slash: Vercel redirects /en/ → /en). */
const PATH: Record<Lang, string> = { es: '/', en: '/en', pt: '/pt' }

/** The language of an address: /en and /pt (with or without the slash, or /en/index.html), else Spanish. */
function fromPath(path: string): Lang {
  const m = path.match(/^\/(en|pt)(?:\/|$)/)
  return m ? (m[1] as Lang) : 'es'
}

let current: Lang = 'es'
const listeners = new Set<(l: Lang) => void>()

export function lang(): Lang {
  return current
}

export function onLang(fn: (l: Lang) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** The visitor's words in the current language: t({ es, en, pt }). */
export function t(words: Record<Lang, string>): string {
  return words[current] ?? words.es
}

export function setLang(l: Lang, root: ParentNode = document): void {
  current = l
  root.querySelectorAll<HTMLElement>('[data-es]').forEach((el) => {
    const v = el.getAttribute(`data-${l}`)
    if (v !== null && el.textContent !== v) el.textContent = v
  })
  root.querySelectorAll<HTMLElement>('[data-es-aria]').forEach((el) => {
    const v = el.getAttribute(`data-${l}-aria`)
    if (v !== null) el.setAttribute('aria-label', v)
  })
  root.querySelectorAll<HTMLInputElement>('[data-es-ph]').forEach((el) => {
    const v = el.getAttribute(`data-${l}-ph`)
    if (v !== null) el.placeholder = v
  })
  document.documentElement.lang = l
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)))
  store.set(KEY, l)
  listeners.forEach((fn) => fn(l))
}

export function initLang(): void {
  document.documentElement.removeAttribute('data-lang-pending')
  const l = fromPath(location.pathname)
  if (l !== 'es') setLang(l)
  else store.set(KEY, l)
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.<HTMLButtonElement>('[data-lang]')
    if (!b) return
    const next = b.dataset.lang as Lang
    if (!LANGS.includes(next) || next === current) return
    setLang(next)
    if (fromPath(location.pathname) !== next) {
      try {
        history.pushState(null, '', PATH[next] + location.search + location.hash)
      } catch {
        /* the text already changed; the address stays */
      }
    }
  })
  // back / forward between language URLs
  addEventListener('popstate', () => {
    const at = fromPath(location.pathname)
    if (at !== current) setLang(at)
  })
}
