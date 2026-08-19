import { z } from 'zod'

import { requestJson } from './http'
import { fetchAllPages, pagedResultSchema } from './listQuery'
import { endOfUtcDayMs, parseServerTimestampMs, startOfUtcDayMs } from './serverTimestamp'

/**
 * API SÖZLEŞMESİ — proje firması yetkilendirmeleri.
 *
 * `GET /api/project-firm-authorizations
 *    ?ProjectFirmId= &GasDistributionFirmId= &GasDistributionGroupId=
 *    &SortBy= &SortDir= &Page= &PageSize=`
 * → `{ items, totalCount, page, pageSize }`
 *
 * Proje firması ↔ gaz dağıtım firması bağını veren TEK uç bu. Dört yer okuyor:
 * proje oluşturmadaki yetki kimliği, Yeni Proje formunun G.D. firması açılırı,
 * kullanıcı yetki satırının proje firması açılırı ve proje firmaları
 * listesindeki "G.D. Firması" sütunu.
 *
 * Bu modül bugün YALNIZ okuma yapıyor. Yazma (`POST`/`PUT`) bilinçli olarak
 * eklenmedi: `ProjectFirmAuthorizationCreateDto` zorunlu `validFrom` istiyor ve
 * arayüzün yetkilendirme kartında tarih alanı YOK — cevaplanmadan yazma yolu
 * kullanıcının girdiğini sessizce kaybederdi
 * (docs/api-eksikleri-proje-firmalari.md → S2; S1 KAPANDI, "Yeterlilik No"
 * kaldırıldı). `saveProjectFirmAuthorizations` bu yüzden hâlâ mock.
 */

const PATH = '/api/project-firm-authorizations'

const authorizationListItemSchema = z.object({
  id: z.number().int().positive(),
  projectFirmId: z.number().int(),
  projectFirmName: z.string(),
  gasDistributionFirmId: z.number().int(),
  gasDistributionFirmName: z.string(),
  validFrom: z.string(),
  validTo: z.string().nullish(),
})

/**
 * Sayfalı zarf — sayaçlar DAHİL zorunlu. Bir tur yalnız `items` doğrulandı ve
 * uç `totalCount: 39` derken 30 satır döndürdüğü için yetki listesi sessizce
 * eksik kaldı; sayfa sayısı `totalCount`/`pageSize`'dan çıktığına göre bu iki
 * alan opsiyonel olamaz.
 */
const pagedAuthorizationSchema = pagedResultSchema(authorizationListItemSchema)

export type ProjectFirmAuthorizationRef = z.infer<typeof authorizationListItemSchema>

/** Yetki kaydı bulunamadı — sunucu hatası DEĞİL, veri eksikliği. */
export class ProjectFirmAuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectFirmAuthorizationError'
  }
}

export const NO_AUTHORIZATION_MESSAGE =
  'Seçilen proje firması ile gaz dağıtım firması arasında geçerli bir yetki ' +
  'kaydı bulunamadı. Proje bu firma çiftiyle açılamaz.'

/**
 * Firma alanlarını görmeyen kullanıcının oturumunda firma bağı yoksa. Sunucu
 * `CurrentUserDto`'da iki alanı da null bırakabiliyor (`/api/users` tarafında
 * firmasız kullanıcı mümkün); bu durumda proje açılamaz.
 */
export const MISSING_USER_FIRMS_MESSAGE =
  'Kullanıcınız bir proje firması ve gaz dağıtım firmasıyla ilişkilendirilmemiş. ' +
  'Proje açabilmek için yöneticinizle görüşün.'

/**
 * Kaydın verilen anda yürürlükte olup olmadığı; `validTo` boşsa süresizdir.
 *
 * **Süresi dolmuş yetki kuralının TEK kapısı.** Yeni Proje formu, yetki
 * satırındaki proje firması açılırı ve proje firmaları listesindeki G.D.
 * firması sütunu aynı bu fonksiyondan geçer — ikinci bir tarih karşılaştırması
 * yazılmaz. Kural sınırda (gün başı/sonu) inceldiği için ikinci bir kopya
 * kaçınılmaz olarak farklı davranırdı.
 *
 * **Sınır kuralı: GÜN bazlı ve iki uçta da DAHİL.** Yetki, `validFrom`'un
 * gününden `validTo`'nun gününün SONUNA kadar geçerli — yani `validTo` bugünse
 * yetki BUGÜN hâlâ geçerlidir.
 *
 * Anlık karşılaştırma (`to >= now`) seçilmedi: bu alan bir belgenin geçerlilik
 * bitişi ve gerçek veride gece yarısına kurulu oluyor. Anlık kural,
 * `validTo = 16.08.2026T00:00` olan bir sertifikayı 16 Ağustos saat 00:00'da
 * ölü sayar ve kullanıcı son gününü kaybederdi. Geçerli bir sertifikayı
 * reddetmek, birkaç saat fazladan kabul etmekten çok daha zararlı.
 *
 * Tarihler UTC varsayımıyla okunuyor (`serverTimestamp.ts`): uç dilim eki
 * yazmıyor, yerel kabul edilseydi UTC+3'te gün sınırı üç saat kayardı.
 */
export function isAuthorizationEffectiveAt(
  row: ProjectFirmAuthorizationRef,
  atMs: number,
): boolean {
  const from = parseServerTimestampMs(row.validFrom)
  if (Number.isNaN(from) || startOfUtcDayMs(from) > atMs) return false

  if (row.validTo === null || row.validTo === undefined) return true

  const to = parseServerTimestampMs(row.validTo)

  // Okunamayan bitiş tarihi kaydı elemez: sunucu biçimi değiştirirse yetki
  // sessizce kaybolmasın, süresiz sayılsın.
  return Number.isNaN(to) || endOfUtcDayMs(to) >= atMs
}

/**
 * Bir firma çifti için gövdeye girecek yetki kaydını seçer.
 *
 * **Pratikte tek satır geliyor**: sunucudaki filtreli benzersiz indeks
 * (`WHERE IsActive = 1`) aynı çift için ikinci bir AKTİF kayda izin vermiyor —
 * 39 kayıtlık gerçek veride de her çift tekil (doğrulandı 2026-08-16). Yine de
 * bu seçim korunuyor: indeks yalnız AKTİF satırları kapsıyor, yani soft-delete
 * edilmiş bir kayıt geri açılırsa ya da kural gevşerse liste çoğalabilir ve
 * çağıranın "ilk satır" gibi sessiz bir varsayıma düşmesi gerekirdi.
 *
 * Birden fazla gelirse kural: yürürlükteki kayıtlar arasından `validFrom` en
 * YENİ olan — yenilenmiş belge varken eskisine proje bağlamayı önlüyor
 * (docs/api-eksikleri-proje-firmalari.md S6).
 *
 * Yürürlükte kayıt yoksa `null` döner — süresi geçmiş bir yetkiye proje
 * bağlamak, sabit kimlik kadar yanlış veri yazardı.
 */
export function pickEffectiveAuthorization(
  rows: readonly ProjectFirmAuthorizationRef[],
  atMs: number,
): ProjectFirmAuthorizationRef | null {
  const effective = rows.filter((row) => isAuthorizationEffectiveAt(row, atMs))
  if (effective.length === 0) return null

  return effective.reduce((latest, row) =>
    Date.parse(row.validFrom) > Date.parse(latest.validFrom) ? row : latest,
  )
}

export interface AuthorizationFilter {
  projectFirmId?: number
  gasDistributionFirmId?: number
}

/**
 * Yetki kayıtları. Süzgeç verilse bile TÜM sayfalar toplanıyor: uçta varsayılan
 * `pageSize` 30 ve süzgeçsiz çağrıda 39 kaydın yalnız 30'u dönüyor (ölçüldü
 * 2026-08-16). Süzgeçli sonuç bugün küçük diye tek sayfaya güvenmek, firma
 * sayısı arttığında sessizce eksik listeye dönerdi.
 */
export async function getProjectFirmAuthorizations(
  filter: AuthorizationFilter = {},
  signal?: AbortSignal,
): Promise<ProjectFirmAuthorizationRef[]> {
  return fetchAllPages(({ page, pageSize }) => {
    const search = new URLSearchParams({ Page: String(page), PageSize: String(pageSize) })
    if (filter.projectFirmId !== undefined) {
      search.set('ProjectFirmId', String(filter.projectFirmId))
    }
    if (filter.gasDistributionFirmId !== undefined) {
      search.set('GasDistributionFirmId', String(filter.gasDistributionFirmId))
    }

    return requestJson(
      { method: 'GET', path: `${PATH}?${search.toString()}`, signal },
      pagedAuthorizationSchema,
    )
  })
}

/**
 * Yalnız BUGÜN yürürlükte olan yetki satırları.
 *
 * Süzme istemcide çünkü uçta `onlyValid` ya da tarih parametresi YOK
 * (docs/api-eksikleri-proje-firmalari.md S2). Yetki verisini okuyan üç ekran da
 * bu kapıdan geçiyor; ham `getProjectFirmAuthorizations` yalnız proje
 * oluştururken (`resolveProjectFirmAuthorizationId`) kullanılıyor, orada seçim
 * kuralı `pickEffectiveAuthorization` içinde ve aynı kapıya çıkıyor.
 */
export async function getEffectiveAuthorizations(
  filter: AuthorizationFilter = {},
  signal?: AbortSignal,
): Promise<ProjectFirmAuthorizationRef[]> {
  const rows = await getProjectFirmAuthorizations(filter, signal)
  const now = Date.now()

  return rows.filter((row) => isAuthorizationEffectiveAt(row, now))
}

/** Açılır kutuya giren firma kısayolu; iki yön de aynı şekli üretiyor. */
export interface AuthorizedFirmRef {
  id: number
  name: string
}

/**
 * Aynı firma birden fazla yetki satırında görünebilir (yenilenen belge, S6):
 * kimliğe göre tekilleştirilir. Sıralama Türkçe ve İSTEMCİDE — sunucu 'Ç'yi
 * 'D'den sonra veriyor ve uçta `SortBy` kullanılmıyor (K85).
 */
function toFirmOptions(
  rows: readonly ProjectFirmAuthorizationRef[],
  select: (row: ProjectFirmAuthorizationRef) => AuthorizedFirmRef,
): AuthorizedFirmRef[] {
  const byId = new Map<number, AuthorizedFirmRef>()

  for (const row of rows) {
    const firm = select(row)
    byId.set(firm.id, firm)
  }

  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, 'tr'))
}

/**
 * Bir proje firmasının BUGÜN yetkili olduğu gaz dağıtım firmaları — Yeni Proje
 * formundaki "Gaz Dağıtım Firması" açılırının kaynağı.
 *
 * Süresi dolmuş yetkiler ELENİYOR: önerilselerdi kullanıcı geçersiz bir çift
 * seçer ve hata ancak kaydetmeye basınca ("geçerli yetki kaydı bulunamadı")
 * görünürdü.
 */
export async function getAuthorizedGasFirms(
  projectFirmId: number,
  signal?: AbortSignal,
): Promise<AuthorizedFirmRef[]> {
  const rows = await getEffectiveAuthorizations({ projectFirmId }, signal)

  return toFirmOptions(rows, (row) => ({
    id: row.gasDistributionFirmId,
    name: row.gasDistributionFirmName,
  }))
}

/**
 * Bir gaz dağıtım firmasında BUGÜN yetkili olan proje firmaları — kullanıcı
 * yetki satırındaki "Proje Firması" açılırının kaynağı (KK-20).
 *
 * `getAuthorizedGasFirms`'in aynası: aynı uç, aynı geçerlilik kapısı, ters yönde
 * tekilleştirme. `GET /api/projectfirms?GasDistributionFirmId=` de bu listeyi
 * verirdi ve satırı doğrudan firma olduğu için tekilleştirme gerektirmezdi, ama
 * geçerlilik TARİHİ taşımıyor: süresi dolmuş bir yetkiyle bağlı firma da
 * seçenek olarak çıkardı. Tek istekle hem daraltma hem süre kuralı ancak yetki
 * ucundan geliyor.
 */
export async function getAuthorizedProjectFirms(
  gasDistributionFirmId: number,
  signal?: AbortSignal,
): Promise<AuthorizedFirmRef[]> {
  const rows = await getEffectiveAuthorizations({ gasDistributionFirmId }, signal)

  return toFirmOptions(rows, (row) => ({ id: row.projectFirmId, name: row.projectFirmName }))
}

/**
 * `POST /api/projects`'in gövdesine giren `projectFirmAuthorizationId`.
 *
 * Uç firma kimliği DEĞİL, proje firmasının o gaz dağıtım firmasındaki YETKİ
 * kaydının kimliğini istiyor. Bu kimlik daha önce sabitti
 * (`SEEDED_PROJECT_FIRM_AUTHORIZATION_ID = 1`) çünkü listeleyen uç yoktu; uç
 * açılınca sabit kalktı.
 */
export async function resolveProjectFirmAuthorizationId(
  lookup: { projectFirmId: number; gasDistributionFirmId: number },
  signal?: AbortSignal,
): Promise<number> {
  const rows = await getProjectFirmAuthorizations(lookup, signal)
  const chosen = pickEffectiveAuthorization(rows, Date.now())

  if (chosen === null) throw new ProjectFirmAuthorizationError(NO_AUTHORIZATION_MESSAGE)

  return chosen.id
}
