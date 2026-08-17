import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAuthSession, setAuthSession } from '../../../api/authToken'
import { ChangePasswordDialog } from '../ChangePasswordDialog'
import { CHANGE_PASSWORD_ERRORS, validateChangePassword } from '../changePasswordSchema'

/** Sunucu şifre değişince YENİ token döndürüyor (eskisi geçersiz oluyor). */
const NEW_SESSION = {
  token: 'yeni-jwt',
  expiresAt: '2099-01-01T00:00:00.000Z',
  fullName: 'Demo Yönetici',
  roleCode: 'Admin',
}

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Formu geçerli değerlerle doldurur. */
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Mevcut Şifre *'), CURRENT)
  await user.type(screen.getByLabelText('Yeni Şifre *'), STRONG)
  await user.type(screen.getByLabelText('Yeni Şifre Tekrar *'), STRONG)
}

afterEach(() => {
  vi.unstubAllGlobals()
  setAuthSession(undefined)
})

const STRONG = 'Yeni.Sifre1'
const CURRENT = 'Eski.Sifre1'

function values(overrides: Partial<Parameters<typeof validateChangePassword>[0]> = {}) {
  return {
    currentPassword: CURRENT,
    newPassword: STRONG,
    repeatPassword: STRONG,
    ...overrides,
  }
}

describe('validateChangePassword', () => {
  it('geçerli formda hata üretmez', () => {
    expect(validateChangePassword(values())).toEqual({})
  })

  it('üç alan da zorunlu', () => {
    const errors = validateChangePassword({
      currentPassword: '',
      newPassword: '',
      repeatPassword: '',
    })

    expect(errors.currentPassword).toBe(CHANGE_PASSWORD_ERRORS.currentPassword)
    expect(errors.newPassword).toBe(CHANGE_PASSWORD_ERRORS.newPassword)
    expect(errors.repeatPassword).toBe(CHANGE_PASSWORD_ERRORS.repeatPassword)
  })

  // Kural sistemin geri kalanıyla AYNI kaynaktan (form/passwordPolicy).
  it('zayıf yeni şifrede kural metnini verir', () => {
    expect(validateChangePassword(values({ newPassword: 'kisa', repeatPassword: 'kisa' })).newPassword).toBe(
      CHANGE_PASSWORD_ERRORS.rule,
    )
  })

  it('tekrar eşleşmezse tekrar alanına hata bağlar', () => {
    const errors = validateChangePassword(values({ repeatPassword: 'Baska.Sifre1' }))

    expect(errors.repeatPassword).toBe(CHANGE_PASSWORD_ERRORS.mismatch)
    expect(errors.newPassword).toBeUndefined()
  })

  // Aynı şifreyi yeniden yazmak "değiştirdim" hissi verir ama hiçbir şey değişmez.
  it('yeni şifre mevcutla aynıysa reddeder', () => {
    expect(validateChangePassword(values({ newPassword: CURRENT, repeatPassword: CURRENT })).newPassword).toBe(
      CHANGE_PASSWORD_ERRORS.sameAsCurrent,
    )
  })
})

describe('ChangePasswordDialog', () => {
  it('üç şifre alanı ve güncelleme düğmesiyle açılır', () => {
    render(<ChangePasswordDialog onClose={vi.fn()} />)

    expect(screen.getByLabelText('Mevcut Şifre *')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Yeni Şifre *')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Yeni Şifre Tekrar *')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Şifreyi Güncelle' })).toBeInTheDocument()
  })

  it('boş formda hataları gösterir', async () => {
    const user = userEvent.setup()
    render(<ChangePasswordDialog onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(screen.getByText(CHANGE_PASSWORD_ERRORS.currentPassword)).toBeInTheDocument()
    expect(screen.getByText(CHANGE_PASSWORD_ERRORS.newPassword)).toBeInTheDocument()
  })

  it('geçerli formu change-password ucuna gönderir', async () => {
    const user = userEvent.setup()
    const fetchMock = stubFetch(NEW_SESSION)
    render(<ChangePasswordDialog onClose={vi.fn()} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    await waitFor(() => {
      expect(String(fetchMock.mock.calls[0][0])).toContain('/api/auth/change-password')
    })
    const request = fetchMock.mock.calls[0][1] as RequestInit
    expect(request.method).toBe('POST')
    expect(JSON.parse(String(request.body))).toEqual({
      currentPassword: CURRENT,
      newPassword: STRONG,
    })
  })

  /**
   * Sunucu şifre değişince eski token'ları geçersiz kılıyor; yanıttaki yeni
   * token saklanmazsa kullanıcı bir sonraki istekte 401 alıp girişe düşerdi.
   */
  it("yanıttaki yeni token'i oturuma yazar", async () => {
    const user = userEvent.setup()
    stubFetch(NEW_SESSION)
    render(<ChangePasswordDialog onClose={vi.fn()} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    await waitFor(() => expect(getAuthSession()?.token).toBe(NEW_SESSION.token))
  })

  it('başarıda anlaşılır bir sonuç mesajı gösterir', async () => {
    const user = userEvent.setup()
    stubFetch(NEW_SESSION)
    render(<ChangePasswordDialog onClose={vi.fn()} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Şifreniz güncellendi')
  })

  // 400'ün sebebini yalnız sunucu biliyor; ham JSON değil, o cümle gösterilir.
  it('400 yanıtında sunucunun mesajını gösterir ve veriyi korur', async () => {
    const user = userEvent.setup()
    stubFetch({ message: 'Mevcut şifreniz hatalı.' }, 400)
    render(<ChangePasswordDialog onClose={vi.fn()} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Mevcut şifreniz hatalı.')
    expect(screen.getByLabelText('Mevcut Şifre *')).toHaveValue(CURRENT)
  })

  it('sunucu hatasında genel mesaja iner', async () => {
    const user = userEvent.setup()
    stubFetch({ message: 'Internal' }, 500)
    render(<ChangePasswordDialog onClose={vi.fn()} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Şifre değiştirilemedi')
  })

  it('doğrulama geçmezse istek hiç atılmaz', async () => {
    const user = userEvent.setup()
    const fetchMock = stubFetch(NEW_SESSION)
    render(<ChangePasswordDialog onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('göster/gizle düğmesi alanı metne çevirir', async () => {
    const user = userEvent.setup()
    render(<ChangePasswordDialog onClose={vi.fn()} />)

    await user.click(screen.getAllByRole('button', { name: 'Şifreyi göster' })[0])

    expect(screen.getByLabelText('Mevcut Şifre *')).toHaveAttribute('type', 'text')
  })

  it('Vazgeç diyaloğu kapatır', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ChangePasswordDialog onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Vazgeç' }))

    expect(onClose).toHaveBeenCalled()
  })
})
