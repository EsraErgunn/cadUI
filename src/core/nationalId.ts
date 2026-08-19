/**
 * T.C. kimlik numarası doğrulaması.
 *
 * Sunucuya bel bağlanmıyor: şahıs firmasında geçersiz numara 400 ile geri
 * geliyor ve kullanıcı hatayı ancak kaydetmeye çalışınca öğreniyordu. Kural
 * tamamen aritmetik olduğu için istemcide de uygulanabiliyor.
 */

export const NATIONAL_ID_LENGTH = 11

const NON_DIGIT_PATTERN = /\D/g

/** Son iki hane sağlama; ilk dokuzu onları üretiyor. */
const CHECKSUM_DIGIT_COUNT = 2

const PAYLOAD_DIGIT_COUNT = NATIONAL_ID_LENGTH - CHECKSUM_DIGIT_COUNT

/**
 * 10. hanenin katsayıları. Tek sıradaki haneler (1., 3., 5., 7., 9.) 7 ile
 * çarpılıp çift sıradakilerin (2., 4., 6., 8.) toplamı çıkarılıyor.
 */
const ODD_WEIGHT = 7

const DECIMAL_BASE = 10

/**
 * Kullanıcının yazdığından yalnız rakamları süzer ve hane sınırına kırpar.
 * Harf alana HİÇ girmez; sonradan doğrulamayla reddedilmez (`toPhoneDigits`
 * deseninin aynısı).
 */
export function toNationalIdDigits(raw: string): string {
  return raw.replace(NON_DIGIT_PATTERN, '').slice(0, NATIONAL_ID_LENGTH)
}

/**
 * Gerçek T.C. kimlik numarası kuralı: 11 hane, ilk hane sıfır olamaz, 10. ve
 * 11. haneler ilk dokuzdan hesaplanan sağlama haneleridir.
 *
 * Hane sayısı tek başına YETMEZ: "11111111111" on bir hanedir ama sağlamayı
 * tutturmaz. Sunucu bu numarayı reddediyor, bu yüzden istemci de reddetmeli —
 * yoksa kullanıcı formu doldurup 400 yiyor.
 */
export function isValidNationalId(digits: string): boolean {
  if (digits.length !== NATIONAL_ID_LENGTH) return false
  if (!/^\d+$/.test(digits)) return false
  // İlk hane sıfır olan bir kimlik numarası yok.
  if (digits.startsWith('0')) return false

  const values = [...digits].map(Number)

  let oddSum = 0
  let evenSum = 0
  for (let index = 0; index < PAYLOAD_DIGIT_COUNT; index += 1) {
    // 0 tabanlı indeksin ÇİFT olduğu yerler numaranın TEK sıralı haneleri.
    if (index % 2 === 0) oddSum += values[index]
    else evenSum += values[index]
  }

  // Fark negatif çıkabildiği için `% 10`dan önce tabana tamamlanıyor:
  // JavaScript'te `-3 % 10` = -3, yani doğrudan karşılaştırma tutmazdı.
  const tenth = ((oddSum * ODD_WEIGHT - evenSum) % DECIMAL_BASE + DECIMAL_BASE) % DECIMAL_BASE
  if (tenth !== values[PAYLOAD_DIGIT_COUNT]) return false

  const eleventh =
    values.slice(0, PAYLOAD_DIGIT_COUNT + 1).reduce((total, value) => total + value, 0) %
    DECIMAL_BASE

  return eleventh === values[NATIONAL_ID_LENGTH - 1]
}

/**
 * Sunucudan okunan değer MASKELİ olabiliyor ("*******1234"). Maskeli metin geri
 * gönderilemez: şahıs firmasında sağlamayı tutturmaz, tüzel firmada "boş olmalı"
 * kuralını çiğner — iki yönde de 400.
 */
export function isMaskedNationalId(raw: string): boolean {
  return raw.includes('*')
}
