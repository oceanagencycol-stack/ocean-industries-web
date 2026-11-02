/** A short notice at the bottom (no alert()): what happened, in the interface's voice. */
let timer = 0

export function toast(msg: string, kind: 'ok' | 'err' = 'ok'): void {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = msg
  el.classList.remove('is-ok', 'is-err')
  el.classList.add(kind === 'err' ? 'is-err' : 'is-ok')
  requestAnimationFrame(() => el.classList.add('is-on'))
  window.clearTimeout(timer)
  timer = window.setTimeout(() => el.classList.remove('is-on'), 4600)
}
