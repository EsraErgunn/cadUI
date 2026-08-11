/**
 * Türkçe harfleri ASCII karşılığına indirger.
 *
 * Neden elle tablo: `'İ'.toLowerCase()` JavaScript'te 'i' değil, 'i' + birleşen
 * nokta (U+0307) üretir — normalize edilmiş iki metin gözle aynı görünüp
 * `includes` ile eşleşmez. `'I'.toLowerCase()` de yerel ayara göre 'i' ya da 'ı'
 * olabilir. Tablo bu ikisini de yerel ayardan bağımsız sabitler.
 */
const TURKISH_FOLD_MAP: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  I: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
}

/** Büyük/küçük harf ve Türkçe karakter duyarsız karşılaştırma anahtarı. */
export function normalizeTr(value: string): string {
  return [...value].map((char) => TURKISH_FOLD_MAP[char] ?? char.toLowerCase()).join('')
}

/** `haystack` içinde `needle` herhangi bir yerde geçiyor mu (içerik bazlı arama). */
export function includesTr(haystack: string, needle: string): boolean {
  return normalizeTr(haystack).includes(normalizeTr(needle))
}

/** Kullanıcı adında harf, rakam ve nokta dışında hiçbir şey kalmaz. */
const NON_USERNAME_CHARS = /[^a-z0-9.]/g

/**
 * Ad soyaddan kullanıcı adı: "Bülent Sarıoğlu" → "bulent.sarioglu" (KK-15).
 *
 * Türkçe harfler `normalizeTr` ile ASCII'ye iner — kullanıcı adı adres ve giriş
 * alanı olarak kullanıldığı için 'ğ'/'İ' gibi harflerin taşınması güvenilmez.
 * İlk sözcük ad, GERİ KALANIN TAMAMI soyad sayılır ve aralarındaki boşluklar
 * düşer: "Ayşe Nur Demir" → "ayse.nurdemir". İkinci noktayı koymak, ad ile
 * soyadı ayıran nokta hangisi belirsiz bırakırdı.
 */
export function buildUsernameFromFullName(fullName: string): string {
  const words = normalizeTr(fullName)
    .split(/\s+/)
    .map((word) => word.replace(NON_USERNAME_CHARS, ''))
    .filter((word) => word !== '')

  if (words.length === 0) return ''
  const [first, ...rest] = words

  return rest.length === 0 ? first : `${first}.${rest.join('')}`
}
