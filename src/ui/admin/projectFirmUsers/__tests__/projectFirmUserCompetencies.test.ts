import { describe, expect, it } from 'vitest'

import type { ProjectFirmUserCompetency } from '../../../../api/projectFirmUserDto'
import {
  buildEmptyCompetency,
  canAddCompetency,
  findDuplicateCompetencyKeys,
  isCompetencyComplete,
  toCompetencyDrafts,
  toCompetencyPayloads,
  withGasFirm,
  type CompetencyDraft,
} from '../projectFirmUserCompetencies'

function buildRow(overrides: Partial<CompetencyDraft> = {}): CompetencyDraft {
  return {
    key: -1,
    competencyId: null,
    gasFirmId: 103,
    projectFirmId: 201,
    authorityType: 'firmEngineer',
    gdfRegistrationNumber: '',
    isActive: true,
    ...overrides,
  }
}

// KK-19: açık satırdaki zorunlu seçimler tamamlanmadan yeni satır eklenmez.
describe('satır tamlığı (KK-19)', () => {
  it('boş satır tamamlanmamış sayılır', () => {
    expect(isCompetencyComplete(buildEmptyCompetency(-1))).toBe(false)
  })

  it('üç zorunlu seçim dolunca satır tamamlanır', () => {
    expect(isCompetencyComplete(buildRow())).toBe(true)
  })

  // GDF kayıt no zorunlu değil: listede değeri olmayan kayıt "—" ile gösteriliyor.
  it('GDF kayıt no boşken de satır tamamdır', () => {
    expect(isCompetencyComplete(buildRow({ gdfRegistrationNumber: '' }))).toBe(true)
  })

  it('yarım satır varken yeni satır eklenemez', () => {
    expect(canAddCompetency([buildRow(), buildEmptyCompetency(-2)])).toBe(false)
    expect(canAddCompetency([buildRow()])).toBe(true)
  })

  it('hiç satır yokken ilk satır eklenebilir', () => {
    expect(canAddCompetency([])).toBe(true)
  })
})

// KK-20: firma değişince proje firması seçimi temizlenir.
describe('proje firmasının G.D. firmasına bağlılığı (KK-20)', () => {
  it('gaz dağıtım firması değişince proje firması düşer', () => {
    const next = withGasFirm(buildRow(), 105)

    expect(next.gasFirmId).toBe(105)
    expect(next.projectFirmId).toBeNull()
  })

  it('aynı firma yeniden seçilirse seçim korunur', () => {
    const row = buildRow()

    expect(withGasFirm(row, row.gasFirmId)).toBe(row)
  })

  it('firma temizlenince proje firması da temizlenir', () => {
    expect(withGasFirm(buildRow(), null).projectFirmId).toBeNull()
  })
})

// KK-22: aynı (gaz dağıtım firması, proje firması) ikilisi ikinci kez tanımlanamaz.
describe('yinelenen yetki (KK-22)', () => {
  it('aynı ikiliyi taşıyan iki satır işaretlenir', () => {
    const rows = [buildRow({ key: -1 }), buildRow({ key: -2 })]

    expect(findDuplicateCompetencyKeys(rows)).toEqual([-1, -2])
  })

  it('proje firması farklıysa yineleme sayılmaz', () => {
    const rows = [buildRow({ key: -1 }), buildRow({ key: -2, projectFirmId: 202 })]

    expect(findDuplicateCompetencyKeys(rows)).toEqual([])
  })

  it('yarım satırlar yineleme sayılmaz', () => {
    const rows = [buildEmptyCompetency(-1), buildEmptyCompetency(-2)]

    expect(findDuplicateCompetencyKeys(rows)).toEqual([])
  })

  it('yetki farklı olsa da aynı ikili yinelemedir', () => {
    const rows = [
      buildRow({ key: -1, authorityType: 'firmEngineer' }),
      buildRow({ key: -2, authorityType: 'firmAuthorizedPerson' }),
    ]

    expect(findDuplicateCompetencyKeys(rows)).toHaveLength(2)
  })
})

// KK-25: kayıtlı yetkiler forma taslak olarak açılır, kimlikleri korunur.
describe('kayıtlı yetkilerin forma açılması (KK-25)', () => {
  const saved: ProjectFirmUserCompetency = {
    id: 5001,
    gasFirm: { id: 103, name: 'AKSA-GEMLİK' },
    projectFirm: { id: 201, name: 'AA Mühendislik' },
    authorityType: 'firmAuthorizedPerson',
    gdfRegistrationNumber: '512',
    isActive: false,
  }

  it('kimlik ve alanlar taslağa taşınır', () => {
    const [draft] = toCompetencyDrafts([saved])

    expect(draft).toEqual({
      key: 5001,
      competencyId: 5001,
      gasFirmId: 103,
      projectFirmId: 201,
      authorityType: 'firmAuthorizedPerson',
      gdfRegistrationNumber: '512',
      isActive: false,
    })
  })

  it('kayıt numarası yoksa alan boş dizeye iner', () => {
    const [draft] = toCompetencyDrafts([{ ...saved, gdfRegistrationNumber: null }])

    expect(draft.gdfRegistrationNumber).toBe('')
  })
})

describe('istek gövdesine çevirme', () => {
  it('tamamlanmış satır gövdeye girer', () => {
    expect(toCompetencyPayloads([buildRow({ gdfRegistrationNumber: ' 512 ' })])).toEqual([
      {
        gasDistributionFirmId: 103,
        projectFirmId: 201,
        authorityType: 'firmEngineer',
        gdfRegistrationNumber: '512',
        isActive: true,
      },
    ])
  })

  // "Girilmedi" ile "boş bırakıldı" veritabanında tek biçimde dursun.
  it('boş kayıt numarası null gider', () => {
    expect(toCompetencyPayloads([buildRow()])[0].gdfRegistrationNumber).toBeNull()
  })

  it('yarım satır gövdeye sızmaz', () => {
    expect(toCompetencyPayloads([buildEmptyCompetency(-1)])).toEqual([])
  })
})
