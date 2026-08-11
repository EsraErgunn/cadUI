import { useCallback, useRef, useState } from 'react'

import {
  COMPETENCY_ERRORS,
  buildEmptyCompetency,
  canAddCompetency,
  findDuplicateCompetencyKeys,
  toCompetencyDrafts,
  toCompetencyPayloads,
  type CompetencyDraft,
} from './projectFirmUserCompetencies'
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
  findTakenProjectFirmUserFields,
  saveProjectFirmUser,
} from '../../../api/projectFirmUserForm'
import { buildUsernameFromFullName } from '../../../api/turkishText'
import { toPhoneDigits } from '../../../core/phone'

const SUBMIT_ERROR_MESSAGE =
  'Kullanıcı kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.'

export interface ProjectFirmUserSaveOutcome {
  userId: number
  isPersisted: boolean
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
    isActive: user.isActive,
  }
}

/** Yeni satırların yerel anahtarı NEGATİF: sunucudan gelen kimliklerle çakışmasın. */
const FIRST_DRAFT_KEY = -1

export function useProjectFirmUserForm({ user }: ProjectFirmUserFormOptions) {
  const isUpdate = user !== null
  const [values, setValues] = useState(() => buildInitialValues(user))
  const [errors, setErrors] = useState<ProjectFirmUserErrors>({})
  const [competencies, setCompetencies] = useState<CompetencyDraft[]>(() =>
    user === null ? [] : toCompetencyDrafts(user.competencies),
  )
  const [competencyError, setCompetencyError] = useState<string | null>(null)
  const [duplicateKeys, setDuplicateKeys] = useState<number[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [focusField, setFocusField] = useState<ProjectFirmUserField | null>(null)
  /** Kullanıcı adına elle dokunulduysa otomatik üretim durur (KK-15). */
  const isUsernameEditedRef = useRef(isUpdate)
  const nextDraftKeyRef = useRef(FIRST_DRAFT_KEY)

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

  const addCompetency = useCallback(() => {
    // Karar durum güncelleyicisinin İÇİNDE verilmiyor: React güncelleyiciyi iki
    // kez çağırabilir (StrictMode) ve yan etkiler ikilenirdi.
    if (!canAddCompetency(competencies)) {
      setCompetencyError(COMPETENCY_ERRORS.incompleteRow)
      return
    }

    const key = nextDraftKeyRef.current
    nextDraftKeyRef.current -= 1
    setCompetencyError(null)
    setIsDirty(true)
    setCompetencies((current) => [...current, buildEmptyCompetency(key)])
  }, [competencies])

  const updateCompetency = useCallback((key: number, patch: Partial<CompetencyDraft>) => {
    setIsDirty(true)
    setCompetencyError(null)
    setDuplicateKeys([])
    setCompetencies((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
  }, [])

  const removeCompetency = useCallback((key: number) => {
    setIsDirty(true)
    setDuplicateKeys([])
    setCompetencies((current) => current.filter((row) => row.key !== key))
  }, [])

  const submit = useCallback(async (): Promise<ProjectFirmUserSaveOutcome | null> => {
    setSubmitError(null)

    const { errors: fieldErrors, data } = validateProjectFirmUser(values, isUpdate)
    const nextDuplicateKeys = findDuplicateCompetencyKeys(competencies)
    const competencyMessage = readCompetencyError(competencies, nextDuplicateKeys)

    setErrors(fieldErrors)
    setDuplicateKeys(nextDuplicateKeys)
    setCompetencyError(competencyMessage)

    const firstInvalid = firstProjectFirmUserErrorField(fieldErrors)
    if (data === null || firstInvalid !== null || competencyMessage !== null) {
      setFocusField(firstInvalid)
      return null
    }

    setIsSubmitting(true)
    try {
      // Benzersizlik SUNUCUDA denetleniyor (KK-16); alan kuralları geçtikten
      // sonra bakılır ki yarım girilmiş bir adres "kullanımda" denmesin.
      const taken = await findTakenProjectFirmUserFields(
        data.email.trim(),
        data.username.trim(),
        user?.id ?? null,
      )

      if (taken.isEmailTaken || taken.isUsernameTaken) {
        setErrors(buildTakenErrors(taken))
        setFocusField(taken.isEmailTaken ? 'email' : 'username')
        return null
      }

      const saved = await saveProjectFirmUser(
        {
          fullName: data.fullName.trim(),
          username: data.username.trim(),
          email: data.email.trim(),
          phone: data.phoneDigits === '' ? null : data.phoneDigits,
          password: data.password === '' ? null : data.password,
          isActive: data.isActive,
          competencies: toCompetencyPayloads(competencies),
        },
        user?.id ?? null,
      )

      return { userId: saved.userId, isPersisted: saved.isPersisted }
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : SUBMIT_ERROR_MESSAGE)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [competencies, isUpdate, user, values])

  return {
    values,
    errors,
    competencies,
    competencyError,
    duplicateKeys,
    isUpdate,
    isDirty,
    isSubmitting,
    submitError,
    focusField,
    setValue,
    addCompetency,
    updateCompetency,
    removeCompetency,
    submit,
    clearFocusRequest: useCallback(() => setFocusField(null), []),
    clearSubmitError: useCallback(() => setSubmitError(null), []),
  }
}

export type ProjectFirmUserForm = ReturnType<typeof useProjectFirmUserForm>

/** Kaydetmeyi engelleyen yetki hatası; sırası önem sırasıdır. */
function readCompetencyError(
  rows: readonly CompetencyDraft[],
  duplicateKeys: readonly number[],
): string | null {
  if (rows.length === 0) return COMPETENCY_ERRORS.required
  if (!canAddCompetency(rows)) return COMPETENCY_ERRORS.incompleteRow
  if (duplicateKeys.length > 0) return COMPETENCY_ERRORS.duplicate
  return null
}

function buildTakenErrors(taken: {
  isEmailTaken: boolean
  isUsernameTaken: boolean
}): ProjectFirmUserErrors {
  const errors: ProjectFirmUserErrors = {}
  if (taken.isEmailTaken) errors.email = PROJECT_FIRM_USER_ERRORS.emailTaken
  if (taken.isUsernameTaken) errors.username = PROJECT_FIRM_USER_ERRORS.usernameTaken
  return errors
}
