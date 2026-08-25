import { describe, expect, it } from 'vitest'

import { GLOBAL_SCOPE } from '../../../api/adminDashboard'
import type { GasDistributionFirm, FirmGroup } from '../../../api/adminFirms'
import {
  UNGROUPED_FIRMS_LABEL,
  buildScopeOptionGroups,
  findScopeName,
  parseScopeValue,
  toScopeValue,
} from '../adminScopeOptions'

/** Sunucu Türkçe sıralamıyor ve 'Ç'yi 'D'den SONRA veriyor; sıra istemcinin
    garantisi olduğu için girdi bilerek karışık. */
const GROUPS: FirmGroup[] = [
  { id: 2, name: 'ENERYA' },
  { id: 1, name: 'AKSA' },
  { id: 3, name: 'ÇEDAŞ' },
]

function buildFirm(
  id: number,
  name: string,
  groupId: number | null,
  groupName: string | null,
): GasDistributionFirm {
  return { id, dfirmNo: id, groupId, groupName, name }
}

const FIRMS: GasDistributionFirm[] = [
  buildFirm(21, 'AKSA-Denizli', 1, 'AKSA'),
  buildFirm(20, 'AKSA-Ankara', 1, 'AKSA'),
  buildFirm(30, 'ENERYA-Aydın', 2, 'ENERYA'),
  buildFirm(40, 'Bağımsız Gaz', null, null),
]

describe('buildScopeOptionGroups', () => {
  it('grupları Türkçe alfabeye göre sıralar', () => {
    const labels = buildScopeOptionGroups(GROUPS, []).map((group) => group.label)

    expect(labels).toEqual(['AKSA', 'ÇEDAŞ', 'ENERYA'])
  })

  it('her grubun firmalarını kendi içinde sıralar', () => {
    const aksa = buildScopeOptionGroups(GROUPS, FIRMS)[0]

    expect(aksa.firmOptions.map((option) => option.label)).toEqual([
      'AKSA-Ankara',
      'AKSA-Denizli',
    ])
  })

  // Firma başka grubun altına düşerse kullanıcı yanlış hiyerarşi görür.
  it('firmayı kendi grubunun altına koyar', () => {
    const groups = buildScopeOptionGroups(GROUPS, FIRMS)
    const enerya = groups.find((group) => group.label === 'ENERYA')

    expect(enerya?.firmOptions.map((option) => option.label)).toEqual(['ENERYA-Aydın'])
  })

  /**
   * Etiket YALIN ad. Bir süre "(tümü)" ekleniyordu ve satır `<optgroup>`
   * başlığının hemen altında duruyordu: kullanıcı aynı şeyin iki kez yazıldığını
   * sanıyordu. Başlık kalktı, grup kendi satırıyla temsil ediliyor.
   */
  it('grubun kendisi seçilebilir bir satır üretir, etiketi yalın addır', () => {
    const aksa = buildScopeOptionGroups(GROUPS, FIRMS)[0]

    expect(aksa.groupOption).toEqual({ value: 'group:1', label: 'AKSA' })
  })

  /** Elenselerdi o firmaların kapsamı arayüzden HİÇ seçilemezdi. */
  it('grubu olmayan firmayı sona ayrı başlık altında toplar', () => {
    const groups = buildScopeOptionGroups(GROUPS, FIRMS)
    const last = groups[groups.length - 1]

    expect(last.label).toBe(UNGROUPED_FIRMS_LABEL)
    expect(last.groupOption).toBeNull()
    expect(last.firmOptions.map((option) => option.label)).toEqual(['Bağımsız Gaz'])
  })

  it('grubu olmayan firma yoksa fazladan başlık açmaz', () => {
    const groups = buildScopeOptionGroups(GROUPS, FIRMS.slice(0, 3))

    expect(groups.map((group) => group.label)).not.toContain(UNGROUPED_FIRMS_LABEL)
  })
})

/**
 * Değer TÜRÜ de taşımak zorunda: aynı sayı hem grup hem firma kimliği olabilir,
 * çıplak kimlik hangisinin seçildiğini söylemez.
 */
describe('toScopeValue / parseScopeValue', () => {
  it('grup kapsamını gidiş-dönüş korur', () => {
    expect(parseScopeValue(toScopeValue({ type: 'group', groupId: 7 }))).toEqual({
      type: 'group',
      groupId: 7,
    })
  })

  it('firma kapsamını gidiş-dönüş korur', () => {
    expect(parseScopeValue(toScopeValue({ type: 'firm', firmId: 7 }))).toEqual({
      type: 'firm',
      firmId: 7,
    })
  })

  it('sistem geneli boş dizeye karşılık gelir', () => {
    expect(toScopeValue(GLOBAL_SCOPE)).toBe('')
    expect(parseScopeValue('')).toEqual(GLOBAL_SCOPE)
  })

  // Bozuk değer kullanıcıyı boş bir kutuyla bırakmaz, sistem geneline düşer.
  it('tanınmayan değer sistem geneline düşer', () => {
    expect(parseScopeValue('region:5')).toEqual(GLOBAL_SCOPE)
    expect(parseScopeValue('group:abc')).toEqual(GLOBAL_SCOPE)
    expect(parseScopeValue('firm:0')).toEqual(GLOBAL_SCOPE)
  })
})

describe('findScopeName', () => {
  it('grup kapsamında grubun adını verir', () => {
    expect(findScopeName({ type: 'group', groupId: 1 }, GROUPS, FIRMS)).toBe('AKSA')
  })

  it('firma kapsamında firmanın adını verir', () => {
    expect(findScopeName({ type: 'firm', firmId: 30 }, GROUPS, FIRMS)).toBe('ENERYA-Aydın')
  })

  it('sistem genelinde ve bilinmeyen kimlikte null döner', () => {
    expect(findScopeName(GLOBAL_SCOPE, GROUPS, FIRMS)).toBeNull()
    expect(findScopeName({ type: 'firm', firmId: 999 }, GROUPS, FIRMS)).toBeNull()
  })
})
