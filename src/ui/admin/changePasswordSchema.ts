import { PASSWORD_RULE_MESSAGE, isStrongPassword } from './form/passwordPolicy'

export const CHANGE_PASSWORD_ERRORS = {
  currentPassword: 'Mevcut şifre zorunludur.',
  newPassword: 'Yeni şifre zorunludur.',
  repeatPassword: 'Yeni şifre tekrarı zorunludur.',
  rule: PASSWORD_RULE_MESSAGE,
  mismatch: 'Yeni şifre ile tekrarı aynı değil.',
  sameAsCurrent: 'Yeni şifre mevcut şifreden farklı olmalıdır.',
} as const

export interface ChangePasswordValues {
  currentPassword: string
  newPassword: string
  repeatPassword: string
}

export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordValues, string>>

export const EMPTY_CHANGE_PASSWORD_VALUES: ChangePasswordValues = {
  currentPassword: '',
  newPassword: '',
  repeatPassword: '',
}

/**
 * Alan başına TEK mesaj ve görsel sırayla: odak ilk hatalı alana taşınacağı için
 * "ilk" tanımı ekrandaki sırayla aynı olmalı (`validateGasFirm` deseni).
 *
 * Kural sırası bilinçli: boş alanda "zorunludur", dolu ama zayıf şifrede kural
 * metni, ikisi de geçerken eşleşme kontrolü.
 */
export function validateChangePassword(values: ChangePasswordValues): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {}

  if (values.currentPassword === '') errors.currentPassword = CHANGE_PASSWORD_ERRORS.currentPassword

  if (values.newPassword === '') errors.newPassword = CHANGE_PASSWORD_ERRORS.newPassword
  else if (!isStrongPassword(values.newPassword)) errors.newPassword = CHANGE_PASSWORD_ERRORS.rule
  else if (values.newPassword === values.currentPassword) {
    errors.newPassword = CHANGE_PASSWORD_ERRORS.sameAsCurrent
  }

  if (values.repeatPassword === '') errors.repeatPassword = CHANGE_PASSWORD_ERRORS.repeatPassword
  else if (errors.newPassword === undefined && values.repeatPassword !== values.newPassword) {
    errors.repeatPassword = CHANGE_PASSWORD_ERRORS.mismatch
  }

  return errors
}
