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

/** Sağlaması TUTAN örnek; gerçek kişiden alınmadı, kuraldan üretildi. */
const VALID_NATIONAL_ID = '12345678950'

function buildValidValues(
  overrides: Partial<ProjectFirmFormValues> = {},
): ProjectFirmFormValues {
  return {
    ...buildEmptyProjectFirmValues(),
    name: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
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
    name: 'FİRMA',
    authorizedPerson: null,
    email: null,
    phone: null,
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
      authorizedPerson: PROJECT_FIRM_ERRORS.authorizedPerson,
      email: PROJECT_FIRM_ERRORS.email,
      taxNumber: PROJECT_FIRM_ERRORS.taxNumber,
      phoneDigits: PROJECT_FIRM_ERRORS.phone,
    })
  })

  // Seri no alanı tümüyle kalktı (K102): artık bir kuralı da yok.
  it('seri no diye bir alan yoktur', () => {
    expect(buildEmptyProjectFirmValues()).not.toHaveProperty('serialNumber')
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

// §10: iki kimlik alanı birbirini dışlıyor.
describe('şahıs / tüzel geçişi (§10)', () => {
  it('tüzelde vergi no zorunlu, kimlik serbesttir', () => {
    const missing = validateProjectFirm(buildValidValues({ taxNumber: '' }))
    expect(missing.errors.taxNumber).toBe(PROJECT_FIRM_ERRORS.taxNumber)
    expect(missing.errors.nationalId).toBeUndefined()
  })

  // Vergi numarası 10 VEYA 11 hane; ikisi de geçerli.
  it('tüzelde vergi no 10 ve 11 hane kabul eder, 9 haneyi reddeder', () => {
    expect(validateProjectFirm(buildValidValues({ taxNumber: '1234567890' })).errors).toEqual({})
    expect(validateProjectFirm(buildValidValues({ taxNumber: '12345678901' })).errors).toEqual({})

    const short = validateProjectFirm(buildValidValues({ taxNumber: '123456789' }))
    expect(short.errors.taxNumber).toBe(PROJECT_FIRM_ERRORS.taxNumberLength)
  })

  it('şahısta kimlik zorunlu ve 11 hane, vergi no serbesttir', () => {
    const values = buildValidValues({ isSoleProprietorship: true, taxNumber: '' })

    const missing = validateProjectFirm(values)
    expect(missing.errors.nationalId).toBe(PROJECT_FIRM_ERRORS.nationalId)
    expect(missing.errors.taxNumber).toBeUndefined()

    const short = validateProjectFirm({ ...values, nationalId: '1234' })
    expect(short.errors.nationalId).toBe(PROJECT_FIRM_ERRORS.nationalIdLength)

    const complete = validateProjectFirm({ ...values, nationalId: VALID_NATIONAL_ID })
    expect(complete.errors).toEqual({})
  })

  /**
   * Hane sayısı tutup SAĞLAMASI tutmayan numara ayrı mesaj alıyor: yalnız
   * uzunluğa bakılsaydı "11111111111" geçer ve sunucudan 400 dönerdi.
   */
  it('şahısta sağlaması tutmayan kimliği reddeder', () => {
    const { errors } = validateProjectFirm(
      buildValidValues({ isSoleProprietorship: true, taxNumber: '', nationalId: '11111111111' }),
    )

    expect(errors.nationalId).toBe(PROJECT_FIRM_ERRORS.nationalIdInvalid)
  })

  it('şahısta ilk hanesi sıfır olan kimliği reddeder', () => {
    const { errors } = validateProjectFirm(
      buildValidValues({ isSoleProprietorship: true, taxNumber: '', nationalId: '01234567890' }),
    )

    expect(errors.nationalId).toBe(PROJECT_FIRM_ERRORS.nationalIdInvalid)
  })
})

describe('normalizeProjectFirmValue', () => {
  it('vergi ve kimlik alanına harf yazılamaz, hane sınırı aşılamaz', () => {
    expect(normalizeProjectFirmValue('taxNumber', '12a34b567890999')).toBe('12345678909')
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

  // Şahısta vergi no gövdeye hiç girmiyor; ön kontrol de yapılmamalı.
  it('şahıs firmasında vergi numarası kontrolü yapılmaz', () => {
    const { data } = validateProjectFirm(
      buildValidValues({
        isSoleProprietorship: true,
        taxNumber: '1234567890',
        nationalId: VALID_NATIONAL_ID,
      }),
    )

    expect(findTakenProjectFirmErrors([buildFirm({ taxNumber: '1234567890' })], data!)).toEqual({})
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

  // Seri no gövdeye HİÇ eklenmiyor; `null` bile gitmiyor (K102).
  it('gövdede seri no anahtarı bulunmaz', () => {
    const { data } = validateProjectFirm(buildValidValues())

    expect(toProjectFirmPayload(data!)).not.toHaveProperty('serialNumber')
  })

  // Cari Kodu AYRI bir alan ve KALIYOR — seri no ile karıştırılmamalı.
  it('muhasebe cari kodunu gövdeye taşır', () => {
    const { data } = validateProjectFirm(buildValidValues({ accountingCode: 'CARI-42' }))

    expect(toProjectFirmPayload(data!).accountingCode).toBe('CARI-42')
  })

  it('şahıs firmasında kimliği nationalIdNumber alanına yazar, vergi alanına yazmaz', () => {
    const { data } = validateProjectFirm(
      buildValidValues({
        isSoleProprietorship: true,
        taxNumber: '',
        nationalId: VALID_NATIONAL_ID,
      }),
    )
    const payload = toProjectFirmPayload(data!)

    expect(payload.nationalIdNumber).toBe(VALID_NATIONAL_ID)
    expect(payload.taxNumber).toBeNull()
    expect(payload.companyType).toBe(1)
  })

  /**
   * Kapalı alanın değeri GÖVDEDE de temizleniyor: formdaki temizliğe tek başına
   * güvenilseydi, ileride eklenecek bir "değerleri koru" davranışı gizli ama
   * dolu bir alan gönderir ve sunucu 400 dönerdi.
   */
  it('şahısta vergi no dolu kalsa bile gövdeye null gider', () => {
    const { data } = validateProjectFirm(
      buildValidValues({
        isSoleProprietorship: true,
        taxNumber: '1234567890',
        nationalId: VALID_NATIONAL_ID,
      }),
    )

    expect(toProjectFirmPayload(data!).taxNumber).toBeNull()
  })

  it('tüzelde kimlik dolu kalsa bile gövdeye null gider', () => {
    const { data } = validateProjectFirm(
      buildValidValues({ nationalId: VALID_NATIONAL_ID }),
    )

    expect(toProjectFirmPayload(data!).nationalIdNumber).toBeNull()
  })
})
