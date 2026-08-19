import { describe, expect, it } from 'vitest'

import { GAS_FIRM_PAGE_SIZE, type GasDistributionFirm, type GasDistributionFirmQuery } from '../adminFirms'
import { queryFirmList } from '../gasFirmListQuery'

function buildFirm(overrides: Partial<GasDistributionFirm> = {}): GasDistributionFirm {
  return {
    id: 1,
    dfirmNo: 1,
    groupId: null,
    groupName: null,
    name: 'FİRMA',
    ...overrides,
  }
}

function buildQuery(overrides: Partial<GasDistributionFirmQuery> = {}): GasDistributionFirmQuery {
  return {
    nameQuery: '',
    groupId: null,
    scopeFirmId: null,
    sortKey: 'dfirmNo',
    sortDir: 'asc',
    page: 1,
    pageSize: GAS_FIRM_PAGE_SIZE,
    ...overrides,
  }
}

/**
 * Sunucu filtresiz/sayfalamasız düz dizi döndürdüğü için bu iş istemcide.
 * Geçici (docs/kararlar.md K27) ama davranışı mock'la gerçeğin ORTAK'ı.
 */
describe('arama', () => {
  const FIRMS = [
    buildFirm({ id: 1, dfirmNo: 1, name: 'Adana Doğalgaz' }),
    buildFirm({ id: 2, dfirmNo: 2, name: 'İzmir Gaz' }),
    buildFirm({ id: 3, dfirmNo: 3, name: 'ÇORUMGAZ' }),
  ]

  it('adın herhangi bir yerinde geçen kaydı bulur', () => {
    const { items } = queryFirmList(FIRMS, buildQuery({ nameQuery: 'gaz' }))

    expect(items.map((firm) => firm.id)).toEqual([1, 2, 3])
  })

  // KK-4: büyük/küçük harf ve Türkçe karakter farkı gözetilmez.
  it('Türkçe karakter ve harf büyüklüğü gözetmez', () => {
    expect(queryFirmList(FIRMS, buildQuery({ nameQuery: 'çorum' })).items).toHaveLength(1)
    expect(queryFirmList(FIRMS, buildQuery({ nameQuery: 'ÇORUM' })).items).toHaveLength(1)
    expect(queryFirmList(FIRMS, buildQuery({ nameQuery: 'izmir' })).items).toHaveLength(1)
  })

  it('eşleşme yoksa boş liste ve sıfır adet verir', () => {
    const { items, totalCount } = queryFirmList(FIRMS, buildQuery({ nameQuery: 'yok' }))

    expect(items).toEqual([])
    expect(totalCount).toBe(0)
  })
})

describe('grup filtresi', () => {
  const FIRMS = [
    buildFirm({ id: 1, dfirmNo: 1, groupId: 5 }),
    buildFirm({ id: 2, dfirmNo: 2, groupId: 7 }),
    buildFirm({ id: 3, dfirmNo: 3, groupId: null }),
  ]

  it('kimliğe göre süzer', () => {
    expect(queryFirmList(FIRMS, buildQuery({ groupId: 5 })).items.map((f) => f.id)).toEqual([1])
  })

  it('grup seçilmezse hepsini verir', () => {
    expect(queryFirmList(FIRMS, buildQuery()).totalCount).toBe(3)
  })
})

describe('sıralama', () => {
  const FIRMS = [
    buildFirm({ id: 1, dfirmNo: 3, name: 'Çorum', groupName: 'ÇEDAŞ' }),
    buildFirm({ id: 2, dfirmNo: 1, name: 'Adana', groupName: 'DOĞUGAZ' }),
    buildFirm({ id: 3, dfirmNo: 2, name: 'Bolu', groupName: null }),
  ]

  it('varsayılan olarak firma numarasına göre artan sıralar', () => {
    expect(queryFirmList(FIRMS, buildQuery()).items.map((f) => f.dfirmNo)).toEqual([1, 2, 3])
  })

  it('yön değişince ters çevirir', () => {
    const { items } = queryFirmList(FIRMS, buildQuery({ sortDir: 'desc' }))

    expect(items.map((firm) => firm.dfirmNo)).toEqual([3, 2, 1])
  })

  it('ada göre Türkçe sıralar', () => {
    const { items } = queryFirmList(FIRMS, buildQuery({ sortKey: 'name' }))

    expect(items.map((firm) => firm.name)).toEqual(['Adana', 'Bolu', 'Çorum'])
  })

  // "-" satırları listeyi bölmesin diye grubu olmayan kayıt HER İKİ yönde sonda.
  it('grubu olmayan kayıt her iki yönde de sona düşer', () => {
    const ascending = queryFirmList(FIRMS, buildQuery({ sortKey: 'groupName' })).items
    const descending = queryFirmList(
      FIRMS,
      buildQuery({ sortKey: 'groupName', sortDir: 'desc' }),
    ).items

    expect(ascending[ascending.length - 1].groupName).toBeNull()
    expect(descending[descending.length - 1].groupName).toBeNull()
  })
})

describe('sayfalama', () => {
  const FIRMS = Array.from({ length: 65 }, (_unused, index) =>
    buildFirm({ id: index + 1, dfirmNo: index + 1 }),
  )

  it('yalnız istenen sayfayı dilimler, toplam adet filtreye göre kalır', () => {
    const { items, totalCount } = queryFirmList(FIRMS, buildQuery())

    expect(items).toHaveLength(GAS_FIRM_PAGE_SIZE)
    expect(totalCount).toBe(65)
  })

  it('ikinci sayfa doğru aralığı verir', () => {
    const { items } = queryFirmList(FIRMS, buildQuery({ page: 2 }))

    expect(items[0].dfirmNo).toBe(GAS_FIRM_PAGE_SIZE + 1)
  })

  it('son sayfa eksik dolabilir', () => {
    expect(queryFirmList(FIRMS, buildQuery({ page: 3 })).items).toHaveLength(5)
  })

  it('aralık dışındaki sayfa boş gelir', () => {
    expect(queryFirmList(FIRMS, buildQuery({ page: 99 })).items).toEqual([])
  })

  it('gelen diziyi değiştirmez', () => {
    const input = [buildFirm({ id: 2, dfirmNo: 2 }), buildFirm({ id: 1, dfirmNo: 1 })]
    queryFirmList(input, buildQuery())

    expect(input[0].dfirmNo).toBe(2)
  })

  /** Üst bardaki kapsam TEK firmaysa liste o satıra iner (URL'de `gdfirm`). */
  it('kapsam firması seçiliyken yalnız o firmayı döndürür', () => {
    const firms = [buildFirm({ id: 1, name: 'AKSA GEBZE' }), buildFirm({ id: 2, name: 'ENERYA' })]

    const result = queryFirmList(firms, buildQuery({ scopeFirmId: 2 }))

    expect(result.totalCount).toBe(1)
    expect(result.items[0].id).toBe(2)
  })
})
