import { z } from 'zod'

import {
  PROJECT_FIRM_COMPANY_TYPES,
  type ProjectFirmFullDto,
  type ProjectFirmPayload,
} from '../../../api/projectFirmDto'
import { toCompanyType } from '../../../api/projectFirmForm'
import {
  NATIONAL_ID_LENGTH,
  isValidNationalId,
  toNationalIdDigits,
} from '../../../core/nationalId'
import { isValidPhone, toPhoneDigits } from '../../../core/phone'

export { NATIONAL_ID_LENGTH } from '../../../core/nationalId'

/**
 * Alan sınırları sunucunun doğrulayıcısından (`ProjectFirmCreateValidator`)
 * alındı: girdiye `maxLength` olarak da yazılıyor ki kullanıcı sınırı 400
 * yiyerek değil yazarken öğrensin.
 */
export const PROJECT_FIRM_MAX_LENGTHS = {
  name: 300,
  accountingCode: 50,
  authorizedPerson: 150,
  email: 255,
  address: 500,
} as const

/**
 * Vergi numarası 10 VEYA 11 hane (§10): eski kayıtlar 10, T.C. kimliğinden
 * türeyen bazı kayıtlar 11 haneli. Tek uzunluğa kilitlemek geçerli numaraları
 * reddederdi.
 */
export const TAX_NUMBER_MIN_LENGTH = 10
export const TAX_NUMBER_MAX_LENGTH = 11

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
  authorizedPerson: 'Yetkili kişi zorunludur.',
  email: 'E-mail zorunludur.',
  // Belge madde 21, birebir.
  emailInvalid: 'Geçerli bir e-posta adresi giriniz.',
  taxNumber: 'Vergi no zorunludur.',
  taxNumberLength: `Vergi numarası ${TAX_NUMBER_MIN_LENGTH} veya ${TAX_NUMBER_MAX_LENGTH} haneli olmalıdır.`,
  taxNumberTaken: 'Bu vergi numarası zaten kullanılmaktadır.',
  nationalId: 'Tc kimlik no zorunludur.',
  nationalIdLength: `Tc kimlik numarası ${NATIONAL_ID_LENGTH} haneli olmalıdır.`,
  /** Hane sayısı doğru ama sağlama tutmuyor — "yanlış yazdınız" demenin yolu. */
  nationalIdInvalid: 'Geçerli bir T.C. kimlik numarası giriniz.',
  /**
   * `409` — sunucuda aynı T.C. kimlik numarasıyla bir şahıs firması var. SİLİNMİŞ
   * firma bile numarayı rezerve tuttuğu için kayıt listede görünmeyebiliyor;
   * mesaj bunu SÖYLÜYOR, yoksa kullanıcı listede arayıp bulamaz ve hatayı
   * anlamsız sanardı.
   */
  nationalIdTaken:
    'Bu T.C. kimlik numarasıyla kayıtlı bir şahıs firması zaten var. Silinmiş firmalar da numarayı korur; kayıt listede görünmeyebilir.',
  phone: 'Telefon zorunludur.',
  phoneInvalid: 'Geçerli bir telefon numarası giriniz.',
  noAuthorization: 'En az bir yetkilendirme kaydı ekleyiniz.',
} as const

/** Formun tuttuğu değerler. Telefon/vergi/kimlik alanları HAM rakam tutar;
    maske yalnız görüntüdedir (core/phone.ts), girdiye harf hiç girmez. */
export interface ProjectFirmFormValues {
  name: string
  accountingCode: string
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

function hasTaxNumberLength(value: string): boolean {
  const length = value.trim().length
  return length >= TAX_NUMBER_MIN_LENGTH && length <= TAX_NUMBER_MAX_LENGTH
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
    ? // Şahıs firmasında vergi numarası gövdeye HİÇ girmiyor (§10); alan
      // ekranda da kapalı olduğu için şema serbest — kapalı alanın eski
      // içeriği kaydetmeyi engellememeli.
      z.string()
    : requiredText(PROJECT_FIRM_ERRORS.taxNumber).refine(hasTaxNumberLength, {
        message: PROJECT_FIRM_ERRORS.taxNumberLength,
      })

  const nationalId = isSoleProprietorship
    ? requiredText(PROJECT_FIRM_ERRORS.nationalId)
        .refine((value) => value.trim().length === NATIONAL_ID_LENGTH, {
          message: PROJECT_FIRM_ERRORS.nationalIdLength,
        })
        // Hane sayısı tutup SAĞLAMASI tutmayan numara ayrı mesaj alıyor:
        // "11 haneli olmalıdır" diyen bir hata, 11 hane yazmış kullanıcıya
        // neyin yanlış olduğunu söylemezdi.
        .refine((value) => isValidNationalId(value.trim()), {
          message: PROJECT_FIRM_ERRORS.nationalIdInvalid,
        })
    : z.string()

  return z.object({
    name: requiredText(PROJECT_FIRM_ERRORS.name),
    accountingCode: z.string(),
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
  if (field === 'taxNumber') return digitsOnly(value, TAX_NUMBER_MAX_LENGTH)
  if (field === 'nationalId') return toNationalIdDigits(value)
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
 * Doğrulanmış değerler → istek gövdesi (POST ve PUT için AYNI gövde).
 *
 * İKİ KİMLİK ALANI BİRBİRİNİ DIŞLIYOR (§10) ve temizlik BURADA da yapılıyor,
 * yalnız formda değil: kapalı alanın değeri gövdeye sızarsa sunucu 400 döner.
 * Formdaki temizlik ekran için, buradaki güvence için — tek noktaya güvenmek,
 * ileride eklenen bir "değerleri koru" davranışında sessizce kırılırdı.
 */
export function toProjectFirmPayload(values: ProjectFirmParsedValues): ProjectFirmPayload {
  const isSole = values.isSoleProprietorship

  return {
    companyType: toCompanyType(isSole),
    name: values.name.trim(),
    taxNumber: isSole ? null : optionalText(values.taxNumber),
    nationalIdNumber: isSole ? optionalText(values.nationalId) : null,
    accountingCode: optionalText(values.accountingCode),
    authorizedPerson: optionalText(values.authorizedPerson),
    email: optionalText(values.email),
    // Ham rakam gider; maske yalnız arayüzde.
    phone: values.phoneDigits === '' ? null : values.phoneDigits,
    mobilePhone: values.phone2Digits === '' ? null : values.phone2Digits,
    address: optionalText(values.address),
  }
}

/** Sunucudan gelen `null`/`undefined` metin → formun boş dizesi. */
function toFieldText(value: string | null | undefined): string {
  return value ?? ''
}

/**
 * TEKİL uç yanıtı → form değerleri.
 *
 * Kaynak DETAY yanıtı olmak ZORUNDA: liste satırı adres ve ikinci telefonu
 * taşımıyor ve o eksik satırla doldurulan bir form, kaydedildiğinde sunucudaki
 * dolu alanları SİLERDİ.
 *
 * ⚠️ T.C. kimlik numarası BİLEREK yüklenmiyor (K103): yanıt onu maskeli
 * döndürüyor ("*******1234") ve maskeli metin geri gönderilirse sunucu 400
 * döner. Alan boş açılıyor ve şahıs firmasında yeniden isteniyor — yüklemek,
 * maskeli değerin gövdeye ulaşabildiği TEK yoldu, yüklememek hatayı yapısal
 * olarak imkânsız kılıyor. Boşluğun sebebi alanın altında yazıyor.
 */
export function toProjectFirmFormValues(firm: ProjectFirmFullDto): ProjectFirmFormValues {
  return {
    name: firm.title,
    accountingCode: toFieldText(firm.accountingCode),
    authorizedPerson: toFieldText(firm.contactPerson),
    email: toFieldText(firm.email),
    taxNumber: toFieldText(firm.taxNumber),
    isSoleProprietorship: firm.companyType === PROJECT_FIRM_COMPANY_TYPES.individual,
    nationalId: '',
    address: toFieldText(firm.address),
    // Sunucudaki numara maskeli veya boşluklu gelebilir; form HAM rakam tutuyor.
    phoneDigits: toPhoneDigits(toFieldText(firm.phone)),
    phone2Digits: toPhoneDigits(toFieldText(firm.phone2)),
  }
}
