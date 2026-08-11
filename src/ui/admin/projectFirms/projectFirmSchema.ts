import { z } from 'zod'

import type { ProjectFirmPayload } from '../../../api/projectFirmDto'
import { toCompanyType } from '../../../api/projectFirmForm'
import { isValidPhone, toPhoneDigits } from '../../../core/phone'

/**
 * Alan sınırları sunucunun doğrulayıcısından (`ProjectFirmCreateValidator`)
 * alındı: girdiye `maxLength` olarak da yazılıyor ki kullanıcı sınırı 400
 * yiyerek değil yazarken öğrensin.
 */
export const PROJECT_FIRM_MAX_LENGTHS = {
  name: 300,
  accountingCode: 50,
  serialNumber: 50,
  authorizedPerson: 150,
  email: 255,
  address: 500,
} as const

/** Belge: vergi numarası 10, T.C. kimlik numarası 11 hane. */
export const TAX_NUMBER_LENGTH = 10
export const NATIONAL_ID_LENGTH = 11

/**
 * Formun TÜM hata metinleri — belge güncellenirse tek yerden bakılır.
 *
 * ASSUMPTION: Belgede BİREBİR verilen tek metin `emailInvalid`. Gerisi belgede
 * yazmıyordu; gaz dağıtım firma formundaki kalıp ("… zorunludur.") korunarak
 * yazıldı ki iki ekran aynı dili konuşsun.
 *
 * `*Taken` mesajları sunucudan GELMİYOR: uç benzersizlik denetlemiyor, ön
 * kontrol istemcide yapılıyor (`projectFirmUniqueness.ts`). Muhasebe cari
 * kodunun benzersizliği (belge madde 23) BURADA YOK: alan ne liste satırında
 * ne de başka bir uçta dönüyor, karşılaştıracak veri bulunmuyor.
 */
export const PROJECT_FIRM_ERRORS = {
  name: 'Ünvan zorunludur.',
  serialNumber: 'Seri no zorunludur.',
  serialNumberTaken: 'Bu seri numarası zaten kullanılmaktadır.',
  authorizedPerson: 'Yetkili kişi zorunludur.',
  email: 'E-mail zorunludur.',
  // Belge madde 21, birebir.
  emailInvalid: 'Geçerli bir e-posta adresi giriniz.',
  taxNumber: 'Vergi no zorunludur.',
  taxNumberLength: `Vergi numarası ${TAX_NUMBER_LENGTH} haneli olmalıdır.`,
  taxNumberTaken: 'Bu vergi numarası zaten kullanılmaktadır.',
  nationalId: 'Tc kimlik no zorunludur.',
  nationalIdLength: `Tc kimlik numarası ${NATIONAL_ID_LENGTH} haneli olmalıdır.`,
  phone: 'Telefon zorunludur.',
  phoneInvalid: 'Geçerli bir telefon numarası giriniz.',
  noAuthorization: 'En az bir yetkilendirme kaydı ekleyiniz.',
  /**
   * Sunucunun doğrulayıcısı `companyType == 2` (tüzel) dışındaki gövdeyi 400 ile
   * geri çeviriyor. Ham sunucu metni ("Şu an yalnızca tüzel firma
   * (CompanyType=2) eklenebilir.") tek başına kullanıcıya hangi alanı
   * değiştireceğini söylemiyordu; önüne bu cümle konuyor.
   */
  soleProprietorshipUnsupported:
    'Şahıs şirketi kaydı sunucuda henüz desteklenmiyor. "Şahıs Şirketi" işaretini kaldırıp vergi numarasıyla kaydedebilirsiniz.',
} as const

/** Formun tuttuğu değerler. Telefon/vergi/kimlik alanları HAM rakam tutar;
    maske yalnız görüntüdedir (core/phone.ts), girdiye harf hiç girmez. */
export interface ProjectFirmFormValues {
  name: string
  accountingCode: string
  serialNumber: string
  authorizedPerson: string
  email: string
  taxNumber: string
  isSoleProprietorship: boolean
  nationalId: string
  address: string
  phoneDigits: string
  phone2Digits: string
}

export type ProjectFirmField = keyof ProjectFirmFormValues
export type ProjectFirmErrors = Partial<Record<ProjectFirmField, string>>

export function buildEmptyProjectFirmValues(): ProjectFirmFormValues {
  return {
    name: '',
    accountingCode: '',
    serialNumber: '',
    authorizedPerson: '',
    email: '',
    taxNumber: '',
    isSoleProprietorship: false,
    nationalId: '',
    address: '',
    phoneDigits: '',
    phone2Digits: '',
  }
}

/** Girdi `id`'si alan adından türetilir: doğrulama sonrası odağın hatalı alana
    taşınması `getElementById` ile bu tek kurala dayanıyor. */
export function projectFirmFieldId(field: ProjectFirmField): string {
  return `project-firm-${field}`
}

/**
 * Alanların EKRANDAKİ sırası (mockup'taki yerleşim). Odak İLK hatalı alana
 * taşınacağı için "ilk" tanımının görsel sırayla aynı olması gerekiyor;
 * zod'un ürettiği sıra şema tanımına bağlı, ekrana değil.
 */
export const PROJECT_FIRM_FIELD_ORDER: ProjectFirmField[] = [
  'name',
  'accountingCode',
  'serialNumber',
  'authorizedPerson',
  'email',
  'taxNumber',
  'isSoleProprietorship',
  'nationalId',
  'address',
  'phoneDigits',
  'phone2Digits',
]

function requiredText(message: string) {
  return z.string().refine((value) => value.trim() !== '', { message })
}

function hasExactLength(value: string, length: number): boolean {
  return value.trim().length === length
}

/**
 * Tarayıcının `type="email"` kontrolüyle aynı kabaca kural. RFC'ye tam uyan bir
 * desen yazılmadı: geçerli adresleri reddeden bir düzenli ifade, geçersizini
 * kaçıran birinden daha pahalıdır — son sözü zaten sunucu söylüyor.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * "Şahıs Şirketi" iki alanın zorunluluğunu birbirine bağlıyor. Kural ŞEMA
 * ÜRETİLİRKEN uygulanıyor, `superRefine` ile değil: zod'un nesne düzeyi
 * kontrolleri yalnız tüm alanlar geçerliyken çalışıyor, yani boş formda ünvan
 * hatası vergi/kimlik hatasını gölgelerdi (aynı tuzak `newProjectSchema`'da
 * belgelenmiş).
 */
function createProjectFirmSchema(isSoleProprietorship: boolean) {
  const taxNumber = isSoleProprietorship
    ? // Şahıs şirketinde firma kimliği T.C. kimlik numarasından tutuluyor:
      // alan zorunluluktan çıkar ama girilirse hane kuralı sürer.
      z
        .string()
        .refine((value) => value.trim() === '' || hasExactLength(value, TAX_NUMBER_LENGTH), {
          message: PROJECT_FIRM_ERRORS.taxNumberLength,
        })
    : requiredText(PROJECT_FIRM_ERRORS.taxNumber).refine(
        (value) => hasExactLength(value, TAX_NUMBER_LENGTH),
        { message: PROJECT_FIRM_ERRORS.taxNumberLength },
      )

  const nationalId = isSoleProprietorship
    ? requiredText(PROJECT_FIRM_ERRORS.nationalId).refine(
        (value) => hasExactLength(value, NATIONAL_ID_LENGTH),
        { message: PROJECT_FIRM_ERRORS.nationalIdLength },
      )
    : // Alan pasifken zaten temizleniyor; şema yine de serbest bırakılıyor ki
      // pasif alanın eski içeriği kaydetmeyi engelleyemesin.
      z.string()

  return z.object({
    name: requiredText(PROJECT_FIRM_ERRORS.name),
    accountingCode: z.string(),
    serialNumber: requiredText(PROJECT_FIRM_ERRORS.serialNumber),
    authorizedPerson: requiredText(PROJECT_FIRM_ERRORS.authorizedPerson),
    // Boş alanda "zorunludur", dolu ama bozuk adreste belgedeki biçim mesajı —
    // sıra bilerek böyle, ilk üretilen mesaj kazanır.
    email: requiredText(PROJECT_FIRM_ERRORS.email).refine(
      (value) => EMAIL_PATTERN.test(value.trim()),
      { message: PROJECT_FIRM_ERRORS.emailInvalid },
    ),
    taxNumber,
    isSoleProprietorship: z.boolean(),
    nationalId,
    address: z.string(),
    phoneDigits: requiredText(PROJECT_FIRM_ERRORS.phone).refine(isValidPhone, {
      message: PROJECT_FIRM_ERRORS.phoneInvalid,
    }),
    // ASSUMPTION: Belge Telefon 2 için yalnız "opsiyonel" diyor. Girildiyse tam
    // numara aranıyor — yarım kalan numara sessizce kaydedilmesin.
    phone2Digits: z.string().refine((value) => value === '' || isValidPhone(value), {
      message: PROJECT_FIRM_ERRORS.phoneInvalid,
    }),
  })
}

/** Yapısal tip: zod sürümleri arasında değişen `ZodIssue` adına bağlanmamak için. */
interface ValidationIssue {
  path: readonly PropertyKey[]
  message: string
}

/** Alan başına TEK mesaj: bir alanın altında hata listesi değil, tek satır görünür. */
export function collectProjectFirmErrors(
  issues: readonly ValidationIssue[],
): ProjectFirmErrors {
  const errors: ProjectFirmErrors = {}

  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field !== 'string') continue

    const key = PROJECT_FIRM_FIELD_ORDER.find((candidate) => candidate === field)
    if (key !== undefined) errors[key] ??= issue.message
  }

  return errors
}

/** Görsel sıraya göre ilk hatalı alan; odak buraya taşınır. */
export function firstProjectFirmErrorField(
  errors: ProjectFirmErrors,
): ProjectFirmField | null {
  return PROJECT_FIRM_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null
}

/** Şemadan GEÇMİŞ değerler. */
export type ProjectFirmParsedValues = z.infer<ReturnType<typeof createProjectFirmSchema>>

export interface ProjectFirmValidation {
  errors: ProjectFirmErrors
  /** Yalnız hiç hata yokken dolu; istek gövdesi bundan kurulur. */
  data: ProjectFirmParsedValues | null
}

/** Formun TEK doğrulama girişi. */
export function validateProjectFirm(values: ProjectFirmFormValues): ProjectFirmValidation {
  const result = createProjectFirmSchema(values.isSoleProprietorship).safeParse(values)
  if (result.success) return { errors: {}, data: result.data }

  return { errors: collectProjectFirmErrors(result.error.issues), data: null }
}

/** Alana yazılabilecekleri kısıtlar: harf ve işaret girdiye HİÇ girmez. */
export function normalizeProjectFirmValue(field: ProjectFirmField, value: string): string {
  if (field === 'phoneDigits' || field === 'phone2Digits') return toPhoneDigits(value)
  if (field === 'taxNumber') return digitsOnly(value, TAX_NUMBER_LENGTH)
  if (field === 'nationalId') return digitsOnly(value, NATIONAL_ID_LENGTH)
  return value
}

function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

/** Boş metin alanı sunucuya boş dize değil `null` gider: "girilmedi" ile "boş
    bırakıldı" ayrımı veritabanında tek biçimde dursun. `gasFirmSchema`'daki
    eşiyle aynı gerekçeyle kopya duruyor — iki şema da kendi alan kümesine bağlı. */
function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Doğrulanmış değerler → istek gövdesi.
 *
 * T.C. kimlik numarası gövdeye KONMAZ: sunucunun create DTO'sunda karşılığı yok
 * ve `taxNumber` alanına yazılsaydı vergi numarası sütununa kimlik düşerdi
 * (bkz. api/projectFirmForm.ts sözleşme notu).
 */
export function toProjectFirmPayload(values: ProjectFirmParsedValues): ProjectFirmPayload {
  return {
    companyType: toCompanyType(values.isSoleProprietorship),
    name: values.name.trim(),
    taxNumber: optionalText(values.taxNumber),
    accountingCode: optionalText(values.accountingCode),
    serialNumber: optionalText(values.serialNumber),
    authorizedPerson: optionalText(values.authorizedPerson),
    email: optionalText(values.email),
    // Ham rakam gider; maske yalnız arayüzde.
    phone: values.phoneDigits === '' ? null : values.phoneDigits,
    mobilePhone: values.phone2Digits === '' ? null : values.phone2Digits,
    address: optionalText(values.address),
  }
}
