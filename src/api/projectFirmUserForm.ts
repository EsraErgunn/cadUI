import { registerUser } from './auth'
import { requestVoid } from './http'
import type { ProjectFirmUserPayload } from './projectFirmUserDto'
import { ROLE_CODES } from './roles'

/**
 * API SÖZLEŞMESİ — Proje firma kullanıcısı oluştur/güncelle. GERÇEK uçlar:
 *
 * - Oluşturma: `POST /api/auth/register` (rol SABİT `ProjectFirmUser`)
 * - Güncelleme: `PUT /api/users/{id}`
 *
 * İki uç AYNI gövdeyi almıyor ve bu ayrım burada kalıyor: register şifre
 * istiyor, update istemiyor. Şifre değiştirme ayrı uçta
 * (`POST /api/users/{id}/reset-password`, bkz. `api/users.ts`).
 *
 * `gasDistributionFirmId` HER ZAMAN `null`: bu ekran proje firması
 * kullanıcısı üretiyor, gaz dağıtım firması bağı o rolün işi.
 */

export interface ProjectFirmUserSaveResult {
  userId: number
}

/**
 * Oluşturma ve güncelleme TEK giriş: ekran da tek (KK-25). `userId` doluysa
 * güncelleme, `null` ise oluşturma.
 *
 * Güncellemede şifre GÖNDERİLMEZ — `UserUpdateDto` şifre alanı taşımıyor.
 */
export async function saveProjectFirmUser(
  payload: ProjectFirmUserPayload,
  userId: number | null,
): Promise<ProjectFirmUserSaveResult> {
  if (userId === null) {
    const created = await registerUser({
      fullName: payload.fullName,
      email: payload.email,
      username: payload.username,
      password: payload.password ?? '',
      phone: payload.phone,
      roleCode: ROLE_CODES.projectFirmUser,
      projectFirmId: payload.projectFirmId,
      gasDistributionFirmId: null,
    })

    return { userId: created.id }
  }

  await requestVoid({
    method: 'PUT',
    path: `/api/users/${userId}`,
    rawJsonBody: JSON.stringify({
      fullName: payload.fullName,
      email: payload.email,
      // Uç boş dize bekliyor, `null` değil: alan `string` ve zorunlu.
      phone: payload.phone ?? '',
      roleCode: ROLE_CODES.projectFirmUser,
      projectFirmId: payload.projectFirmId,
      gasDistributionFirmId: null,
    }),
  })

  return { userId }
}
