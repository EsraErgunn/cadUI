import { parseServerTimestampMs } from './serverTimestamp'

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
  // Dilim eki yoksa UTC varsayılır; kural `serverTimestamp.ts`'te, yetki
  // geçerliliğiyle ORTAK (iki yerde ayrı yazılsaydı biri düzeltilip öbürü kalırdı).
  const expiresAtMs = parseServerTimestampMs(candidate.expiresAt)
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

/**
 * Sekmeler arası eşitleme. `storage` olayı yalnız DİĞER sekmelerde tetiklenir:
 * bir sekmede çıkış yapılınca öbürü açık kalıp "girişli" görünmesin, bir
 * sekmede giriş yapılınca öbürü elle yenilenmeden çalışsın.
 *
 * Modül yüklenirken bir kez bağlanıyor ve hiç sökülmüyor — oturum uygulamanın
 * ömrü boyunca yaşayan tek bir değer, bileşen ömrüne bağlı değil.
 */
globalThis.addEventListener?.('storage', (event) => {
  if (event.key !== STORAGE_KEY) return

  const next = readStoredSession()
  // Aynı token yeniden yazıldıysa abone uyandırmaya gerek yok.
  if (next?.token === session?.token) return

  session = next
  for (const listener of listeners) listener()
})
