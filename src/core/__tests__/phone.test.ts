import { describe, expect, it } from 'vitest'

import {
  PHONE_DIGIT_COUNT,
  caretIndexAfterDigits,
  countDigits,
  formatPhone,
  isValidPhone,
  toPhoneDigits,
} from '../phone'

describe('toPhoneDigits', () => {
  it('harf ve işaretleri süzer', () => {
    expect(toPhoneDigits('0abc555')).toBe('0555')
    expect(toPhoneDigits('(0555) 123-45-67')).toBe('05551234567')
  })

  it('hane sınırını aşan girişi kırpar', () => {
    expect(toPhoneDigits('0555123456789')).toBe('05551234567')
    expect(toPhoneDigits('0555123456789')).toHaveLength(PHONE_DIGIT_COUNT)
  })

  it('boş girişi boş bırakır', () => {
    expect(toPhoneDigits('')).toBe('')
    expect(toPhoneDigits('abc')).toBe('')
  })
})

describe('formatPhone', () => {
  it('tam numarayı 0xxx xxx xx xx biçiminde gruplar', () => {
    expect(formatPhone('05551234567')).toBe('0555 123 45 67')
  })

  // Maske ancak numara tamamlanınca belirseydi kullanıcı yazarken biçimi görmezdi.
  it('yarım kalan girişi de gruplar', () => {
    expect(formatPhone('0')).toBe('0')
    expect(formatPhone('0555')).toBe('0555')
    expect(formatPhone('05551')).toBe('0555 1')
    expect(formatPhone('0555123')).toBe('0555 123')
    expect(formatPhone('055512345')).toBe('0555 123 45')
  })

  it('boş girişte boş dize verir', () => {
    expect(formatPhone('')).toBe('')
  })

  it('sondaki grup ayıracı boşta kalmaz', () => {
    expect(formatPhone('0555123')).not.toMatch(/\s$/)
  })

  /**
   * Akışta `toPhoneDigits` zaten kırpıyor, ama `formatPhone` da kendi başına
   * güvenli: grup boyutları toplamından fazlası çıktıya HİÇ girmez, yoksa
   * maskenin dışına taşan bir kuyruk oluşurdu.
   */
  it('hane sınırından fazlasını çıktıya almaz', () => {
    expect(formatPhone('0555123456789')).toBe('0555 123 45 67')
    expect(countDigits(formatPhone('0555123456789'))).toBe(PHONE_DIGIT_COUNT)
  })
})

describe('isValidPhone', () => {
  it('tam ve 0 ile başlayan numarayı kabul eder', () => {
    expect(isValidPhone('05551234567')).toBe(true)
  })

  it('eksik haneli numarayı reddeder', () => {
    expect(isValidPhone('')).toBe(false)
    expect(isValidPhone('0555123456')).toBe(false)
  })

  // Hane sayısı tutsa bile maske 0 ile başlıyor; "5551234567 8" gibi bir giriş
  // doğru uzunlukta ama geçerli bir numara değil.
  it('0 ile başlamayan numarayı reddeder', () => {
    expect(isValidPhone('15551234567')).toBe(false)
  })

  it('maskeli metni değil ham rakamları bekler', () => {
    expect(isValidPhone('0555 123 45 67')).toBe(false)
  })
})

describe('countDigits', () => {
  it('yalnız rakamları sayar', () => {
    expect(countDigits('0555 123')).toBe(7)
    expect(countDigits('')).toBe(0)
    expect(countDigits('abc')).toBe(0)
  })
})

/**
 * İmleç konumu rakam SAYISIYLA taşınır. Karakter indeksi kullanılsaydı maskeye
 * eklenen boşluk imleci bir karakter geriye kaydırırdı.
 */
describe('caretIndexAfterDigits', () => {
  it('grup ayıracından önceki rakamdan sonra durur', () => {
    // "0555 123 45 67" — 4. rakam '5', indeks 3, sonrası 4 (boşluktan önce).
    expect(caretIndexAfterDigits('0555 123 45 67', 4)).toBe(4)
  })

  it('boşluğu atlayarak sonraki gruba geçer', () => {
    // 5. rakam '1', indeks 5 → imleç 6.
    expect(caretIndexAfterDigits('0555 123 45 67', 5)).toBe(6)
    expect(caretIndexAfterDigits('0555 123 45 67', 7)).toBe(8)
  })

  it('metnin başında ve sonunda sınırları aşmaz', () => {
    expect(caretIndexAfterDigits('0555 123 45 67', 0)).toBe(0)
    expect(caretIndexAfterDigits('0555 123 45 67', -1)).toBe(0)
    expect(caretIndexAfterDigits('0555 123 45 67', 99)).toBe('0555 123 45 67'.length)
  })

  it('boş metinde sıfır verir', () => {
    expect(caretIndexAfterDigits('', 3)).toBe(0)
  })
})
