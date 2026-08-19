import { z } from 'zod'

import { isValidPhone } from '../../../core/phone'

/** Belgedeki alan sınırları. Girdinin `maxLength`'ini de bu sabitler besler. */
export const GAS_FIRM_MAX_LENGTHS = {
  name: 100,
  description: 250,
  address: 250,
} as const

/**
 * Formun TÜM hata metinleri — belge güncellenirse tek yerden bakılır.
 *
 * İlk beşi gereksinim belgesindeki karşılıklarıyla BİREBİR aynı.
 * `dfirmNoTaken` istemcide üretilmez: benzersizliğe sunucu karar verir (409),
 * arayüz yalnız gelen hatayı Firma No alanına bağlar.
 *
 * Sondaki üç uzunluk mesajı belgede tanımlı DEĞİL, burada yazıldı: girdiye
 * `maxLength` konduğu için arayüzden ulaşılamazlar. Şemadaki kural yine de
 * duruyor — değer forma dışarıdan (güncelleme verisi) geldiğinde tek koruma bu.
 */
export const GAS_FIRM_ERRORS = {
  dfirmNo: 'Firma no zorunludur.',
  dfirmNoTaken: 'Bu firma numarası zaten kullanılmaktadır.',
  name: 'Firma adı zorunludur.',
  group: 'Grup firması zorunludur.',
  phone: 'Telefon zorunludur.',
  phoneInvalid: 'Geçerli bir telefon numarası giriniz.',
  nameTooLong: `Firma adı en çok ${GAS_FIRM_MAX_LENGTHS.name} karakter olabilir.`,
  descriptionTooLong: `Açıklama en çok ${GAS_FIRM_MAX_LENGTHS.description} karakter olabilir.`,
  addressTooLong: `Adres en çok ${GAS_FIRM_MAX_LENGTHS.address} karakter olabilir.`,
} as const

/**
 * Formun tuttuğu değerler.
 *
 * `dfirmNo` metin: girdi yalnız rakam kabul etse de ham metin elde durur
 * (bkz. NumberStepperField gerekçesi — sayı girdisinde "alan boşaldı" ile
 * "geçersiz karakter yazıldı" ayırt edilemiyor). Sayıya yalnız istek gövdesi
 * kurulurken çevrilir.
 */
export interface GasFirmFormValues {
  dfirmNo: string
  name: string
  /**
   * Grup firmasının KİMLİĞİ, metin olarak (seçim kutusu değerleri dizedir).
   * Boş dize = seçilmedi; doğrulama buna izin vermez. Sunucu grubu adla değil
   * kimlikle alıyor.
   */
  groupId: string
  description: string
  contactPerson: string
  address: string
  /** HAM rakamlar, maskesiz. Maske yalnız görüntüde (core/phone.ts). */
  phoneDigits: string
}

export type GasFirmField = keyof GasFirmFormValues
export type GasFirmErrors = Partial<Record<GasFirmField, string>>

/** Girdi `id`'si alan adından türetilir: doğrulama sonrası odağın hatalı alana
    taşınması `getElementById` ile bu tek kurala dayanıyor. */
export function gasFirmFieldId(field: GasFirmField): string {
  return `gas-firm-${field}`
}

/**
 * Alanların EKRANDAKİ sırası (mockup'taki yerleşim). Odak İLK hatalı alana
 * taşınacağı için "ilk" tanımının görsel sırayla aynı olması gerekiyor;
 * zod'un ürettiği sıra şema tanımına bağlı, ekrana değil.
 */
export const GAS_FIRM_FIELD_ORDER: GasFirmField[] = [
  'dfirmNo',
  'name',
  'groupId',
  'description',
  'contactPerson',
  'address',
  'phoneDigits',
]

function requiredText(message: string) {
  return z.string().refine((value) => value.trim() !== '', { message })
}

const DIGITS_ONLY_PATTERN = /^\d+$/

export const gasFirmSchema = z.object({
  // İki kural da aynı alanda: boş bırakılan alanda "zorunludur" mesajı önce
  // üretildiği için `collectErrors` onu alır, "sayısal" mesajı gölgede kalır.
  dfirmNo: requiredText(GAS_FIRM_ERRORS.dfirmNo).refine(
    (value) => DIGITS_ONLY_PATTERN.test(value.trim()),
    { message: GAS_FIRM_ERRORS.dfirmNo },
  ),
  name: requiredText(GAS_FIRM_ERRORS.name).refine(
    (value) => value.trim().length <= GAS_FIRM_MAX_LENGTHS.name,
    { message: GAS_FIRM_ERRORS.nameTooLong },
  ),
  // Grup artık zorunlu: her gaz dağıtım firması bir grup firmasına bağlı.
  groupId: requiredText(GAS_FIRM_ERRORS.group),
  description: z.string().max(GAS_FIRM_MAX_LENGTHS.description, {
    message: GAS_FIRM_ERRORS.descriptionTooLong,
  }),
  contactPerson: z.string(),
  address: z.string().max(GAS_FIRM_MAX_LENGTHS.address, {
    message: GAS_FIRM_ERRORS.addressTooLong,
  }),
  // Boş alanda "Telefon zorunludur.", dolu ama eksik hanede "Geçerli bir
  // telefon numarası giriniz." — sıra bilerek böyle, ilk üretilen mesaj kazanır.
  phoneDigits: requiredText(GAS_FIRM_ERRORS.phone).refine(isValidPhone, {
    message: GAS_FIRM_ERRORS.phoneInvalid,
  }),
})

/** Yapısal tip: zod sürümleri arasında değişen `ZodIssue` adına bağlanmamak için. */
interface ValidationIssue {
  path: readonly PropertyKey[]
  message: string
}

/**
 * Alan başına TEK mesaj: bir alanın altında hata listesi değil, tek satır görünür.
 *
 * `newProjectSchema` içinde aynı desenin bir eşi var. Ortak bir yardımcıya
 * çıkarmak o ekranın şemasını ve testlerini değiştirmeyi gerektirirdi; iki ekran
 * da kendi alan kümesine bağlı kaldığı için kopya burada bilerek duruyor.
 */
export function collectGasFirmErrors(issues: readonly ValidationIssue[]): GasFirmErrors {
  const errors: GasFirmErrors = {}

  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field !== 'string') continue

    const key = GAS_FIRM_FIELD_ORDER.find((candidate) => candidate === field)
    if (key !== undefined) errors[key] ??= issue.message
  }

  return errors
}

/** Görsel sıraya göre ilk hatalı alan; odak buraya taşınır. */
export function firstGasFirmErrorField(errors: GasFirmErrors): GasFirmField | null {
  return GAS_FIRM_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null
}

/** Şemadan GEÇMİŞ değerler. */
export type GasFirmParsedValues = z.infer<typeof gasFirmSchema>

export interface GasFirmValidation {
  errors: GasFirmErrors
  /** Yalnız hiç hata yokken dolu; istek gövdesi bundan kurulur. */
  data: GasFirmParsedValues | null
}

/** Formun TEK doğrulama girişi. */
export function validateGasFirm(values: GasFirmFormValues): GasFirmValidation {
  const result = gasFirmSchema.safeParse(values)
  if (result.success) return { errors: {}, data: result.data }

  return { errors: collectGasFirmErrors(result.error.issues), data: null }
}

/** Boş metin alanı sunucuya boş dize değil `null` gider: "girilmedi" ile "boş
    bırakıldı" ayrımı veritabanında tek biçimde dursun. */
export function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Uyarı metninde tam olarak kaç ad sayılacağı; gerisi "ve N kayıt daha". */
const SIMILAR_NAME_PREVIEW_LIMIT = 3

/**
 * Belge madde 9: aynı isimde firma varsa kullanıcı UYARILIR ama kayıt
 * engellenmez. Eşleşme birebir değil BENZERLİK — arama zaten büyük/küçük harf ve
 * Türkçe karakter duyarsız, içerik bazlı (KK-4). Birebir eşitlik arasaydık
 * "ADANA DOĞALGAZ" yazan kullanıcı "Adana Doğalgaz Dağıtım A.Ş." kaydını
 * göremezdi — uyarı tam da işe yarayacağı yerde susardı.
 *
 * Kararı kullanıcı verir: metin adları sayar ve gösterir, hiçbir şeyi engellemez.
 */
export function buildSimilarNamesWarning(names: string[]): string | null {
  if (names.length === 0) return null

  const shown = names.slice(0, SIMILAR_NAME_PREVIEW_LIMIT)
  const remaining = names.length - shown.length
  const list = remaining === 0 ? shown.join(', ') : `${shown.join(', ')} ve ${remaining} kayıt daha`

  return `Bu isme benzeyen ${names.length} kayıt var: ${list}`
}
