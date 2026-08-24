import { z } from 'zod'

import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { requestJson, requestVoid } from './http'
import { pagedResultSchema, type PagedResult } from './listQuery'
import { mockedData, serverData, type Sourced } from './mockGate'
import { addMockPolicy, getMockPolicies, removeMockPolicy } from './policiesMock'
import type { ProjectSummary } from './projectDetailTypes'
import { isEndpointImplemented } from './unimplementedEndpoints'

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
 * Kayıt (`POST /api/policies`) ucu VAR ama ekran henüz bağlanmadı;
 * `policyCreate` bayrağı duruyor ve gövdeyi `policiesMock.ts` besliyor.
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

export type PolicyCreateResult =
  | { ok: true; policyId: number }
  | { ok: false; reason: 'duplicateNumber' | 'unavailable' }

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

/**
 * Poliçe silme — GERÇEK uç (`DELETE /api/policies/{id}`).
 *
 * Bellekteki depo da temizleniyor: KAYIT yolu hâlâ mock (`policyCreate`) ve o
 * turda oluşturulmuş bir poliçe silindikten sonra depoda kalsaydı, proje
 * detayının poliçe sekmesinde durmaya devam ederdi.
 */
export async function deletePolicy(policyId: number, signal?: AbortSignal): Promise<void> {
  await requestVoid({ method: 'DELETE', path: `/api/policies/${policyId}`, signal })

  removeMockPolicy(policyId)
}

/**
 * `GET /api/insurance-companies` — GERÇEK uç.
 *
 * Yol tireli. Bir süre `/api/insurancecompanies` varsayılıyordu ve o adres 404
 * dönüyordu; uç açıldığında bile liste boş kalırdı.
 *
 * `Sourced` zarfı DURUYOR: çağıranlar (poliçe sihirbazı) kaynağa göre farklı
 * yüzey çiziyor ve zarfı kaldırmak onları da değiştirmek olurdu. Artık her
 * zaman `server`.
 */
const insuranceCompanyDtoSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    title: z.string(),
  }),
)

export async function listInsuranceCompanies(
  signal?: AbortSignal,
): Promise<Sourced<InsuranceCompany[]>> {
  const dto = await requestJson(
    { method: 'GET', path: '/api/insurance-companies', signal },
    insuranceCompanyDtoSchema,
  )

  return serverData(dto.map((company) => ({ id: company.id, name: company.title })))
}

/**
 * Poliçe numarası benzersizliği (KK-19) — İSTEMCİ VARSAYIMI, sunucuda karşılığı
 * YOK.
 *
 * `PolicyManager.CreateAsync` poliçe numarasına hiç bakmıyor; denetlediği kural
 * başka: bir birimde aynı anda tek aktif poliçe (ihlalde 400). Buradaki kontrol
 * yalnız BELLEKTEKİ mock depoya karşı çalışıyor ve kayıt yolu gerçek uca
 * bağlanınca kaldırılmalı — sunucunun uygulamadığı bir kuralı kullanıcıya hata
 * olarak göstermek, olmayan bir kısıtı varmış gibi öğretir.
 *
 * TODO(esra): `policyCreate` bağlanınca bu fonksiyon ve
 * `POLICY_ERRORS.policyNumberTaken` silinecek.
 */
export function isPolicyNumberTaken(policyNumber: string): boolean {
  const normalized = policyNumber.trim().toLocaleUpperCase('tr-TR')

  return getMockPolicies().some(
    (policy) => policy.policyNumber.toLocaleUpperCase('tr-TR') === normalized,
  )
}

/**
 * Poliçe kaydı. Depo BELLEKTE: kayıt gerçekten proje detayının "Poliçe
 * Bilgileri" sekmesine düşüyor ama sayfa yenilenince kayboluyor. Çağıran bunu
 * kullanıcıya SÖYLER (K58'in `isPersisted: false` deseni).
 *
 * Üretim derlemesinde hiç yazılmaz (`unavailable`): gösterilmeyecek bir depoya
 * kayıt atmak, kullanıcıya yapılmamış bir işi yapılmış göstermek olurdu.
 */
export async function createProjectPolicy(
  payload: CreatePolicyPayload,
  /**
   * Proje künyesi. Uca GİTMEZ — `PolicyAddDto` proje kimliği almıyor, sunucu
   * projeyi birimden türetiyor. Bellekteki depo proje adını gösterebilsin diye
   * alınıyor; uç bağlanınca bu parametre düşer.
   */
  project: ProjectSummary,
  signal?: AbortSignal,
): Promise<PolicyCreateResult> {
  if (isEndpointImplemented('policyCreate')) {
    throw new Error('createProjectPolicy: uç bağlandı ama gövdesi yazılmadı.')
  }

  // Yalnız mock deposuna karşı; sunucuda böyle bir kural YOK (bkz.
  // `isPolicyNumberTaken`).
  if (isPolicyNumberTaken(payload.policyNumber)) {
    return { ok: false, reason: 'duplicateNumber' }
  }

  await delay(MOCK_LATENCY_MS, signal)

  const saved = mockedData(() => addMockPolicy(payload, project))
  if (saved.source === 'unavailable') return { ok: false, reason: 'unavailable' }

  return { ok: true, policyId: saved.data.id }
}
