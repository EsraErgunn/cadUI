import { describe, expect, it, vi } from 'vitest'

import type { Lookup } from '../../../../api/projects'
import { lastMonthRange } from '../../adminDateRange'
import { buildProjectFilterChips } from '../projectFilterChips'
import type { ProjectFilters } from '../useProjectListParams'

const CITIES: Lookup[] = [
  { id: 6, name: 'Ankara' },
  { id: 34, name: 'İstanbul' },
]
const DISTRICTS: Lookup[] = [
  { id: 1, name: 'Çankaya' },
  { id: 2, name: 'Keçiören' },
]
const PROJECT_FIRMS: Lookup[] = [{ id: 12, name: 'Beyaz Tesisat A.Ş.' }]

function makeFilters(overrides: Partial<ProjectFilters> = {}): ProjectFilters {
  const defaultRange = lastMonthRange(new Date())

  return {
    dateFrom: defaultRange.from,
    dateTo: defaultRange.to,
    cityId: null,
    districtId: null,
    projectFirmId: null,
    search: '',
    ...overrides,
  }
}

function build(filters: ProjectFilters, onApply = vi.fn()) {
  return {
    chips: buildProjectFilterChips({
      filters,
      cities: CITIES,
      districts: DISTRICTS,
      projectFirms: PROJECT_FIRMS,
      onApply,
    }),
    onApply,
  }
}

describe('buildProjectFilterChips', () => {
  it('hiçbir kriter uygulanmamışken etiket üretmez', () => {
    expect(build(makeFilters()).chips).toHaveLength(0)
  })

  it('varsayılan tarih aralığını filtre saymaz', () => {
    const { chips } = build(makeFilters({ cityId: 6, districtId: 1 }))

    expect(chips.map((chip) => chip.key)).toEqual(['city', 'district'])
  })

  it('özel tarih aralığını gg.aa.yyyy biçiminde gösterir', () => {
    const { chips } = build(makeFilters({ dateFrom: '2026-02-01', dateTo: '2026-02-28' }))

    expect(chips[0].label).toBe('Tarih')
    expect(chips[0].value).toBe('01.02.2026 – 28.02.2026')
  })

  it('tarih etiketi kaldırılınca varsayılan aralığa döner', () => {
    const filters = makeFilters({ dateFrom: '2026-02-01', dateTo: '2026-02-28', search: 'gül' })
    const { chips, onApply } = build(filters)
    const defaultRange = lastMonthRange(new Date())

    chips[0].onRemove()

    expect(onApply).toHaveBeenCalledWith({
      ...filters,
      dateFrom: defaultRange.from,
      dateTo: defaultRange.to,
    })
  })

  it('il, ilçe ve firma kimliğini ada çevirir, kaldırınca null yapar', () => {
    const filters = makeFilters({ cityId: 6, districtId: 2, projectFirmId: 12 })
    const { chips, onApply } = build(filters)

    expect(chips.map((chip) => chip.value)).toEqual([
      'Ankara',
      'Keçiören',
      'Beyaz Tesisat A.Ş.',
    ])

    chips[1].onRemove()
    expect(onApply).toHaveBeenCalledWith({ ...filters, districtId: null })
  })

  // İlçe listesi İLE bağlı geliyor: il kalkınca elde ilçe listesi kalmıyor.
  it('il etiketi kaldırılınca ilçe de düşer', () => {
    const filters = makeFilters({ cityId: 6, districtId: 2 })
    const { chips, onApply } = build(filters)

    chips[0].onRemove()

    expect(onApply).toHaveBeenCalledWith({ ...filters, cityId: null, districtId: null })
  })

  it('seçim kutusu kaynağı gelmemişken iç kimliği göstermez', () => {
    const chips = buildProjectFilterChips({
      filters: makeFilters({ districtId: 2 }),
      cities: [],
      districts: [],
      projectFirms: [],
      onApply: vi.fn(),
    })

    expect(chips[0].value).not.toContain('2')
  })

  it('arama etiketi kaldırılınca aramayı boşaltır', () => {
    const filters = makeFilters({ search: 'yıldız' })
    const { chips, onApply } = build(filters)

    expect(chips[0]).toMatchObject({ key: 'q', label: 'Arama', value: 'yıldız' })

    chips[0].onRemove()
    expect(onApply).toHaveBeenCalledWith({ ...filters, search: '' })
  })
})
