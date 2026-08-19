import { z } from 'zod'

import { isValidPhone } from '../../../core/phone'
import { PASSWORD_RULE_MESSAGE, isStrongPassword } from '../form/passwordPolicy'

/**
 * Hata metinleri proje firması kullanıcısı formuyla AYNI kalıpta: iki ekran da
 * kullanıcı oluşturuyor ve farklı cümleler kurmaları kullanıcıya iki ayrı kural
 * varmış gibi görünürdü.
 */
export const GAS_DISTRIBUTION_USER_ERRORS = {
  email: 'E-mail zorunludur.',
  emailInvalid: 'Geçerli bir e-posta adresi giriniz.',
  fullName: 'Adı soyadı zorunludur.',
  username: 'Kullanıcı adı zorunludur.',
  password: 'Şifre zorunludur.',
  passwordRule: PASSWORD_RULE_MESSAGE,
  phoneInvalid: 'Geçerli bir telefon numarası giriniz.',
  gasFirm: 'Gaz dağıtım firması zorunludur.',
} as const

export interface GasDistributionUserFormValues {
  email: string
  /** HAM rakamlar; maske yalnız görüntüde (core/phone.ts). */
  phoneDigits: string
  fullName: string
  username: string
  password: string
  /** Seçim kutusunun değeri metin; gövdeye sayı olarak çevrilir. */
  gasFirmId: string
}

export type GasDistributionUserField = keyof GasDistributionUserFormValues
export type GasDistributionUserErrors = Partial<Record<GasDistributionUserField, string>>

export function buildEmptyGasDistributionUserValues(): GasDistributionUserFormValues {
  return {
    email: '',
    phoneDigits: '',
    fullName: '',
    username: '',
    password: '',
    gasFirmId: '',
  }
}

/** Girdi `id`'si alan adından türer: odağın ilk hatalı alana taşınması buna dayanıyor. */
export function gasDistributionUserFieldId(field: GasDistributionUserField): string {
  return `gas-distribution-user-${field}`
}

/** Alanların EKRANDAKİ sırası; "ilk hatalı alan" bu sıraya göre. */
export const GAS_DISTRIBUTION_USER_FIELD_ORDER: GasDistributionUserField[] = [
  'email',
  'phoneDigits',
  'fullName',
  'username',
  'password',
  'gasFirmId',
]

/** Tarayıcının `type="email"` kontrolüyle aynı kabaca kural. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requiredText(message: string) {
  return z.string().refine((value) => value.trim() !== '', { message })
}

const gasDistributionUserSchema = z.object({
  email: requiredText(GAS_DISTRIBUTION_USER_ERRORS.email).refine(
    (value) => EMAIL_PATTERN.test(value.trim()),
    { message: GAS_DISTRIBUTION_USER_ERRORS.emailInvalid },
  ),
  // Telefon opsiyonel; girildiyse tam numara aranır — yarım numara sessizce
  // kaydedilmesin.
  phoneDigits: z.string().refine((value) => value === '' || isValidPhone(value), {
    message: GAS_DISTRIBUTION_USER_ERRORS.phoneInvalid,
  }),
  fullName: requiredText(GAS_DISTRIBUTION_USER_ERRORS.fullName),
  username: requiredText(GAS_DISTRIBUTION_USER_ERRORS.username),
  password: requiredText(GAS_DISTRIBUTION_USER_ERRORS.password).refine(isStrongPassword, {
    message: GAS_DISTRIBUTION_USER_ERRORS.passwordRule,
  }),
  gasFirmId: requiredText(GAS_DISTRIBUTION_USER_ERRORS.gasFirm),
})

/** Yapısal tip: zod sürümleri arasında değişen `ZodIssue` adına bağlanmamak için. */
interface ValidationIssue {
  path: readonly PropertyKey[]
  message: string
}

/** Alan başına TEK mesaj: alanın altında hata listesi değil, tek satır görünür. */
function collectErrors(issues: readonly ValidationIssue[]): GasDistributionUserErrors {
  const errors: GasDistributionUserErrors = {}

  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field !== 'string') continue

    const key = GAS_DISTRIBUTION_USER_FIELD_ORDER.find((candidate) => candidate === field)
    if (key !== undefined) errors[key] ??= issue.message
  }

  return errors
}

/** Görsel sıraya göre ilk hatalı alan; odak buraya taşınır. */
export function firstGasDistributionUserErrorField(
  errors: GasDistributionUserErrors,
): GasDistributionUserField | null {
  return GAS_DISTRIBUTION_USER_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null
}

export interface GasDistributionUserValidation {
  errors: GasDistributionUserErrors
  /** Yalnız hiç hata yokken dolu. */
  data: GasDistributionUserFormValues | null
}

export function validateGasDistributionUser(
  values: GasDistributionUserFormValues,
): GasDistributionUserValidation {
  const result = gasDistributionUserSchema.safeParse(values)
  if (result.success) return { errors: {}, data: result.data }

  return { errors: collectErrors(result.error.issues), data: null }
}
