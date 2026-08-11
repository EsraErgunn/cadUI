import { z } from 'zod'

/**
 * SUNUCU ↔ ARAYÜZ dönüşümünün TEK yeri (gasFirmDto.ts deseni).
 *
 * `GET /api/projectfirms` alanları arayüzün adlarıyla birebir değil:
 * `title` ↔ `name`, `contactPerson` ↔ `authorizedPerson`.
 *
 * EKRANIN İSTEDİĞİ AMA UÇTA OLMAYAN ALANLAR — hepsi `null` doğar, arayüz "-"
 * gösterir:
 * - `serialNumber` (Seri No) ve `phone2` (Gsm) YALNIZ `/api/projectfirms/{id}`
 *   detay yanıtında var, liste satırında yok. Satır başına detay isteği atmak
 *   30 kayıtta 30 istek demekti; bilinçli olarak yapılmadı.
 * - Yeterlik numarası (Yeter No) uçta HİÇ yok — ne listede ne detayda.
 * - Gaz dağıtım firması bağı da yok: proje firmasını GD firmasına bağlayan bir
 *   uç bulunmuyor, bu yüzden "her yetki ayrı satır" kuralı (KK-5) bugün
 *   uygulanamıyor ve kayıt adedi TEKİL FİRMA sayısıdır.
 *
 * TODO(esra): backend liste DTO'suna `serialNumber`, `phone2`, yeterlik numarası
 * ve GD firması bağını ekleyince yalnız bu dosyadaki eşleme değişecek.
 */

/** Opsiyonel metin alanları sunucuda boş kalabiliyor. */
const nullableText = z.string().nullable()

/**
 * `id` ve `companyType` OpenAPI'de `integer | string` görünür (.NET üretecinin
 * biçimi); tel üzerinde sayı geliyor — gaz dağıtım firması listesi de aynı
 * şemayla gerçek uca karşı çalışıyor.
 */
export const projectFirmListItemDtoSchema = z.object({
  id: z.number().int().positive(),
  companyType: z.number().int(),
  title: z.string(),
  taxNumber: nullableText,
  contactPerson: nullableText,
  phone: nullableText,
  email: nullableText,
})

export const projectFirmListDtoSchema = z.array(projectFirmListItemDtoSchema)

export type ProjectFirmListItemDto = z.infer<typeof projectFirmListItemDtoSchema>

/** Gaz dağıtım firması bağı geldiğinde dolacak alan; bugün her satırda `null`. */
export interface ProjectFirmGasFirm {
  id: number
  name: string
}

/** Liste satırının arayüz karşılığı. */
export interface ProjectFirm {
  id: number
  serialNumber: string | null
  qualificationNumber: string | null
  name: string
  gasFirm: ProjectFirmGasFirm | null
  authorizedPerson: string | null
  email: string | null
  phone: string | null
  mobilePhone: string | null
  /**
   * Tabloda sütunu YOK; ekleme ekranının benzersizlik ön kontrolü için taşınıyor
   * (sunucu vergi numarasını denetlemiyor, bkz. `projectFirmForm.ts`). Liste zaten
   * tek seferde tümüyle çekildiği için ek istek doğurmaz.
   */
  taxNumber: string | null
}

/**
 * Sunucudan gelen liste satırı → arayüzün alan adları.
 *
 * Karşılığı olmayan alanlar SİLİNMEDİ, `null` veriliyor: sütunlar gereksinimdeki
 * sırayla duruyor ve uç genişleyince yalnız bu fonksiyon değişiyor.
 */
export function toProjectFirmListItem(dto: ProjectFirmListItemDto): ProjectFirm {
  return {
    id: dto.id,
    serialNumber: null,
    qualificationNumber: null,
    name: dto.title,
    gasFirm: null,
    authorizedPerson: dto.contactPerson,
    email: dto.email,
    phone: dto.phone,
    mobilePhone: null,
    taxNumber: dto.taxNumber,
  }
}

/**
 * Firma türü sunucuda `byte`. Değerler backend'in `ProjectFirmCreateValidator`
 * kuralından okundu: bugün YALNIZ `legal` kabul ediliyor, `individual` gövdesi
 * 400 ile geri çevriliyor (bkz. projectFirmForm.ts).
 */
export const PROJECT_FIRM_COMPANY_TYPES = {
  individual: 1,
  legal: 2,
} as const

/**
 * Ekleme/güncelleme istek gövdesi (ARAYÜZ adlarıyla; sunucuya
 * `toProjectFirmPayloadDto` ile çevrilir).
 *
 * T.C. kimlik numarası alanı YOK: sunucunun `ProjectFirmCreateDto`'sunda
 * karşılığı bulunmuyor (`ProjectFirm.NationalIdNumber` şifreli bir sütun ve
 * uca hiç açılmamış). Şahıs şirketi kimliği bu yüzden gönderilmiyor —
 * gönderilse `taxNumber` sütununa yazılır, veri yanlış yere düşerdi.
 */
export interface ProjectFirmPayload {
  companyType: number
  name: string
  taxNumber: string | null
  accountingCode: string | null
  serialNumber: string | null
  authorizedPerson: string | null
  email: string | null
  /** HAM rakamlar: "05551234567". Maskeli metin GÖNDERİLMEZ. */
  phone: string | null
  mobilePhone: string | null
  address: string | null
}

/** Sunucunun `ProjectFirmCreateDto` alan adları. */
export interface ProjectFirmPayloadDto {
  companyType: number
  title: string
  taxNumber: string | null
  accountingCode: string | null
  serialNumber: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  phone2: string | null
  address: string | null
}

/** Arayüzün istek gövdesi → sunucunun alan adları. */
export function toProjectFirmPayloadDto(payload: ProjectFirmPayload): ProjectFirmPayloadDto {
  return {
    companyType: payload.companyType,
    title: payload.name,
    taxNumber: payload.taxNumber,
    accountingCode: payload.accountingCode,
    serialNumber: payload.serialNumber,
    contactPerson: payload.authorizedPerson,
    email: payload.email,
    phone: payload.phone,
    phone2: payload.mobilePhone,
    address: payload.address,
  }
}

/**
 * Ekleme yanıtı. Sunucu 201 değil **200** ile tam detay nesnesi döndürüyor
 * (gaz dağıtım firması ucundaki desenin aynısı). Şema yalnız çağıranın
 * ihtiyaç duyduğu kadarını zorunlu tutuyor.
 */
export const projectFirmDetailDtoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
})
