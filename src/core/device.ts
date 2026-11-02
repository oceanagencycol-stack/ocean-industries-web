export type Tier = 'high' | 'mid' | 'low'

export interface DeviceInfo {
  webgl2: boolean
  reducedMotion: boolean
  coarse: boolean
  mobile: boolean
  ios: boolean
  android: boolean
  saveData: boolean
  gpu: string
  /** WebGL runs in software (SwiftShader, llvmpipe…): the glass would freeze the page; the still shows instead.
   *  A forced ?q= (QA) overrides it. */
  software: boolean
  tier: Tier
}

function probeGL(): { ok: boolean; gpu: string } {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) as WebGL2RenderingContext | null
    if (!gl) return { ok: false, gpu: '' }
    let gpu = ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '')
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { ok: true, gpu }
  } catch {
    return { ok: false, gpu: '' }
  }
}

/**
 * The cheap facts are read at once; the GPU ones (webgl2, gpu, tier) the first time something asks. Creating a
 * WebGL2 context costs time, and the inner pages never need one (only the home page carries the glass).
 */
export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent
  const ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const android = /Android/i.test(ua)
  const coarse = matchMedia('(pointer: coarse)').matches
  const mobile = ios || android || coarse
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  const saveData = conn?.saveData === true
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const cores = navigator.hardwareConcurrency ?? 4
  // forced from the URL for QA: ?q=high|mid|low
  const forced = new URLSearchParams(location.search).get('q')

  let probed: { ok: boolean; gpu: string } | null = null
  const probe = () => (probed ??= probeGL())
  let tier: Tier | null = null

  const pickTier = (): Tier => {
    if (forced === 'high' || forced === 'mid' || forced === 'low') return forced
    const gpu = probe().gpu
    if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) return 'low'
    if (mobile) {
      if (ios || /Apple GPU/i.test(gpu)) return 'mid'
      if (/Adreno \(TM\) (7[3-9]\d|8\d\d)|Mali-G7[1-9]|Mali-G[7-9]\d\d|Xclipse/i.test(gpu) && mem >= 6) return 'mid'
      return 'low'
    }
    if (/Intel/i.test(gpu) && !/Arc|Iris Xe/i.test(gpu)) return cores >= 8 ? 'mid' : 'low'
    if (cores <= 4 && mem <= 4) return 'mid'
    return 'high'
  }

  return {
    reducedMotion,
    coarse,
    mobile,
    ios,
    android,
    saveData,
    get webgl2() {
      return probe().ok
    },
    get gpu() {
      return probe().gpu
    },
    get software() {
      return !forced && /swiftshader|llvmpipe|software|basic render/i.test(probe().gpu)
    },
    get tier() {
      return (tier ??= pickTier())
    },
  }
}
