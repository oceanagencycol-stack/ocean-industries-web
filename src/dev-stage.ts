// Dev only: the stage on its own, posed from Playwright (window.__st).
import { createStage, finalState } from './three/stage'
import { detectDevice } from './core/device'
const dev = detectDevice()
const canvas = document.getElementById('stage') as HTMLCanvasElement
void (async () => {
  const st = await createStage(canvas, dev.tier, { mobile: dev.mobile })
  await st.warmup()
  Object.assign(st.state, finalState())
  st.setOpacity(1)
  st.start()
  ;(window as unknown as { __st: unknown }).__st = st
  ;(window as unknown as { __ready: boolean }).__ready = true
  window.addEventListener('pointermove', (e) => {
    const x = (e.clientX / innerWidth) * 2 - 1, y = -((e.clientY / innerHeight) * 2 - 1)
    st.setPointer(x, y); st.wakeAt(x, y, 1)
  })
})()
