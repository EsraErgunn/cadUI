/**
 * Belgedeki maske: 0xxx xxx xx xx. Grup boyutları hane sayısını da tanımlar —
 * ikisi ayrı sabit olsaydı biri değişince diğeri sessizce geride kalırdı.
 */
const PHONE_GROUP_SIZES = [4, 3, 2, 2] as const

export const PHONE_DIGIT_COUNT = PHONE_GROUP_SIZES.reduce((total, size) => total + size, 0)

export const PHONE_PLACEHOLDER = '0xxx xxx xx xx'

const NON_DIGIT_PATTERN = /\D/g

/** Tek karakter sınaması; `g` bayrağı YOK — `test` çağrıları arası durum taşımasın. */
const DIGIT_PATTERN = /\d/

/**
 * Numara 0 ile başlar (maskenin kendisi bunu söylüyor): 11 hane girilse bile
 * "0" ile başlamayan giriş geçerli sayılmaz.
 */
const VALID_PHONE_PATTERN = new RegExp(`^0\\d{${PHONE_DIGIT_COUNT - 1}}$`)

/**
 * Kullanıcının yazdığından yalnız rakamları süzer ve hane sınırına kırpar.
 * Harf alana hiç GİRMEZ; sonradan doğrulamayla reddedilmez.
 */
export function toPhoneDigits(raw: string): string {
  return raw.replace(NON_DIGIT_PATTERN, '').slice(0, PHONE_DIGIT_COUNT)
}

/**
 * Ham rakamları maskeli görünüme çevirir. Yarım kalan giriş de biçimlenir
 * ("0555 12"), yoksa maske ancak numara tamamlanınca belirirdi.
 */
export function formatPhone(digits: string): string {
  const groups: string[] = []
  let offset = 0

  for (const size of PHONE_GROUP_SIZES) {
    if (offset >= digits.length) break
    groups.push(digits.slice(offset, offset + size))
    offset += size
  }

  return groups.join(' ')
}

/** Eksik haneli veya 0 ile başlamayan numara geçersizdir. */
export function isValidPhone(digits: string): boolean {
  return VALID_PHONE_PATTERN.test(digits)
}

export function countDigits(text: string): number {
  return text.replace(NON_DIGIT_PATTERN, '').length
}

/**
 * Maskeli metinde baştan `digitCount` rakam geçildikten SONRAKİ imleç konumu.
 *
 * Maske her tuş vuruşunda yeniden kurulduğu için tarayıcı imleci metnin sonuna
 * atıyordu; metnin ortasına yazan kullanıcı her karakterden sonra sona
 * fırlıyordu. Konum rakam SAYISINA göre hesaplanır, karakter indeksine göre
 * değil — araya giren boşluklar kayma yaratmasın.
 */
export function caretIndexAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0

  let seen = 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (!DIGIT_PATTERN.test(formatted[index])) continue

    seen += 1
    if (seen === digitCount) return index + 1
  }

  return formatted.length
}
