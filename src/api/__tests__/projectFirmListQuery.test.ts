import { describe, expect, it } from 'vitest'

import type { ProjectFirmAuthorizationRef } from '../projectFirmAuthorizations'
import { buildProjectFirmRows, queryProjectFirmList } from '../projectFirmListQuery'
import {
  PROJECT_FIRM_PAGE_SIZE,
  type ProjectFirm,
  type ProjectFirmQuery,
} from '../projectFirms'

function buildFirm(overrides: Partial<ProjectFirm> = {}): ProjectFirm {
  return {
    id: 1,
    name: 'FİRMA',
    authorizedPerson: null,
    email: null,
    phone: null,
    taxNumber: null,
    ...overrides,
  }
}

function buildQuery(overrides: Partial<ProjectFirmQuery> = {}): ProjectFirmQuery {
  return {
    nameQuery: '',
    sortKey: 'name',
    sortDir: 'asc',
    page: 1,
    pageSize: PROJECT_FIRM_PAGE_SIZE,
    ...overrides,
  }
}

function buildAuthorization(
  overrides: Partial<ProjectFirmAuthorizationRef> = {},
): ProjectFirmAuthorizationRef {
  return {
    id: 1,
    projectFirmId: 1,
    projectFirmName: 'FİRMA',
    gasDistributionFirmId: 101,
    gasDistributionFirmName: 'Başkentgaz',
    validFrom: '2026-01-01T00:00:00Z',
    validTo: null,
    ...overrides,
  }
}

/**
 * Firma ↔ G.D. firması bağını kuran uç yok; iki ucun sonucu satırda burada
 * birleşiyor. Süre süzgeci ÇAĞIRANDA (`getEffectiveAuthorizations`), bu yüzden
 * buradaki girdiler zaten yürürlükte sayılıyor.
 */
describe('buildProjectFirmRows', () => {
  it('yetkiyi kendi firmasının satırına yazar', () => {
    const rows = buildProjectFirmRows(
      [buildFirm({ id: 1 }), buildFirm({ id: 2 })],
      [buildAuthorization({ projectFirmId: 2 })],
    )

    expect(rows[0].gasFirms).toEqual([])
    expect(rows[1].gasFirms).toEqual([{ id: 101, name: 'Başkentgaz' }])
  })

  it('bir firmanın birden fazla G.D. firmasını taşır', () => {
    const rows = buildProjectFirmRows(
      [buildFirm({ id: 1 })],
      [
        buildAuthorization({ id: 1, gasDistributionFirmId: 101, gasDistributionFirmName: 'Doğugaz' }),
        buildAuthorization({ id: 2, gasDistributionFirmId: 102, gasDistributionFirmName: 'Çorumgaz' }),
      ],
    )

    // Sıralama Türkçe: sunucu 'Ç'yi 'D'den sonra veriyor.
    expect(rows[0].gasFirms.map((firm) => firm.name)).toEqual(['Çorumgaz', 'Doğugaz'])
  })

  /** Yenilenen belge aynı çift için iki satır olabiliyor (S6). */
  it('aynı G.D. firmasının iki yetkisini tek gösterir', () => {
    const rows = buildProjectFirmRows(
      [buildFirm({ id: 1 })],
      [buildAuthorization({ id: 1 }), buildAuthorization({ id: 2 })],
    )

    expect(rows[0].gasFirms).toHaveLength(1)
  })

  /** Karşılığı olmayan yetki satırı hiçbir firmaya yazılmaz, hata da vermez. */
  it('firması listede olmayan yetkiyi yok sayar', () => {
    const rows = buildProjectFirmRows(
      [buildFirm({ id: 1 })],
      [buildAuthorization({ projectFirmId: 99 })],
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].gasFirms).toEqual([])
  })
})

/**
 * Sunucu filtresiz/sayfalamasız düz dizi döndürdüğü için bu iş istemcide.
 * Geçici (docs/kararlar.md K29) ama davranışı mock'la gerçeğin ORTAK'ı.
 */
describe('arama', () => {
  const FIRMS = [
    buildFirm({ id: 1, name: 'Adana Mühendislik Ltd. Şti.' }),
    buildFirm({ id: 2, name: 'İstanbul Proje A.Ş.' }),
    buildFirm({ id: 3, name: 'ÇORUM Tesisat Ltd. Şti.' }),
  ]

  it('ünvanın herhangi bir yerinde geçen kaydı bulur', () => {
    const { items } = queryProjectFirmList(FIRMS, buildQuery({ nameQuery: 'ltd' }))

    expect(items.map((firm) => firm.id)).toEqual([1, 3])
  })

  it('büyük/küçük harf ve Türkçe karakter gözetmez', () => {
    expect(queryProjectFirmList(FIRMS, buildQuery({ nameQuery: 'çorum' })).items).toHaveLength(1)
    expect(queryProjectFirmList(FIRMS, buildQuery({ nameQuery: 'ÇORUM' })).items).toHaveLength(1)
  })

  /**
   * `toLocaleLowerCase('tr')` kullanılsaydı 'I' → 'ı' olur ve düz klavyeyle
   * "ISTANBUL" yazan kullanıcı "İstanbul"u BULAMAZDI. `includesTr` üçünü de
   * 'i'ye katladığı için iki yön de eşleşir.
   */
  it('I ile yazılan arama İ ile başlayan ünvanı bulur', () => {
    expect(queryProjectFirmList(FIRMS, buildQuery({ nameQuery: 'ISTANBUL' })).items).toHaveLength(1)
    expect(queryProjectFirmList(FIRMS, buildQuery({ nameQuery: 'istanbul' })).items).toHaveLength(1)
  })

  it('eşleşme yoksa boş liste ve sıfır adet verir', () => {
    const { items, totalCount } = queryProjectFirmList(FIRMS, buildQuery({ nameQuery: 'yok' }))

    expect(items).toEqual([])
    expect(totalCount).toBe(0)
  })

  it('arama yalnız ünvana bakar, yetkiliye değil', () => {
    const firms = [buildFirm({ id: 1, name: 'Adana', authorizedPerson: 'Zeynep Arslan' })]

    expect(queryProjectFirmList(firms, buildQuery({ nameQuery: 'Zeynep' })).totalCount).toBe(0)
  })
})

describe('sıralama', () => {
  const FIRMS = [
    buildFirm({ id: 1, name: 'Çorum', authorizedPerson: 'Ahmet' }),
    buildFirm({ id: 2, name: 'Adana', authorizedPerson: 'Zeynep' }),
    buildFirm({ id: 3, name: 'Bolu', authorizedPerson: null }),
  ]

  it('varsayılan olarak ünvana göre Türkçe artan sıralar', () => {
    const { items } = queryProjectFirmList(FIRMS, buildQuery())

    expect(items.map((firm) => firm.name)).toEqual(['Adana', 'Bolu', 'Çorum'])
  })

  it('yön değişince ters çevirir', () => {
    const { items } = queryProjectFirmList(FIRMS, buildQuery({ sortDir: 'desc' }))

    expect(items.map((firm) => firm.name)).toEqual(['Çorum', 'Bolu', 'Adana'])
  })

  it('yetkiliye göre sıralar', () => {
    const { items } = queryProjectFirmList(FIRMS, buildQuery({ sortKey: 'authorizedPerson' }))

    expect(items.map((firm) => firm.authorizedPerson)).toEqual(['Ahmet', 'Zeynep', null])
  })

  // "-" satırları listeyi ortadan bölmesin diye her iki yönde de sonda.
  it('yetkilisi olmayan kayıt her iki yönde de sona düşer', () => {
    const ascending = queryProjectFirmList(
      FIRMS,
      buildQuery({ sortKey: 'authorizedPerson' }),
    ).items
    const descending = queryProjectFirmList(
      FIRMS,
      buildQuery({ sortKey: 'authorizedPerson', sortDir: 'desc' }),
    ).items

    expect(ascending[ascending.length - 1].authorizedPerson).toBeNull()
    expect(descending[descending.length - 1].authorizedPerson).toBeNull()
  })
})

describe('sayfalama', () => {
  const FIRMS = Array.from({ length: 65 }, (_unused, index) =>
    buildFirm({ id: index + 1, name: `Firma ${String(index + 1).padStart(3, '0')}` }),
  )

  it('yalnız istenen sayfayı dilimler, toplam adet filtreye göre kalır', () => {
    const { items, totalCount } = queryProjectFirmList(FIRMS, buildQuery())

    expect(items).toHaveLength(PROJECT_FIRM_PAGE_SIZE)
    expect(totalCount).toBe(65)
  })

  it('ikinci sayfa doğru aralığı verir', () => {
    const { items } = queryProjectFirmList(FIRMS, buildQuery({ page: 2 }))

    expect(items[0].name).toBe('Firma 031')
  })

  it('son sayfa eksik dolabilir', () => {
    expect(queryProjectFirmList(FIRMS, buildQuery({ page: 3 })).items).toHaveLength(5)
  })

  it('aralık dışındaki sayfa boş gelir', () => {
    expect(queryProjectFirmList(FIRMS, buildQuery({ page: 99 })).items).toEqual([])
  })

  it('arama sonucunda toplam adet süzülmüş sayıdır', () => {
    const { totalCount } = queryProjectFirmList(FIRMS, buildQuery({ nameQuery: 'Firma 01' }))

    expect(totalCount).toBe(10)
  })

  it('gelen diziyi değiştirmez', () => {
    const input = [buildFirm({ id: 2, name: 'B' }), buildFirm({ id: 1, name: 'A' })]
    queryProjectFirmList(input, buildQuery())

    expect(input[0].name).toBe('B')
  })
})
