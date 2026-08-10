import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { hasApiBaseUrl, requestJson } from './http'
import type { SortDirection } from './listQuery'
import {
  projectFirmListDtoSchema,
  toProjectFirmListItem,
  type ProjectFirm,
} from './projectFirmDto'
import { allMockProjectFirms } from './projectFirmsMock'

export type { ProjectFirm, ProjectFirmGasFirm } from './projectFirmDto'

/**
 * API SÖZLEŞMESİ — Proje firmaları listesi (doğrulandı: yerel cadapi OpenAPI).
 *
 * GET /api/projectfirms → ProjectFirmListItemDto[]
 * - "Aktif proje firmalarını listeler". Filtresiz, sayfalamasız DÜZ DİZİ:
 *   `q`/`page`/`pageSize`/`sort` parametresi YOK.
 * - Arama, sıralama ve sayfalama bu yüzden İSTEMCİDE (`projectFirmListQuery.ts`) —
 *   K27'nin aynı gerekçeyle ikinci kez uygulanması, bkz. docs/kararlar.md K29.
 * - Satır FİRMA bazlı: yetki bazlı DEĞİL. Uç hiçbir gaz dağıtım firması alanı
 *   taşımadığı için kayıt adedi tekil firma sayısıdır (KK-5 karşılanmıyor).
 *
 * `VITE_API_URL` tanımlı değilse mock gövdeye düşer (`projectFirmsMock.ts`).
 *
 * Ekle/güncelle uçları (`POST /api/projectfirms`, `PUT|DELETE /api/projectfirms/{id}`)
 * mevcut ama ekranları henüz yok; bu dosya yalnız listeyi kapsıyor.
 */

export const PROJECT_FIRM_PAGE_SIZE = 30

/**
 * Sıralanabilir sütunlar. Karşılığı `null` gelen sütunlar (Seri No, Yeter No,
 * Gsm, G.D. Firması) sıralanabilir DEĞİL: hepsi aynı değeri taşıdığı için
 * başlığa tıklamak hiçbir şeyi değiştirmez, kullanıcıya bozuk görünürdü.
 */
export const PROJECT_FIRM_SORT_KEYS = ['name', 'authorizedPerson'] as const
export type ProjectFirmSortKey = (typeof PROJECT_FIRM_SORT_KEYS)[number]

export const DEFAULT_PROJECT_FIRM_SORT_KEY: ProjectFirmSortKey = 'name'
export const DEFAULT_PROJECT_FIRM_SORT_DIR: SortDirection = 'asc'

/**
 * Uygulanan liste kriterleri.
 *
 * Bölge ve G.D. firması ALANI YOK: satır ikisini de taşımıyor, süzülseydi
 * seçim yapılır yapılmaz liste boşalır ve kullanıcı veri kaybettiğini sanırdı
 * (aynı tuzak gaz dağıtım firmaları ekranında bölge için yaşandı, K27).
 * Filtre paneli bu yüzden pasif kutularla ve sebebini söyleyen ipuçlarıyla açılır.
 */
export interface ProjectFirmQuery {
  nameQuery: string
  sortKey: ProjectFirmSortKey
  sortDir: SortDirection
  page: number
  pageSize: number
}

/**
 * TÜM listeyi tek seferde çeker; süzme/sıralama/sayfalama ÇAĞIRANDA (`useMemo`)
 * yapılır. Sorgu `queryKey`'in parçası olsaydı her tuş vuruşu yeni bir ağ isteği
 * doğururdu — kayıt adedi yüksek olduğu için bilinçli olarak böyle.
 */
export async function getProjectFirmList(signal?: AbortSignal): Promise<ProjectFirm[]> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS, signal)
    return allMockProjectFirms()
  }

  const dtos = await requestJson(
    { method: 'GET', path: '/api/projectfirms', signal },
    projectFirmListDtoSchema,
  )

  return dtos.map(toProjectFirmListItem)
}
