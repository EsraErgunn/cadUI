import { describe, expect, it } from 'vitest'

import {
  projectFirmListPageSchema,
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
   *
   * G.D. firması bağı bu listede ARTIK YOK: ayrı uçtan geliyor ve satıra
   * `projectFirmListQuery.buildProjectFirmRows` ekliyor.
   */
  it('uçta bulunmayan alanları null bırakır', () => {
    expect(toProjectFirmListItem(buildDto())).toMatchObject({
      serialNumber: null,
      qualificationNumber: null,
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

/** Uç 2026-08-16'da düz diziden sayfalı zarfa geçti; şema zarfı okuyor. */
function buildPage(items: unknown[]) {
  return { items, totalCount: items.length, page: 1, pageSize: 30 }
}

describe('projectFirmListPageSchema', () => {
  it('geçerli zarfı kabul eder', () => {
    expect(projectFirmListPageSchema.parse(buildPage([buildDto()])).items).toHaveLength(1)
  })

  /** Eski sözleşme: düz dizi artık gelmemeli, sınırda patlasın. */
  it('düz diziyi reddeder', () => {
    expect(() => projectFirmListPageSchema.parse([buildDto()])).toThrow()
  })

  // Sözleşme kayması bileşenin içinde değil sınırda patlamalı.
  it('ünvanı olmayan satırı reddeder', () => {
    expect(() =>
      projectFirmListPageSchema.parse(buildPage([{ ...buildDto(), title: undefined }])),
    ).toThrow()
  })

  it('kimliği sayı olmayan satırı reddeder', () => {
    expect(() => projectFirmListPageSchema.parse(buildPage([{ ...buildDto(), id: '7' }]))).toThrow()
  })
})
