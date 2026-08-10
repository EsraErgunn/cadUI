import { describe, expect, it } from 'vitest'

import {
  projectFirmListDtoSchema,
  toProjectFirmListItem,
  type ProjectFirmListItemDto,
} from '../projectFirmDto'

function buildDto(overrides: Partial<ProjectFirmListItemDto> = {}): ProjectFirmListItemDto {
  return {
    id: 7,
    companyType: 1,
    title: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    taxNumber: '1234567890',
    contactPerson: 'Ahmet Yılmaz',
    phone: '05321000000',
    email: 'bilgi@adana.com.tr',
    ...overrides,
  }
}

describe('toProjectFirmListItem', () => {
  it('sunucu alan adlarını arayüzün adlarına çevirir', () => {
    expect(toProjectFirmListItem(buildDto())).toMatchObject({
      id: 7,
      name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
      authorizedPerson: 'Ahmet Yılmaz',
      phone: '05321000000',
      email: 'bilgi@adana.com.tr',
    })
  })

  /**
   * Uçta karşılığı OLMAYAN alanlar. Bu test bilerek "null bekliyorum" diyor:
   * backend liste DTO'suna bu alanları eklediğinde kırılıp eşlemenin
   * güncellenmesi gerektiğini hatırlatsın (bkz. projectFirmDto.ts TODO).
   */
  it('uçta bulunmayan alanları null bırakır', () => {
    expect(toProjectFirmListItem(buildDto())).toMatchObject({
      serialNumber: null,
      qualificationNumber: null,
      gasFirm: null,
      mobilePhone: null,
    })
  })

  it('boş kalabilen alanları olduğu gibi taşır', () => {
    const firm = toProjectFirmListItem(
      buildDto({ contactPerson: null, phone: null, email: null }),
    )

    expect(firm).toMatchObject({ authorizedPerson: null, phone: null, email: null })
  })
})

describe('projectFirmListDtoSchema', () => {
  it('geçerli yanıtı kabul eder', () => {
    expect(projectFirmListDtoSchema.parse([buildDto()])).toHaveLength(1)
  })

  // Sözleşme kayması bileşenin içinde değil sınırda patlamalı.
  it('ünvanı olmayan satırı reddeder', () => {
    expect(() => projectFirmListDtoSchema.parse([{ ...buildDto(), title: undefined }])).toThrow()
  })

  it('kimliği sayı olmayan satırı reddeder', () => {
    expect(() => projectFirmListDtoSchema.parse([{ ...buildDto(), id: '7' }])).toThrow()
  })
})
