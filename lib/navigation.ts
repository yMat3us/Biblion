const INTERNAL_BASE_URL = new URL('https://biblion.invalid')

/** Converts an untrusted return URL into a same-origin path or a safe fallback. */
export function safeInternalPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value?.startsWith('/')) return fallback

  try {
    const destination = new URL(value, INTERNAL_BASE_URL)
    if (destination.origin !== INTERNAL_BASE_URL.origin) return fallback
    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return fallback
  }
}
