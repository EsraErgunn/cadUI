import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NewProjectPage } from '../NewProjectPage'

const api = vi.hoisted(() => ({
  createProject: vi.fn(),
  getProjectFirms: vi.fn(),
  getGasFirmsForProjectFirm: vi.fn(),
  getFirmEngineers: vi.fn(),
  getProjectTypes: vi.fn(),
  getHeatingTypes: vi.fn(),
}))

const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projects')>()),
  ...api,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

const FIRMS = [
  { id: 11, name: 'Anadolu Mühendislik' },
  { id: 12, name: 'Beyaz Tesisat' },
]
const GAS_FIRMS = [{ id: 101, name: 'Başkent Doğalgaz' }]
const ENGINEERS = [
  { id: 501, fullName: 'Ayşe Yıldırım' },
  { id: 502, fullName: 'Mehmet Kaya' },
]
const PROJECT_TYPES = [
  { code: 'ILAVE', label: 'İlave' },
  { code: 'DONUSUM', label: 'Dönüşüm' },
]
const HEATING_TYPES = [
  { code: 'bireysel', label: 'Bireysel' },
  { code: 'merkezi', label: 'Merkezi' },
]

/** Yönlendirme hedefi; rota durumunu da görünür kılar (başarı bildirimi verisi). */
function ListProbe() {
  const location = useLocation()
  return (
    <div>
      <h1>Taslak Projeler</h1>
      <span data-testid="list-state">{JSON.stringify(location.state)}</span>
    </div>
  )
}

function renderPage({ isAdmin = true, route = '/projects/new' } = {}) {
  useIsAdmin.mockReturnValue(isAdmin)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects" element={<ListProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Firma listesi sunucudan geliyor; seçenekler basılmadan seçim yapılamaz. */
async function selectProjectFirm(user: ReturnType<typeof userEvent.setup>, firmId: string) {
  const select = screen.getByLabelText('Proje Firması')
  await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1))
  await user.selectOptions(select, firmId)
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Proje Adı'), 'Yıldız Apartmanı')
  await selectProjectFirm(user, '11')
  await waitFor(() =>
    expect(screen.getByLabelText('Gaz Dağıtım Firması')).not.toBeDisabled(),
  )
  await user.selectOptions(screen.getByLabelText('Gaz Dağıtım Firması'), '101')
  await waitFor(() =>
    expect(
      within(screen.getByLabelText(/Yetkili Mühendis/)).getAllByRole('option').length,
    ).toBeGreaterThan(1),
  )
  await user.selectOptions(screen.getByLabelText(/Yetkili Mühendis/), '501')
  await user.type(screen.getByLabelText('Adres'), 'Çankaya 12. Sokak No 5')
  await user.selectOptions(screen.getByLabelText(/Isınma Tipi/), 'bireysel')
  await user.selectOptions(screen.getByLabelText('Bina Kullanımı Tipi'), 'coklu')
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getProjectFirms.mockResolvedValue(FIRMS)
  api.getGasFirmsForProjectFirm.mockResolvedValue(GAS_FIRMS)
  api.getFirmEngineers.mockResolvedValue(ENGINEERS)
  api.getProjectTypes.mockResolvedValue(PROJECT_TYPES)
  api.getHeatingTypes.mockResolvedValue(HEATING_TYPES)
  api.createProject.mockResolvedValue({ id: 99, pId: '24999', status: 'taslak' })
  // Varsayılan tarihler "bugüne" bağlı; sabitlenmeseydi test yıl sonunda kayardı.
  vi.setSystemTime(new Date(2026, 7, 4))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('NewProjectPage — çerçeve ve varsayılanlar', () => {
  it('üç kart hâlinde açılır', () => {
    renderPage()

    expect(screen.getByRole('region', { name: 'Proje Bilgileri' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Yapı Bilgileri' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tesisat Bilgileri' })).toBeInTheDocument()
  })

  it('parametrik alanların etiketinde (parametrik) yazar', () => {
    renderPage()

    expect(screen.getByLabelText(/Proje Tipi \(parametrik\)/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Isınma Tipi \(parametrik\)/)).toBeInTheDocument()
  })

  it('tarihler bugün ve iki ay sonrasıyla gelir, bitiş başlamadan öne inemez', () => {
    renderPage()

    expect(screen.getByLabelText('İş Başlama Tarihi')).toHaveValue('2026-08-04')
    expect(screen.getByLabelText('İş Bitiş Tarihi')).toHaveValue('2026-10-04')
    expect(screen.getByLabelText('İş Bitiş Tarihi')).toHaveAttribute('min', '2026-08-04')
    expect(screen.getByLabelText('İş Bitiş Tarihi')).toBeEnabled()
  })

  it('başlama tarihi silinince bitiş alanı pasifleşir ve boşalır', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.clear(screen.getByLabelText('İş Başlama Tarihi'))

    const endDate = screen.getByLabelText('İş Bitiş Tarihi')
    expect(endDate).toBeDisabled()
    expect(endDate).toHaveValue('')
    expect(screen.getByText('Önce iş başlama tarihini seçin.')).toBeInTheDocument()
  })

  it('başlama tarihi değişince bitiş tarihi yeniden hesaplanır', () => {
    renderPage()

    // Tarih girdisi bölüm bölüm yazılıyor; `type` ara adımlarda alanı boşaltıyor.
    // Takvimden seçim tek bir change olayı, `fireEvent` onu birebir taklit ediyor.
    fireEvent.change(screen.getByLabelText('İş Bitiş Tarihi'), {
      target: { value: '2026-09-01' },
    })
    expect(screen.getByLabelText('İş Bitiş Tarihi')).toHaveValue('2026-09-01')

    // Önce bitiş girilse bile başlama değişince türetilen tarih kazanır.
    fireEvent.change(screen.getByLabelText('İş Başlama Tarihi'), {
      target: { value: '2026-10-01' },
    })

    expect(screen.getByLabelText('İş Bitiş Tarihi')).toHaveValue('2026-12-01')
  })

  it('sayısal alanlar varsayılanlarıyla ve birimleriyle gelir', () => {
    renderPage()

    // Rol süzgeci şart: artır/azalt düğmelerinin aria-label'ı da etiketi içeriyor.
    expect(screen.getByRole('spinbutton', { name: 'Daire Sayısı' })).toHaveValue('0')
    expect(screen.getByRole('spinbutton', { name: /İşyeri Sayısı/ })).toHaveValue('0')
    expect(screen.getByRole('spinbutton', { name: 'Alan (m²)' })).toHaveValue('0')
    expect(screen.getByRole('spinbutton', { name: 'Kapasite (m³/h)' })).toHaveValue('0')
    expect(screen.getByRole('spinbutton', { name: /S\.K\. Basıncı \(mbar\)/ })).toHaveValue('21')
  })

  it('sayısal alan klavyeden negatife inmez', async () => {
    const user = userEvent.setup()
    renderPage()

    const field = screen.getByRole('spinbutton', { name: 'Daire Sayısı' })
    field.focus()
    await user.keyboard('{ArrowDown}')

    expect(field).toHaveValue('0')
  })

  it('daire sayısı elle tam sayı olarak yazılabilir, ondalık kabul etmez', async () => {
    const user = userEvent.setup()
    renderPage()

    const field = screen.getByRole('spinbutton', { name: 'Daire Sayısı' })
    await user.type(field, '2,5')

    expect(field).toHaveValue('25')
  })

  it('proje tipi listesi servisten gelir ve ilk seçenek varsayılan olur', async () => {
    renderPage()

    const select = screen.getByLabelText(/Proje Tipi/)
    await waitFor(() => expect(select).toHaveValue('ILAVE'))
    // Sabit dizi gömülseydi Ayarlar'dan eklenen bu tip listede olmazdı.
    expect(within(select).getByRole('option', { name: 'Dönüşüm' })).toBeInTheDocument()
  })
})

describe('NewProjectPage — rol bazlı alanlar', () => {
  it('admin firma alanlarını görür', () => {
    renderPage({ isAdmin: true })

    expect(screen.getByLabelText('Proje Firması')).toBeInTheDocument()
    expect(screen.getByLabelText('Gaz Dağıtım Firması')).toBeInTheDocument()
  })

  it('proje firması kullanıcısında firma alanları DOM’da hiç yok', () => {
    renderPage({ isAdmin: false })

    expect(screen.queryByLabelText('Proje Firması')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Gaz Dağıtım Firması')).not.toBeInTheDocument()
  })

  it('admin’de firma seçilmeden mühendis alanı pasif', () => {
    renderPage({ isAdmin: true })

    expect(screen.getByLabelText(/Yetkili Mühendis/)).toBeDisabled()
    expect(api.getFirmEngineers).not.toHaveBeenCalled()
  })

  it('proje firması kullanıcısında mühendis alanı ilk render’da aktif ve kimliksiz çekilir', async () => {
    renderPage({ isAdmin: false })

    expect(screen.getByLabelText(/Yetkili Mühendis/)).not.toBeDisabled()
    await waitFor(() => expect(api.getFirmEngineers).toHaveBeenCalled())
    expect(api.getFirmEngineers.mock.calls[0][0]).toBeUndefined()
  })

  it('firma seçilince mühendis listesi o firmayla çekilir', async () => {
    const user = userEvent.setup()
    renderPage()

    await selectProjectFirm(user, '11')

    await waitFor(() => expect(api.getFirmEngineers).toHaveBeenCalled())
    expect(api.getFirmEngineers.mock.calls[0][0]).toBe(11)
    await waitFor(() => expect(screen.getByLabelText(/Yetkili Mühendis/)).not.toBeDisabled())
  })

  it('firma değişince seçili mühendis temizlenir', async () => {
    const user = userEvent.setup()
    renderPage()

    await selectProjectFirm(user, '11')
    await waitFor(() => expect(screen.getByLabelText(/Yetkili Mühendis/)).not.toBeDisabled())
    await waitFor(() =>
      expect(
        within(screen.getByLabelText(/Yetkili Mühendis/)).getAllByRole('option').length,
      ).toBeGreaterThan(1),
    )
    await user.selectOptions(screen.getByLabelText(/Yetkili Mühendis/), '501')
    expect(screen.getByLabelText(/Yetkili Mühendis/)).toHaveValue('501')

    await user.selectOptions(screen.getByLabelText('Proje Firması'), '12')

    expect(screen.getByLabelText(/Yetkili Mühendis/)).toHaveValue('')
    expect(screen.getByLabelText('Gaz Dağıtım Firması')).toHaveValue('')
  })

  // Bölge kapsamı kaldırıldı (K31): firma listesi hiçbir zaman süzülmez.
  it('firma listesini bölgeyle sınırlamaz', async () => {
    renderPage({ route: '/projects/new?region=Ege' })

    await waitFor(() => expect(api.getProjectFirms).toHaveBeenCalled())
    expect(api.getProjectFirms.mock.calls[0][0]).not.toBe('Ege')
  })
})

describe('NewProjectPage — gönderim', () => {
  it('boş formda kayıt oluşmaz, hatalar görünür ve odak ilk hatalı alana gider', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Oluştur/ }))

    expect(api.createProject).not.toHaveBeenCalled()
    expect(await screen.findByText('Proje adı zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Proje firması zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Gaz dağıtım firması zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Yetkili mühendis zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Adres zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Isınma tipi zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Bina kullanımı tipi zorunludur.')).toBeInTheDocument()
    expect(screen.getByLabelText('Proje Adı')).toHaveFocus()
  })

  it('hata mesajı alana aria-describedby ile bağlanır', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Oluştur/ }))

    const input = await screen.findByLabelText('Proje Adı')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Proje adı zorunludur.')
  })

  it('geçerli formda doğru gövde gider ve listeye yönlendirilir', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Oluştur/ }))

    await waitFor(() => expect(api.createProject).toHaveBeenCalledTimes(1))
    expect(api.createProject.mock.calls[0][0]).toMatchObject({
      name: 'Yıldız Apartmanı',
      projectFirmId: 11,
      gasDistributionFirmId: 101,
      engineerUserId: 501,
      address: 'Çankaya 12. Sokak No 5',
      heatingType: 'bireysel',
      buildingUsageType: 'coklu',
      serviceBoxPressureMbar: 21,
      projectType: 'ILAVE',
    })
    // P_ID istemcide üretilmez.
    expect(api.createProject.mock.calls[0][0]).not.toHaveProperty('pId')

    expect(await screen.findByRole('heading', { name: 'Taslak Projeler' })).toBeInTheDocument()
    expect(screen.getByTestId('list-state')).toHaveTextContent('24999')
  })

  it('gönderim sürerken alanlar ve iptal kilitlenir', async () => {
    // İstek bilerek askıda: kilit yalnız bu aralıkta görülebilir.
    let releaseRequest = () => {}
    api.createProject.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseRequest = () => resolve({ id: 99, pId: '24999', status: 'taslak' })
        }),
    )
    const user = userEvent.setup()
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Oluştur/ }))

    await waitFor(() => expect(screen.getByLabelText('Proje Adı')).toBeDisabled())
    expect(screen.getByRole('spinbutton', { name: 'Daire Sayısı' })).toBeDisabled()
    expect(screen.getByLabelText('İş Başlama Tarihi')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'İptal' })).toBeDisabled()

    releaseRequest()
    expect(await screen.findByRole('heading', { name: 'Taslak Projeler' })).toBeInTheDocument()
  })

  it('sunucu hatasında form verisi korunur ve hata mesajı görünür', async () => {
    api.createProject.mockRejectedValue(new Error('500'))
    const user = userEvent.setup()
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Oluştur/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Proje oluşturulamadı')
    expect(screen.getByLabelText('Proje Adı')).toHaveValue('Yıldız Apartmanı')
    expect(screen.queryByRole('heading', { name: 'Taslak Projeler' })).not.toBeInTheDocument()
  })
})

describe('NewProjectPage — iptal', () => {
  it('form temizken doğrudan listeye döner', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'İptal' }))

    expect(await screen.findByRole('heading', { name: 'Taslak Projeler' })).toBeInTheDocument()
    expect(api.createProject).not.toHaveBeenCalled()
  })

  it('veri girildiyse önce onay sorar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Proje Adı'), 'A')
    await user.click(screen.getByRole('button', { name: 'İptal' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Taslak Projeler' })).not.toBeInTheDocument()
  })

  it('onay verilince listeye döner', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Proje Adı'), 'A')
    await user.click(screen.getByRole('button', { name: 'İptal' }))
    await user.click(await screen.findByRole('button', { name: 'Listeye dön' }))

    expect(await screen.findByRole('heading', { name: 'Taslak Projeler' })).toBeInTheDocument()
    expect(api.createProject).not.toHaveBeenCalled()
  })
})
