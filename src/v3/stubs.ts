/**
 * Stubs mínimos de los otros dos paquetes de la v3, para que la página funcione sola mientras no estén en su rama.
 * Se reemplazan solos al integrar: `bridge.ts` busca primero los módulos reales (import.meta.glob) y solo si no
 * existen usa estos. Nada que tocar aquí cuando lleguen.
 *
 *  - El mundo (src/world/plates.ts): `mountWorld` no monta nada y devuelve null → la página se queda con las placas
 *    de respaldo de cada tramo (la «versión quieta», que es la misma que ve quien no tiene WebGL2).
 *  - La intro (src/intro-v3/intro.ts): `shouldRunIntro` dice que no → no hay velo ni intro; la portada entra con la
 *    gramática de entrada de la página.
 */
import type { WorldModule, IntroModule } from './bridge'

export const world: WorldModule = {
  mountWorld: () => null,
}

export const intro: IntroModule = {
  shouldRunIntro: () => false,
  runIntro: () => null,
}

/** true solo en los stubs: la página sabe que no hay intro de verdad (no ofrece «Repetir la intro»). */
export const isStub = true
