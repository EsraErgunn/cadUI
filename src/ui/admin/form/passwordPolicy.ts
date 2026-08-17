/**
 * Şifre kuralının TEK kaynağı (KK-17: en az 8 karakter; büyük harf, küçük harf,
 * rakam ve özel karakter). Kural iki ekranda birden geçerli — kullanıcı
 * oluşturma formu ve şifre değiştirme — bu yüzden ekrana özel şemadan ortak
 * `form/` klasörüne TAŞINDI, kopyalanmadı: iki kopya olsaydı biri güncellenip
 * öbürü unutulduğunda aynı sistem iki farklı şifre kuralı uygular, kullanıcı
 * bir ekranda kabul edilen şifrenin öbüründe reddedildiğini görürdü.
 *
 * Kuralın SON sözü sunucuda: buradaki kontrol kullanıcıya anında geri bildirim
 * içindir, sunucunun kendi doğrulamasının yerine geçmez.
 */
export const PASSWORD_MIN_LENGTH = 8

/** Türkçe harfler de büyük/küçük sayılır; yoksa "Ğ" özel karakter olurdu. */
const UPPERCASE_PATTERN = /[A-ZĞÜŞİÖÇ]/
const LOWERCASE_PATTERN = /[a-zğüşıöç]/
const DIGIT_PATTERN = /\d/
const SPECIAL_PATTERN = /[^\p{L}\p{N}]/u

/**
 * Kullanıcı hangi koşulu sağlamadığını tek tek göremeyeceği için dört koşul da
 * tek cümlede sayılıyor.
 */
export const PASSWORD_RULE_MESSAGE =
  `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı; büyük harf, küçük harf, rakam ve özel karakter içermelidir.`

export function isStrongPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    UPPERCASE_PATTERN.test(value) &&
    LOWERCASE_PATTERN.test(value) &&
    DIGIT_PATTERN.test(value) &&
    SPECIAL_PATTERN.test(value)
  )
}
