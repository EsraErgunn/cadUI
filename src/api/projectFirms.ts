import { requestJson } from './http'
import { fetchAllPages, type SortDirection } from './listQuery'
import {
  projectFirmListPageSchema,
  toProjectFirmListItem,
  type ProjectFirm,
} from './projectFirmDto'

export type { ProjectFirm, ProjectFirmGasFirm } from './projectFirmDto'

/**
 * API SÖZLEŞMESİ — Proje firmaları listesi.
 * (Doğrulandı: cadapi @ a6ea695 — ProjectFirmsController + ProjectFirmManager.)
 *
 * GET /api/projectfirms → PagedResultDto<ProjectFirmListItemDto>
 *   `{ items, totalCount, page, pageSize }` — DÜZ DİZİ DEĞİL, sayfalı zarf.
 *
 * Kabul edilen sorgu parametreleri:
 * - `Page` (varsayılan 1), `PageSize` (varsayılan 30, ÜST SINIR 100 — üstü
 *   sessizce kırpılır, bkz. `listQuery.ts`).
 * - `GasDistributionFirmId`, `GasDistributionGroupId` — firmayı yetkisi
 *   üzerinden süzer.
 * - `SortDir` (`asc`/`desc`).
 * - `SortBy` gövdede VAR ama sunucu bugün OKUMUYOR: `ApplySort` yalnız
 *   `SortDir` alıyor ve sıralama her hâlde `Title` + `Id` üzerinden yapılıyor.
 *   Yani göndermek zararsız, güvenmek yanlış.
 *
 * ARAMA (`q`) PARAMETRESİ YOK — istemci tarafı süzmenin tek gerçek gerekçesi
 * budur. Sıralama ve sayfalama sunucuda MEVCUT; `getProjectFirmList` yine de
 * tüm sayfaları toplayıp işi istemcide bitiriyor çünkü ekran arama yapıyor ve
 * benzersizlik ön kontrolü listenin TAMAMINI görmek zorunda (aşağıdaki
 * `fetchAllPages` yorumuna bakın). Sunucu taraflı listeye geçiş `q` gelince
 * mümkün olur — bkz. docs/api-eksikleri-proje-firmalari.md.
 *
 * Görünürlük sunucuda: global `IsActive` süzgeci + `WhereVisibleTo` (admin
 * hepsi, proje firması kendi kaydı, gaz dağıtım kendi kapsamı).
 *
 * Satır FİRMA bazlı, yetki bazlı DEĞİL — kayıt adedi tekil firma sayısıdır
 * (KK-5 karşılanmıyor). NOT: `ProjectFirmListItemDto` sunucuda
 * `AuthorizedGasDistributionFirms` (yürürlükteki yetkilerin `{id, title}`
 * listesi) TAŞIYOR; bu modülün şeması onu OKUMUYOR ve gaz dağıtım firması bağı
 * ayrı uçtan (`GET /api/project-firm-authorizations`) birleştiriliyor.
 * TODO(esra): iki kaynaktan hangisinin kalacağı kararı verilmeli — satır alanı
 * kullanılırsa liste ekranı ikinci isteği bırakabilir.
 *
 * MOCK GÖVDE YOK. Eskiden `VITE_API_URL` tanımsızken sessizce sahte listeye
 * düşüyordu; uç sözleşmede VAR, o yüzden tek doğru davranış gerçek isteği
 * atmak. API kökü yoksa `http.ts` anlaşılır bir `NetworkError` fırlatır ve
 * ekran hata durumunu gösterir — kullanıcı uydurma veriyi gerçek sanmaz.
 * (Aynı ilke: `unimplementedEndpoints.ts`, docs/kararlar.md K46.)
 *
 * Ekle/güncelle/sil uçları `projectFirmForm.ts` içinde.
 */

/**
 * Proje firması LİSTESİNİ besleyen sorgu köklerinin tek kaynağı.
 *
 * Satır iki uçtan birleşiyor: firma kaydı (`/api/projectfirms`) ve gaz dağıtım
 * bağı (`/api/project-firm-authorizations`). Kayıt sonrası yalnız ilki
 * geçersizleştiriliyordu; yeni firma listede çıkıyor ama "G.D. Firması" sütunu
 * BOŞ kalıyordu, çünkü yetki sorgusu 5 dakika taze sayılıyor ve kayıttan ÖNCE
 * çekilmiş veriyle cevap veriyordu. İki kök burada duruyor ki mutasyon tarafı
 * hangisinin unutulduğunu düşünmek zorunda kalmasın.
 */
export const PROJECT_FIRM_QUERY_ROOTS = [
  'projectFirmList',
  'projectFirmAuthorizations',
] as const

export const PROJECT_FIRM_PAGE_SIZE = 30

/**
 * Sıralanabilir sütunlar. `G.D. Firması` sıralanabilir DEĞİL: satır bağı ayrı
 * uçtan geliyor ve çoğul, yani tek bir sıralama anahtarı üretmiyor. Karşılığı
 * olmayan üç sütun (Seri No, Yeter No, Gsm) zaten kaldırıldı (K102).
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
  /**
   * Metin araması. Ekranın kendi kutusu YOK; değer üst bardaki genel aramadan
   * geliyor ve uca `q` olarak gidiyor (Elastic, `ProjectFirmManager`).
   */
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
export async function getProjectFirmList(
  signal?: AbortSignal,
  /** Doluysa uca `q` olarak gider; arama SUNUCUDA (Elastic). */
  nameQuery = '',
): Promise<ProjectFirm[]> {
  const trimmed = nameQuery.trim()
  const searchParam = trimmed === '' ? '' : `&q=${encodeURIComponent(trimmed)}`

  const dtos = await fetchAllPages(({ page, pageSize }) =>
    requestJson(
      {
        method: 'GET',
        path: `/api/projectfirms?Page=${page}&PageSize=${pageSize}${searchParam}`,
        signal,
      },
      projectFirmListPageSchema,
    ),
  )

  return dtos.map(toProjectFirmListItem)
}
