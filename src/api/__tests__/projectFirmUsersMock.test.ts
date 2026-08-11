import { beforeAll, describe, expect, it } from 'vitest'

import type { ProjectFirmUserQuery } from '../projectFirmUserDto'
import { PROJECT_FIRM_USER_PAGE_SIZE } from '../projectFirmUsers'
import { queryMockProjectFirmUsers, seedProjectFirmUsers } from '../projectFirmUsersMock'

/**
 * Mock, sunucunun YAPACAĞI işi yapıyor: süzme, sıralama ve dilimleme burada.
 * Bu testler uç açıldığında da geçerli kalacak sözleşmeyi tarif ediyor
 * (docs/kararlar.md K46).
 *
 * Satırlar GERÇEK firma uçlarından tohumlanıyor; testte o uçların yerine sabit
 * bir firma kümesi konuyor — üretimdeki tohumlama yolunun aynısı.
 */
const GAS_FIRMS = [
  { id: 103, name: 'AKSA-GEMLİK' },
  { id: 105, name: 'ENERYA-ANTALYA' },
  { id: 107, name: 'TOROSGAZ-KÜTAHYA' },
]

const PROJECT_FIRMS = [
  { id: 201, name: 'AA Mühendislik' },
  { id: 202, name: 'Aksa Test Firması' },
  { id: 203, name: 'Anadolu Tesisat Ltd.' },
]

beforeAll(() => {
  seedProjectFirmUsers(GAS_FIRMS, PROJECT_FIRMS)
})
function buildQuery(overrides: Partial<ProjectFirmUserQuery> = {}): ProjectFirmUserQuery {
  return {
    nameQuery: '',
    authorityType: null,
    onlyActive: false,
    page: 1,
    pageSize: PROJECT_FIRM_USER_PAGE_SIZE,
    ...overrides,
  }
}

describe('sayfalama (KK-12)', () => {
  it('sayfa başına en çok 30 satır döner ve toplam filtrelenmiş adettir', () => {
    const page = queryMockProjectFirmUsers(buildQuery())

    expect(page.items.length).toBeLessThanOrEqual(PROJECT_FIRM_USER_PAGE_SIZE)
    expect(page.pageSize).toBe(PROJECT_FIRM_USER_PAGE_SIZE)
    expect(page.totalCount).toBeGreaterThan(PROJECT_FIRM_USER_PAGE_SIZE)
  })

  it('ikinci sayfa birinciyle aynı satırları taşımaz', () => {
    const first = queryMockProjectFirmUsers(buildQuery({ page: 1 }))
    const second = queryMockProjectFirmUsers(buildQuery({ page: 2 }))

    const firstKeys = first.items.map((row) => row.competencyId)
    const overlap = second.items.filter((row) => firstKeys.includes(row.competencyId))

    expect(overlap).toHaveLength(0)
    expect(second.totalCount).toBe(first.totalCount)
  })

  it('son sayfanın ötesinde boş liste döner ama adet korunur', () => {
    const all = queryMockProjectFirmUsers(buildQuery())
    const beyond = queryMockProjectFirmUsers(buildQuery({ page: 999 }))

    expect(beyond.items).toHaveLength(0)
    expect(beyond.totalCount).toBe(all.totalCount)
  })
})

// KK-11: her yetki AYRI satır; aynı kullanıcının satırları art arda gelir.
describe('çoklu yetkili kullanıcı (KK-11)', () => {
  it('satır adedi kullanıcı adedinden fazladır', () => {
    const page = queryMockProjectFirmUsers(buildQuery({ pageSize: 500 }))
    const userIds = new Set(page.items.map((row) => row.userId))

    expect(page.items.length).toBeGreaterThan(userIds.size)
    expect(page.totalCount).toBe(page.items.length)
  })

  it('aynı kullanıcının satırları art arda listelenir', () => {
    const page = queryMockProjectFirmUsers(buildQuery({ pageSize: 500 }))
    const seen = new Set<number>()
    let previousUserId: number | null = null

    for (const row of page.items) {
      if (row.userId !== previousUserId) {
        // Kullanıcıya ikinci kez dönülmüşse satırlar bölünmüş demektir.
        expect(seen.has(row.userId)).toBe(false)
        seen.add(row.userId)
        previousUserId = row.userId
      }
    }
  })

  it('kullanıcı bilgileri her satırda yinelenir', () => {
    const page = queryMockProjectFirmUsers(buildQuery({ pageSize: 500 }))
    const multiRowUserId = page.items.find(
      (row, index) => page.items[index + 1]?.userId === row.userId,
    )?.userId

    const rows = page.items.filter((row) => row.userId === multiRowUserId)
    expect(rows.length).toBeGreaterThan(1)
    expect(new Set(rows.map((row) => row.username)).size).toBe(1)
    expect(new Set(rows.map((row) => row.email)).size).toBe(1)
  })
})

describe('yetki filtresi (KK-3)', () => {
  it('yalnız seçilen yetkideki satırları döndürür', () => {
    const page = queryMockProjectFirmUsers(
      buildQuery({ authorityType: 'firmEngineer', pageSize: 500 }),
    )

    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items.every((row) => row.authorityType === 'firmEngineer')).toBe(true)
  })

  it('"Tümü" seçilince filtre kalkar', () => {
    const filtered = queryMockProjectFirmUsers(
      buildQuery({ authorityType: 'firmAuthorizedPerson', pageSize: 500 }),
    )
    const all = queryMockProjectFirmUsers(buildQuery({ pageSize: 500 }))

    expect(all.totalCount).toBeGreaterThan(filtered.totalCount)
  })
})

// KK-4: kullanıcı AKTİF ve yetki satırı AKTİF olanlar.
describe('aktif filtresi (KK-4)', () => {
  it('işaretliyken pasif kayıtları eler', () => {
    const active = queryMockProjectFirmUsers(buildQuery({ onlyActive: true, pageSize: 500 }))
    const all = queryMockProjectFirmUsers(buildQuery({ pageSize: 500 }))

    expect(active.totalCount).toBeGreaterThan(0)
    expect(active.totalCount).toBeLessThan(all.totalCount)
  })

  it('işaret kaldırılınca pasif kayıtlar da listelenir', () => {
    const active = queryMockProjectFirmUsers(buildQuery({ onlyActive: true, pageSize: 500 }))
    const all = queryMockProjectFirmUsers(buildQuery({ pageSize: 500 }))
    const activeKeys = active.items.map((row) => row.competencyId)

    expect(all.items.some((row) => !activeKeys.includes(row.competencyId))).toBe(true)
  })
})

describe('arama (KK-5)', () => {
  it('kullanıcı adı, ad soyad ve e-posta alanlarında eşleşir', () => {
    const byUsername = queryMockProjectFirmUsers(buildQuery({ nameQuery: 'tolga.ertek' }))
    const byFullName = queryMockProjectFirmUsers(buildQuery({ nameQuery: 'Tolga Ertek' }))
    const byEmail = queryMockProjectFirmUsers(buildQuery({ nameQuery: 'tolga.ertek@' }))

    expect(byUsername.totalCount).toBeGreaterThan(0)
    expect(byFullName.totalCount).toBe(byUsername.totalCount)
    expect(byEmail.totalCount).toBe(byUsername.totalCount)
  })

  it('büyük/küçük harf ve Türkçe karakter ayrımı yapmaz', () => {
    const typed = queryMockProjectFirmUsers(buildQuery({ nameQuery: 'BULENT SARIOGLU' }))

    expect(typed.totalCount).toBeGreaterThan(0)
    expect(typed.items[0].fullName).toBe('Bülent Sarıoğlu')
  })

  it('eşleşme yoksa boş sonuç döner (KK-7)', () => {
    const page = queryMockProjectFirmUsers(buildQuery({ nameQuery: 'kayıt-yok-xyz' }))

    expect(page.items).toHaveLength(0)
    expect(page.totalCount).toBe(0)
  })
})

// KK-6: üç kriter birlikte uygulanır, adet filtrelenmiş sonuca göre daralır.
describe('filtrelerin birlikte uygulanması (KK-6)', () => {
  it('kriterler kesişimi verir', () => {
    const combined = queryMockProjectFirmUsers(
      buildQuery({ authorityType: 'firmEngineer', onlyActive: true, nameQuery: 'a', pageSize: 500 }),
    )
    const onlyAuthority = queryMockProjectFirmUsers(
      buildQuery({ authorityType: 'firmEngineer', pageSize: 500 }),
    )

    expect(combined.totalCount).toBeLessThanOrEqual(onlyAuthority.totalCount)
    expect(combined.items.every((row) => row.authorityType === 'firmEngineer')).toBe(true)
  })
})
