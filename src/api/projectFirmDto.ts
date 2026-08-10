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
  }
}
