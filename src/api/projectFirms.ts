import { requestJson } from './http'
import { fetchAllPages, type SortDirection } from './listQuery'
import {
  projectFirmListPageSchema,
  toProjectFirmListItem,
  type ProjectFirm,
} from './projectFirmDto'

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
 * MOCK GÖVDE YOK. Eskiden `VITE_API_URL` tanımsızken sessizce sahte listeye
 * düşüyordu; uç sözleşmede VAR, o yüzden tek doğru davranış gerçek isteği
 * atmak. API kökü yoksa `http.ts` anlaşılır bir `NetworkError` fırlatır ve
 * ekran hata durumunu gösterir — kullanıcı uydurma veriyi gerçek sanmaz.
 * (Aynı ilke: `unimplementedEndpoints.ts`, docs/kararlar.md K46.)
 *
 * Ekle/güncelle/sil uçları `projectFirmForm.ts` içinde.
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
 * TÜM listeyi çeker; süzme/sıralama/sayfalama ÇAĞIRANDA (`useMemo`) yapılır.
 * Sorgu `queryKey`'in parçası olsaydı her tuş vuruşu yeni bir ağ isteği
 * doğururdu — kayıt adedi yüksek olduğu için bilinçli olarak böyle.
 *
 * Uç 2026-08-16'da sayfalı zarfa geçti ve parametresiz çağrıda yalnız İLK 30
 * kaydı veriyor. Eksik liste burada özellikle tehlikeli: benzersizlik ön
 * kontrolü (`findTakenProjectFirmErrors`) bu listeye bakıyor, yani görünmeyen
 * bir kayıt "vergi numarası boşta" sonucunu verir ve çift kayıt açtırır.
 * Sayfalar bu yüzden `fetchAllPages` ile toplanıyor.
 */
export async function getProjectFirmList(signal?: AbortSignal): Promise<ProjectFirm[]> {
  const dtos = await fetchAllPages(({ page, pageSize }) =>
    requestJson(
      { method: 'GET', path: `/api/projectfirms?Page=${page}&PageSize=${pageSize}`, signal },
      projectFirmListPageSchema,
    ),
  )

  return dtos.map(toProjectFirmListItem)
}
