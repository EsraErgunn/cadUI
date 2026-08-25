import { z } from 'zod'

import { requestJson, requestVoid } from './http'
import { pagedResultSchema, type PagedResult } from './listQuery'

/**
 * API SÖZLEŞMESİ — Poliçeler. (Doğrulandı: cadapi @ a6ea695.)
 *
 * - `GET /api/policies` — sayfalı liste. `ProjectId` OPSİYONEL: verilmezse
 *   kullanıcının görünürlük kapsamındaki TÜM poliçeler döner, verilirse tek
 *   projeye daralır. Ek süzgeçler: `InsuranceCompanyId`, `Search`.
 * - `GET /api/policies/{id}` — tekil
 * - `PUT /api/policies/{id}` — güncelleme
 * - `DELETE /api/policies/{id}` — elle iptal (soft-delete)
 * - `GET /api/insurance-companies` — sigorta şirketleri
 *
 * **ACENTE KAVRAMI YOK.** Poliçenin sunucudaki tek firma alanı
 * `InsuranceCompanyId`; ayrı bir acente tablosu, ucu veya modeli yok. Sihirbazda
 * bir süre iki ayrı kutu vardı ("Sigorta Şirketi" + "Acente / Poliçe Firması")
 * ve ikincisinin yazacağı yer yoktu — tek kutuya indirildi. Bu adla yeni tip,
 * sorgu veya uç ekleme.
 *
 * **SIRALAMA PARAMETRESİ YOK.** Uç `SortBy`/`SortDir` almıyor; sıra sunucuda
 * sabit (`StartDate` azalan, `Id` tiebreaker). Ekranda sıralanabilir başlık
 * bırakılmadı — çalışmayan bir sütun başlığı, olmayandan yanıltıcıdır.
 *
 * **ARAMA KAPSAMI SUNUCUNUN:** poliçe numarası, birim numarası ve abone
 * numarası (contains). **Proje adı DAHİL DEĞİL** — ekran bir süre proje adında
 * da arıyormuş gibi duruyordu.
 *
 * `ProjectUnitId` süzgeci YOK: birim bazlı poliçe listesi için uç mevcut değil
 * (bkz. docs/api-eksikleri-policeler.md).
 *
 * **Kayıt kuralı sunucuda:** bir birimde aynı anda tek AKTİF poliçe olabilir.
 * İhlalde uç `400` + `{ message }` döndürüyor (409 DEĞİL) ve eski poliçeyi
 * OTOMATİK KAPATMIYOR — kullanıcı önce mevcut poliçeyi iptal etmeli. Poliçe
 * NUMARASI üzerinde hiçbir benzersizlik kuralı YOK (ne indeks ne denetim).
 */

/**
 * `PolicyDto` — liste ve tekil detay AYNI gövdeyi döndürüyor.
 *
 * Alanların çoğu opsiyonel: poliçe birime bağlı ve birim silinmiş olabiliyor
 * (`isUnitDeleted`), tutar/tarih de girilmemiş olabiliyor. Zorunlu tutmak, yarım
 * doldurulmuş tek bir kayıt yüzünden listeyi sınırda öldürürdü.
 */
const policyDtoSchema = z.object({
  id: z.number().int().positive(),
  projectId: z.number().int(),
  projectName: z.string().nullish(),
  projectUnitId: z.number().int().nullish(),
  unitNumber: z.string().nullish(),
  insuranceCompanyId: z.number().int().nullish(),
  insuranceCompanyTitle: z.string().nullish(),
  policyNumber: z.string().nullish(),
  amount: z.number().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  isActive: z.boolean().nullish(),
  isUnitDeleted: z.boolean().nullish(),
})

export type PolicyDto = z.infer<typeof policyDtoSchema>

const policyPageSchema = pagedResultSchema(policyDtoSchema)

/** Proje detayındaki sekme sayfalama istemiyor; üst sınır listeyi kesmesin diye yüksek. */
const PROJECT_POLICY_PAGE_SIZE = 100

/**
 * Bir PROJENİN poliçeleri — GERÇEK uç (`GET /api/policies?ProjectId=`).
 *
 * `excludeUnitDeleted` GÖNDERİLMİYOR: silinmiş birime bağlı poliçe de listede
 * kalmalı, yoksa kayıt sessizce kaybolur ve kullanıcı sildiği birimle birlikte
 * poliçesinin de gittiğini fark etmez. Satır `isUnitDeleted` taşıyor, ayrımı
 * arayüz yapar.
 */
export async function listProjectPolicies(
  projectId: number,
  signal?: AbortSignal,
): Promise<PolicyDto[]> {
  const search = new URLSearchParams({
    ProjectId: String(projectId),
    Page: '1',
    PageSize: String(PROJECT_POLICY_PAGE_SIZE),
  })

  const page = await requestJson(
    { method: 'GET', path: `/api/policies?${search.toString()}`, signal },
    policyPageSchema,
  )

  return page.items
}

/** Tekil poliçe (`GET /api/policies/{id}`); güncelleme ekranı gelince formu besleyecek. */
export function getPolicy(policyId: number, signal?: AbortSignal): Promise<PolicyDto> {
  return requestJson({ method: 'GET', path: `/api/policies/${policyId}`, signal }, policyDtoSchema)
}

/**
 * Poliçe güncelleme (`PUT /api/policies/{id}`).
 *
 * Ekranı HENÜZ YOK; fonksiyon sözleşmeyi bağlamak için burada — yol ve gövde
 * biçimi bir yerde yazılı olmazsa ekranı yazan kişi yeniden keşfetmek zorunda
 * kalır. Gövde birim TAŞIMAZ: `PolicyUpdateDto` birimi almıyor, poliçe başka
 * bir birime taşınamıyor.
 *
 * TODO(esra): güncelleme ekranı yazılınca çağıran buraya bağlanacak.
 */
export interface UpdatePolicyPayload {
  insuranceCompanyId: number | null
  policyNumber: string | null
  amount: number | null
  startDate: string | null
  endDate: string | null
}

export function updatePolicy(
  policyId: number,
  payload: UpdatePolicyPayload,
  signal?: AbortSignal,
): Promise<void> {
  return requestVoid({
    method: 'PUT',
    path: `/api/policies/${policyId}`,
    rawJsonBody: JSON.stringify(payload),
    signal,
  })
}

export interface InsuranceCompany {
  id: number
  name: string
}

/**
 * Poliçe yöntemi. Sunucuya GİTMEZ — `PolicyAddDto`'da karşılığı yok. Sihirbazın
 * ilk adımı (gereksinim 15) tek seçenekli bir bilgilendirme olarak duruyor;
 * değeri kaydın gövdesine girmiyor.
 */
export const POLICY_METHODS = ['manual'] as const
export type PolicyMethod = (typeof POLICY_METHODS)[number]

export const POLICY_METHOD_LABELS: Record<PolicyMethod, string> = {
  manual: 'Manuel Poliçe',
}

/**
 * `POST /api/policies` gövdesi — `PolicyAddDto` ile BİREBİR.
 *
 * `projectId` YOK: sunucu projeyi birimden türetiyor. `agencyId` ve `method` de
 * yok; ikisinin de sunucuda alanı bulunmuyor.
 */
export interface CreatePolicyPayload {
  /** Poliçenin bağlandığı birim; sunucuda kayıt proje değil BİRİM başına. */
  projectUnitId: number
  insuranceCompanyId: number
  policyNumber: string
  /** Kuruş DAHİL tutar (2 ondalık); biçimlendirme gösterim katmanında. */
  amount: number
  /** yyyy-aa-gg — saat dilimi kaymasın diye ISO damgası değil, düz tarih. */
  startDate: string
  endDate: string
}

export const POLICY_PAGE_SIZE = 30

/**
 * Poliçeler listesinin satırı — `PolicyDto`'dan türetiliyor.
 *
 * Alanların çoğu `null` olabilir çünkü sunucuda `ProjectUnitId` dışında hiçbiri
 * zorunlu değil; yarım doldurulmuş tek bir kayıt listeyi sınırda öldürmesin.
 *
 * "Acente", "Yöntem" ve "ProjeId" alanları YOK: üçünün de sunucuda karşılığı
 * bulunmuyor (`PolicyDto` bina kodu taşımıyor). Boş kalacak sütunlar yerine
 * alanın kendisi kaldırıldı.
 */
export interface PolicyRow {
  id: number
  policyNumber: string | null
  insuranceCompanyId: number | null
  insuranceCompanyName: string | null
  /** Kuruş DAHİL teminat tutarı; biçimlendirme gösterim katmanında. */
  amount: number | null
  startDate: string | null
  endDate: string | null
  projectId: number
  /** Sunucudan geliyor (`PolicyDto.ProjectName`); çözülemezse `null`. */
  projectName: string | null
  /** Poliçenin bağlı olduğu birim; güncelleme formunda SALT OKUNUR gösterilir. */
  unitNumber: string | null
  /**
   * Birim çizimden silindi mi (`PolicyDto.IsUnitDeleted`).
   *
   * Poliçe bu durumda İPTAL EDİLMİYOR: `IsActive` `true` kalıyor ve kayıt
   * listede görünmeye devam ediyor, yalnız birim bağı kopuyor
   * (`ProjectUnitId` null'a çekiliyor). Satır bu yüzden uyarıyla işaretleniyor
   * — sessizce birimsiz görünen bir poliçe, veri kaybı gibi okunurdu.
   */
  isUnitDeleted: boolean
}

export interface PolicyListQuery {
  /**
   * Sunucunun aradığı alanlar: poliçe numarası, birim numarası, abone numarası.
   * PROJE ADI DAHİL DEĞİL — uç o alanda aramıyor.
   */
  search: string
  insuranceCompanyId: number | null
  /** `null` = proje bağımsız "tüm poliçeler"; uç `ProjectId` olmadan da çalışır. */
  projectId: number | null
  page: number
  pageSize: number
}

function toPolicyRow(dto: PolicyDto): PolicyRow {
  return {
    id: dto.id,
    policyNumber: dto.policyNumber ?? null,
    insuranceCompanyId: dto.insuranceCompanyId ?? null,
    insuranceCompanyName: dto.insuranceCompanyTitle ?? null,
    amount: dto.amount ?? null,
    startDate: dto.startDate ?? null,
    endDate: dto.endDate ?? null,
    projectId: dto.projectId,
    projectName: dto.projectName ?? null,
    unitNumber: dto.unitNumber ?? null,
    isUnitDeleted: dto.isUnitDeleted ?? false,
  }
}

/**
 * Poliçeler listesi — GERÇEK uç (`GET /api/policies`).
 *
 * `ProjectId` yalnız DOLUYSA yazılıyor: uç onsuz çağrıldığında kullanıcının
 * görünürlük kapsamındaki tüm poliçeleri döndürüyor (backend a6ea695). Boş
 * süzgeci parametre olarak göndermek, "tümü" demek için yokluğu kullanan
 * sözleşmeyi bozardı.
 *
 * Sıralama GÖNDERİLMİYOR — uç `SortBy`/`SortDir` almıyor, sıra sunucuda sabit.
 */
export async function listPolicies(
  query: PolicyListQuery,
  signal?: AbortSignal,
): Promise<PagedResult<PolicyRow>> {
  const search = new URLSearchParams({
    Page: String(query.page),
    PageSize: String(query.pageSize),
  })

  if (query.projectId !== null) search.set('ProjectId', String(query.projectId))
  if (query.insuranceCompanyId !== null) {
    search.set('InsuranceCompanyId', String(query.insuranceCompanyId))
  }
  if (query.search !== '') search.set('Search', query.search)

  const page = await requestJson(
    { method: 'GET', path: `/api/policies?${search.toString()}`, signal },
    policyPageSchema,
  )

  return { ...page, items: page.items.map(toPolicyRow) }
}

/** Poliçe silme — GERÇEK uç (`DELETE /api/policies/{id}`); elle iptal (soft-delete). */
export function deletePolicy(policyId: number, signal?: AbortSignal): Promise<void> {
  return requestVoid({ method: 'DELETE', path: `/api/policies/${policyId}`, signal })
}

/**
 * `GET /api/insurance-companies` — GERÇEK uç.
 *
 * Yol tireli. Bir süre `/api/insurancecompanies` varsayılıyordu ve o adres 404
 * dönüyordu; uç açıldığında bile liste boş kalırdı.
 */
const insuranceCompanyDtoSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    title: z.string(),
  }),
)

export async function listInsuranceCompanies(
  signal?: AbortSignal,
): Promise<InsuranceCompany[]> {
  const dto = await requestJson(
    { method: 'GET', path: '/api/insurance-companies', signal },
    insuranceCompanyDtoSchema,
  )

  return dto.map((company) => ({ id: company.id, name: company.title }))
}

/**
 * Poliçe kaydı — GERÇEK uç (`POST /api/policies`).
 *
 * Yanıt `200` ve gövdesi oluşturulan kaydın kendisi (`PolicyDto`); `201` DEĞİL
 * ve sarmalayıcı bir zarf YOK (`BaseApiController.FromResult` → `Ok(result.Data)`).
 *
 * Hata FIRLATILIR, dönüş değerine gömülmez: `http.ts` gövdedeki `message`
 * alanını `ApiError.message`'a taşıyor ve çağıran onu olduğu gibi kullanıcıya
 * gösterebiliyor. Sunucunun ürettiği iki hata gövdesi de bu kapıdan geçiyor —
 * iş kuralı `{ message }`, FluentValidation `{ errors: { alan: [...] } }`.
 *
 * Beklenen hâller (hepsi koddan doğrulandı, cadapi @ a6ea695):
 * - `404` — birim ya da sigorta şirketi bulunamadı, proje görünür değil
 * - `400` — birimde zaten aktif poliçe var (eski poliçe OTOMATİK kapanmaz)
 * - `400` — doğrulama: `ProjectUnitId > 0`, `PolicyNumber` ≤ 50 karakter,
 *   `Amount >= 0`, `EndDate >= StartDate`
 */
export function createPolicy(
  payload: CreatePolicyPayload,
  signal?: AbortSignal,
): Promise<PolicyDto> {
  return requestJson(
    {
      method: 'POST',
      path: '/api/policies',
      rawJsonBody: JSON.stringify(payload),
      signal,
    },
    policyDtoSchema,
  )
}
