import { describe, expect, it } from 'vitest'

import {
  PROJECT_FIRM_USER_ERRORS,
  buildEmptyProjectFirmUserValues,
  firstProjectFirmUserErrorField,
  validateProjectFirmUser,
  type ProjectFirmUserFormValues,
} from '../projectFirmUserSchema'

function buildValues(overrides: Partial<ProjectFirmUserFormValues> = {}): ProjectFirmUserFormValues {
  return {
    email: 'tolga.ertek@firma.com',
    phoneDigits: '05321180880',
    fullName: 'Tolga Ertek',
    username: 'tolga.ertek',
    password: 'Guclu.Sifre1',
    ...overrides,
  }
}

describe('zorunlu alanlar (KK-14)', () => {
  it('boş formda dört zorunlu alanın hatası birden çıkar', () => {
    const { errors, data } = validateProjectFirmUser(buildEmptyProjectFirmUserValues(), false)

    expect(data).toBeNull()
    expect(errors.email).toBe(PROJECT_FIRM_USER_ERRORS.email)
    expect(errors.fullName).toBe(PROJECT_FIRM_USER_ERRORS.fullName)
    expect(errors.username).toBe(PROJECT_FIRM_USER_ERRORS.username)
    expect(errors.password).toBe(PROJECT_FIRM_USER_ERRORS.password)
  })

  it('odak görsel sıradaki ilk hatalı alana gider', () => {
    const { errors } = validateProjectFirmUser(
      buildValues({ email: '', fullName: '' }),
      false,
    )

    expect(firstProjectFirmUserErrorField(errors)).toBe('email')
  })

  it('geçerli formda hata kalmaz', () => {
    const { errors, data } = validateProjectFirmUser(buildValues(), false)

    expect(errors).toEqual({})
    expect(data).not.toBeNull()
  })
})

describe('e-posta biçimi (KK-14)', () => {
  it('bozuk adres belgedeki mesajı verir', () => {
    const { errors } = validateProjectFirmUser(buildValues({ email: 'ornek.firma.com' }), false)

    expect(errors.email).toBe(PROJECT_FIRM_USER_ERRORS.emailInvalid)
  })

  // Boş alanda "zorunludur", dolu ama bozukta biçim mesajı — ilk mesaj kazanır.
  it('boş alanda biçim değil zorunluluk mesajı çıkar', () => {
    const { errors } = validateProjectFirmUser(buildValues({ email: '' }), false)

    expect(errors.email).toBe(PROJECT_FIRM_USER_ERRORS.email)
  })
})

describe('telefon (KK-14)', () => {
  it('boş bırakılabilir', () => {
    const { errors } = validateProjectFirmUser(buildValues({ phoneDigits: '' }), false)

    expect(errors.phoneDigits).toBeUndefined()
  })

  it('yarım numara reddedilir', () => {
    const { errors } = validateProjectFirmUser(buildValues({ phoneDigits: '0532118' }), false)

    expect(errors.phoneDigits).toBe(PROJECT_FIRM_USER_ERRORS.phoneInvalid)
  })
})

// KK-17: en az 8 karakter, büyük harf, küçük harf, rakam ve özel karakter.
describe('şifre kuralları (KK-17)', () => {
  const weakPasswords = {
    'kısa şifre': 'Ab1.',
    'büyük harfsiz': 'guclu.sifre1',
    'küçük harfsiz': 'GUCLU.SIFRE1',
    'rakamsız': 'Guclu.Sifre',
    'özel karaktersiz': 'GucluSifre1',
  }

  for (const [label, password] of Object.entries(weakPasswords)) {
    it(`${label} reddedilir`, () => {
      const { errors } = validateProjectFirmUser(buildValues({ password }), false)

      expect(errors.password).toBe(PROJECT_FIRM_USER_ERRORS.passwordRule)
    })
  }

  it('dört koşulu da sağlayan şifre kabul edilir', () => {
    const { errors } = validateProjectFirmUser(buildValues({ password: 'Guclu.Sifre1' }), false)

    expect(errors.password).toBeUndefined()
  })
})

// KK-25: güncellemede şifre boş gelir, boş bırakılırsa değişmez.
describe('güncelleme modu (KK-25)', () => {
  it('boş şifre kabul edilir', () => {
    const { errors, data } = validateProjectFirmUser(buildValues({ password: '' }), true)

    expect(errors.password).toBeUndefined()
    expect(data?.password).toBe('')
  })

  it('şifre girildiyse kural yine uygulanır', () => {
    const { errors } = validateProjectFirmUser(buildValues({ password: 'zayif' }), true)

    expect(errors.password).toBe(PROJECT_FIRM_USER_ERRORS.passwordRule)
  })

  it('diğer zorunlu alanlar güncellemede de zorunludur', () => {
    const { errors } = validateProjectFirmUser(
      buildValues({ password: '', fullName: '' }),
      true,
    )

    expect(errors.fullName).toBe(PROJECT_FIRM_USER_ERRORS.fullName)
  })
})
