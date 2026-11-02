/** localStorage and sessionStorage can throw (private mode, blocked cookies): every access goes through try/catch. */
type Area = 'local' | 'session'

function area(a: Area): Storage | null {
  try {
    return a === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export const store = {
  get(key: string, a: Area = 'local'): string | null {
    try {
      return area(a)?.getItem(key) ?? null
    } catch {
      return null
    }
  },
  set(key: string, value: string, a: Area = 'local'): void {
    try {
      area(a)?.setItem(key, value)
    } catch {
      /* no persistence: the preference lives in memory only */
    }
  },
  remove(key: string, a: Area = 'local'): void {
    try {
      area(a)?.removeItem(key)
    } catch {
      /* noop */
    }
  },
}
