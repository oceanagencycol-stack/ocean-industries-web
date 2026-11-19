# Intro del logotipo (v3)

La entrada de la marca descrita en `docs/v3/CONCEPTO.md` («La intro»), ≈ 4,5 s: la estrella del símbolo se enciende,
los contornos de las dos S nacen de ella y se llenan de nieve, el logotipo monolínea se traza letra por letra sobre sus
ejes, un barrido de luz lo recorre, aparece la ®, y el logotipo vuela a la barra mientras la estrella se aleja hasta
ser un punto. Desarrollo: `dev-intro.html` (`npm run dev` → `/dev-intro`; `?lang=en|pt`, `?qa=intro=<0..1>`).

## API para la página

```ts
import { shouldRunIntro, runIntro } from './intro-v3/intro'

if (shouldRunIntro()) {
  await runIntro({
    dock: document.querySelector('[data-intro-dock]'), // el ancla de la barra (ver abajo)
    onStar: () => sound.play('estrella'),             // la estrella se enciende (≈ 150 ms)
    onWordComplete: () => sound.play('golpe'),        // la palabra queda completa (≈ 3000 ms)
  })
}
// aquí arranca el mundo (la cámara empieza a caer)
```

- `shouldRunIntro(): boolean` — `false` con `prefers-reduced-motion: reduce` o si la intro se vio en los últimos 7 días
  (`localStorage['ocean-v3-intro-at']`, con try/catch); `true` siempre con `?qa=intro…`.
- `runIntro({ dock, onStar?, onWordComplete?, lang? }): Promise<void>` — monta la intro sobre todo (`position: fixed`,
  `z-index` máximo), guarda la fecha y se cumple al terminar o al saltarla. Con movimiento reducido no monta nada y se
  cumple enseguida. Con `?qa=intro=<p>` la deja posada en `p` (la promesa queda pendiente) y expone
  `window.__oceanIntro.seek(p)` para las pruebas.
- Al terminar (o al saltarla, o si no hubo intro) avisa `ocean:intro-done` en `window`, con
  `detail: { played, skipped }`.
- `INTRO_MS` (4500) e `INTRO_KEY` se exportan también.

## Lo que la página tiene que poner

- **El ancla** `dock`: el elemento de la barra que contiene el `<svg>` de `marca/v3/logo-sin-r.svg` (el logotipo de la
  barra, sin ®). El logotipo de la intro aterriza exactamente sobre ese SVG (FLIP medido en cada montaje y al cambiar
  el tamaño de la ventana). Mientras corre, `html.oi-running` lo esconde (`visibility: hidden`) y el de la intro cae
  encima; el cambio pasa en el mismo cuadro.
- **`[data-intro-inert]`** en lo que no se debe poder enfocar mientras corre (la barra, `main`): la intro les pone
  `inert` y se lo quita al terminar.
- **El velo de espera** `<div class="oi-veil" data-intro-veil aria-hidden="true"></div>` al principio de `<body>`:
  negro desde el primer cuadro mientras llega el JavaScript; la intro lo retira (o lo reemplaza por su propio negro en
  el mismo cuadro). Con movimiento reducido no se pinta; sin JavaScript se abre solo a los 3 s. En `index.html`, el
  script de arranque (`data-ocean-boot`) debería decidir antes de pintar con la misma regla de `shouldRunIntro()` y
  quitar el velo si no toca (como hace hoy con `no-intro`).
- **Idioma** de «Saltar intro» / «Skip intro» / «Pular intro»: `lang` o, si no, `?lang`, `localStorage['ocean-lang']` y
  `<html lang>`.

## Saltar

Botón real «Saltar intro», visible desde el primer segundo (aparece de 250 a 850 ms), abajo a la derecha, con foco
visible. También `Escape`. Saltar funde la intro en 0,5 s y muestra el logotipo de la barra en su lugar. No enciende el
sonido.

## Cómo está hecha

- `intro.ts`: el marcado (SVG en línea), la línea de tiempo y la API. Una sola línea de tiempo: cada propiedad animada
  es una animación de la Web Animations API de 0 a 4500 ms con sus fotogramas en tiempos absolutos (`track`); poner el
  mismo `currentTime` a todas posa la intro en cualquier instante. Solo `transform`, `opacity` y `stroke-dashoffset`
  (también dentro de máscaras); nada de filtros ni sombras animadas. Curvas: `cubic-bezier(.16,1,.3,1)` para revelar,
  una de entrada y salida suave con asentamiento largo para lo que viaja; nada rebota.
- La marca sale tal cual de `marca/v3/` (con `?raw`): `simbolo-simetrico.svg` (relleno, contornos y reflejo),
  `logo-trazos.svg` (los ejes que se trazan, por `data-l`; la Λ se parte en sus dos piernas, de cada pie al vértice),
  `logo.svg` (el dibujo definitivo, con la ®) y `logo-sin-r.svg` (solo su `viewBox`, para centrar las letras sin la ®).
  Mientras se trazan, la Λ y la N van enmascaradas por su forma definitiva (sus esquinas exteriores son más redondas que
  la unión del trazo), así que al terminar los ejes y el definitivo coinciden. Como Chrome suaviza distinto el borde de
  un trazo con guiones, el definitivo se funde encima en 90 ms y luego los ejes se van por debajo en otros 90 ms: el
  interior no cambia y ningún cuadro cambia el borde de golpe (`qa/intro-v3.cjs` lo mide).
- `trace.ts`: los contornos de las S empezando en su punto más cercano a la estrella, hacia adelante y hacia atrás
  (se calculan al montar, ≈ 1 ms).
- `intro.css`: capas, el velo, el grano (`public/v3/grano.png`, de `tools/grano.mjs`: 256 px, 2 bits, ≈ 15 KB;
  `soft-light` al 0,07, desplazada a saltos de ≈ 24 por segundo solo mientras corre) y la trama (la misma tesela quieta
  al 2,2 % en mezcla normal: en el negro el grano `soft-light` no se ve y el halo de la estrella haría bandas).
- `dev.ts`, `dev.css`: la página de desarrollo (`dev-intro.html`, `noindex`) sobre `public/v3/m1a.avif|webp`
  (M1a, 2560 px, 73 KB / 109 KB).

## QA

`npm run build && node qa/intro-v3.cjs` (Playwright; sirve `dist/` con las cabeceras de `vercel.json`): 16 instantes en
escritorio (1440×900) y teléfono (390×844) en dos corridas idénticas, el aterrizaje en la barra (≤ 0,75 px), el cambio
al dibujo definitivo cuadro a cuadro, tareas largas > 50 ms durante la intro de verdad, «Saltar» y `Escape`, movimiento
reducido, una vez cada 7 días, ES/EN/PT, consola y CSP limpias, y un video por tamaño. Todo en `qa/out/intro-v3/`.
Termina en «intro en verde».

Sonido: solo los ganchos (`onStar`, `onWordComplete`); la intro no genera ni reproduce audio.
