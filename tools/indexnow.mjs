#!/usr/bin/env node
/**
 * Avisa a los buscadores con IndexNow (Bing —que alimenta la búsqueda de ChatGPT y Copilot—, Yandex, Seznam, Naver…)
 * de que las URL del sitemap cambiaron. Correr DESPUÉS de publicar en producción:
 *
 *   node tools/indexnow.mjs            # todas las URL de public/sitemap.xml
 *   node tools/indexnow.mjs --dry      # solo muestra qué mandaría
 *
 * La llave de IndexNow es pública por diseño: vive en public/<llave>.txt y el buscador la lee para comprobar que el
 * aviso viene del dueño del dominio. No es un secreto.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HOST = 'www.oceanindustries.com.co'

const keyFile = readdirSync(resolve(ROOT, 'public')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f))
if (!keyFile) throw new Error('No hay llave de IndexNow en public/ (<32 hex>.txt)')
const key = readFileSync(resolve(ROOT, 'public', keyFile), 'utf8').trim()
if (key !== keyFile.slice(0, -4)) throw new Error('El contenido de la llave no coincide con su nombre de archivo')

const sitemap = readFileSync(resolve(ROOT, 'public/sitemap.xml'), 'utf8')
const urlList = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))]
if (!urlList.length) throw new Error('El sitemap no tiene URL')

const body = { host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList }
console.log(`${urlList.length} URL:\n  ${urlList.join('\n  ')}`)
if (process.argv.includes('--dry')) process.exit(0)

const live = await fetch(body.keyLocation)
if (!live.ok || (await live.text()).trim() !== key) {
  throw new Error(`La llave no está publicada en ${body.keyLocation} (¿ya se desplegó a producción?)`)
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})
// 200 = recibido; 202 = recibido, la llave se valida después. 403 llave inválida; 422 URL fuera del host; 429 demasiados.
console.log(`IndexNow respondió ${res.status} ${res.statusText}`)
if (res.status >= 300) process.exit(1)
