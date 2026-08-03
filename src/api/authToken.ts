const STORAGE_KEY = 'starcad.auth'

/**
 * Oturum token'ının TEK kaynağı. Zustand store değil, çünkü http.ts token'ı
 * okumak zorunda ve store api/auth.ts'i, o da http.ts'i import ediyor —
 * store'a bağlansaydı import döngüsü olurdu. React tarafı bu modülü
 * useSyncExternalStore ile dinler (useAuthSession).
 *
 * localStorage seçildi: API bearer token döndürüyor, HttpOnly çerez akışı yok.
 * Bedeli, XSS'in token'ı okuyabilmesi — bu yüzden dangerouslySetInnerHTML yasağı
 * (CLAUDE.md) burada ekstra önem kazanıyor.
 */
export type AuthSession = {
  token: string
  /** ISO 8601, sunucudan geldiği gibi. */
  expiresAt: string
  fullName: string
  roleCode: string
}

let session: AuthSession | undefined = readStoredSession()
const listeners = new Set<() => void>()

function readStoredSession(): AuthSession | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined

    const parsed: unknown = JSON.parse(raw)
    if (!isSession(parsed)) return undefined

    // Süresi geçmiş token'la açılmak, her isteğin 401 dönmesi demek: baştan at.
    return isExpired(parsed) ? undefined : parsed
  } catch {
    // Bozuk/erişilemez depo oturumsuz sayılır; açılışı engellemesin.
    return undefined
  }
}

function isSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AuthSession>
  return (
    typeof candidate.token === 'string' &&
    typeof candidate.expiresAt === 'string' &&
    typeof candidate.fullName === 'string' &&
    typeof candidate.roleCode === 'string'
  )
}

export function isExpired(candidate: AuthSession): boolean {
  const expiresAtMs = Date.parse(candidate.expiresAt)
  // Tarih okunamıyorsa süresi dolmuş sayılmaz; kararı sunucunun 401'i verir.
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()
}

/** http.ts bunu her istekte okur; abone olmaz. */
export function getAuthSession(): AuthSession | undefined {
  return session
}

export function setAuthSession(next: AuthSession | undefined): void {
  session = next

  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Depo yazılamıyorsa (özel mod/kota) oturum yalnız bu sekmede yaşar.
  }

  for (const listener of listeners) listener()
}

export function subscribeAuthSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
