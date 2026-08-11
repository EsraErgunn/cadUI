import { describe, expect, it } from 'vitest'

import {
  firmDetailDtoSchema,
  firmListItemDtoSchema,
  toFirmDetail,
  toFirmListItem,
  toFirmPayloadDto,
  toSortedFirmGroups,
} from '../gasFirmDto'

const DETAIL_DTO = {
  id: 42,
  title: 'ADANA DOĞALGAZ',
  companyNumber: 1204,
  groupId: 1,
  groupName: 'AKSA',
  contactPerson: 'Ahmet Yılmaz',
  description: 'Akdeniz bölgesi.',
  phone: '05321000000',
  address: 'Adana OSB No: 1',
}

/**
 * Sunucunun alan adları arayüzünkilerle birebir değil. Dönüşüm tek dosyada
 * duruyor; bu testler o dosyanın sözleşmesini sabitliyor.
 */
describe('toFirmDetail', () => {
  it('sunucu adlarını arayüz adlarına çevirir', () => {
    const detail = toFirmDetail(DETAIL_DTO)

    expect(detail.dfirmNo).toBe(DETAIL_DTO.companyNumber)
    expect(detail.name).toBe(DETAIL_DTO.title)
  })

  it('kalan alanları olduğu gibi taşır', () => {
    expect(toFirmDetail(DETAIL_DTO)).toEqual({
      id: 42,
      dfirmNo: 1204,
      name: 'ADANA DOĞALGAZ',
      groupId: 1,
      groupName: 'AKSA',
      description: 'Akdeniz bölgesi.',
      contactPerson: 'Ahmet Yılmaz',
      address: 'Adana OSB No: 1',
      phone: '05321000000',
    })
  })

  // Sunucu bu alanları boş bırakabiliyor; arayüz zaten `null` modelliyor.
  it('boş alanları null olarak taşır', () => {
    const detail = toFirmDetail({
      ...DETAIL_DTO,
      groupId: null,
      groupName: null,
      phone: null,
      description: null,
      address: null,
      contactPerson: null,
    })

    expect(detail.groupId).toBeNull()
    expect(detail.phone).toBeNull()
  })

  it('bölge alanı ÜRETMEZ — sunucu sözleşmesinde yok', () => {
    expect(toFirmDetail(DETAIL_DTO)).not.toHaveProperty('region')
  })
})

const LIST_DTO = {
  id: 7,
  title: 'ÇORUMGAZ',
  companyNumber: 1206,
  groupId: 2,
  groupName: 'ÇEDAŞ',
}

describe('toFirmListItem', () => {
  it('sunucu adlarını arayüz adlarına çevirir', () => {
    const item = toFirmListItem(LIST_DTO)

    expect(item.dfirmNo).toBe(1206)
    expect(item.name).toBe('ÇORUMGAZ')
    expect(item.groupId).toBe(2)
  })

  it('grubu olmayan satırı null taşır', () => {
    const item = toFirmListItem({ ...LIST_DTO, groupId: null, groupName: null })

    expect(item.groupId).toBeNull()
    expect(item.groupName).toBeNull()
  })
})

describe('firmListItemDtoSchema', () => {
  // Sunucu liste DTO'sundan yetkili kişiyi çıkardı; şema bunu ZORUNLU
  // beklerse liste hiç render olmuyordu.
  it('yetkili kişi alanı olmadan geçer', () => {
    expect(firmListItemDtoSchema.safeParse(LIST_DTO).success).toBe(true)
  })

  it('alan yine de gelirse yanıtı reddetmez', () => {
    expect(
      firmListItemDtoSchema.safeParse({ ...LIST_DTO, contactPerson: 'Ayşe Demir' }).success,
    ).toBe(true)
  })
})

describe('firmDetailDtoSchema', () => {
  it('telefonun null gelmesini kabul eder', () => {
    expect(firmDetailDtoSchema.safeParse({ ...DETAIL_DTO, phone: null }).success).toBe(true)
  })

  it('zorunlu alan eksikse sınırda patlar', () => {
    const missing: Record<string, unknown> = { ...DETAIL_DTO }
    delete missing.companyNumber

    expect(firmDetailDtoSchema.safeParse(missing).success).toBe(false)
  })
})

describe('toFirmPayloadDto', () => {
  const PAYLOAD = {
    dfirmNo: 115,
    name: 'YENİ FİRMA',
    groupId: 3,
    description: null,
    contactPerson: null,
    address: null,
    phone: '05551234567',
  }

  it('arayüz adlarını sunucu adlarına çevirir', () => {
    const dto = toFirmPayloadDto(PAYLOAD)

    expect(dto.title).toBe('YENİ FİRMA')
    expect(dto.companyNumber).toBe(115)
  })

  it('bölge alanı GÖNDERMEZ', () => {
    expect(toFirmPayloadDto(PAYLOAD)).not.toHaveProperty('region')
  })

  it('grup seçilmediğinde null gönderir', () => {
    expect(toFirmPayloadDto({ ...PAYLOAD, groupId: null }).groupId).toBeNull()
  })

  // Telefon ham rakam gider; maske yalnız arayüzde.
  it('telefonu ham rakam olarak gönderir, boşsa null', () => {
    expect(toFirmPayloadDto(PAYLOAD).phone).toBe('05551234567')
    expect(toFirmPayloadDto({ ...PAYLOAD, phone: '' }).phone).toBeNull()
  })
})

/**
 * Sunucu Türkçe sıralamıyor: ÇEDAŞ'ı DOĞUGAZ'dan önce veriyor. Düz kod noktası
 * sıralaması da yanlış — 'Ç' (U+00C7) 'D'den (U+0044) sonra gelir.
 */
describe('toSortedFirmGroups', () => {
  it('Türkçe harfleri doğru sıralar', () => {
    const sorted = toSortedFirmGroups([
      { id: 4, name: 'GAZDAŞ' },
      { id: 3, name: 'DOĞUGAZ' },
      { id: 2, name: 'ÇEDAŞ' },
      { id: 1, name: 'AKSA' },
    ])

    expect(sorted.map((group) => group.name)).toEqual(['AKSA', 'ÇEDAŞ', 'DOĞUGAZ', 'GAZDAŞ'])
  })

  it('kimlikleri korur', () => {
    const sorted = toSortedFirmGroups([
      { id: 9, name: 'ZORLU' },
      { id: 1, name: 'AKSA' },
    ])

    expect(sorted.map((group) => group.id)).toEqual([1, 9])
  })

  it('gelen diziyi değiştirmez', () => {
    const input = [
      { id: 2, name: 'ÇEDAŞ' },
      { id: 1, name: 'AKSA' },
    ]
    toSortedFirmGroups(input)

    expect(input[0].name).toBe('ÇEDAŞ')
  })
})
