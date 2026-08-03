import { z } from 'zod'

import { setAuthSession, type AuthSession } from './authToken'
import { requestJson, type RequestOptions } from './http'

/**
 * API SÖZLEŞMESİ — kimlik doğrulama (cadapi AuthController).
 *
 * POST /api/auth/login   { username, password } → { token, expiresAt, fullName, roleCode }
 * GET  /api/auth/me      → CurrentUserDto        (token gerekir)
 *
 * API fail-closed: [AllowAnonymous] olmayan her uç token ister, yoksa 401.
 * Kayıt (POST /api/auth/register) yalnız Admin rolüne açık — kendi issue'sunda.
 */

const loginResponseSchema = z.object({
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
    loginResponseSchema,
  )

  setAuthSession(response)
  return response
}

export function logout(): void {
  setAuthSession(undefined)
}

export function getCurrentUser(options?: RequestOptions): Promise<CurrentUser> {
  return requestJson(
    { method: 'GET', path: '/api/auth/me', signal: options?.signal },
    currentUserSchema,
  )
}
