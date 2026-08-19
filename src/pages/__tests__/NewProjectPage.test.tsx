import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NewProjectPage } from '../NewProjectPage'

const api = vi.hoisted(() => ({
  createProject: vi.fn(),
  getCities: vi.fn(),
  getCityDistricts: vi.fn(),
}))

const getCodesByGroupName = vi.hoisted(() => vi.fn())
const getProjectFirmList = vi.hoisted(() => vi.fn())
const getAuthorizedGasFirms = vi.hoisted(() => vi.fn())
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projects')>()),
  ...api,
}))

// Proje firması kutusu proje firmaları ekranıyla ORTAK veri katmanından
// (`GET /api/projectfirms`); GD firması kutusu ise seçili proje firmasının
// GEÇERLİ yetkilerinden (`GET /api/project-firm-authorizations`).
vi.mock('../../api/projectFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirms')>()),
  getProjectFirmList,
}))

vi.mock('../../api/projectFirmAuthorizations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmAuthorizations')>()),
  getAuthorizedGasFirms,
}))

vi.mock('../../api/codes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/codes')>()),
  getCodesByGroupName,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

/** `getProjectFirmList` satırı: kutu yalnız `id` + `name` kullanıyor
    (`name`, uçtaki `title`'ın karşılığı — projectFirmDto). */
const FIRMS = [
  { id: 11, name: 'Anadolu Mühendislik', authorizedPerson: null, email: null, phone: null,
    taxNumber: null },
  { id: 12, name: 'Beyaz Tesisat', authorizedPerson: null, email: null, phone: null,
    taxNumber: null },
]
/** `getAuthorizedGasFirms` satırı: kutu yalnız `id` + `name` kullanıyor. */
const GAS_FIRMS = [{ id: 101, name: 'Başkent Doğalgaz' }]
const CITIES = [
  { id: 6, name: 'Ankara' },
  { id: 34, name: 'İstanbul' },
]
const DISTRICTS = [
  { id: 64, name: 'Çankaya' },
  { id: 59, name: 'Altındağ' },
]
/** Kod grubu ucundan gelen seçenekler: gövdeye `id`, ekrana `name`. */
const PROJECT_TYPES = [
  { id: 3, name: 'İlave' },
  { id: 7, name: 'Dönüşüm' },
]
const HEATING_TYPES = [
  { id: 8, name: 'Bireysel' },
  { id: 9, name: 'Merkezi' },
]
const BUILDING_USAGE_TYPES = [
  { id: 12, name: 'Çoklu' },
  { id: 13, name: 'Müstakil' },
]

const CODES_BY_GROUP: Record<string, { id: number; name: string }[]> = {
  ProjectType: PROJECT_TYPES,
  HeatingType: HEATING_TYPES,
  BuildingUsageType: BUILDING_USAGE_TYPES,
}

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

/** İlçe kutusu il seçilene kadar pasif; seçenekler de il seçilince yükleniyor. */
async function selectCityAndDistrict(user: ReturnType<typeof userEvent.setup>) {
  const city = screen.getByLabelText(/^İl \*$/)
  await waitFor(() => expect(within(city).getAllByRole('option').length).toBeGreaterThan(1))
  await user.selectOptions(city, '6')

  const district = screen.getByLabelText(/^İlçe \*$/)
  await waitFor(() => expect(district).not.toBeDisabled())
  await user.selectOptions(district, '64')
}

/** Bina kullanımı da artık kod grubundan geliyor; seçenekler basılmadan seçilemez. */
async function selectBuildingUsageType(
  user: ReturnType<typeof userEvent.setup>,
  codeId: string,
) {
  const select = screen.getByLabelText(/Bina Kullanımı Tipi/)
  await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1))
  await user.selectOptions(select, codeId)
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Proje Adı'), 'Yıldız Apartmanı')
  await selectProjectFirm(user, '11')
  await waitFor(() =>
    expect(screen.getByLabelText('Gaz Dağıtım Firması')).not.toBeDisabled(),
  )
  await user.selectOptions(screen.getByLabelText('Gaz Dağıtım Firması'), '101')
  await selectCityAndDistrict(user)
  await user.type(screen.getByLabelText('Adres'), 'Çankaya 12. Sokak No 5')
  await user.selectOptions(screen.getByLabelText(/Isınma Tipi/), '8')
  await selectBuildingUsageType(user, '12')
}

beforeEach(() => {
  vi.clearAllMocks()
  getProjectFirmList.mockResolvedValue(FIRMS)
  getAuthorizedGasFirms.mockResolvedValue(GAS_FIRMS)
  api.getCities.mockResolvedValue(CITIES)
  api.getCityDistricts.mockResolvedValue(DISTRICTS)
  getCodesByGroupName.mockImplementation((groupName: string) =>
    Promise.resolve(CODES_BY_GROUP[groupName] ?? []),
  )
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
    expect(screen.getByLabelText(/Bina Kullanımı Tipi \(parametrik\)/)).toBeInTheDocument()
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
    // Ekranda ad görünür, değer KİMLİK taşır.
    await waitFor(() => expect(select).toHaveValue('3'))
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

  // Bölge kapsamı kaldırıldı (K31): firma listesi hiçbir zaman süzülmez.
  it('firma listesini bölgeyle sınırlamaz', async () => {
    renderPage({ route: '/projects/new?region=Ege' })

    await waitFor(() => expect(getProjectFirmList).toHaveBeenCalled())
    expect(getProjectFirmList.mock.calls[0][0]).not.toBe('Ege')
  })
})

describe('NewProjectPage — firma kutularının kaynağı', () => {
  /** İkisi de mock'tan değil gerçek uçtan; ekranda `title`, değerde `id`. */
  it('proje firmalarını GET /api/projectfirms veri katmanından alır', async () => {
    renderPage()

    const select = screen.getByLabelText('Proje Firması')
    await waitFor(() =>
      expect(within(select).getByRole('option', { name: 'Anadolu Mühendislik' })).toHaveValue('11'),
    )
    expect(getProjectFirmList).toHaveBeenCalled()
  })

  it('gaz dağıtım firmalarını seçili proje firmasının YETKİLERİNDEN alır', async () => {
    const user = userEvent.setup()
    renderPage()

    await selectProjectFirm(user, '11')

    const select = screen.getByLabelText('Gaz Dağıtım Firması')
    await waitFor(() =>
      expect(within(select).getByRole('option', { name: 'Başkent Doğalgaz' })).toHaveValue('101'),
    )
    expect(getAuthorizedGasFirms).toHaveBeenCalled()
  })

  /** Seçenekler proje firmasına bağlı; firma seçilmeden uca gidilmesi boşuna istek olurdu. */
  it('proje firması seçilmeden yetki ucuna gitmez', () => {
    renderPage()

    expect(getAuthorizedGasFirms).not.toHaveBeenCalled()
  })

  /** Boş kutu "sistemde firma yok" gibi okunuyordu; sebep yazılmalı. */
  it('proje firması listesi yüklenemezse sebebi yazar ve kutu pasif kalır', async () => {
    getProjectFirmList.mockRejectedValue(new Error('ağ'))
    renderPage()

    expect(
      await screen.findByText(/Proje firması listesi yüklenemedi/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Proje Firması')).toBeDisabled()
  })

  it('gaz dağıtım firması listesi yüklenemezse sebebi yazar', async () => {
    const user = userEvent.setup()
    getAuthorizedGasFirms.mockRejectedValue(new Error('ağ'))
    renderPage()

    await selectProjectFirm(user, '11')

    expect(
      await screen.findByText(/Gaz dağıtım firması listesi yüklenemedi/),
    ).toBeInTheDocument()
  })

  /**
   * Gerçek veride var: tek yetkisi süresi dolmuş bir proje firması seçilince
   * liste BOŞ geliyor. Sessiz boş kutu, kullanıcıya sebebi söylemezdi.
   */
  it('firmanın geçerli yetkisi yoksa sebebini yazar', async () => {
    const user = userEvent.setup()
    getAuthorizedGasFirms.mockResolvedValue([])
    renderPage()

    await selectProjectFirm(user, '11')

    expect(await screen.findByText(/geçerli bir yetkisi yok/)).toBeInTheDocument()
  })

  /** Seçenekler proje firmasının yetkilerinden türediği için sıra kuralı korunuyor. */
  it('GD firması kutusu proje firması seçilene kadar pasif kalır', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByLabelText('Gaz Dağıtım Firması')).toBeDisabled()

    await selectProjectFirm(user, '11')

    await waitFor(() =>
      expect(screen.getByLabelText('Gaz Dağıtım Firması')).not.toBeDisabled(),
    )
  })

  /** Daraltma artık GERÇEK: liste seçili firmanın yetkilerinden türüyor. */
  it('GD firması listesi seçilen proje firmasına göre DARALIR', async () => {
    const user = userEvent.setup()
    renderPage()

    await selectProjectFirm(user, '11')
    await waitFor(() => expect(getAuthorizedGasFirms).toHaveBeenCalled())

    expect(getAuthorizedGasFirms.mock.calls[0][0]).toBe(11)
  })

  /** Firma değişince seçenekler o firmanın yetkileriyle yeniden çekilmeli. */
  it('proje firması değişince GD listesi yeniden çekilir', async () => {
    const user = userEvent.setup()
    renderPage()

    await selectProjectFirm(user, '11')
    await waitFor(() => expect(getAuthorizedGasFirms).toHaveBeenCalledWith(11, expect.anything()))

    await user.selectOptions(screen.getByLabelText('Proje Firması'), '12')
    await waitFor(() => expect(getAuthorizedGasFirms).toHaveBeenCalledWith(12, expect.anything()))
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
    expect(screen.getByText('Adres zorunludur.')).toBeInTheDocument()
    // İl ve ilçe ZORUNLU: uç ikisini de istiyor.
    expect(screen.getByText('İl seçiniz.')).toBeInTheDocument()
    expect(screen.getByText('İlçe seçiniz.')).toBeInTheDocument()
    expect(screen.getByText('Isınma tipi zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Bina kullanımı tipi zorunludur.')).toBeInTheDocument()
    expect(screen.getByLabelText('Proje Adı')).toHaveFocus()
  })

  /**
   * İlçeleri veren uç il kimliği istiyor (`GET /api/cities/{cityId}/districts`);
   * ilsiz bir ilçe listesi yok, kutu bu yüzden pasif açılıyor.
   */
  it('ilçe kutusu il seçilene kadar pasiftir', async () => {
    const user = userEvent.setup()
    renderPage()

    const district = await screen.findByLabelText(/^İlçe \*$/)
    expect(district).toBeDisabled()

    const city = screen.getByLabelText(/^İl \*$/)
    await waitFor(() => expect(within(city).getAllByRole('option').length).toBeGreaterThan(1))
    await user.selectOptions(city, '6')

    await waitFor(() => expect(district).not.toBeDisabled())
    expect(api.getCityDistricts).toHaveBeenCalledWith(6, expect.anything())
  })

  /**
   * Uç düşünce kutu SESSİZCE boş kalıyordu: kullanıcı ilinin sistemde
   * olmadığını sanıyordu. Sebep yazılmalı.
   */
  it('il listesi yüklenemezse sebebi yazar', async () => {
    api.getCities.mockRejectedValue(new Error('ağ'))
    renderPage()

    expect(
      await screen.findByText('İl listesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.'),
    ).toBeInTheDocument()
  })

  it('ilçe listesi yüklenemezse kutu boş açılmaz, sebebi yazar', async () => {
    api.getCityDistricts.mockRejectedValue(new Error('ağ'))
    const user = userEvent.setup()
    renderPage()

    const city = await screen.findByLabelText(/^İl \*$/)
    await waitFor(() => expect(within(city).getAllByRole('option').length).toBeGreaterThan(1))
    await user.selectOptions(city, '6')

    expect(
      await screen.findByText('İlçe listesi yüklenemedi. İli tekrar seçin.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^İlçe \*$/)).toBeDisabled()
  })

  // İl değişince eski ilçe yeni ilin listesinde bulunmayabilir; ekranda
  // geçerliymiş gibi durup sessizce yanlış kayıt üretirdi.
  it('il değişince ilçe seçimi temizlenir', async () => {
    const user = userEvent.setup()
    renderPage()

    await selectCityAndDistrict(user)
    expect(screen.getByLabelText(/^İlçe \*$/)).toHaveValue('64')

    await user.selectOptions(screen.getByLabelText(/^İl \*$/), '34')

    await waitFor(() => expect(screen.getByLabelText(/^İlçe \*$/)).toHaveValue(''))
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
      address: 'Çankaya 12. Sokak No 5',
      projectTypeCodeId: 3,
      heatingTypeCodeId: 8,
      buildingUsageTypeCodeId: 12,
      serviceBoxPressureMbar: 21,
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
