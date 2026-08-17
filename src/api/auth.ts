import { z } from 'zod'

import { setAuthSession, type AuthSession } from './authToken'
import { ApiError, requestJson, requestVoid, type RequestOptions } from './http'

/**
 * API SÖZLEŞMESİ — kimlik doğrulama (cadapi AuthController).
 *
 * POST /api/auth/login            { username, password } → AuthSession
 * POST /api/auth/change-password  { currentPassword, newPassword } → AuthSession
 * POST /api/auth/logout           (gövde YOK) → 200 (gövdesiz) | 401
 * GET  /api/auth/me               → CurrentUserDto (token gerekir)
 *
 * API fail-closed: [AllowAnonymous] olmayan her uç token ister, yoksa 401.
 * Kayıt (POST /api/auth/register) yalnız Admin rolüne açık — kendi issue'sunda.
 */

const UNAUTHORIZED = 401

/**
 * Oturum yanıtı. Giriş VE şifre değiştirme aynı gövdeyi döndürüyor; tek şema
 * kullanılıyor ki iki uç ayrışmasın.
 */
const authSessionSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  fullName: z.string(),
  roleCode: z.string(),
})

const currentUserSchema = z.object({
  id: z.number().int(),
  fullName: z.string(),
  username: z.string(),
  email: z.string(),
  roleCode: z.string(),
  roleName: z.string(),
  projectFirmId: z.number().int().nullable(),
  gasDistributionFirmId: z.number().int().nullable(),
})

export type CurrentUser = z.infer<typeof currentUserSchema>

export type LoginCredentials = {
  /** API kullanıcı ADI istiyor, e-posta değil. */
  username: string
  password: string
}

/**
 * Başarılı girişte oturumu kurar. Hata mesajı BURADA genelleştirilmez —
 * sunucunun ayrıntısı çağırana kadar taşınır, genel mesajı LoginPage yazar
 * (hesabın var olup olmadığı ele verilmez, CLAUDE.md ürün kuralı).
 */
export async function login(
  credentials: LoginCredentials,
  options?: RequestOptions,
): Promise<AuthSession> {
  const response = await requestJson(
    {
      method: 'POST',
      path: '/api/auth/login',
      rawJsonBody: JSON.stringify(credentials),
      signal: options?.signal,
    },
    authSessionSchema,
  )

  setAuthSession(response)
  return response
}

export type ChangePasswordPayload = {
  currentPassword: string
  newPassword: string
}

/**
 * Kullanıcının KENDİ şifresini değiştirir.
 *
 * **Yanıttaki yeni token MUTLAKA saklanır.** Sunucu şifre değişince kullanıcının
 * mevcut token'larını geçersiz kılıyor (JWT'deki `TokenVersion` artıyor); eldeki
 * token'la devam edilseydi kullanıcı şifresini değiştirdikten hemen sonra bir
 * sonraki istekte 401 alıp giriş ekranına düşerdi. Bu yüzden uç, girişle AYNI
 * oturum gövdesini döndürüyor ve burada `setAuthSession` ile devralınıyor.
 *
 * Hata mesajı BURADA genelleştirilmez: 400'ün sebebini (yanlış mevcut şifre,
 * politikaya uymayan yeni şifre) sunucu yazıyor ve çağırana olduğu gibi taşınır.
 * 401'de `http.ts` oturumu zaten düşürüyor, `RequireAuth` girişe yönlendiriyor.
 */
export async function changePassword(
  payload: ChangePasswordPayload,
  options?: RequestOptions,
): Promise<AuthSession> {
  const response = await requestJson(
    {
      method: 'POST',
      path: '/api/auth/change-password',
      rawJsonBody: JSON.stringify(payload),
      signal: options?.signal,
    },
    authSessionSchema,
  )

  setAuthSession(response)
  return response
}

/**
 * Oturumu sunucuda da sonlandırır. Uç kullanıcının TÜM token'larını geçersiz
 * kılıyor, bu yüzden yerel temizlik tek başına yeterli değildi — eski gövde
 * yalnız `setAuthSession(undefined)` çağırıyordu ve token başka sekmede/istemcide
 * süresi dolana kadar geçerli kalıyordu.
 *
 * Gövdesiz istek, gövdesiz yanıt: `requestVoid` kullanılıyor çünkü `requestJson`
 * boş gövdede `response.json()` ile patlar ve çıkış SUNUCUDA başarılıyken hata
 * görünürdü.
 *
 * **Yerel oturum HER DURUMDA temizlenir (`finally`).** Kullanıcı "çık" dedi;
 * istek ağ hatasıyla düşerse bile bu makinede oturumu açık bırakmak — paylaşılan
 * bir bilgisayarda — sunucudaki token'ın süresi dolana kadar geçerli kalmasından
 * daha kötü bir sonuç. Zaten bu özellikten ÖNCEKİ davranış tam olarak buydu:
 * hiç sunucu çağrısı yoktu.
 *
 * **401 hata SAYILMAZ:** token zaten geçersizse istenen sonuç gerçekleşmiş
 * demektir. `http.ts` 401'de oturumu kendisi düşürüyor, `RequireAuth` da girişe
 * yönlendiriyor — yani çağıranın ayrıca yapacağı bir şey yok.
 */
export async function logout(options?: RequestOptions): Promise<void> {
  try {
    await requestVoid({ method: 'POST', path: '/api/auth/logout', signal: options?.signal })
  } catch (error) {
    if (!(error instanceof ApiError && error.status === UNAUTHORIZED)) throw error
  } finally {
    setAuthSession(undefined)
  }
}

export function getCurrentUser(options?: RequestOptions): Promise<CurrentUser> {
  return requestJson(
    { method: 'GET', path: '/api/auth/me', signal: options?.signal },
    currentUserSchema,
  )
}
