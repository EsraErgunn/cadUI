import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MOCK_GAS_FIRMS,
  MOCK_PROJECT_FIRMS,
  buildDetail,
  renderFormFlow,
} from './projectFirmUserFixture'

/** Etiket "Şifre" ya da "Şifre *"; göz düğmesinin adıyla ("Şifreyi göster") karışmasın. */
const PASSWORD_LABEL = /^Şifre( \*)?$/

const readApi = vi.hoisted(() => ({
  getProjectFirmUser: vi.fn(),
  getCompetencyGasFirms: vi.fn(),
  getAuthorizedProjectFirms: vi.fn(),
}))
const formApi = vi.hoisted(() => ({
  saveProjectFirmUser: vi.fn(),
  findTakenProjectFirmUserFields: vi.fn(),
}))

vi.mock('../../api/projectFirmUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmUsers')>()),
  ...readApi,
}))

vi.mock('../../api/projectFirmUserForm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmUserForm')>()),
  ...formApi,
}))

beforeEach(() => {
  readApi.getCompetencyGasFirms.mockResolvedValue(MOCK_GAS_FIRMS)
  readApi.getAuthorizedProjectFirms.mockResolvedValue(MOCK_PROJECT_FIRMS)
  readApi.getProjectFirmUser.mockResolvedValue(buildDetail())
  formApi.findTakenProjectFirmUserFields.mockResolvedValue({
    isEmailTaken: false,
    isUsernameTaken: false,
  })
  formApi.saveProjectFirmUser.mockResolvedValue({ userId: 1001, isPersisted: false })
})

afterEach(() => {
  vi.clearAllMocks()
})

// KK-13: iki bölüm, açıklama ve zorunlu alan yıldızı.
describe('oluşturma ekranının açılışı (KK-13)', () => {
  it('başlık, açıklama ve iki bölüm görünür', () => {
    renderFormFlow()

    expect(
      screen.getByRole('heading', { name: 'Yeni Proje Firma Kullanıcısı Oluşturma' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Oluşturma ve güncelleme aynı ekranı kullanır')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Kullanıcı Bilgileri/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Kullanıcı Yetkinlikleri/ })).toBeInTheDocument()
  })

  it('zorunlu alanların etiketi yıldız taşır', () => {
    renderFormFlow()

    expect(screen.getByLabelText(/^Email \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Adı Soyadı \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Kullanıcı Adı \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Şifre \*/)).toBeInTheDocument()
    // Telefon opsiyonel (madde 22): yıldız YOK.
    expect(screen.getByLabelText('Telefon')).toBeInTheDocument()
  })

  // KK-18: yeni kullanıcıda "Aktif" anahtarı açık gelir.
  it('Aktif anahtarı açık gelir', () => {
    renderFormFlow()

    expect(screen.getByRole('switch', { name: 'Aktif' })).toBeChecked()
  })
})

// KK-14: zorunlu alan ve biçim denetimi.
describe('zorunlu alan denetimi (KK-14)', () => {
  it('boş formda kayıt olmaz, alanlar hata alır', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    expect(await screen.findByText('E-mail zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Adı soyadı zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Şifre zorunludur.')).toBeInTheDocument()
    expect(formApi.saveProjectFirmUser).not.toHaveBeenCalled()
  })

  it('bozuk e-posta belgedeki mesajı gösterir', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.type(screen.getByLabelText(/^Email/), 'ornek.firma.com')
    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    expect(await screen.findByText('Geçerli bir e-posta adresi giriniz.')).toBeInTheDocument()
  })

  // Telefon maskeli çalışır, harf kabul etmez.
  it('telefon alanına harf girilemez, maske kurulur', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    const phone = screen.getByLabelText('Telefon')
    await user.type(phone, 'abc05321180880')

    expect(phone).toHaveValue('0532 118 08 80')
  })
})

// KK-15: kullanıcı adı ad soyaddan üretilir, kaydetmeden önce değiştirilebilir.
describe('kullanıcı adının üretilmesi (KK-15)', () => {
  it('ad soyad yazıldıkça kullanıcı adı dolar', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.type(screen.getByLabelText(/^Adı Soyadı/), 'Bülent Sarıoğlu')

    expect(screen.getByLabelText(/^Kullanıcı Adı/)).toHaveValue('bulent.sarioglu')
  })

  it('kullanıcı elle değiştirdiyse üretim durur', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.type(screen.getByLabelText(/^Adı Soyadı/), 'Bülent Sarıoğlu')
    await user.clear(screen.getByLabelText(/^Kullanıcı Adı/))
    await user.type(screen.getByLabelText(/^Kullanıcı Adı/), 'b.sarioglu')
    await user.type(screen.getByLabelText(/^Adı Soyadı/), ' Bey')

    expect(screen.getByLabelText(/^Kullanıcı Adı/)).toHaveValue('b.sarioglu')
  })
})

// KK-17: şifre maskeli, göz düğmesiyle görünür oluyor.
describe('şifre alanı (KK-17)', () => {
  it('maskeli başlar, göz düğmesiyle açılır ve kapanır', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    const password = screen.getByLabelText(PASSWORD_LABEL)
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Şifreyi göster' }))
    expect(password).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Şifreyi gizle' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('kuralı sağlamayan şifre reddedilir', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.type(screen.getByLabelText(PASSWORD_LABEL), 'zayifsifre')
    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    expect(await screen.findByText(/en az 8 karakter olmalı/)).toBeInTheDocument()
  })
})
