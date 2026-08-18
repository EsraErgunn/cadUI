import { z } from 'zod'

import { pagedResultSchema } from './listQuery'

/**
 * SUNUCU ↔ ARAYÜZ dönüşümünün TEK yeri (gasFirmDto.ts deseni).
 *
 * `GET /api/projectfirms` alanları arayüzün adlarıyla birebir değil:
 * `title` ↔ `name`, `contactPerson` ↔ `authorizedPerson`.
 *
 * Liste satırı artık uçtan geleni BİREBİR taşıyor. Seri No, Yeter No ve Gsm
 * sütunları KALKTI (K102): üçü de her satırda "-" gösteriyordu — ilki ve
 * üçüncüsü yalnız detay yanıtında, ikincisinin uçta hiç karşılığı yoktu. Seri
 * no ayrıca alan olarak da kaldırıldı, Yeter No ise yetkilendirmeden.
 *
 * Gaz dağıtım firması bağı bu satırda YOK ama artık başka bir uçtan geliyor:
 * `GET /api/project-firm-authorizations`. Birleştirme `projectFirmListQuery.ts`
 * içinde (`ProjectFirmRow`), burada değil — satır tipi tek uçtan doğduğu için
 * eşlemenin ikinci bir isteğe bağımlı olmaması gerekiyor.
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

/**
 * Uç 2026-08-16'da düz diziden SAYFALI ZARFA geçti ve
 * `GasDistributionFirmId`/`GasDistributionGroupId`/`SortBy`/`SortDir`/`Page`/
 * `PageSize` almaya başladı. Süzme/sıralama/sayfalama hâlâ İSTEMCİDE (K27);
 * `GasDistributionFirmId` süzgeci KK-20 daraltmasını da veriyor ama o ayrı iş
 * (bkz. docs/api-eksikleri-proje-firmalari.md).
 */
export const projectFirmListPageSchema = pagedResultSchema(projectFirmListItemDtoSchema)

export type ProjectFirmListItemDto = z.infer<typeof projectFirmListItemDtoSchema>

/** Satırın yetkili olduğu gaz dağıtım firması; yetki ucundan gelir. */
export interface ProjectFirmGasFirm {
  id: number
  name: string
}

/** Liste satırının arayüz karşılığı; alanların tamamı uçtan geliyor. */
export interface ProjectFirm {
  id: number
  name: string
  authorizedPerson: string | null
  email: string | null
  phone: string | null
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
 * Artık `null` doğan alan YOK: karşılığı olmayan üç sütun kaldırıldığı için
 * eşleme birebir (K102).
 */
export function toProjectFirmListItem(dto: ProjectFirmListItemDto): ProjectFirm {
  return {
    id: dto.id,
    name: dto.title,
    authorizedPerson: dto.contactPerson,
    email: dto.email,
    phone: dto.phone,
    taxNumber: dto.taxNumber,
  }
}

/**
 * Firma türü sunucuda `byte`. İKİSİ de kabul ediliyor (§10): şahıs firması
 * `nationalIdNumber` ister ve `taxNumber`ı BOŞ bırakır, tüzel firma tam
 * tersi. Eskiden yalnız `legal` geçiyordu; o kısıt kalktı.
 */
export const PROJECT_FIRM_COMPANY_TYPES = {
  individual: 1,
  legal: 2,
} as const

/**
 * Ekleme/güncelleme istek gövdesi (ARAYÜZ adlarıyla; sunucuya
 * `toProjectFirmPayloadDto` ile çevrilir).
 *
 * İKİ KİMLİK ALANI BİRBİRİNİ DIŞLIYOR (§10): şahısta `nationalIdNumber` dolu ve
 * `taxNumber` `null`, tüzelde tam tersi. Gizli ama dolu kalan alan sunucudan
 * 400 döndürüyor, bu yüzden temizlik forma değil GÖVDEYE kadar iniyor
 * (`toProjectFirmPayload`).
 *
 * `serialNumber` YOK: alan sözleşmeden kalktı (K102) ve `null` göndermek yerine
 * anahtar hiç yazılmıyor.
 */
export interface ProjectFirmPayload {
  companyType: number
  name: string
  taxNumber: string | null
  nationalIdNumber: string | null
  accountingCode: string | null
  authorizedPerson: string | null
  email: string | null
  /** HAM rakamlar: "05551234567". Maskeli metin GÖNDERİLMEZ. */
  phone: string | null
  mobilePhone: string | null
  address: string | null
}

/**
 * Sunucunun `ProjectFirmCreateDto` alan adları. POST ve PUT gövdeleri AYNI
 * (sözleşme doğrulandı), bu yüzden tek tip iki uca da hizmet ediyor.
 */
export interface ProjectFirmPayloadDto {
  companyType: number
  title: string
  taxNumber: string | null
  nationalIdNumber: string | null
  accountingCode: string | null
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
    nationalIdNumber: payload.nationalIdNumber,
    accountingCode: payload.accountingCode,
    contactPerson: payload.authorizedPerson,
    email: payload.email,
    phone: payload.phone,
    phone2: payload.mobilePhone,
    address: payload.address,
  }
}

/**
 * TEKİL firma yanıtı (`GET /api/projectfirms/{id}`).
 *
 * Liste satırından GENİŞ: adres ve ikinci telefon yalnız burada var — Kişi
 * Bilgileri ekranı bu yüzden listeyi değil tekil ucu okuyor.
 *
 * Ekranın GÖSTERMEDİĞİ alanlar da şemada (`companyType`, `taxNumber`,
 * `accountingCode`): `PUT /api/projectfirms/{id}` gövdesi bunları da istiyor ve
 * okunan değer geri gönderilmezse sunucuda SİLİNİRLER. Yani bu alanlar ekranda
 * görünmese de taşınmak zorunda.
 *
 * ⚠️ `nationalIdNumber` bu kuralın İSTİSNASI: yanıt onu MASKELİ döndürüyor
 * ("*******1234") ve maskeli metin geri gönderilemez — şahısta sağlamayı
 * tutturmaz, tüzelde "boş olmalı" kuralını çiğner, iki yönde de 400. Okunuyor
 * ama forma yüklenmiyor ve gövdeye olduğu gibi konmuyor (K103).
 *
 * `serialNumber` şemadan KALKTI (K102): alan hiçbir yerde okunmuyor ve gövdeye
 * de yazılmıyor.
 */
export const projectFirmFullDtoSchema = z.object({
  id: z.number().int().positive(),
  companyType: z.number().int(),
  title: z.string(),
  taxNumber: nullableText,
  nationalIdNumber: nullableText,
  accountingCode: nullableText,
  contactPerson: nullableText,
  email: nullableText,
  phone: nullableText,
  phone2: nullableText,
  address: nullableText,
})

export type ProjectFirmFullDto = z.infer<typeof projectFirmFullDtoSchema>

/**
 * Kişi Bilgileri ekranının FİRMA kaydında düzenlediği alanlar; gerisi okunan
 * kayıttan taşınır.
 *
 * `email` ve `phone` burada YOK ve bu bilinçli: ekrandaki Email kullanıcının
 * kendi e-postası (`PUT /api/users/{id}`), Telefon 1 de kullanıcının telefonu.
 * Firmanın kendi e-postası ve santral telefonu bu ekrandan DEĞİŞTİRİLMEZ,
 * okundukları gibi geri gönderilirler.
 */
export interface ProjectFirmContactChanges {
  title: string
  contactPerson: string | null
  phone2: string | null
  address: string | null
  /**
   * Şahıs firmasında kullanıcının YENİDEN GİRDİĞİ T.C. kimlik numarası; tüzel
   * firmada `null`. Okunan değer maskeli olduğu için taşınamıyor, bu yüzden
   * ekran alanı boş açıp gerçek numarayı istiyor (K103).
   */
  nationalIdNumber: string | null
}

/**
 * Gövde OKUNAN kayıttan türetilir, sıfırdan kurulmaz: ekranın düzenlemediği
 * alanlar (`companyType`, vergi no, T.C. kimlik, cari kod…) böylece olduğu gibi
 * geri gider — PUT kısmi güncelleme yapmadığı için gönderilmeyen alan SİLİNİR.
 *
 * Dönüş tipi `ProjectFirmPayloadDto`: POST ve PUT gövdeleri sözleşmede AYNI on
 * bir alan. Ayrı bir `ProjectFirmUpdateDto` vardı ve `companyType`i
 * `number | null` tutuyordu — sözleşme `number` diyor, yani o tip tek başına bir
 * sözleşme ihlaline izin veriyordu. Tek tipe indirildi ki iki uç ayrışamasın.
 */
export function toProjectFirmUpdateDto(
  firm: ProjectFirmFullDto,
  changes: ProjectFirmContactChanges,
): ProjectFirmPayloadDto {
  const { nationalIdNumber, ...rest } = changes

  return {
    companyType: firm.companyType,
    taxNumber: firm.taxNumber,
    // OKUNAN değer DEĞİL, ekrandan gelen: yanıttaki numara maskeli ve geri
    // gönderilirse sunucu 400 döner (K103).
    nationalIdNumber,
    accountingCode: firm.accountingCode,
    email: firm.email,
    phone: firm.phone,
    ...rest,
  }
}

/**
 * Ekleme yanıtı (`POST /api/projectfirms`). Sunucu 201 değil **200** ile TAM
 * detay nesnesi döndürüyor — sözleşmede tekil uçla aynı on bir alan, bu yüzden
 * şema da aynısı. Eskiden yalnız `{ id, title }` doğrulanıyordu; çağıranın o
 * kadarı yetiyordu ama şema sözleşmeden dar kalınca yanıttaki bir kayma
 * sınırda yakalanmıyordu.
 */
export const projectFirmDetailDtoSchema = projectFirmFullDtoSchema
