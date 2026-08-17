import { describe, expect, it } from 'vitest'

import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
} from '../../../api/adminDashboard'
import {
  ANNOUNCEMENT_ERRORS,
  EMPTY_ANNOUNCEMENT,
  firstAnnouncementErrorField,
  toAnnouncementDraft,
  validateAnnouncement,
  type AnnouncementFormValues,
} from '../announcements/announcementSchema'

const VALID: AnnouncementFormValues = {
  title: 'Planlı Bakım Bildirimi',
  scopeName: 'AKSA',
  body: '19 Temmuz Pazar 02:00–06:00 arasında sistem bakımda olacaktır.',
  isSystem: true,
}

describe('validateAnnouncement', () => {
  it('geçerli duyuruda hata üretmez', () => {
    expect(validateAnnouncement(VALID)).toEqual({})
  })

  it('boş başlığı ve boş metni zorunlu sayar', () => {
    const errors = validateAnnouncement(EMPTY_ANNOUNCEMENT)

    expect(errors.title).toBe(ANNOUNCEMENT_ERRORS.titleRequired)
    expect(errors.body).toBe(ANNOUNCEMENT_ERRORS.bodyRequired)
  })

  it('yalnız boşluktan oluşan alan dolu sayılmaz', () => {
    const errors = validateAnnouncement({ ...VALID, title: '   ', body: '\n ' })

    expect(errors.title).toBe(ANNOUNCEMENT_ERRORS.titleRequired)
    expect(errors.body).toBe(ANNOUNCEMENT_ERRORS.bodyRequired)
  })

  it('çok kısa başlığı reddeder', () => {
    expect(validateAnnouncement({ ...VALID, title: 'ab' }).title).toBe(
      ANNOUNCEMENT_ERRORS.titleTooShort,
    )
  })

  it('sınırı aşan başlık ve metni reddeder', () => {
    const errors = validateAnnouncement({
      ...VALID,
      title: 'a'.repeat(ANNOUNCEMENT_TITLE_MAX_LENGTH + 1),
      body: 'b'.repeat(ANNOUNCEMENT_BODY_MAX_LENGTH + 1),
    })

    expect(errors.title).toBe(ANNOUNCEMENT_ERRORS.titleTooLong)
    expect(errors.body).toBe(ANNOUNCEMENT_ERRORS.bodyTooLong)
  })

  // Kapsam boş bırakılabilir: duyuru o zaman herkese görünür.
  it('kapsamı zorunlu tutmaz', () => {
    expect(validateAnnouncement({ ...VALID, scopeName: '' }).scopeName).toBeUndefined()
  })
})

describe('firstAnnouncementErrorField', () => {
  it('hata yokken null döner', () => {
    expect(firstAnnouncementErrorField({})).toBeNull()
  })

  it('formdaki İLK hatalı alanı verir — odak oraya gider', () => {
    const errors = validateAnnouncement(EMPTY_ANNOUNCEMENT)

    expect(firstAnnouncementErrorField(errors)).toBe('title')
  })

  it('başlık geçerliyken sıradaki hatalı alanı verir', () => {
    const errors = validateAnnouncement({ ...VALID, body: '' })

    expect(firstAnnouncementErrorField(errors)).toBe('body')
  })
})

describe('toAnnouncementDraft', () => {
  it('kenar boşluklarını atar', () => {
    const draft = toAnnouncementDraft({ ...VALID, title: '  Başlık  ', body: ' Metin ' })

    expect(draft.title).toBe('Başlık')
    expect(draft.body).toBe('Metin')
  })

  it('seçilmemiş kapsamı null’a çevirir — duyuru herkese görünür', () => {
    expect(toAnnouncementDraft({ ...VALID, scopeName: '' }).scopeName).toBeNull()
  })

  it('seçili kapsamı olduğu gibi taşır', () => {
    expect(toAnnouncementDraft(VALID).scopeName).toBe('AKSA')
  })

  it('sistem duyurusu işaretini taşır — amber kenarlık buna bağlı', () => {
    expect(toAnnouncementDraft(VALID).isSystem).toBe(true)
  })
})
