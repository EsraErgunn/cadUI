import { useCallback, useRef, useState } from 'react'

import {
  PROJECT_FIRM_USER_ERRORS,
  buildEmptyProjectFirmUserValues,
  firstProjectFirmUserErrorField,
  validateProjectFirmUser,
  type ProjectFirmUserErrors,
  type ProjectFirmUserField,
  type ProjectFirmUserFormValues,
} from './projectFirmUserSchema'
import { ApiError } from '../../../api/http'
import type { ProjectFirmUserDetail } from '../../../api/projectFirmUserDto'
import {
  saveProjectFirmUser,
} from '../../../api/projectFirmUserForm'
import { buildUsernameFromFullName } from '../../../api/turkishText'
import { toPhoneDigits } from '../../../core/phone'

const SUBMIT_ERROR_MESSAGE =
  'Kullanıcı kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.'

/**
 * Üretim derlemesi: yazacak uç yok ve sahte kayıt üretilmiyor (K50). Kullanıcı
 * formda KALIR — listeye "kaydedildi" diye göndermek, hiçbir yere gitmemiş bir
 * kaydı gitmiş göstermek olurdu.
 */

export interface ProjectFirmUserSaveOutcome {
  userId: number
}

const CONFLICT = 409

/** Sunucunun 409 metni hangi alanı işaret ediyor. */
const CONFLICT_MESSAGES = {
  username: PROJECT_FIRM_USER_ERRORS.usernameTaken,
  email: PROJECT_FIRM_USER_ERRORS.emailTaken,
} as const

type ConflictField = keyof typeof CONFLICT_MESSAGES

function findConflictField(message: string): ConflictField | null {
  const text = message.toLocaleLowerCase('tr')
  if (text.includes('kullanıcı adı')) return 'username'
  if (text.includes('e-posta')) return 'email'
  return null
}

export interface ProjectFirmUserFormOptions {
  /** `null` → oluşturma; dolu → güncelleme (aynı ekran, KK-25). */
  user: ProjectFirmUserDetail | null
}

function buildInitialValues(user: ProjectFirmUserDetail | null): ProjectFirmUserFormValues {
  if (user === null) return buildEmptyProjectFirmUserValues()

  return {
    email: user.email,
    phoneDigits: user.phone === null ? '' : toPhoneDigits(user.phone),
    fullName: user.fullName,
    username: user.username,
    // Güncellemede şifre BOŞ gelir; boş bırakılırsa değişmez (KK-25).
    password: '',
    projectFirmId: user.projectFirmId === null ? '' : String(user.projectFirmId),
  }
}

export function useProjectFirmUserForm({ user }: ProjectFirmUserFormOptions) {
  const isUpdate = user !== null
  const [values, setValues] = useState(() => buildInitialValues(user))
  const [errors, setErrors] = useState<ProjectFirmUserErrors>({})
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [focusField, setFocusField] = useState<ProjectFirmUserField | null>(null)
  /** Kullanıcı adına elle dokunulduysa otomatik üretim durur (KK-15). */
  const isUsernameEditedRef = useRef(isUpdate)

  const clearFieldError = useCallback((field: ProjectFirmUserField) => {
    setErrors((current) => {
      if (current[field] === undefined) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const setValue = useCallback(
    (field: ProjectFirmUserField, value: string | boolean) => {
      setIsDirty(true)
      setValues((current) => {
        const next = { ...current, [field]: value }
        if (field === 'username') isUsernameEditedRef.current = true
        // Kullanıcı adı ad soyaddan türer; kullanıcı ona dokunduğu anda üretim
        // durur, yoksa kişinin yazdığı ad her tuşta silinirdi (KK-15).
        if (field === 'fullName' && !isUsernameEditedRef.current) {
          next.username = buildUsernameFromFullName(String(value))
        }
        return next
      })
      clearFieldError(field)
      if (field === 'fullName') clearFieldError('username')
    },
    [clearFieldError],
  )

  const submit = useCallback(async (): Promise<ProjectFirmUserSaveOutcome | null> => {
    setSubmitError(null)

    const { errors: fieldErrors, data } = validateProjectFirmUser(values, isUpdate)

    setErrors(fieldErrors)

    const firstInvalid = firstProjectFirmUserErrorField(fieldErrors)
    if (data === null || firstInvalid !== null) {
      setFocusField(firstInvalid)
      return null
    }

    setIsSubmitting(true)
    try {
      const saved = await saveProjectFirmUser(
        {
          fullName: data.fullName.trim(),
          username: data.username.trim(),
          email: data.email.trim(),
          phone: data.phoneDigits === '' ? null : data.phoneDigits,
          password: data.password === '' ? null : data.password,
          projectFirmId: Number(data.projectFirmId),
        },
        user?.id ?? null,
      )

      return { userId: saved.userId }
    } catch (error) {
      // Benzersizlik denetimi SUNUCUDA (KK-16) ve 409 ile geliyor. Ön kontrol
      // ucu YOK, zaten olsa da iki istek arasında başka biri aynı adı alabilir —
      // tek doğru yer sunucunun cevabı. Hangi alanın çakıştığı mesajdan
      // okunuyor; ayırt edilemezse şerit olarak gösteriliyor.
      const conflictField = error instanceof ApiError && error.status === CONFLICT
        ? findConflictField(error.message)
        : null

      if (conflictField !== null) {
        setErrors({ [conflictField]: CONFLICT_MESSAGES[conflictField] })
        setFocusField(conflictField)
        return null
      }

      setSubmitError(error instanceof ApiError ? error.message : SUBMIT_ERROR_MESSAGE)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [isUpdate, user, values])

  return {
    values,
    errors,
    isUpdate,
    isDirty,
    isSubmitting,
    submitError,
    focusField,
    setValue,
    submit,
    clearFocusRequest: useCallback(() => setFocusField(null), []),
    clearSubmitError: useCallback(() => setSubmitError(null), []),
  }
}

export type ProjectFirmUserForm = ReturnType<typeof useProjectFirmUserForm>


