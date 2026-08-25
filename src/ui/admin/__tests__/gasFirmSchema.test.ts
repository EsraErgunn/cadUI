import { describe, expect, it } from 'vitest'

import {
  GAS_FIRM_ERRORS,
  GAS_FIRM_MAX_LENGTHS,
  firstGasFirmErrorField,
  gasFirmFieldId,
  optionalText,
  validateGasFirm,
  type GasFirmFormValues,
} from '../firms/gasFirmSchema'
import { toGasFirmPayload } from '../firms/gasFirmValues'

function buildValues(overrides: Partial<GasFirmFormValues> = {}): GasFirmFormValues {
  return {
    dfirmNo: '115',
    name: 'ADANA DOĞALGAZ',
    groupId: '1',
    description: '',
    contactPerson: '',
    address: '',
    phoneDigits: '05551234567',
    ...overrides,
  }
}

describe('validateGasFirm', () => {
  it('zorunlu alanlar doluyken hata üretmez', () => {
    const { errors, data } = validateGasFirm(buildValues())

    expect(errors).toEqual({})
    expect(data).not.toBeNull()
  })

  it('opsiyonel alanların boş kalması kaydı engellemez', () => {
    const { data } = validateGasFirm(
      buildValues({ description: '', contactPerson: '', address: '' }),
    )

    expect(data).not.toBeNull()
  })

  /**
   * Grup firması OPSİYONEL: grubu olmayan firma geçerli bir senaryo ve sunucu
   * `GroupId`'yi `int?` olarak alıyor, doğrulayıcısı yalnız değer varsa
   * denetliyor. Bir süre zorunluydu.
   */
  it('grup seçilmemişse hata ÜRETMEZ ve gövdeye null gider', () => {
    const { errors, data } = validateGasFirm(buildValues({ groupId: '' }))

    expect(errors.groupId).toBeUndefined()
    expect(data).not.toBeNull()
    expect(toGasFirmPayload(data!).groupId).toBeNull()
  })

  it('grup seçilmişse kimliği sayı olarak gövdeye girer', () => {
    const { data } = validateGasFirm(buildValues({ groupId: '4' }))

    expect(toGasFirmPayload(data!).groupId).toBe(4)
  })

  // KK-8: üç zorunlu alan da boşken üçünün de mesajı GÖRÜNMELİ; kullanıcı
  // eksikleri tur tur değil tek seferde görsün.
  it('boş zorunlu alanların hepsini aynı anda bildirir', () => {
    const { errors, data } = validateGasFirm(
      buildValues({ dfirmNo: '', name: '', phoneDigits: '' }),
    )

    expect(data).toBeNull()
    expect(errors.dfirmNo).toBe(GAS_FIRM_ERRORS.dfirmNo)
    expect(errors.name).toBe(GAS_FIRM_ERRORS.name)
    expect(errors.phoneDigits).toBe(GAS_FIRM_ERRORS.phone)
  })

  it('sayısal olmayan firma numarasını reddeder', () => {
    const { errors } = validateGasFirm(buildValues({ dfirmNo: '11a' }))

    expect(errors.dfirmNo).toBe(GAS_FIRM_ERRORS.dfirmNo)
  })

  it('eksik haneli telefonda biçim mesajını verir, zorunluluk mesajını değil', () => {
    const { errors } = validateGasFirm(buildValues({ phoneDigits: '0555123' }))

    expect(errors.phoneDigits).toBe(GAS_FIRM_ERRORS.phoneInvalid)
  })

  it('boş telefonda zorunluluk mesajı biçim mesajını gölgeler', () => {
    const { errors } = validateGasFirm(buildValues({ phoneDigits: '' }))

    expect(errors.phoneDigits).toBe(GAS_FIRM_ERRORS.phone)
  })

  it('sınırı aşan firma adını reddeder', () => {
    const tooLong = 'A'.repeat(GAS_FIRM_MAX_LENGTHS.name + 1)
    const { errors, data } = validateGasFirm(buildValues({ name: tooLong }))

    expect(data).toBeNull()
    expect(errors.name).toBe(GAS_FIRM_ERRORS.nameTooLong)
  })

  it('sınırdaki uzunluğu kabul eder', () => {
    const atLimit = 'A'.repeat(GAS_FIRM_MAX_LENGTHS.name)
    const { data } = validateGasFirm(buildValues({ name: atLimit }))

    expect(data).not.toBeNull()
  })

  // Benzersizliğe sunucu karar veriyor: istemci ön kontrolü yok, bu yüzden
  // doğrulama geçerli bir numarayı asla "kullanılıyor" diye reddetmez.
  it('benzersizlik kontrolü yapmaz', () => {
    const { errors } = validateGasFirm(buildValues({ dfirmNo: '1204' }))

    expect(errors.dfirmNo).toBeUndefined()
  })
})

describe('firstGasFirmErrorField', () => {
  it('görsel sıraya göre ilk hatalı alanı verir', () => {
    const { errors } = validateGasFirm(buildValues({ name: '', phoneDigits: '' }))

    expect(firstGasFirmErrorField(errors)).toBe('name')
  })

  it('firma numarası her zaman öne geçer', () => {
    const { errors } = validateGasFirm(
      buildValues({ dfirmNo: '', name: '', phoneDigits: '' }),
    )

    expect(firstGasFirmErrorField(errors)).toBe('dfirmNo')
  })

  it('hata yoksa null verir', () => {
    expect(firstGasFirmErrorField({})).toBeNull()
  })
})

describe('gasFirmFieldId', () => {
  it('alan adından türetir', () => {
    expect(gasFirmFieldId('dfirmNo')).toBe('gas-firm-dfirmNo')
  })
})

describe('optionalText', () => {
  it('boş ve yalnız boşluktan oluşan metni null yapar', () => {
    expect(optionalText('')).toBeNull()
    expect(optionalText('   ')).toBeNull()
  })

  it('dolu metnin kenar boşluklarını kırpar', () => {
    expect(optionalText('  Ahmet Yılmaz ')).toBe('Ahmet Yılmaz')
  })
})
