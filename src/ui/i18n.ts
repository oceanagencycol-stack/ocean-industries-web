/**
 * Three languages, one page. The HTML is served in Spanish (the canonical, es_CO); every element that changes carries
 * its own words: data-es / data-en / data-pt for the text, data-*-aria for an accessible name, data-*-ph for a
 * placeholder. The language changes only when the visitor picks it (or picked it before: localStorage), never by
 * guessing from the browser: that left <html lang="en"> over Spanish content (the 2-sep audit).
 */
import { store } from '../core/storage'

export type Lang = 'es' | 'en' | 'pt'
const KEY = 'ocean-lang'
const LANGS: Lang[] = ['es', 'en', 'pt']

const TITLES: Record<Lang, string> = {
  es: 'Ocean Industries — Agencia de IA y automatización en Cali, Bogotá y Miami',
  en: 'Ocean Industries — AI and automation agency in Cali, Bogotá and Miami',
  pt: 'Ocean Industries — Agência de IA e automação em Cali, Bogotá e Miami',
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
  document.title = TITLES[l]
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)))
  store.set(KEY, l)
  listeners.forEach((fn) => fn(l))
}

export function initLang(): void {
  const saved = store.get(KEY) as Lang | null
  document.documentElement.removeAttribute('data-lang-pending')
  if (saved && LANGS.includes(saved) && saved !== 'es') setLang(saved)
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.<HTMLButtonElement>('[data-lang]')
    if (!b) return
    const l = b.dataset.lang as Lang
    if (LANGS.includes(l) && l !== current) setLang(l)
  })
}
