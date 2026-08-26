import { describe, expect, it } from 'vitest'

import {
  buildDuplicateGasFirmMessage,
  buildProjectFirmAuthorizations,
  findDuplicateGasFirms,
  removeAuthorization,
  toAuthorizationPayloads,
  type ProjectFirmAuthorization,
} from '../authorizationDraft'

const GROUP = { id: 1, name: 'AKSA' }

/**
 * Kayıtlar coğrafi bölge değil, bölge lisanslı gaz dağıtım firması; ad
 * sunucunun ünvanı olduğu gibi (arayüz artık etiket türetmiyor).
 */
const GEMLIK = { id: 10, name: 'Gemlik Gaz Dağıtım A.Ş.' }
const ADANA = { id: 11, name: 'Adana Doğalgaz Dağıtım A.Ş.' }

function buildDraft(gasFirms = [GEMLIK, ADANA]) {
  return {
    group: GROUP,
    gasFirms,
    certificateNumber: 'ST-1',
    validFrom: '2026-01-01',
    validTo: '',
  }
}

describe('buildProjectFirmAuthorizations (KK-4)', () => {
  // Belge: kayıtlar tek tek kaldırılabilmeli ve aynı kayıt ikinci kez
  // eklenememeli — ikisi de firma bazlı satır istiyor.
  it('her gaz dağıtım firması için ayrı satır üretir', () => {
    const added = buildProjectFirmAuthorizations(buildDraft())

    expect(added.map((item) => item.gasDistributionFirmId)).toEqual([GEMLIK.id, ADANA.id])
    expect(added[0]).toMatchObject({
      groupName: 'AKSA',
      gasDistributionFirmName: 'Gemlik Gaz Dağıtım A.Ş.',
    })
  })

  it('sertifika numarasını kırpar', () => {
    const [first] = buildProjectFirmAuthorizations({
      ...buildDraft([GEMLIK]),
      certificateNumber: '  ST-7  ',
    })

    expect(first.certificateNumber).toBe('ST-7')
  })

  /** Boş bitiş "süresiz" demek; uca `null` gider, boş dize değil. */
  it('boş geçerlilik bitişini null yapar', () => {
    const [first] = buildProjectFirmAuthorizations(buildDraft([GEMLIK]))

    expect(first.validTo).toBeNull()
    expect(first.validFrom).toBe('2026-01-01')
  })

  // "Yeterlilik No" kayıttan tümüyle kalktı (K102).
  it('kayıtta yeterlilik numarası alanı bulunmaz', () => {
    const [first] = buildProjectFirmAuthorizations(buildDraft([GEMLIK]))

    expect(first).not.toHaveProperty('qualificationNumber')
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
      'Bu firmalar için yetkilendirme zaten eklendi: ' +
        'Gemlik Gaz Dağıtım A.Ş., Adana Doğalgaz Dağıtım A.Ş.',
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
  /**
   * Ad gövdeye GİTMİYOR (`saveProjectFirmAuthorizations` onu `JSON.stringify`
   * dışında bırakıyor); yükte taşınmasının tek sebebi kısmi başarıda
   * başarısız satırı kullanıcıya ADIYLA söyleyebilmek.
   */
  it('sunucunun alanlarını ve hata mesajı için firma adını taşır', () => {
    const list = buildProjectFirmAuthorizations(buildDraft([GEMLIK]))

    expect(toAuthorizationPayloads(list)).toEqual([
      {
        gasDistributionFirmId: GEMLIK.id,
        gasDistributionFirmName: GEMLIK.name,
        certificateNumber: 'ST-1',
        validFrom: '2026-01-01',
        validTo: null,
      },
    ])
  })
})
