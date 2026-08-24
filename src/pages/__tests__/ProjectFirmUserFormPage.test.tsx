import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDetail, renderFormFlow } from './projectFirmUserFixture'

/** Etiket "Şifre" ya da "Şifre *"; göz düğmesinin adıyla ("Şifreyi göster") karışmasın. */
const PASSWORD_LABEL = /^Şifre( \*)?$/

const readApi = vi.hoisted(() => ({ getProjectFirmUser: vi.fn() }))
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
  readApi.getProjectFirmUser.mockResolvedValue({ source: 'mock', data: buildDetail() })
  formApi.findTakenProjectFirmUserFields.mockResolvedValue({
    isEmailTaken: false,
    isUsernameTaken: false,
  })
  formApi.saveProjectFirmUser.mockResolvedValue({ ok: true, userId: 1001, isPersisted: false })
})

afterEach(() => {
  vi.clearAllMocks()
})

// K51: güncelleme ekranını dolduran kişi uydurma; ekran bunu söylemek zorunda
// ve üretim derlemesinde formu HİÇ doldurmuyor.
describe('veri kaynağı uyarısı (K51)', () => {
  const updateRoute = '/admin/project-firm-users/1001'

  it('mock kayıtta form uyarı şeridiyle birlikte açılır', async () => {
    renderFormFlow(updateRoute)

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Bu ekrandaki bazı veriler sunucudan gelmiyor.')
    expect(notice).toHaveTextContent('Kullanıcının bilgileri')
    expect(await screen.findByLabelText(/Adı Soyadı/)).toHaveValue('Tolga Ertek')
  })

  it('kaynak yokken form yerine "kaynağı yok" kutusu çıkar', async () => {
    readApi.getProjectFirmUser.mockResolvedValue({ source: 'unavailable', data: null })
    renderFormFlow(updateRoute)

    expect(await screen.findByText('Bu bölümün veri kaynağı henüz yok.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Adı Soyadı/)).not.toBeInTheDocument()
    expect(
      screen.queryByText('Bu ekrandaki bazı veriler sunucudan gelmiyor.'),
    ).not.toBeInTheDocument()
  })

})

// KK-13: iki bölüm, açıklama ve zorunlu alan yıldızı.
describe('oluşturma ekranının açılışı (KK-13)', () => {
  it('başlık, açıklama ve kullanıcı bilgileri bölümü görünür', () => {
    renderFormFlow()

    expect(
      screen.getByRole('heading', { name: 'Yeni Proje Firma Kullanıcısı Oluşturma' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Kullanıcı Bilgileri/ })).toBeInTheDocument()
    // "Kullanıcı Yetkinlikleri" bölümü ekrandan kaldırıldı.
    expect(screen.queryByRole('heading', { name: /Kullanıcı Yetkinlikleri/ })).toBeNull()
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

  // Kullanıcı düzeyindeki "Aktif" anahtarı KALKTI.
  it('kullanıcı düzeyinde Aktif anahtarı çizilmez', () => {
    renderFormFlow()

    expect(screen.queryByRole('switch', { name: 'Aktif' })).not.toBeInTheDocument()
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
