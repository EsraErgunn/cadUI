import { describe, expect, it } from 'vitest'

import type { ProjectFirm } from '../../../../api/projectFirmDto'
import {
  PROJECT_FIRM_ERRORS,
  buildEmptyProjectFirmValues,
  firstProjectFirmErrorField,
  normalizeProjectFirmValue,
  toProjectFirmPayload,
  validateProjectFirm,
  type ProjectFirmFormValues,
} from '../projectFirmSchema'
import { findTakenProjectFirmErrors } from '../projectFirmUniqueness'

function buildValidValues(
  overrides: Partial<ProjectFirmFormValues> = {},
): ProjectFirmFormValues {
  return {
    ...buildEmptyProjectFirmValues(),
    name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
    serialNumber: 'SR-001',
    authorizedPerson: 'Ahmet Yılmaz',
    email: 'bilgi@adana.com.tr',
    taxNumber: '1234567890',
    phoneDigits: '05321000000',
    ...overrides,
  }
}

function buildFirm(overrides: Partial<ProjectFirm> = {}): ProjectFirm {
  return {
    id: 1,
    serialNumber: null,
    qualificationNumber: null,
    name: 'FİRMA',
    authorizedPerson: null,
    email: null,
    phone: null,
    mobilePhone: null,
    taxNumber: null,
    ...overrides,
  }
}

describe('zorunlu alanlar (KK-6)', () => {
  it('boş formda her zorunlu alan için mesaj üretir', () => {
    const { errors, data } = validateProjectFirm(buildEmptyProjectFirmValues())

    expect(data).toBeNull()
    expect(errors).toMatchObject({
      name: PROJECT_FIRM_ERRORS.name,
      serialNumber: PROJECT_FIRM_ERRORS.serialNumber,
      authorizedPerson: PROJECT_FIRM_ERRORS.authorizedPerson,
      email: PROJECT_FIRM_ERRORS.email,
      taxNumber: PROJECT_FIRM_ERRORS.taxNumber,
      phoneDigits: PROJECT_FIRM_ERRORS.phone,
    })
  })

  it('opsiyonel alanlar boş bırakılabilir', () => {
    const { errors, data } = validateProjectFirm(buildValidValues())

    expect(errors).toEqual({})
    expect(data).not.toBeNull()
  })

  // Belge madde 21: mesaj birebir.
  it('bozuk e-postada belgedeki mesajı verir', () => {
    const { errors } = validateProjectFirm(buildValidValues({ email: 'bilgi@' }))

    expect(errors.email).toBe('Geçerli bir e-posta adresi giriniz.')
  })

  it('yarım telefonu reddeder, boş telefon 2 kabul eder', () => {
    const { errors } = validateProjectFirm(
      buildValidValues({ phoneDigits: '0532100', phone2Digits: '' }),
    )

    expect(errors.phoneDigits).toBe(PROJECT_FIRM_ERRORS.phoneInvalid)
    expect(errors.phone2Digits).toBeUndefined()
  })

  it('girildiyse telefon 2 de tam olmalıdır', () => {
    const { errors } = validateProjectFirm(buildValidValues({ phone2Digits: '0532' }))

    expect(errors.phone2Digits).toBe(PROJECT_FIRM_ERRORS.phoneInvalid)
  })

  it('ilk hatalı alanı ekrandaki sıraya göre bulur', () => {
    const { errors } = validateProjectFirm(
      buildValidValues({ name: '', email: '', taxNumber: '' }),
    )

    expect(firstProjectFirmErrorField(errors)).toBe('name')
  })
})

describe('şahıs şirketi geçişi (KK-5)', () => {
  it('işaretsizken vergi no zorunlu ve 10 hane, kimlik serbesttir', () => {
    const short = validateProjectFirm(buildValidValues({ taxNumber: '12345' }))
    expect(short.errors.taxNumber).toBe(PROJECT_FIRM_ERRORS.taxNumberLength)

    const missing = validateProjectFirm(buildValidValues({ taxNumber: '' }))
    expect(missing.errors.taxNumber).toBe(PROJECT_FIRM_ERRORS.taxNumber)
    expect(missing.errors.nationalId).toBeUndefined()
  })

  it('işaretliyken kimlik zorunlu ve 11 hane, vergi no serbesttir', () => {
    const values = buildValidValues({ isSoleProprietorship: true, taxNumber: '' })

    const missing = validateProjectFirm(values)
    expect(missing.errors.nationalId).toBe(PROJECT_FIRM_ERRORS.nationalId)
    expect(missing.errors.taxNumber).toBeUndefined()

    const short = validateProjectFirm({ ...values, nationalId: '1234' })
    expect(short.errors.nationalId).toBe(PROJECT_FIRM_ERRORS.nationalIdLength)

    const complete = validateProjectFirm({ ...values, nationalId: '12345678901' })
    expect(complete.errors).toEqual({})
  })
})

describe('normalizeProjectFirmValue', () => {
  it('vergi ve kimlik alanına harf yazılamaz, hane sınırı aşılamaz', () => {
    expect(normalizeProjectFirmValue('taxNumber', '12a34b567890999')).toBe('1234567890')
    expect(normalizeProjectFirmValue('nationalId', '1x2345678901234')).toBe('12345678901')
  })

  it('telefon alanları ham rakama indirilir', () => {
    expect(normalizeProjectFirmValue('phoneDigits', '0532 100 00 00')).toBe('05321000000')
    expect(normalizeProjectFirmValue('phone2Digits', '0abc532')).toBe('0532')
  })
})

describe('benzersizlik ön kontrolü (KK-8)', () => {
  it('kullanılmış vergi numarasını yakalar', () => {
    const { data } = validateProjectFirm(buildValidValues())
    const errors = findTakenProjectFirmErrors(
      [buildFirm({ taxNumber: '1234567890' })],
      data!,
    )

    expect(errors.taxNumber).toBe(PROJECT_FIRM_ERRORS.taxNumberTaken)
  })

  /** Seri no bugün liste satırında `null` geliyor; kural yine de işlemeli —
      aynı oturumda eklenen kayıt seri numarasını taşıyor. */
  it('kullanılmış seri numarasını büyük/küçük harf duyarsız yakalar', () => {
    const { data } = validateProjectFirm(buildValidValues({ serialNumber: 'sr-001' }))
    const errors = findTakenProjectFirmErrors(
      [buildFirm({ serialNumber: 'SR-001' })],
      data!,
    )

    expect(errors.serialNumber).toBe(PROJECT_FIRM_ERRORS.serialNumberTaken)
  })

  it('çakışma yoksa hata üretmez', () => {
    const { data } = validateProjectFirm(buildValidValues())

    expect(findTakenProjectFirmErrors([buildFirm()], data!)).toEqual({})
  })
})

describe('toProjectFirmPayload', () => {
  it('boş opsiyonel alanları null gönderir, firma türünü tüzel yapar', () => {
    const { data } = validateProjectFirm(buildValidValues())

    expect(toProjectFirmPayload(data!)).toMatchObject({
      companyType: 2,
      name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
      accountingCode: null,
      address: null,
      mobilePhone: null,
      phone: '05321000000',
    })
  })

  /**
   * T.C. kimlik numarası KENDİ alanında gider. Uç `nationalIdNumber`'ı sonradan
   * kabul etmeye başladı; asıl güvence değişmedi: numara `taxNumber` alanına
   * YAZILMAZ, yoksa vergi numarası sütununa kimlik düşerdi.
   */
  it('şahıs şirketinde kimliği nationalIdNumber alanına yazar, vergi alanına yazmaz', () => {
    const { data } = validateProjectFirm(
      buildValidValues({
        isSoleProprietorship: true,
        taxNumber: '',
        nationalId: '12345678901',
      }),
    )
    const payload = toProjectFirmPayload(data!)

    expect(payload.nationalIdNumber).toBe('12345678901')
    expect(payload.taxNumber).toBeNull()
    expect(payload.companyType).toBe(1)
  })

  /** Tüzel firmada kimlik alanı formda temizlenir; gövdeye `null` gider. */
  it('tüzel firmada nationalIdNumber null gönderir', () => {
    const { data } = validateProjectFirm(buildValidValues())

    expect(toProjectFirmPayload(data!).nationalIdNumber).toBeNull()
  })
})
