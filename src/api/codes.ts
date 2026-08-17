import { z } from 'zod'

import { requestJson } from './http'

/**
 * API SÖZLEŞMESİ — parametrik kod grupları (GERÇEK uç).
 *
 * GET /api/codes/by-group-name/{groupName} → CodeListItemDto[]
 *   { id, groupId, groupName, name, codeValue } — yalnız AKTİF kodlar.
 *
 * Kayıt uçları kodun KİMLİĞİNİ istiyor (`projectTypeCodeId` gibi), `codeValue`
 * metnini değil. Kimlikler seed'de sabit olsa da koda yazılmaz: aynı kod başka
 * bir veritabanında (test/üretim) başka kimlik alır ve gövde sessizce yanlış
 * kaydı gösterirdi.
 */

/** Sunucudaki `CodeGroup.GroupName` ile birebir; yazım hatası 404 demek. */
export const CODE_GROUP_NAMES = {
  projectType: 'ProjectType',
  heatingType: 'HeatingType',
  buildingUsageType: 'BuildingUsageType',
} as const

export type CodeGroupName = (typeof CODE_GROUP_NAMES)[keyof typeof CODE_GROUP_NAMES]

/** Seçim kutusunun kaynağı: gövdeye `id` gider, ekranda `name` görünür. */
export interface CodeOption {
  id: number
  name: string
}

const codeListSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    name: z.string(),
  }),
)

/**
 * Sıra SUNUCUDAN geldiği gibi bırakılır: proje tipinin varsayılanı "ilk
 * seçenek" olduğu için istemcide yeniden sıralamak varsayılanı da değiştirirdi.
 */
export async function getCodesByGroupName(
  groupName: CodeGroupName,
  signal?: AbortSignal,
): Promise<CodeOption[]> {
  return requestJson(
    { method: 'GET', path: `/api/codes/by-group-name/${groupName}`, signal },
    codeListSchema,
  )
}
