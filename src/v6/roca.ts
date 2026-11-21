/**
 * v6 · La roca: el símbolo y el logotipo oficiales de OCEAN grabados en la cara lisa del fondo marino.
 *
 * La IA nunca dibuja la marca: la placa trae la roca en blanco y aquí se graba la marca real de `marca/v3/` con
 * capas enmascaradas (hendidura, filo de sombra, filo de luz, luz del haz y encendido). El haz de los faros de la
 * nave recorre la escena con el scroll; donde pasa, el grabado brilla; al final la marca se enciende en blanco
 * pleno («resultado = blanco que se enciende», DESIGN.md).
 *
 * La posición de la cara se da en píxeles de la placa (`cara`), así que el grabado sigue a la roca con cualquier
 * proporción de pantalla aunque la placa vaya en `object-fit: cover`.
 */
import simboloUrl from '../../marca/v3/simbolo-simetrico.svg?url'
import logoUrl from '../../marca/v3/logo-sin-r.svg?url'

export interface RocaOpciones {
  /** La sección alta que da el recorrido del scroll. */
  root: HTMLElement
  /** Tamaño natural de la placa (px). */
  placa: { w: number; h: number }
  /** `object-position` de la placa, en fracciones (0–1). */
  foco: { x: number; y: number }
  /** Rectángulo de la cara lisa de la roca en píxeles de la placa. */
  cara: { x: number; y: number; w: number; h: number }
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ease = (t: number) => t * t * (3 - 2 * t)
const tramo = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)))

export function mountRoca(o: RocaOpciones): { dispose(): void } {
  const { root } = o
  const escena = root.querySelector<HTMLElement>('.roca__escena')!
  const grabado = root.querySelector<HTMLElement>('.roca__grabado')!
  const glifos = [...root.querySelectorAll<HTMLElement>('.roca__glifo')]
  root.querySelector<HTMLElement>('.roca__glifo--simbolo')?.style.setProperty('--glifo', `url("${simboloUrl}")`)
  root.querySelector<HTMLElement>('.roca__glifo--logo')?.style.setProperty('--glifo', `url("${logoUrl}")`)

  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches

  // Dónde cae la cara de la roca en pantalla (object-fit: cover + object-position).
  let caja = { x: 0, y: 0, w: 0, h: 0 }
  const medir = () => {
    const W = escena.clientWidth
    const H = escena.clientHeight
    const s = Math.max(W / o.placa.w, H / o.placa.h)
    const dx = (W - o.placa.w * s) * o.foco.x
    const dy = (H - o.placa.h * s) * o.foco.y
    caja = { x: dx + o.cara.x * s, y: dy + o.cara.y * s, w: o.cara.w * s, h: o.cara.h * s }
    // En pantallas angostas la cara es más ancha que la pantalla: el grabado se queda en un ancho seguro, centrado.
    const maxW = W * 0.78
    if (caja.w > maxW) {
      const k = maxW / caja.w
      caja = { x: caja.x + (caja.w - maxW) / 2, y: caja.y + (caja.h * (1 - k)) / 2, w: maxW, h: caja.h * k }
    }
    Object.assign(grabado.style, {
      left: `${caja.x}px`,
      top: `${caja.y}px`,
      width: `${caja.w}px`,
      height: `${caja.h}px`,
    })
    // Profundidad del grabado en px de pantalla: proporcional al tamaño de la cara, nítido en 4K y en el teléfono.
    grabado.style.setProperty('--hondo', `${Math.max(1, Math.round(caja.w / 260))}px`)
  }

  let raf = 0
  const pintar = () => {
    raf = 0
    const r = root.getBoundingClientRect()
    const recorrido = Math.max(1, r.height - innerHeight)
    const p = quieto ? 1 : clamp(-r.top / recorrido)

    // Llegada: la oscuridad se abre (0–0,18). El haz barre de izquierda a derecha y se asienta en la cara (0,1–0,7).
    const llegada = tramo(p, 0, 0.18)
    const barrido = tramo(p, 0.1, 0.7)
    const bx = 0.18 + barrido * 0.62 - tramo(p, 0.55, 0.78) * 0.29 // 18 % → 80 % → vuelve al centro de la cara (51 %)
    const by = 0.62 - barrido * 0.24
    const W = escena.clientWidth
    const H = escena.clientHeight
    escena.style.setProperty('--oscuro', String(1 - llegada))
    escena.style.setProperty('--bx', `${(bx * 100).toFixed(2)}%`)
    escena.style.setProperty('--by', `${(by * 100).toFixed(2)}%`)

    // Luz del haz sobre cada glifo, en coordenadas locales del glifo (para el degradado enmascarado).
    const hx = bx * W
    const hy = by * H
    for (const g of glifos) {
      const b = g.getBoundingClientRect()
      const e = escena.getBoundingClientRect()
      const lx = ((hx - (b.left - e.left)) / Math.max(1, b.width)) * 100
      const ly = ((hy - (b.top - e.top)) / Math.max(1, b.height)) * 100
      g.style.setProperty('--lx', `${lx.toFixed(1)}%`)
      g.style.setProperty('--ly', `${ly.toFixed(1)}%`)
    }
    // Encendido: la marca pasa de grabada a blanca (0,62–0,86); el halo se asienta al final.
    grabado.style.setProperty('--grabado', String(tramo(p, 0.08, 0.3)))
    grabado.style.setProperty('--luz', String(tramo(p, 0.15, 0.4) * (1 - tramo(p, 0.8, 0.95) * 0.4)))
    grabado.style.setProperty('--on', String(tramo(p, 0.62, 0.86)))
    root.dataset.fase = p < 0.18 ? 'llegada' : p < 0.62 ? 'barrido' : p < 0.86 ? 'encendido' : 'marca'
  }
  const pedir = () => {
    if (!raf) raf = requestAnimationFrame(pintar)
  }
  const alCambiar = () => {
    medir()
    pedir()
  }

  const ro = new ResizeObserver(alCambiar)
  ro.observe(escena)
  addEventListener('scroll', pedir, { passive: true })
  alCambiar()

  return {
    dispose() {
      ro.disconnect()
      removeEventListener('scroll', pedir)
      cancelAnimationFrame(raf)
    },
  }
}
