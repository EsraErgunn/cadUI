import { z } from 'zod'

import { requestJson } from './http'

/**
 * Rol kodları. Kullanıcı başına TEK rol var ve kontrol kırılgan id veya ad
 * metniyle değil bu sabitlerle yapılır (bkz. knowledge/access-control.md).
 * Değerler cadapi'deki `Role.Code` ile birebir aynı olmalı.
 */
export const ROLE_CODES = {
  admin: 'Admin',
  gasDistributionUser: 'GasDistributionUser',
  projectFirmUser: 'ProjectFirmUser',
} as const

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES]

/**
 * `GET /api/roles` → `[{ id, name, code }]`.
 *
 * **`ROLE_CODES` bu uçtan TÜRETİLMEZ ve türetilmemeli.** Kodlar bir yetki
 * sözleşmesi: `RequireRole` ve menü süzgeci onlarla karşılaştırma yapıyor.
 * Çalışma anında çekilen bir listeye bağlansaydı ağ hatası yetki kararını
 * belirsizleştirir, istek dönene kadar da her kapı kapalı görünürdü.
 *
 * Uçtan gelen şey rolün GÖRÜNEN ADI: istemcide ikinci bir Türkçe sözlük
 * tutmamak için (`UserMenu`).
 */
export interface Role {
  id: number
  name: string
  code: string
}

const roleListSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    name: z.string(),
    code: z.string(),
  }),
)

export function listRoles(signal?: AbortSignal): Promise<Role[]> {
  return requestJson({ method: 'GET', path: '/api/roles', signal }, roleListSchema)
}
