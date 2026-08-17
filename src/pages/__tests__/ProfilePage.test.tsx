import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../api/http'
import { ProfilePage } from '../ProfilePage'

const authApi = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const usersApi = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn() }))
const firmApi = vi.hoisted(() => ({
  getProjectFirm: vi.fn(),
  updateProjectFirmContact: vi.fn(),
}))

vi.mock('../../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/auth')>()),
  ...authApi,
}))

vi.mock('../../api/users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/users')>()),
  ...usersApi,
}))

vi.mock('../../api/projectFirmForm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmForm')>()),
  ...firmApi,
}))

const ME = {
  id: 42,
  fullName: 'Demo Kullanıcı',
  username: 'demo.kullanici',
  projectFirmId: 7 as number | null,
}

const USER = {
  id: 42,
  fullName: 'Demo Kullanıcı',
  email: 'demo@ornek.local',
  username: 'demo.kullanici',
  phone: '05551112233',
  roleCode: 'ProjectFirmUser',
  roleName: 'Proje Firması Kullanıcısı',
  projectFirmId: 7 as number | null,
  gasDistributionFirmId: null,
}

const FIRM = {
  id: 7,
  companyType: 1,
  title: 'Örnek Mühendislik Ltd. Şti.',
  taxNumber: '1234567890',
  nationalIdNumber: null,
  accountingCode: 'CR-1',
  serialNumber: '52120213',
  contactPerson: 'Yetkili Kişi',
  email: 'firma@ornek.local',
  phone: '02121112233',
  phone2: '05559998877',
  address: 'Örnek Mahallesi No: 1',
}

function renderPage({ user = USER, me = ME } = {}) {
  authApi.getCurrentUser.mockResolvedValue(me)
  usersApi.getUser.mockResolvedValue(user)
  firmApi.getProjectFirm.mockResolvedValue(FIRM)
  usersApi.updateUser.mockResolvedValue(undefined)
  firmApi.updateProjectFirmContact.mockResolvedValue(undefined)

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/profile']}>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('veri kaynakları', () => {
  it('kullanıcı kimliğini oturumdan alır, sabit id kullanmaz', async () => {
    renderPage()

    await waitFor(() => expect(usersApi.getUser).toHaveBeenCalledWith(ME.id, expect.anything()))
  })

  it('kullanıcı alanlarını gösterir', async () => {
    renderPage()

    expect(await screen.findByLabelText(/StarCAD Mobile Kullanıcı Adı/)).toHaveValue(
      USER.username,
    )
    // Telefon 1 KULLANICININ telefonu; maskeli gösterilir.
    expect(screen.getByLabelText(/Telefon 1/)).toHaveValue('0555 111 22 33')
  })

  it('projectFirmId üzerinden firma ucunu çağırır ve alanları eşler', async () => {
    renderPage()

    await waitFor(() => {
      expect(firmApi.getProjectFirm).toHaveBeenCalledWith(USER.projectFirmId, expect.anything())
    })

    expect(await screen.findByLabelText(/Seri No/)).toHaveValue(FIRM.serialNumber)
    expect(screen.getByLabelText(/Ünvan/)).toHaveValue(FIRM.title)
    expect(screen.getByLabelText(/Firma Yetkilisi/)).toHaveValue(FIRM.contactPerson)
    // Email KULLANICININ e-postası; firmanınki (farklı değer) kullanılmıyor.
    expect(screen.getByLabelText(/Email/)).toHaveValue(USER.email)
    expect(screen.getByLabelText(/Adres/)).toHaveValue(FIRM.address)
    expect(screen.getByLabelText(/Telefon 2/)).toHaveValue('0555 999 88 77')
  })

  // Sözleşmede karşılığı olmayan alanlar ekrana GİRMEZ.
  it('Yeterlilik No ve Gsm alanları render edilmez', async () => {
    renderPage()
    await screen.findByLabelText(/Seri No/)

    expect(screen.queryByLabelText(/Yeterlilik/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Yeterlilik/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Gsm/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Gsm/i)).not.toBeInTheDocument()
  })

  it('firma bağı yoksa firma ucuna hiç gitmez', async () => {
    renderPage({ user: { ...USER, projectFirmId: null }, me: { ...ME, projectFirmId: null } })

    expect(await screen.findByLabelText(/StarCAD Mobile Kullanıcı Adı/)).toBeInTheDocument()
    expect(firmApi.getProjectFirm).not.toHaveBeenCalled()
    // Sahte değerle DOLDURULMAZ: alan boş kalır ve sebebi yazar.
    expect(screen.getByLabelText(/Ünvan/)).toHaveValue('')
    expect(screen.getByText(/proje firmasına bağlı değil/)).toBeInTheDocument()
  })

  it('kullanıcı ucu hata verirse anlaşılır hata gösterir', async () => {
    authApi.getCurrentUser.mockResolvedValue(ME)
    usersApi.getUser.mockRejectedValue(new Error('bozuk'))

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Kişi bilgileri yüklenemedi.')
  })
})

describe('güncelleme', () => {
  it('telefon 1 değişince kullanıcı ucuna gider', async () => {
    const user = userEvent.setup()
    renderPage()

    const phone = await screen.findByLabelText(/Telefon 1/)
    await user.clear(phone)
    await user.type(phone, '05554443322')
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    await waitFor(() => {
      expect(usersApi.updateUser).toHaveBeenCalledWith(USER.id, {
        email: USER.email,
        fullName: USER.fullName,
        phone: '05554443322',
        roleCode: USER.roleCode,
        projectFirmId: USER.projectFirmId,
        gasDistributionFirmId: USER.gasDistributionFirmId,
      })
    })
  })

  // Firma alanları KULLANICI ucuna gönderilmemeli.
  it('firma alanlarını firma ucuna gönderir ve okunan kaydı korur', async () => {
    const user = userEvent.setup()
    renderPage()

    const address = await screen.findByLabelText(/Adres/)
    await user.clear(address)
    await user.type(address, 'Yeni Adres 2')
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    await waitFor(() => {
      expect(firmApi.updateProjectFirmContact).toHaveBeenCalledWith(
        FIRM,
        // `email`/`phone` firma gövdesine EKRANDAN girmez; okunan kayıttan taşınır.
        {
          title: FIRM.title,
          serialNumber: FIRM.serialNumber,
          contactPerson: FIRM.contactPerson,
          phone2: FIRM.phone2,
          address: 'Yeni Adres 2',
        },
      )
    })
    // Kullanıcı gövdesinde firma alanı YOK.
    const userBody = usersApi.updateUser.mock.calls[0][1] as Record<string, unknown>
    expect(userBody).not.toHaveProperty('address')
    expect(userBody).not.toHaveProperty('title')
  })

  // Kullanıcı isteği düşerse firma isteği HİÇ gönderilmemeli.
  it('kullanıcı PUT başarısızsa firma PUT gönderilmez', async () => {
    const user = userEvent.setup()
    renderPage()
    usersApi.updateUser.mockRejectedValue(new ApiError(400, 'E-posta zaten kullanımda.'))

    await screen.findByLabelText(/Adres/)
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    // Sunucunun KENDİ mesajı gösterilir, ham JSON değil.
    expect(await screen.findByRole('alert')).toHaveTextContent('E-posta zaten kullanımda.')
    expect(firmApi.updateProjectFirmContact).not.toHaveBeenCalled()
  })

  /** İki ayrı uç, ortak transaction yok: yarım kalan hâl gizlenmemeli. */
  it('firma PUT düşerse kısmi başarı bildirilir', async () => {
    const user = userEvent.setup()
    renderPage()
    firmApi.updateProjectFirmContact.mockRejectedValue(new ApiError(400, 'Ünvan geçersiz.'))

    await screen.findByLabelText(/Adres/)
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Kişi bilgileriniz kaydedildi')
    expect(notice).toHaveTextContent('Ünvan geçersiz.')
    // "Tamamen başarılı" mesajı GÖSTERİLMEZ.
    expect(screen.queryByText('Kişi bilgileriniz güncellendi.')).not.toBeInTheDocument()
  })

  it('başarılı kayıtta bildirim gösterir', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByLabelText(/Adres/)
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    expect(await screen.findByRole('status')).toHaveTextContent('güncellendi')
  })

  it('zorunlu ünvan boşken istek atılmaz', async () => {
    const user = userEvent.setup()
    renderPage()

    const title = await screen.findByLabelText(/Ünvan/)
    await user.clear(title)
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    expect(await screen.findByText('Ünvan zorunludur.')).toBeInTheDocument()
    expect(firmApi.updateProjectFirmContact).not.toHaveBeenCalled()
  })

  it('kayıt hatasında girilen veri korunur', async () => {
    const user = userEvent.setup()
    renderPage()
    usersApi.updateUser.mockRejectedValue(new Error('ağ hatası'))

    const address = await screen.findByLabelText(/Adres/)
    await user.clear(address)
    await user.type(address, 'Yeni Adres 3')
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('kaydedilemedi')
    expect(screen.getByLabelText(/Adres/)).toHaveValue('Yeni Adres 3')
  })
})
