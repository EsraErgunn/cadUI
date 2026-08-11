import { MOCK_LATENCY_MS, delay } from './adminFirms'
import { hasApiBaseUrl, requestJson } from './http'
import {
  PROJECT_FIRM_COMPANY_TYPES,
  projectFirmDetailDtoSchema,
  toProjectFirmPayloadDto,
  type ProjectFirmPayload,
} from './projectFirmDto'
import {
  createMockProjectFirm,
  recordMockProjectFirmAuthorizations,
} from './projectFirmsMock'

export type { ProjectFirmPayload } from './projectFirmDto'
export { PROJECT_FIRM_COMPANY_TYPES } from './projectFirmDto'

/**
 * API SÖZLEŞMESİ — Yeni proje firması ekle ekranı.
 * (Liste ucu `projectFirms.ts` içinde; o da filtresiz düz dizi döndürüyor.)
 *
 * POST /api/projectfirms → 200 (201 DEĞİL) + ProjectFirmDetailDto
 *
 * Gövde alanları sunucunun adlarıyla: `companyType`, `title`, `taxNumber`,
 * `accountingCode`, `serialNumber`, `contactPerson`, `email`, `phone`,
 * `phone2`, `address`. Dönüşüm `projectFirmDto.ts`'te.
 *
 * SUNUCUDA KARŞILIĞI OLMAYANLAR — hiçbiri uydurulmadı, arayüzde duruyor:
 *
 * - **Yetkilendirme kayıtları**: `ProjectFirmAuthorization` tablosu VAR ama onu
 *   yazan bir uç yok; `ProjectFirmCreateDto` yetki alanı taşımıyor.
 *   `saveProjectFirmAuthorizations` bu yüzden HER ZAMAN mock (aynı durumdaki
 *   `getNextDfirmNo` deseni) — uç açılınca yalnız bu gövde `requestJson`'a
 *   döner, imza değişmez.
 * - **T.C. kimlik numarası**: `ProjectFirm.NationalIdNumber` şifreli bir sütun,
 *   create DTO'sunda karşılığı yok. Şahıs şirketi kimliği gönderilmiyor.
 * - **Şahıs şirketi**: sunucunun doğrulayıcısı `companyType == 2` (tüzel)
 *   dışındaki gövdeyi 400 ile geri çeviriyor. Arayüz seçimi engellemiyor,
 *   sunucunun mesajı olduğu gibi gösteriliyor.
 * - **Benzersizlik**: sunucu vergi/seri numarasını DENETLEMİYOR (409 yok).
 *   Ön kontrol istemcide, liste ucundan gelen kayıtlar üzerinde
 *   (`projectFirmSchema.findTakenProjectFirmErrors`). Yarış durumunu kapatmaz;
 *   sunucu kuralı gelince bu ön kontrol ikinci savunma hattına düşer.
 *
 * `VITE_API_URL` tanımlı değilse tüm uçlar mock gövdeye düşer (`hasApiBaseUrl`).
 */

const PROJECT_FIRMS_PATH = '/api/projectfirms'

/** Yetkilendirme kaydının istek gövdesindeki karşılığı (uç açılınca kullanılacak). */
export interface ProjectFirmAuthorizationPayload {
  /** Gaz dağıtım firmasının kimliği; sunucu modeli bunu `GasDistributionFirmRegionId`
      ile tutuyor — uç açılınca eşlemenin doğrulanması gerekecek. */
  gasDistributionFirmId: number
  qualificationNumber: string
  certificateNumber: string | null
}

/** Ekleme yanıtı tam detay nesnesi döndürüyor; çağıranın ihtiyacı olan kimlik. */
export async function createProjectFirm(payload: ProjectFirmPayload): Promise<number> {
  if (!hasApiBaseUrl()) {
    await delay(MOCK_LATENCY_MS)
    return createMockProjectFirm(payload).id
  }

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
