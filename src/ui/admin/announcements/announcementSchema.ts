import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
  type AnnouncementDraft,
} from '../../../api/adminDashboard'

export type AnnouncementField = 'title' | 'body' | 'scopeName'

export interface AnnouncementFormValues {
  title: string
  /** Boş dize = tüm bölgeler; `SelectField` seçilmemiş hâli böyle taşıyor. */
  scopeName: string
  body: string
  isSystem: boolean
}

export type AnnouncementErrors = Partial<Record<AnnouncementField, string>>

/** Başlık tek kelimelik kısaltmalara kapalı olmasın diye alt sınır düşük tutuldu. */
const TITLE_MIN_LENGTH = 3

export const ANNOUNCEMENT_ERRORS = {
  titleRequired: 'Duyuru başlığı zorunludur.',
  titleTooShort: `Başlık en az ${TITLE_MIN_LENGTH} karakter olmalıdır.`,
  titleTooLong: `Başlık en fazla ${ANNOUNCEMENT_TITLE_MAX_LENGTH} karakter olabilir.`,
  bodyRequired: 'Duyuru metni zorunludur.',
  bodyTooLong: `Duyuru metni en fazla ${ANNOUNCEMENT_BODY_MAX_LENGTH} karakter olabilir.`,
} as const

export const EMPTY_ANNOUNCEMENT: AnnouncementFormValues = {
  title: '',
  scopeName: '',
  body: '',
  isSystem: false,
}

/**
 * Odak sırası: hatalı alanların ilki formdaki SIRAYA göre seçilir, doğrulama
 * fonksiyonundaki yazım sırasına göre değil — alan sırası değişirse odak da
 * onunla değişmeli.
 */
const FIELD_ORDER: AnnouncementField[] = ['title', 'scopeName', 'body']

function validateTitle(raw: string): string | undefined {
  const title = raw.trim()

  if (title === '') return ANNOUNCEMENT_ERRORS.titleRequired
  if (title.length < TITLE_MIN_LENGTH) return ANNOUNCEMENT_ERRORS.titleTooShort
  if (title.length > ANNOUNCEMENT_TITLE_MAX_LENGTH) return ANNOUNCEMENT_ERRORS.titleTooLong

  return undefined
}

function validateBody(raw: string): string | undefined {
  const body = raw.trim()

  if (body === '') return ANNOUNCEMENT_ERRORS.bodyRequired
  if (body.length > ANNOUNCEMENT_BODY_MAX_LENGTH) return ANNOUNCEMENT_ERRORS.bodyTooLong

  return undefined
}

/**
 * Bölge ZORUNLU DEĞİL: boş bırakılan duyuru tüm bölgelerde görünür. Yalnız
 * başlık ve metin doğrulanır — sunucu da aynı iki alanı zorunlu görmeli.
 */
export function validateAnnouncement(values: AnnouncementFormValues): AnnouncementErrors {
  const errors: AnnouncementErrors = {}

  const titleError = validateTitle(values.title)
  if (titleError !== undefined) errors.title = titleError

  const bodyError = validateBody(values.body)
  if (bodyError !== undefined) errors.body = bodyError

  return errors
}

export function firstAnnouncementErrorField(errors: AnnouncementErrors): AnnouncementField | null {
  return FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null
}

/** Gönderilecek gövde: kenar boşlukları atılır, boş bölge `null`'a çevrilir. */
export function toAnnouncementDraft(values: AnnouncementFormValues): AnnouncementDraft {
  return {
    title: values.title.trim(),
    body: values.body.trim(),
    scopeName: values.scopeName === '' ? null : values.scopeName,
    isSystem: values.isSystem,
  }
}
