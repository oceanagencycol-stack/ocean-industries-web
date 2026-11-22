/** Página de desarrollo de la v6: el final en el fondo del mar con la marca grabada en la roca. */
import '../styles/fonts.css'
import '../styles/v6-roca.css'
import { mountRoca } from './roca'

const estilo = document.createElement('style')
estilo.textContent = `
  html,body{margin:0;background:#03060C;color:#E0E7ED;font-family:Geist,system-ui,sans-serif}
  .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .v6dev__intro,.v6dev__fin{min-height:60vh;display:grid;place-content:center;text-align:center;padding:0 24px;color:#B2C0CC;font-size:15px;line-height:1.6}
`
document.head.append(estilo)

const root = document.querySelector<HTMLElement>('[data-roca]')
if (root) {
  mountRoca({
    root,
    placa: { w: 1920, h: 1068 },
    foco: { x: 0.5, y: 0.42 },
    // La cara lisa de la roca en el último cuadro de la película (la misma que ROCA en src/v4/script.ts).
    cara: { x: 720, y: 139, w: 518, h: 523 },
  })
}
