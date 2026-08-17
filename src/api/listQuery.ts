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

/**
 * Sunucunun kabul ettiği en büyük sayfa boyutu. ÖLÇÜLDÜ (2026-08-16):
 * `PageSize=1000` istendiğinde yanıt `pageSize: 100` dönüyor — üstü sessizce
 * kırpılıyor. "Tek istekte hepsini al" bu yüzden mümkün değil.
 */
const MAX_PAGE_SIZE = 100

/**
 * Güvenlik tavanı. `totalCount` hatalı gelirse (ya da liste istek arasında
 * büyürse) döngü sonsuza gitmesin: 100 × 200 = 20.000 kayıt, bu ekranların
 * gerçekçi üst sınırının çok üstünde.
 */
const MAX_PAGES = 200

/**
 * Sayfalı bir ucun TÜM kayıtlarını toplar.
 *
 * Bu uçlar 2026-08-16'da düz diziden sayfalı zarfa geçti ve parametresiz
 * çağrıda varsayılan `pageSize` **30**. Çağıranların hepsi tüm listeyi varsayıyor
 * (istemci tarafı süzme/sıralama/sayfalama, benzersizlik ön kontrolü, açılır
 * seçenekleri) — tek sayfayla yetinilseydi 31. kayıttan sonrası SESSİZCE
 * kaybolurdu: benzersizlik kontrolü "bu vergi no boşta" der, açılırda firma
 * görünmez, liste ekranı eksik sayfalar üretirdi.
 *
 * Bu, K27'nin emekliliği DEĞİL: sunucu tarafı sayfalamaya geçiş ekran ekran ve
 * ayrı yapılacak (bkz. docs/kararlar.md). Buradaki döngü yalnız ucun ESKİ
 * sözleşmesini ("hepsini döndür") koruyor.
 *
 * Sayfalar SIRAYLA çekiliyor: sayfa sayısı ilk yanıttaki `totalCount`'tan
 * çıkıyor, yani paralelleştirme ancak ilk istek döndükten sonra kurulabilirdi
 * ve bu listeler (onlarca kayıt) o karmaşıklığı hak etmiyor.
 */
export async function fetchAllPages<TItem>(
  fetchPage: (params: { page: number; pageSize: number }) => Promise<PagedResult<TItem>>,
): Promise<TItem[]> {
  const first = await fetchPage({ page: 1, pageSize: MAX_PAGE_SIZE })
  const collected = [...first.items]

  // Sayfa boyutu İSTENEN değil DÖNEN değerden okunuyor (sunucu kırpabiliyor);
  // istenen değerle hesaplansaydı sayfa sayısı olduğundan az çıkardı.
  const pageSize = first.pageSize > 0 ? first.pageSize : MAX_PAGE_SIZE
  const pageCount = Math.min(Math.ceil(first.totalCount / pageSize), MAX_PAGES)

  for (let page = 2; page <= pageCount; page += 1) {
    const next = await fetchPage({ page, pageSize })
    // Boş sayfa: sunucu totalCount'tan azını verdi, devam etmenin anlamı yok.
    if (next.items.length === 0) break

    collected.push(...next.items)
  }

  return collected
}
