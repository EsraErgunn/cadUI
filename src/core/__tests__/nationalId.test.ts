import { describe, expect, it } from 'vitest'

import {
  NATIONAL_ID_LENGTH,
  isMaskedNationalId,
  isValidNationalId,
  toNationalIdDigits,
} from '../nationalId'

/**
 * Geçerli örnekler sağlama kuralından ÜRETİLDİ, gerçek kişilerden alınmadı:
 * ilk dokuz hane seçilip 10. ve 11. haneler hesaplandı.
 */
const VALID_IDS = ['10000000146', '19191919190', '12345678950']

describe('toNationalIdDigits', () => {
  it('rakam olmayan her şeyi atar', () => {
    expect(toNationalIdDigits('123 456-789/50')).toBe('12345678950')
  })

  it('hane sınırını aşan girişi kırpar', () => {
    expect(toNationalIdDigits('123456789509876')).toHaveLength(NATIONAL_ID_LENGTH)
  })

  it('boş girdide boş dize döner', () => {
    expect(toNationalIdDigits('abc')).toBe('')
  })
})

describe('isValidNationalId', () => {
  it.each(VALID_IDS)('%s geçerlidir', (id) => {
    expect(isValidNationalId(id)).toBe(true)
  })

  it('eksik haneli numarayı reddeder', () => {
    expect(isValidNationalId('1234567895')).toBe(false)
  })

  it('fazla haneli numarayı reddeder', () => {
    expect(isValidNationalId('123456789501')).toBe(false)
  })

  it('ilk hanesi sıfır olan numarayı reddeder', () => {
    // Sağlaması tutsa bile kural gereği geçersiz.
    expect(isValidNationalId('01234567890')).toBe(false)
  })

  it('rakam olmayan karakter içeren metni reddeder', () => {
    expect(isValidNationalId('1234567895a')).toBe(false)
  })

  // Hane sayısı tek başına yetmiyor: bu numara 11 hane ama sağlaması tutmaz.
  it('sağlaması tutmayan on bir haneli numarayı reddeder', () => {
    expect(isValidNationalId('11111111111')).toBe(false)
  })

  it('yalnız 10. hanesi bozuk numarayı reddeder', () => {
    expect(isValidNationalId('12345678960')).toBe(false)
  })

  it('yalnız 11. hanesi bozuk numarayı reddeder', () => {
    expect(isValidNationalId('12345678951')).toBe(false)
  })

  it('maskeli metni reddeder', () => {
    expect(isValidNationalId('*******1234')).toBe(false)
  })
})

describe('isMaskedNationalId', () => {
  it('yıldız içeren değeri maskeli sayar', () => {
    expect(isMaskedNationalId('*******1234')).toBe(true)
  })

  it('düz numarayı maskeli saymaz', () => {
    expect(isMaskedNationalId('12345678950')).toBe(false)
  })
})
