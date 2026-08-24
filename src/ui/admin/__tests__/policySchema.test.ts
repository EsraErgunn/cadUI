import { afterEach, describe, expect, it } from 'vitest'

import { addMockPolicy, resetMockPolicies } from '../../../api/policiesMock'
import { toIsoDate } from '../adminDateRange'
import {
  POLICY_ERRORS,
  buildPolicyDefaults,
  buildPolicyPayload,
  firstPolicyErrorField,
  formatPolicyAmount,
  parsePolicyAmount,
  sanitizePolicyAmount,
  validatePolicyForm,
  validatePolicyStep,
  type PolicyFormValues,
} from '../policies/policySchema'

const TODAY = new Date('2026-08-13T09:00:00.000Z')

function buildFilledValues(overrides: Partial<PolicyFormValues> = {}): PolicyFormValues {
  return {
    ...buildPolicyDefaults(TODAY),
    insuranceCompanyId: 1,
    projectUnitId: 7,
    policyNumber: 'POL-2026-0001',
    amountText: '1.500.000,50',
    endDate: '2027-08-13',
    ...overrides,
  }
}

afterEach(() => {
  resetMockPolicies()
})

describe('teminat tutarı metni', () => {
  it('harf, ikinci virgül ve taşan hane REDDEDİLİR (değer değişmez)', () => {
    expect(sanitizePolicyAmount('1500a')).toBeNull()
    expect(sanitizePolicyAmount('1,5,5')).toBeNull()
    expect(sanitizePolicyAmount('1234567890123456')).toBeNull()
  })

  it('rakam, nokta ve tek virgül geçer', () => {
    expect(sanitizePolicyAmount('1.500.000,50')).toBe('1.500.000,50')
  })

  it('nokta binlik, virgül ondalık okunur (tr-TR)', () => {
    expect(parsePolicyAmount('1.500.000,50')).toBe(1500000.5)
    expect(parsePolicyAmount('')).toBeNull()
  })

  it('odaktan çıkışta binlik ayraç ve iki ondalık uygulanır', () => {
    expect(formatPolicyAmount('1500000')).toBe('1.500.000,00')
    // Çözülemeyen metne dokunulmaz: kullanıcı yazdığını kaybetmesin.
    expect(formatPolicyAmount('')).toBe('')
  })
})

describe('varsayılan değerler', () => {
  it('yöntem seçili, başlangıç bugün, bitiş boş', () => {
    const values = buildPolicyDefaults(TODAY)

    expect(values.method).toBe('manual')
    expect(values.startDate).toBe(toIsoDate(TODAY))
    expect(values.endDate).toBe('')
  })
})

describe('adım bazlı doğrulama', () => {
  // Adımda TEK seçim var: sunucuda acente kavramı yok, iki kutu tek kutuya indi.
  it('firma adımı sigorta şirketi seçimini zorunlu tutar', () => {
    expect(validatePolicyStep('firm', buildPolicyDefaults(TODAY))).toEqual({
      insuranceCompanyId: POLICY_ERRORS.insuranceCompany,
    })
  })

  it('yöntem, özet ve sonuç adımlarında denetlenecek alan yok', () => {
    const empty = buildPolicyDefaults(TODAY)

    expect(validatePolicyStep('method', empty)).toEqual({})
    expect(validatePolicyStep('summary', empty)).toEqual({})
    expect(validatePolicyStep('done', empty)).toEqual({})
  })

  // Birim de bu adımda: poliçe sunucuda projeye değil BİRİME bağlanıyor.
  it('bilgi adımında dört alan da zorunlu', () => {
    const errors = validatePolicyStep('info', buildPolicyDefaults(TODAY))

    expect(errors).toEqual({
      projectUnitId: POLICY_ERRORS.unit,
      policyNumber: POLICY_ERRORS.policyNumber,
      amountText: POLICY_ERRORS.amount,
      endDate: POLICY_ERRORS.endDate,
    })
  })

  it('bitiş tarihi başlangıçtan önce olamaz', () => {
    const errors = validatePolicyStep('info', buildFilledValues({ endDate: '2026-01-01' }))

    expect(errors.endDate).toBe(POLICY_ERRORS.endBeforeStart)
  })

  it('sıfır ve altı teminat kabul edilmez', () => {
    expect(validatePolicyStep('info', buildFilledValues({ amountText: '0' })).amountText).toBe(
      POLICY_ERRORS.amountPositive,
    )
  })

  it('sistemde kayıtlı poliçe numarası kabul edilmez (büyük/küçük harf ayırmadan)', () => {
    addMockPolicy(
      {
        projectUnitId: 1,
        insuranceCompanyId: 1,
        policyNumber: 'POL-2026-0001',
        amount: 1000,
        startDate: '2026-08-13',
        endDate: '2027-08-13',
      },
      { id: 1, name: 'Örnek Proje', pId: '1' },
    )

    const errors = validatePolicyStep('info', buildFilledValues({ policyNumber: 'pol-2026-0001' }))

    expect(errors.policyNumber).toBe(POLICY_ERRORS.policyNumberTaken)
  })

  it('doldurulmuş form hata vermez', () => {
    expect(validatePolicyForm(buildFilledValues())).toEqual({})
  })
})

describe('odak taşınacak alan', () => {
  it('görsel sıradaki İLK hatalı alan seçilir', () => {
    expect(
      firstPolicyErrorField({
        endDate: POLICY_ERRORS.endDate,
        insuranceCompanyId: POLICY_ERRORS.insuranceCompany,
      }),
    ).toBe('insuranceCompanyId')
    expect(firstPolicyErrorField({})).toBeNull()
  })
})

describe('istek gövdesi', () => {
  it('eksik seçim gövde üretmez', () => {
    expect(buildPolicyPayload(buildPolicyDefaults(TODAY))).toBeNull()
  })

  it('birim seçilmeden gövde üretmez', () => {
    expect(buildPolicyPayload(buildFilledValues({ projectUnitId: null }))).toBeNull()
  })

  /** Gövde `PolicyAddDto` ile birebir: `projectId`, `method` ve `agencyId` YOK. */
  it('poliçe numarasının boşlukları kırpılır, tutar sayıya çevrilir', () => {
    expect(buildPolicyPayload(buildFilledValues({ policyNumber: '  POL-2026-0002 ' }))).toEqual({
      projectUnitId: 7,
      insuranceCompanyId: 1,
      policyNumber: 'POL-2026-0002',
      amount: 1500000.5,
      startDate: toIsoDate(TODAY),
      endDate: '2027-08-13',
    })
  })
})
