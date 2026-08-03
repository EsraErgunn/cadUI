import { z } from 'zod'

/**
 * API SÖZLEŞMESİ — tüm yönetici liste endpoint'lerinin ortak zarfı.
 *
 * 200 → { items, totalCount, page, pageSize }
 * - items: Yalnızca istenen sayfanın kayıtları (sayfalama sunucuda yapılır).
 * - totalCount: Filtre uygulanmış toplam kayıt sayısı.
 */
export interface PagedResult<TItem> {
  items: TItem[]
  totalCount: number
  page: number
  pageSize: number
}

/** Zarfın şeması; öğe şemasını çağıran verir. Böylece her liste kendi öğesini
    doğrular, sayfalama alanları tek yerde tanımlı kalır. */
export function pagedResultSchema<TItem extends z.ZodType>(itemSchema: TItem) {
  return z.object({
    items: z.array(itemSchema),
    totalCount: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
}

export const SORT_DIRECTIONS = ['asc', 'desc'] as const
export type SortDirection = (typeof SORT_DIRECTIONS)[number]
