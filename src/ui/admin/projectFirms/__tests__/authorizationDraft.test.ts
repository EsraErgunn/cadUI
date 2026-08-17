import { describe, expect, it } from 'vitest'

import {
  buildDuplicateGasFirmMessage,
  buildProjectFirmAuthorizations,
  findDuplicateGasFirms,
  formatAuthorizationGasFirmName,
  removeAuthorization,
  toAuthorizationPayloads,
  type ProjectFirmAuthorization,
} from '../authorizationDraft'

const GROUP = { id: 1, name: 'AKSA' }

/** Kutulardaki kayıtlar coğrafi bölge değil, bölge lisanslı gaz dağıtım firması. */
const GEMLIK = { id: 10, name: 'AKSA-GEMLİK' }
const ADANA = { id: 11, name: 'AKSA-ADANA' }

function buildDraft(gasFirms = [GEMLIK, ADANA]) {
  return {
    group: GROUP,
    gasFirms,
    qualificationNumber: ' YT-100 ',
    certificateNumber: '  ',
  }
}

/** Belge madde 17: seçenekler "AKSA-ADANA", "AKSA-GEMLİK" biçiminde okunur. */
describe('formatAuthorizationGasFirmName', () => {
  it('grup ile ünvanı birleştirip belgedeki biçime getirir', () => {
    expect(
      formatAuthorizationGasFirmName({
        name: 'Adana Doğalgaz Dağıtım A.Ş.',
        groupName: 'Aksa Enerji Grubu',
      }),
    ).toBe('AKSA-ADANA')
  })

  it('Türkçe büyük harfi doğru yapar', () => {
    expect(
      formatAuthorizationGasFirmName({ name: 'İzmir Gaz A.Ş.', groupName: 'Enerya Grubu' }),
    ).toBe('ENERYA-İZMİR')
  })

  // Gerçek veri ünvanı zaten bu biçimde tutuyor; önek ikinci kez eklenmemeli.
  it('ünvan zaten grup önekliyse tekrar öneklemez', () => {
    expect(formatAuthorizationGasFirmName({ name: 'AKSA-GEMLİK', groupName: 'AKSA' })).toBe(
      'AKSA-GEMLİK',
    )
  })

  it('grubu olmayan kayıtta yalnız bölgeyi yazar', () => {
    expect(
      formatAuthorizationGasFirmName({ name: 'Bolu Doğalgaz A.Ş.', groupName: null }),
    ).toBe('BOLU')
  })
})

describe('buildProjectFirmAuthorizations (KK-4)', () => {
  // Belge: kayıtlar tek tek kaldırılabilmeli ve aynı kayıt ikinci kez
  // eklenememeli — ikisi de firma bazlı satır istiyor.
  it('her gaz dağıtım firması için ayrı satır üretir', () => {
    const added = buildProjectFirmAuthorizations(buildDraft())

    expect(added.map((item) => item.gasDistributionFirmId)).toEqual([GEMLIK.id, ADANA.id])
    expect(added[0]).toMatchObject({
      groupName: 'AKSA',
      gasDistributionFirmName: 'AKSA-GEMLİK',
    })
  })

  it('yeterlilik numarasını kırpar, boş sertifikayı null yapar', () => {
    const [first] = buildProjectFirmAuthorizations(buildDraft([GEMLIK]))

    expect(first.qualificationNumber).toBe('YT-100')
    expect(first.certificateNumber).toBeNull()
  })

  it('girilen sertifika numarasını taşır', () => {
    const [first] = buildProjectFirmAuthorizations({
      ...buildDraft([GEMLIK]),
      certificateNumber: 'ST-9',
    })

    expect(first.certificateNumber).toBe('ST-9')
  })
})

describe('findDuplicateGasFirms (KK-4)', () => {
  const existing: ProjectFirmAuthorization[] = buildProjectFirmAuthorizations(
    buildDraft([GEMLIK]),
  )

  it('zaten ekli kaydı bulur', () => {
    expect(findDuplicateGasFirms(existing, [GEMLIK, ADANA])).toEqual([GEMLIK])
  })

  it('yeni kayıtlarda boş döner', () => {
    expect(findDuplicateGasFirms(existing, [ADANA])).toEqual([])
  })

  // Metin kullanıcıya görünüyor: belgedeki "bölge" dili korunuyor.
  it('engelin sebebini adlarla söyler', () => {
    expect(buildDuplicateGasFirmMessage([GEMLIK, ADANA])).toBe(
      'Bu bölgeler için yetkilendirme zaten eklendi: AKSA-GEMLİK, AKSA-ADANA',
    )
  })
})

describe('removeAuthorization', () => {
  it('yalnız verilen kaydı düşürür', () => {
    const list = buildProjectFirmAuthorizations(buildDraft())

    expect(
      removeAuthorization(list, GEMLIK.id).map((item) => item.gasDistributionFirmId),
    ).toEqual([ADANA.id])
  })
})

describe('toAuthorizationPayloads', () => {
  it('istek gövdesine yalnız sunucunun alanlarını taşır', () => {
    const list = buildProjectFirmAuthorizations(buildDraft([GEMLIK]))

    expect(toAuthorizationPayloads(list)).toEqual([
      {
        gasDistributionFirmId: GEMLIK.id,
        qualificationNumber: 'YT-100',
        certificateNumber: null,
      },
    ])
  })
})
