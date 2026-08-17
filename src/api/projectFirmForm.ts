import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { hasApiBaseUrl, requestJson, requestVoid, type RequestOptions } from './http'
import {
  PROJECT_FIRM_COMPANY_TYPES,
  projectFirmDetailDtoSchema,
  projectFirmFullDtoSchema,
  toProjectFirmPayloadDto,
  toProjectFirmUpdateDto,
  type ProjectFirmContactChanges,
  type ProjectFirmFullDto,
  type ProjectFirmPayload,
} from './projectFirmDto'
import { recordMockProjectFirmAuthorizations } from './projectFirmsMock'

export type { ProjectFirmPayload } from './projectFirmDto'
export { PROJECT_FIRM_COMPANY_TYPES } from './projectFirmDto'

/**
 * API SÖZLEŞMESİ — Yeni proje firması ekle ekranı.
 * (Liste ucu `projectFirms.ts` içinde; o da filtresiz düz dizi döndürüyor.)
 *
 * POST   /api/projectfirms      → 200 (201 DEĞİL) + ProjectFirmDetailDto
 * PUT    /api/projectfirms/{id} → 200, GÖVDESİZ
 * DELETE /api/projectfirms/{id} → 200, GÖVDESİZ; 404 kayıt yoksa
 *
 * Gövde alanları sunucunun adlarıyla: `companyType`, `title`, `taxNumber`,
 * `nationalIdNumber`, `accountingCode`, `serialNumber`, `contactPerson`,
 * `email`, `phone`, `phone2`, `address`. POST ve PUT gövdeleri AYNI.
 * Dönüşüm `projectFirmDto.ts`'te.
 *
 * SUNUCUDA KARŞILIĞI OLMAYANLAR — hiçbiri uydurulmadı, arayüzde duruyor:
 *
 * - **Yetkilendirme kayıtları**: `ProjectFirmAuthorization` tablosu VAR ama onu
 *   yazan bir uç yok; `ProjectFirmCreateDto` yetki alanı taşımıyor.
 *   `saveProjectFirmAuthorizations` bu yüzden HER ZAMAN mock (aynı durumdaki
 *   `getNextDfirmNo` deseni) — uç açılınca yalnız bu gövde `requestJson`'a
 *   döner, imza değişmez. GÜNCELLEME ekranı bu yüzden yetkilendirme bölümünü
 *   HİÇ göstermiyor (bkz. `ProjectFirmUpdateForm`).
 * - **Şahıs şirketi**: sunucunun doğrulayıcısı `companyType == 2` (tüzel)
 *   dışındaki gövdeyi 400 ile geri çeviriyor. Arayüz seçimi engellemiyor,
 *   sunucunun mesajı olduğu gibi gösteriliyor.
 * - **Benzersizlik**: sunucu vergi/seri numarasını DENETLEMİYOR (409 yok).
 *   Ön kontrol istemcide, liste ucundan gelen kayıtlar üzerinde
 *   (`projectFirmSchema.findTakenProjectFirmErrors`). Yarış durumunu kapatmaz;
 *   sunucu kuralı gelince bu ön kontrol ikinci savunma hattına düşer.
 *
 * MOCK GÖVDE YOK. Firma uçlarının hepsi sözleşmede var, bu yüzden `VITE_API_URL`
 * tanımsızken sahte gövdeye düşmüyorlar: API kökü yoksa `http.ts` anlaşılır bir
 * `NetworkError` fırlatır. Tek istisna `saveProjectFirmAuthorizations` — o ucun
 * sözleşmede karşılığı YOK (aşağıdaki nota bakın).
 */

const PROJECT_FIRMS_PATH = '/api/projectfirms'

/** Yetkilendirme kaydının istek gövdesindeki karşılığı (uç açılınca kullanılacak). */
export interface ProjectFirmAuthorizationPayload {
  /** Gaz dağıtım firmasının kimliği. Sunucu modeli bir tur `GasDistributionFirmRegionId`
      diyordu; bölge kavramı kalkınca alan `GasDistributionFirmId` oldu ve arayüzdeki
      adla örtüştü — uç açılınca eşlemenin doğrulanması yine de gerekecek. */
  gasDistributionFirmId: number
  qualificationNumber: string
  certificateNumber: string | null
}

/** Ekleme yanıtı tam detay nesnesi döndürüyor; çağıranın ihtiyacı olan kimlik. */
export async function createProjectFirm(payload: ProjectFirmPayload): Promise<number> {
  const dto = await requestJson(
    {
      method: 'POST',
      path: PROJECT_FIRMS_PATH,
      rawJsonBody: JSON.stringify(toProjectFirmPayloadDto(payload)),
    },
    projectFirmDetailDtoSchema,
  )

  return dto.id
}

/**
 * Firmanın TÜM alanlarını günceller (`PUT /api/projectfirms/{id}`).
 *
 * `updateProjectFirmContact`ten AYRI: o, Kişi Bilgileri ekranının yalnız birkaç
 * alanı değiştirdiği dar yol (gövdeyi OKUNAN kayıttan tamamlıyor). Burası
 * güncelleme ekranının yolu — gövde formun kendisinden kuruluyor ve sözleşmenin
 * istediği on bir alanın hepsini taşıyor.
 *
 * Yanıt gövdesiz (200, boş) → `requestVoid`. 404 kayıt yoksa, 400 doğrulama.
 */
export async function updateProjectFirm(
  id: number,
  payload: ProjectFirmPayload,
): Promise<void> {
  await requestVoid({
    method: 'PUT',
    path: `${PROJECT_FIRMS_PATH}/${id}`,
    rawJsonBody: JSON.stringify(toProjectFirmPayloadDto(payload)),
  })
}

export interface AuthorizationSaveResult {
  /**
   * Kayıt gerçekten kalıcı oldu mu. Bugün YALNIZ mock modda `true`: orada
   * firma da yetkilendirme de aynı bellekteki gövdeye yazılıyor, yani ekran
   * kendi içinde tutarlı. Gerçek uçta firma sunucuya gidiyor ama yetkilendirme
   * mock'ta kalıyor — arayüz bunu kullanıcıya SÖYLEMEK zorunda.
   */
  arePersisted: boolean
}

/**
 * Yetkilendirme kayıtları. HER ZAMAN mock: sunucuda bunları yazan bir uç yok
 * (yukarıdaki sözleşme notu). Firma kaydı başarılı olduktan SONRA çağrılır,
 * bu yüzden burada bir hata firma kaydını geri almaz.
 *
 * "Kalıcı oldu mu" kararı BURADA veriliyor, arayüzde değil: uç açıldığında
 * `arePersisted` koşulsuz `true` olacak ve ekranda hiçbir şey değişmeyecek.
 * Arayüz `hasApiBaseUrl()`e kendisi baksaydı, bu bilgi iki yerde dururdu.
 *
 * TODO(esra): `POST /api/projectfirms/{id}/authorizations` açılınca gövde
 * `requestJson`'a dönecek, imza aynı kalacak.
 */
export async function saveProjectFirmAuthorizations(
  firmId: number,
  authorizations: ProjectFirmAuthorizationPayload[],
): Promise<AuthorizationSaveResult> {
  await delay(MOCK_LATENCY_MS)
  recordMockProjectFirmAuthorizations(firmId, authorizations)

  return { arePersisted: !hasApiBaseUrl() }
}

/**
 * Şahıs şirketi işaretliyken gönderilecek firma türü; aksi hâlde tüzel.
 *
 * ASSUMPTION: Belge firma türü diye bir alandan söz etmiyor; "Şahıs Şirketi"
 * onay kutusu sunucudaki `companyType`e bağlandı (1 = şahıs, 2 = tüzel).
 * Sunucu bugün yalnız 2'yi kabul ediyor.
 */
export function toCompanyType(isSoleProprietorship: boolean): number {
  return isSoleProprietorship
    ? PROJECT_FIRM_COMPANY_TYPES.individual
    : PROJECT_FIRM_COMPANY_TYPES.legal
}

/**
 * Tekil firma (`GET /api/projectfirms/{id}`). Liste ucundan okunmuyor: seri no,
 * adres ve ikinci telefon liste satırında YOK.
 */
export function getProjectFirm(
  id: number,
  options?: RequestOptions,
): Promise<ProjectFirmFullDto> {
  return requestJson(
    { method: 'GET', path: `${PROJECT_FIRMS_PATH}/${id}`, signal: options?.signal },
    projectFirmFullDtoSchema,
  )
}

/**
 * Firmanın iletişim alanlarını günceller (`PUT /api/projectfirms/{id}`).
 *
 * Gövde OKUNAN kayıttan türetiliyor (`toProjectFirmUpdateDto`): uç tüm alanları
 * bekliyor ve ekranda olmayanlar (vergi no, cari kod, şirket türü…) geri
 * gönderilmezse sunucuda silinirdi.
 *
 * Yanıt gövdesiz → `requestVoid`.
 */
export function updateProjectFirmContact(
  firm: ProjectFirmFullDto,
  changes: ProjectFirmContactChanges,
  options?: RequestOptions,
): Promise<void> {
  return requestVoid({
    method: 'PUT',
    path: `${PROJECT_FIRMS_PATH}/${firm.id}`,
    rawJsonBody: JSON.stringify(toProjectFirmUpdateDto(firm, changes)),
    signal: options?.signal,
  })
}

/**
 * Proje firmasını siler (`DELETE /api/projectfirms/{id}`).
 *
 * Ad `deactivate…` DEĞİL: gaz dağıtım firmasının aksine bu ucun soft-delete
 * olduğu doğrulanmadı, o yüzden fonksiyon sunucunun fiilini olduğu gibi taşıyor
 * ve onay diyaloğu da kaydın korunacağına dair bir söz VERMİYOR.
 *
 * Yanıt gövdesiz → `requestVoid`; `requestJson` boş gövdede `response.json()`
 * ile patlar ve işlem sunucuda BAŞARILIYKEN kullanıcı hata görürdü.
 */
export async function deleteProjectFirm(id: number): Promise<void> {
  await requestVoid({ method: 'DELETE', path: `${PROJECT_FIRMS_PATH}/${id}` })
}
