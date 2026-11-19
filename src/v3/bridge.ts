/**
 * El puente con los otros dos paquetes de la v3 (docs/v3/ARQUITECTURA.md). La página los consume solo por su API:
 *
 *   Mundo: import('./world/plates').then(m => m.mountWorld({ canvas, sections })) → { dispose }
 *   Intro: import('./intro-v3/intro').then(m => m.shouldRunIntro() && m.runIntro({ dock }))
 *
 * `import.meta.glob` resuelve en el build: si el archivo existe, su trozo (perezoso, sin modulepreload); si no, un
 * objeto vacío y se usan los stubs (src/v3/stubs.ts). Así esta rama compila y funciona sola, y al integrar las tres
 * ramas los módulos reales entran sin tocar una línea.
 *
 * La intro (src/intro-v3, fusionada en v3 el 18-nov) cumple la API: `runIntro()` devuelve una promesa que se cumple al
 * terminar o al saltarla, y además avisa `ocean:intro-done` en window. El puente escucha las dos señales y tiene una
 * salida de seguridad (9 s): la página nunca queda tapada. Acepta también los nombres viejos (`introDue`/`bootIntro`).
 */

export interface WorldHandle {
  dispose(): void
}
export interface WorldModule {
  mountWorld(opts: { canvas: HTMLCanvasElement; sections: NodeListOf<HTMLElement> }): WorldHandle | null | undefined | Promise<WorldHandle | null | undefined>
}

type IntroResult = { done?: Promise<unknown>; skip?: () => void } | Promise<unknown> | null | undefined | void
export interface IntroModule {
  shouldRunIntro?: () => boolean
  runIntro?: (opts: { dock: Element | null; lang?: string }) => IntroResult
  /** nombres de la rama v3-intro (18-nov) */
  introDue?: () => boolean
  bootIntro?: (opts: { dock: Element | null; lang?: string }) => IntroResult
  INTRO_KEY?: string
}

const worldReal = import.meta.glob<WorldModule>('../world/plates.ts')
const introReal = import.meta.glob<IntroModule>('../intro-v3/intro.ts')

export const hasRealWorld = Object.keys(worldReal).length > 0
export const hasRealIntro = Object.keys(introReal).length > 0

export async function loadWorld(): Promise<WorldModule> {
  const real = Object.values(worldReal)[0]
  if (real) return real()
  return (await import('./stubs')).world
}

export async function loadIntro(): Promise<IntroModule> {
  const real = Object.values(introReal)[0]
  if (real) return real()
  return (await import('./stubs')).intro
}

/**
 * Corre la intro si toca y resuelve cuando termina (o enseguida si no toca). Nunca deja la página tapada: si algo
 * falla o tarda más de lo que dura la intro con holgura, sigue.
 */
export async function playIntro(dock: Element | null, lang: string): Promise<boolean> {
  let m: IntroModule
  try {
    m = await loadIntro()
  } catch {
    return false
  }
  const should = m.shouldRunIntro ?? m.introDue
  const run = m.runIntro ?? m.bootIntro
  if (!should || !run || !should()) return false
  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.removeEventListener('ocean:intro-done', finish)
      window.clearTimeout(safety)
      resolve(true)
    }
    window.addEventListener('ocean:intro-done', finish)
    const safety = window.setTimeout(finish, 9000)
    try {
      const r = run({ dock, lang })
      if (!r) return finish()
      const p = r instanceof Promise ? r : r.done
      if (p) p.then(finish, finish)
    } catch {
      finish()
    }
  })
}
