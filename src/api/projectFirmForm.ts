import { requestJson, requestVoid, type RequestOptions } from './http'
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
 * `nationalIdNumber`, `accountingCode`, `contactPerson`, `email`, `phone`,
 * `phone2`, `address`. POST ve PUT gövdeleri AYNI. Dönüşüm
 * `projectFirmDto.ts`'te. `serialNumber` gövdeden ÇIKTI (K102) — `null`
 * gönderilmiyor, anahtar hiç yazılmıyor.
 *
 * Şahıs firması (`companyType = 1`) ARTIK destekleniyor: `nationalIdNumber`
 * zorunlu, `taxNumber` boş. Aynı T.C. numarasıyla ikinci kayıt 409 döner ve
 * SİLİNMİŞ firma da numarayı rezerve tutar.
 *
 * **Yetkilendirme kayıtları ARTIK GERÇEK uca yazılıyor**
 * (`POST /api/project-firm-authorizations`, satır başına bir istek). Bu blok bir
 * süre "her zaman mock" diyordu; uç açıldı, gövde bağlandı ve not güncellenmeden
 * kalmıştı. GÜNCELLEME ekranı yetkilendirme bölümünü yine de göstermiyor
 * (bkz. `ProjectFirmUpdateForm`).
 *
 * SUNUCUDA KARŞILIĞI OLMAYAN:
 *
 * - **Benzersizlik**: sunucu VERGİ numarasını denetlemiyor (409 yok); ön
 *   kontrol istemcide, liste ucundan gelen kayıtlar üzerinde
 *   (`projectFirmUniqueness.ts`). Yarış durumunu kapatmaz; sunucu kuralı gelince
 *   bu ön kontrol ikinci savunma hattına düşer. T.C. kimlik numarası AYRI:
 *   orada sunucu 409 döndürüyor ve silinmiş firma bile numarayı rezerve
 *   tutuyor, yani istemcide ön kontrol yapılamaz.
 *
 * MOCK GÖVDE YOK — istisnasız. Firma uçlarının hepsi sözleşmede var, bu yüzden
 * `VITE_API_URL` tanımsızken sahte gövdeye düşmüyorlar: API kökü yoksa `http.ts`
 * anlaşılır bir `NetworkError` fırlatır.
 */

const PROJECT_FIRMS_PATH = '/api/projectfirms'

/** Yetkilendirme kaydının istek gövdesindeki karşılığı. */
export interface ProjectFirmAuthorizationPayload {
  /**
   * Firmanın ADI. Gövdeye GİTMİYOR; başarısız satırları kullanıcıya adıyla
   * söyleyebilmek için taşınıyor — kimlik göstermek "hangi firma bağlanamadı"
   * sorusunu cevaplamazdı.
   */
  gasDistributionFirmName: string
  /** Gaz dağıtım firmasının kimliği. Sunucu modeli bir tur `GasDistributionFirmRegionId`
      diyordu; bölge kavramı kalkınca alan `GasDistributionFirmId` oldu. */
  gasDistributionFirmId: number
  /** Kayıttaki TEK numara; "Yeterlilik No" kalktı (K102). Uçta ZORUNLU. */
  certificateNumber: string
  /** yyyy-aa-gg; uçta zorunlu. */
  validFrom: string
  /** yyyy-aa-gg ya da null (süresiz). */
  validTo: string | null
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
  /** Satırların TAMAMI yazıldı mı. `failedGasFirmNames` boşsa `true`. */
  arePersisted: boolean
  /**
   * Yazılamayan satırların firma ADLARI. Firma kaydı zaten oluşmuş oluyor ve
   * geri alınmıyor; kullanıcı hangi bağların kurulamadığını görmeden "kaydedildi"
   * mesajıyla baş başa kalmamalı.
   */
  failedGasFirmNames: string[]
}

const PROJECT_FIRM_AUTHORIZATIONS_PATH = '/api/project-firm-authorizations'

/**
 * Yetkilendirme kayıtları — GERÇEK uç, satır başına BİR istek
 * (`POST /api/project-firm-authorizations`). Uç toplu gövde kabul etmiyor.
 *
 * Firma kaydı başarılı olduktan SONRA çağrılıyor, bu yüzden buradaki bir hata
 * firma kaydını geri ALMAZ — çağıran hangi bağların kurulamadığını gösterir,
 * kullanıcı kalanları firma güncelleme ekranından tamamlar.
 *
 * Bir satır düşünce döngü DURMUYOR: ilk hatada çıkılsaydı sonraki firmalar hiç
 * denenmez ve kullanıcı kaç bağın kurulduğunu bilemezdi. Hatalar toplanıp
 * adlarıyla geri veriliyor.
 *
 * Sıralı gönderiliyor, paralel değil: uç aynı firma için çakışan kayıtları
 * reddedebiliyor ve paralel istekte hangisinin geçtiği belirsiz olurdu.
 */
export async function saveProjectFirmAuthorizations(
  firmId: number,
  authorizations: ProjectFirmAuthorizationPayload[],
): Promise<AuthorizationSaveResult> {
  const failedGasFirmNames: string[] = []

  for (const authorization of authorizations) {
    try {
      await requestVoid({
        method: 'POST',
        path: PROJECT_FIRM_AUTHORIZATIONS_PATH,
        rawJsonBody: JSON.stringify({
          projectFirmId: firmId,
          gasDistributionFirmId: authorization.gasDistributionFirmId,
          certificateNumber: authorization.certificateNumber,
          validFrom: authorization.validFrom,
          validTo: authorization.validTo,
        }),
      })
    } catch {
      failedGasFirmNames.push(authorization.gasDistributionFirmName)
    }
  }

  return { arePersisted: failedGasFirmNames.length === 0, failedGasFirmNames }
}

/**
 * Şahıs şirketi işaretliyken gönderilecek firma türü; aksi hâlde tüzel.
 *
 * "Şahıs Şirketi" onay kutusu sunucudaki `companyType`e bağlı (1 = şahıs,
 * 2 = tüzel); sunucu ikisini de kabul ediyor (§10).
 */
export function toCompanyType(isSoleProprietorship: boolean): number {
  return isSoleProprietorship
    ? PROJECT_FIRM_COMPANY_TYPES.individual
    : PROJECT_FIRM_COMPANY_TYPES.legal
}

/**
 * Tekil firmanın önbellek anahtarı — fonksiyonun YANINDA duruyor.
 *
 * Aynı kaydı iki ekran çekiyor (Profil ve Firma Güncelle) ve anahtarı ayrı ayrı
 * yazdıkları sürece iki farklı ada (`projectFirmDetail` / `projectFirm`)
 * kaymışlardı: iki kopya önbellek, iki istek ve en kötüsü çapraz tutmayan
 * geçersizleştirme — biri kaydı güncelleyince ötekinin kopyası bayat kalıyordu.
 * Anahtarı üreten tek yer burası olduğu sürece o kayma tekrar edemez.
 */
export const PROJECT_FIRM_QUERY_KEY = 'projectFirm'

/** Kimlik `null` olabilir: çağıran sorguyu `enabled` ile kapatana kadar anahtar
    yine de kararlı bir değer taşımalı. */
export function projectFirmQueryKey(id: number | null): readonly [string, number | null] {
  return [PROJECT_FIRM_QUERY_KEY, id]
}

/**
 * Tekil firma (`GET /api/projectfirms/{id}`). Liste ucundan okunmuyor: adres ve
 * ikinci telefon liste satırında YOK.
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
