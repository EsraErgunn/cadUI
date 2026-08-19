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

/** Sağlaması TUTAN örnek; gerçek kişiden alınmadı, kuraldan üretildi. */
const VALID_NATIONAL_ID = '12345678950'

/**
 * ŞAHIS firması (`companyType: 1`) ve kimlik numarası sunucudan MASKELİ
 * geliyor — ekranın bu değeri forma yüklememesi ve geri göndermemesi gerekiyor.
 */
const FIRM = {
  id: 7,
  companyType: 1,
  title: 'Örnek Mühendislik Ltd. Şti.',
  taxNumber: null,
  nationalIdNumber: '*******1234',
  accountingCode: 'CR-1',
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

    // Email KULLANICININ e-postası; firmanınki (farklı değer) kullanılmıyor.
    expect(await screen.findByLabelText(/Email/)).toHaveValue(USER.email)
  })

  // Ünvan, Firma Yetkilisi, Adres ve Telefon 2 ekrandan KALKTI; gövdeye okunan
  // kayıttan gidiyorlar.
  it('kalkan firma alanları render edilmez', async () => {
    renderPage()
    await screen.findByLabelText(/Email/)

    expect(screen.queryByLabelText(/Ünvan/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Firma Yetkilisi/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Adres/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Telefon 2/)).not.toBeInTheDocument()
  })

  // Sözleşmede karşılığı olmayan alanlar ekrana GİRMEZ (Seri No da kalktı, K102).
  it('Seri No, Yeterlilik No ve Gsm alanları render edilmez', async () => {
    renderPage()
    await screen.findByLabelText(/Email/)

    expect(screen.queryByLabelText(/Seri No/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Yeterlilik/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Yeterlilik/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Gsm/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Gsm/i)).not.toBeInTheDocument()
  })

  it('firma bağı yoksa firma ucuna hiç gitmez', async () => {
    renderPage({ user: { ...USER, projectFirmId: null }, me: { ...ME, projectFirmId: null } })

    expect(await screen.findByLabelText(/StarCAD Mobile Kullanıcı Adı/)).toBeInTheDocument()
    expect(firmApi.getProjectFirm).not.toHaveBeenCalled()
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

/**
 * Firma ŞAHIS firması: kimlik alanı zorunlu ve boş açılıyor (maskeli değer
 * yüklenmiyor), yani kaydeden her test onu doldurmak zorunda.
 */
async function fillNationalId(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/Tc Kimlik No/), VALID_NATIONAL_ID)
}

describe('güncelleme', () => {
  it('telefon 1 değişince kullanıcı ucuna gider', async () => {
    const user = userEvent.setup()
    renderPage()

    const phone = await screen.findByLabelText(/Telefon 1/)
    await user.clear(phone)
    await user.type(phone, '05554443322')
    await fillNationalId(user)
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
  it('firma gövdesine yalnız T.C. kimlik numarası girer', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByLabelText(/Email/)
    await fillNationalId(user)
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    await waitFor(() => {
      // Ünvan/yetkili/adres/telefon 2 gövdeye OKUNAN kayıttan gidiyor
      // (`toProjectFirmUpdateDto`); ekrandan yalnız kimlik numarası giriyor.
      expect(firmApi.updateProjectFirmContact).toHaveBeenCalledWith(FIRM, {
        nationalIdNumber: VALID_NATIONAL_ID,
      })
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

    await screen.findByLabelText(/Email/)
    await fillNationalId(user)
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

    await screen.findByLabelText(/Email/)
    await fillNationalId(user)
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

    await screen.findByLabelText(/Email/)
    await fillNationalId(user)
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    expect(await screen.findByRole('status')).toHaveTextContent('güncellendi')
  })

  it('kayıt hatasında girilen veri korunur', async () => {
    const user = userEvent.setup()
    renderPage()
    usersApi.updateUser.mockRejectedValue(new Error('ağ hatası'))

    const email = await screen.findByLabelText(/Email/)
    await user.clear(email)
    await user.type(email, 'yeni.adres@firma.com')
    await fillNationalId(user)
    await user.click(screen.getByRole('button', { name: 'Güncelle' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('kaydedilemedi')
    expect(screen.getByLabelText(/Email/)).toHaveValue('yeni.adres@firma.com')
  })

  // §10 + K103: alan yalnız şahıs firmasında ve okunan değer YÜKLENMEZ.
  describe('T.C. kimlik alanı (§10)', () => {
    it('şahıs firmasında görünür ve maskeli değeri yüklemez', async () => {
      renderPage()

      const nationalId = await screen.findByLabelText(/Tc Kimlik No/)
      expect(nationalId).toHaveValue('')
      // Boşluğun sebebi ekranda yazıyor; yoksa "veri kayboldu" gibi okunurdu.
      expect(screen.getByText(/yeniden girin/i)).toBeInTheDocument()
    })

    it('tüzel firmada alan hiç çizilmez', async () => {
      firmApi.getProjectFirm.mockResolvedValue({
        ...FIRM,
        companyType: 2,
        taxNumber: '1234567890',
        nationalIdNumber: null,
      })
      authApi.getCurrentUser.mockResolvedValue(ME)
      usersApi.getUser.mockResolvedValue(USER)
      usersApi.updateUser.mockResolvedValue(undefined)
      firmApi.updateProjectFirmContact.mockResolvedValue(undefined)

      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <MemoryRouter>
            <ProfilePage />
          </MemoryRouter>
        </QueryClientProvider>,
      )

      await screen.findByLabelText(/Email/)
      expect(screen.queryByLabelText(/Tc Kimlik No/)).not.toBeInTheDocument()
    })

    it('kimlik girilmeden kaydedilemez', async () => {
      const user = userEvent.setup()
      renderPage()

      await screen.findByLabelText(/Tc Kimlik No/)
      await user.click(screen.getByRole('button', { name: 'Güncelle' }))

      expect(await screen.findByText('Tc kimlik no zorunludur.')).toBeInTheDocument()
      expect(firmApi.updateProjectFirmContact).not.toHaveBeenCalled()
    })

    // Sağlaması tutmayan numara sunucuda 400 alırdı; istemci de reddediyor.
    it('sağlaması tutmayan kimliği reddeder', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.type(await screen.findByLabelText(/Tc Kimlik No/), '11111111111')
      await user.click(screen.getByRole('button', { name: 'Güncelle' }))

      expect(
        await screen.findByText('Geçerli bir T.C. kimlik numarası giriniz.'),
      ).toBeInTheDocument()
      expect(firmApi.updateProjectFirmContact).not.toHaveBeenCalled()
    })
  })
})
