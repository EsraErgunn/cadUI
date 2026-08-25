import { z } from 'zod'

import { isValidPhone } from '../../../core/phone'
import { PASSWORD_RULE_MESSAGE, isStrongPassword } from '../form/passwordPolicy'

/**
 * Formun TÜM hata metinleri.
 *
 * Belgede BİREBİR verilen ikisi: `emailInvalid` (madde 9) ve `usernameTaken`
 * (madde 12). Gerisi belgede yazmıyordu; proje firması formundaki kalıp
 * ("… zorunludur.") korunarak yazıldı ki iki ekran aynı dili konuşsun.
 *
 * ASSUMPTION: `passwordRule` metni belgede yok — kuralın kendisi var (KK-17).
 * Kuralın ve metnin sahibi artık `form/passwordPolicy.ts`: şifre değiştirme
 * ekranı da aynı kuralı uyguluyor, ikinci kopya çıkarılmadı.
 */
export const PROJECT_FIRM_USER_ERRORS = {
  email: 'E-mail zorunludur.',
  emailInvalid: 'Geçerli bir e-posta adresi giriniz.',
  emailTaken: 'Bu e-posta adresi zaten kullanılmaktadır.',
  fullName: 'Adı soyadı zorunludur.',
  username: 'Kullanıcı adı zorunludur.',
  projectFirm: 'Proje firması seçiniz.',
  usernameTaken: 'Bu kullanıcı adı zaten kullanılmaktadır.',
  password: 'Şifre zorunludur.',
  passwordRule: PASSWORD_RULE_MESSAGE,
  phoneInvalid: 'Geçerli bir telefon numarası giriniz.',
} as const

export interface ProjectFirmUserFormValues {
  email: string
  /** HAM rakamlar; maske yalnız görüntüde (core/phone.ts), harf hiç girmez. */
  phoneDigits: string
  fullName: string
  username: string
  password: string
  /**
   * Kullanıcının bağlanacağı proje firması. Seçim kutusu değeri DİZE; boş dize
   * = seçilmedi. Sunucu alanı opsiyonel kabul ediyor ama firmasız bir proje
   * firması kullanıcısı hiçbir projeyi göremez — bu yüzden formda zorunlu.
   */
  projectFirmId: string
}

export type ProjectFirmUserField = keyof ProjectFirmUserFormValues
export type ProjectFirmUserErrors = Partial<Record<ProjectFirmUserField, string>>

export function buildEmptyProjectFirmUserValues(): ProjectFirmUserFormValues {
  return {
    email: '',
    phoneDigits: '',
    fullName: '',
    username: '',
    password: '',
    projectFirmId: '',
  }
}

/** Girdi `id`'si alan adından türer: odağın ilk hatalı alana taşınması buna dayanıyor. */
export function projectFirmUserFieldId(field: ProjectFirmUserField): string {
  return `project-firm-user-${field}`
}

/** Alanların EKRANDAKİ sırası (mockup yerleşimi); "ilk hatalı alan" bu sıraya göre. */
export const PROJECT_FIRM_USER_FIELD_ORDER: ProjectFirmUserField[] = [
  'email',
  'phoneDigits',
  'fullName',
  'username',
  'password',
]

/** Tarayıcının `type="email"` kontrolüyle aynı kabaca kural (projectFirmSchema ile aynı gerekçe). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** "Özel karakter" = harf ve rakam dışı her görünür karakter. */

function requiredText(message: string) {
  return z.string().refine((value) => value.trim() !== '', { message })
}

/**
 * Şifrenin zorunluluğu MODA bağlı (KK-25): güncellemede alan boş gelir ve boş
 * bırakılırsa şifre değişmez. Kural şema ÜRETİLİRKEN uygulanıyor, `superRefine`
 * ile değil — nesne düzeyi kontroller yalnız tüm alanlar geçerliyken çalışıyor,
 * yani boş formda e-posta hatası şifre hatasını gölgelerdi (aynı tuzak
 * projectFirmSchema'da belgelenmiş).
 */
function createProjectFirmUserSchema(isUpdate: boolean) {
  const password = isUpdate
    ? z.string().refine((value) => value === '' || isStrongPassword(value), {
        message: PROJECT_FIRM_USER_ERRORS.passwordRule,
      })
    : requiredText(PROJECT_FIRM_USER_ERRORS.password).refine(isStrongPassword, {
        message: PROJECT_FIRM_USER_ERRORS.passwordRule,
      })

  return z.object({
    // Boş alanda "zorunludur", dolu ama bozuk adreste belgedeki biçim mesajı —
    // sıra bilinçli, ilk üretilen mesaj kazanır.
    email: requiredText(PROJECT_FIRM_USER_ERRORS.email).refine(
      (value) => EMAIL_PATTERN.test(value.trim()),
      { message: PROJECT_FIRM_USER_ERRORS.emailInvalid },
    ),
    // Telefon opsiyonel (madde 10); girildiyse tam numara aranır — yarım kalan
    // numara sessizce kaydedilmesin.
    phoneDigits: z.string().refine((value) => value === '' || isValidPhone(value), {
      message: PROJECT_FIRM_USER_ERRORS.phoneInvalid,
    }),
    fullName: requiredText(PROJECT_FIRM_USER_ERRORS.fullName),
    username: requiredText(PROJECT_FIRM_USER_ERRORS.username),
    password,
    projectFirmId: requiredText(PROJECT_FIRM_USER_ERRORS.projectFirm),
  })
}

/** Yapısal tip: zod sürümleri arasında değişen `ZodIssue` adına bağlanmamak için. */
interface ValidationIssue {
  path: readonly PropertyKey[]
  message: string
}

/** Alan başına TEK mesaj: alanın altında hata listesi değil, tek satır görünür. */
export function collectProjectFirmUserErrors(
  issues: readonly ValidationIssue[],
): ProjectFirmUserErrors {
  const errors: ProjectFirmUserErrors = {}

  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field !== 'string') continue

    const key = PROJECT_FIRM_USER_FIELD_ORDER.find((candidate) => candidate === field)
    if (key !== undefined) errors[key] ??= issue.message
  }

  return errors
}

/** Görsel sıraya göre ilk hatalı alan; odak buraya taşınır. */
export function firstProjectFirmUserErrorField(
  errors: ProjectFirmUserErrors,
): ProjectFirmUserField | null {
  return PROJECT_FIRM_USER_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null
}

export interface ProjectFirmUserValidation {
  errors: ProjectFirmUserErrors
  /** Yalnız hiç hata yokken dolu. */
  data: ProjectFirmUserFormValues | null
}

export function validateProjectFirmUser(
  values: ProjectFirmUserFormValues,
  isUpdate: boolean,
): ProjectFirmUserValidation {
  const result = createProjectFirmUserSchema(isUpdate).safeParse(values)
  if (result.success) return { errors: {}, data: result.data }

  return { errors: collectProjectFirmUserErrors(result.error.issues), data: null }
}
