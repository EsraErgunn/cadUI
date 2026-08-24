import { z } from 'zod'

import { requestJson, requestVoid, type RequestOptions } from './http'

/**
 * API SÖZLEŞMESİ — kullanıcı kaydı (`Users` tablosu).
 *
 * POST /api/users/{id}/reset-password → { newPassword } → 200
 * GET /api/users/{id} → UserDto
 * PUT /api/users/{id} → { email, fullName, phone, roleCode, projectFirmId,
 *                         gasDistributionFirmId }
 *
 * `/api/projectfirmusers` ile KARIŞTIRMA: o yol proje firması kullanıcıları
 * LİSTE ekranınındır ve sunucuda hâlâ yok (`unimplementedEndpoints.ts`). Burası
 * tekil kullanıcı kaydının gerçek ucu.
 *
 * Oturumdaki kullanıcının kimliği `GET /api/auth/me`'den geliyor (`api/auth.ts`);
 * bu dosya kimliği ÜRETMEZ, yalnız verilen kimlikle çalışır.
 */

/**
 * Sunucunun yanıtı. `phone` yalnız BURADA var — `/api/auth/me` telefon
 * döndürmüyor, Kişi Bilgileri ekranı bu yüzden iki ucu birden okuyor.
 *
 * Ekranın kullanmadığı alanlar (`roleName`, `createdAt`…) şemada opsiyonel:
 * sunucu birini kaldırdığında ekranın sınırda patlaması, gösterilmeyen bir alan
 * uğruna alınacak bedel değil (projectDetail'deki `generatedAt` ile aynı gerekçe).
 */
const userDtoSchema = z.object({
  id: z.number().int().positive(),
  fullName: z.string(),
  email: z.string().nullish(),
  username: z.string(),
  phone: z.string().nullish(),
  roleCode: z.string().nullish(),
  roleName: z.string().nullish(),
  projectFirmId: z.number().int().nullish(),
  projectFirmName: z.string().nullish(),
  gasDistributionFirmId: z.number().int().nullish(),
  gasDistributionFirmName: z.string().nullish(),
  createdAt: z.string().nullish(),
})

export type User = z.infer<typeof userDtoSchema>

/**
 * Güncelleme gövdesi. Sunucu TÜM alanları bekliyor, yani ekranın düzenlemediği
 * alanlar da geri gönderilmek zorunda — `null` gönderilseydi kullanıcının rolü
 * ve firma bağı silinirdi. Çağıran bu yüzden gövdeyi `toUserPayload` ile
 * OKUNAN kayıttan türetiyor.
 */
export interface UserPayload {
  email: string | null
  fullName: string
  phone: string | null
  roleCode: string | null
  projectFirmId: number | null
  gasDistributionFirmId: number | null
}

/**
 * Okunan kaydı güncelleme gövdesine çevirir; `changes` yalnız DEĞİŞTİRİLEN
 * alanları taşır. Ekranda olmayan alanlar böylece olduğu gibi geri gider.
 */
export function toUserPayload(user: User, changes: Partial<UserPayload>): UserPayload {
  return {
    email: user.email ?? null,
    fullName: user.fullName,
    phone: user.phone ?? null,
    roleCode: user.roleCode ?? null,
    projectFirmId: user.projectFirmId ?? null,
    gasDistributionFirmId: user.gasDistributionFirmId ?? null,
    ...changes,
  }
}

/**
 * Yöneticinin BAŞKA bir kullanıcının şifresini sıfırlaması.
 *
 * Uç kullanıcının TÜM oturumlarını sonlandırıyor (TokenVersion artıyor), yani
 * geri alınamaz bir işlem — çağıran ekran onay sormak zorunda.
 *
 * TODO(esra): ekranı henüz yok. Fonksiyon sözleşmeyi bağlamak için burada:
 * yol ve gövde biçimi bir yerde yazılı olmazsa ekranı yazan kişi yeniden
 * keşfetmek zorunda kalır.
 */
export function resetUserPassword(
  id: number,
  newPassword: string,
  options?: RequestOptions,
): Promise<void> {
  return requestVoid({
    method: 'POST',
    path: `/api/users/${id}/reset-password`,
    rawJsonBody: JSON.stringify({ newPassword }),
    signal: options?.signal,
  })
}

export function getUser(id: number, options?: RequestOptions): Promise<User> {
  return requestJson(
    { method: 'GET', path: `/api/users/${id}`, signal: options?.signal },
    userDtoSchema,
  )
}

/** Yanıt gövdesiz; `requestJson` boş gövdede patlar (bkz. http.ts → requestVoid). */
export function updateUser(
  id: number,
  payload: UserPayload,
  options?: RequestOptions,
): Promise<void> {
  return requestVoid({
    method: 'PUT',
    path: `/api/users/${id}`,
    rawJsonBody: JSON.stringify(payload),
    signal: options?.signal,
  })
}
