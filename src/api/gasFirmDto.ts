import { z } from 'zod'

/**
 * SUNUCU ↔ ARAYÜZ dönüşümünün TEK yeri.
 *
 * Uç `/api/gasdistributionfirms` alanları arayüzün alan adlarıyla birebir
 * değil: `companyNumber` ↔ `dfirmNo`, `title` ↔ `name`. Arayüz tarafındaki
 * adları değiştirmek yerine dönüşüm burada tutuluyor — `GasDistributionFirm`
 * ve `GasDistributionFirmDetail` adlarına bileşenler ve testler bağlı.
 *
 * Sunucunun alan adı değişirse yalnız bu dosya değişir.
 */

/** Opsiyonel metin alanları sunucuda boş kalabiliyor. */
const nullableText = z.string().nullable()

/**
 * Tekil firma yanıtı. `POST` de (201 değil) 200 ile bu gövdeyi döndürüyor,
 * bu yüzden ekleme yanıtı da aynı şemadan geçiyor.
 *
 * TODO(esra): `description`/`address`/`contactPerson`/`groupId` alanlarının
 * gerçekten null gelebildiği backend'le teyit edilecek; şema şimdilik
 * hoşgörülü, çünkü arayüz bu alanları zaten `null` olarak modelliyor.
 */
export const firmDetailDtoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  companyNumber: z.number().int(),
  groupId: z.number().int().nullable(),
  groupName: nullableText,
  contactPerson: nullableText,
  description: nullableText,
  phone: nullableText,
  address: nullableText,
})

export type FirmDetailDto = z.infer<typeof firmDetailDtoSchema>

/**
 * Liste satırı. Tekil yanıttan DAR: açıklama, telefon, adres ve yetkili kişi
 * taşımıyor — bunlar yalnız detay ucunda. `contactPerson` sunucu tarafında
 * liste DTO'sundan çıkarıldı; şemada zorunlu kalırsa `safeParse` patlar ve
 * liste hiç render olmaz, o yüzden burada da yok.
 * Uç filtresiz/sayfalamasız DÜZ DİZİ döndürüyor.
 */
export const firmListItemDtoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  companyNumber: z.number().int(),
  groupId: z.number().int().nullable(),
  groupName: nullableText,
})

export const firmListDtoSchema = z.array(firmListItemDtoSchema)

export type FirmListItemDto = z.infer<typeof firmListItemDtoSchema>

/** Sunucudan gelen liste satırı → arayüzün alan adları. */
export function toFirmListItem(dto: FirmListItemDto) {
  return {
    id: dto.id,
    dfirmNo: dto.companyNumber,
    name: dto.title,
    groupId: dto.groupId,
    groupName: dto.groupName,
  }
}

/** `PUT` gövde döndürmüyor, yalnız `{ message }`. Kimlik çağıranda zaten var. */
export const firmMessageDtoSchema = z.object({ message: z.string() })

export const firmGroupDtoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
})

/** Grup firması seçim kutusunun kaynağı. Değer artık ad değil KİMLİK. */
export interface FirmGroup {
  id: number
  name: string
}

export const firmGroupListDtoSchema = z.array(firmGroupDtoSchema)

/** Sunucudan gelen tekil firma → arayüzün alan adları. */
export function toFirmDetail(dto: FirmDetailDto) {
  return {
    id: dto.id,
    dfirmNo: dto.companyNumber,
    name: dto.title,
    groupId: dto.groupId,
    groupName: dto.groupName,
    description: dto.description,
    contactPerson: dto.contactPerson,
    address: dto.address,
    phone: dto.phone,
  }
}

/** İstek gövdesi alanları. Sunucu bölge (`region`) TAŞIMIYOR. */
export interface FirmPayloadDto {
  title: string
  companyNumber: number
  groupId: number | null
  description: string | null
  contactPerson: string | null
  phone: string | null
  address: string | null
}

/** Arayüzün istek gövdesi → sunucunun alan adları. */
export function toFirmPayloadDto(payload: {
  dfirmNo: number
  name: string
  groupId: number | null
  description: string | null
  contactPerson: string | null
  address: string | null
  phone: string
}): FirmPayloadDto {
  return {
    title: payload.name,
    companyNumber: payload.dfirmNo,
    groupId: payload.groupId,
    description: payload.description,
    contactPerson: payload.contactPerson,
    // Ham rakam gider; maske yalnız arayüzde (core/phone.ts).
    phone: payload.phone === '' ? null : payload.phone,
    address: payload.address,
  }
}

/**
 * Grup listesi. Sunucu Türkçe sıralamıyor (ÇEDAŞ, DOĞUGAZ'dan önce geliyor);
 * sıralama burada, tek yerde yapılıyor ki hem form seçim kutusu hem liste
 * filtresi aynı sırayı görsün.
 */
export function toSortedFirmGroups(dtos: { id: number; name: string }[]): FirmGroup[] {
  return [...dtos].sort((left, right) => left.name.localeCompare(right.name, 'tr'))
}
