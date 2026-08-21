import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Lookup } from '../../../../api/projects'
import { ProjectFilterBar } from '../ProjectFilterBar'
import type { ProjectFilters } from '../useProjectListParams'

const api = vi.hoisted(() => ({ getCities: vi.fn(), getCityDistricts: vi.fn() }))

vi.mock('../../../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../api/projects')>()),
  ...api,
}))

const CITIES: Lookup[] = [
  { id: 6, name: 'Ankara' },
  { id: 34, name: 'İstanbul' },
]
const DISTRICTS: Lookup[] = [
  { id: 1, name: 'Çankaya' },
  { id: 2, name: 'Keçiören' },
]
const PROJECT_FIRMS: Lookup[] = [{ id: 11, name: 'Anadolu Mühendislik Ltd. Şti.' }]

const APPLIED_FILTERS: ProjectFilters = {
  dateFrom: '2026-06-01',
  dateTo: '2026-07-01',
  cityId: null,
  districtId: null,
  projectFirmId: null,
  search: '',
}

function renderBar(
  onApply: (filters: ProjectFilters) => void,
  { haveProjectFirmsFailed = false, isManagementView = true } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={client}>
      <ProjectFilterBar
        filters={APPLIED_FILTERS}
        projectFirms={PROJECT_FIRMS}
        haveProjectFirmsFailed={haveProjectFirmsFailed}
        isManagementView={isManagementView}
        onApply={onApply}
      />
    </QueryClientProvider>,
  )
}

/** İl seçenekleri sunucudan geliyor; seçim ancak liste basılınca yapılabilir. */
async function selectCity(user: ReturnType<typeof userEvent.setup>, cityId: string) {
  const city = screen.getByLabelText('İl')
  await waitFor(() => expect(city).toHaveDisplayValue('Tümü'))
  await screen.findByRole('option', { name: 'Ankara' })
  await user.selectOptions(city, cityId)
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getCities.mockResolvedValue(CITIES)
  api.getCityDistricts.mockResolvedValue(DISTRICTS)
})

describe('ProjectFilterBar', () => {
  it('yazarken istek atmaz, yalnız Filtrele ile uygular', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    renderBar(onApply)

    await user.type(screen.getByPlaceholderText('Proje Ara...'), 'yıldız')
    await selectCity(user, '6')
    await waitFor(() => expect(screen.getByLabelText('İlçe')).not.toBeDisabled())
    await user.selectOptions(screen.getByLabelText('İlçe'), '2')
    expect(onApply).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Filtrele' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith({
      dateFrom: '2026-06-01',
      dateTo: '2026-07-01',
      cityId: 6,
      districtId: 2,
      projectFirmId: null,
      search: 'yıldız',
    })
  })

  /** İlçe ucu il kimliği istiyor: il seçilmeden istek ATILMAMALI. */
  it('il seçilmeden ilçe kutusu pasif ve istek gitmez', async () => {
    renderBar(vi.fn())

    expect(screen.getByLabelText('İlçe')).toBeDisabled()
    expect(api.getCityDistricts).not.toHaveBeenCalled()
  })

  it('il seçilince o ilin ilçeleri çekilir', async () => {
    const user = userEvent.setup()
    renderBar(vi.fn())

    await selectCity(user, '6')

    await waitFor(() => expect(api.getCityDistricts).toHaveBeenCalledWith(6, expect.anything()))
    expect(await screen.findByRole('option', { name: 'Keçiören' })).toBeInTheDocument()
  })

  // Eski ilçe yeni ilin listesinde bulunmayabilir; seçili kalsaydı kullanıcı
  // ilçesi başka bir ile ait olan bir süzgeçle liste açardı.
  it('il değişince seçili ilçe temizlenir', async () => {
    const user = userEvent.setup()
    renderBar(vi.fn())

    await selectCity(user, '6')
    await waitFor(() => expect(screen.getByLabelText('İlçe')).not.toBeDisabled())
    await user.selectOptions(screen.getByLabelText('İlçe'), '2')
    expect(screen.getByLabelText('İlçe')).toHaveValue('2')

    await user.selectOptions(screen.getByLabelText('İl'), '34')

    await waitFor(() => expect(screen.getByLabelText('İlçe')).toHaveValue(''))
  })

  /** Kutu boş açılıp "sistemde firma yok" sanısı vermemeli; sebep yazılır. */
  it('firma listesi yüklenemezse kutu pasif ve sebebi görünür', () => {
    renderBar(vi.fn(), { haveProjectFirmsFailed: true })

    expect(screen.getByLabelText('Proje Firması')).toBeDisabled()
    expect(screen.getByText('Firma listesi yüklenemedi.')).toBeInTheDocument()
  })

  it('arama alanında Enter da uygular', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    renderBar(onApply)

    await user.type(screen.getByPlaceholderText('Proje Ara...'), 'gül{Enter}')

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ search: 'gül' }))
  })

  it('tarih alanları birbirini sınırlar', async () => {
    const user = userEvent.setup()
    renderBar(vi.fn())

    const startInput = screen.getByLabelText('Başlangıç tarihi')
    expect(startInput).toHaveAttribute('max', '2026-07-01')

    await user.clear(startInput)
    await user.type(startInput, '2026-06-15')

    expect(screen.getByLabelText('Bitiş tarihi')).toHaveAttribute('min', '2026-06-15')
  })
})

/**
 * Proje firması kullanıcısının listesi zaten tek firmaya ait; süzgeç ona
 * seçebileceği tek satırı gösterirdi.
 */
it('yönetim görünümü dışında Proje Firması süzgecini çizmez', () => {
  renderBar(vi.fn(), { isManagementView: false })

  expect(screen.queryByLabelText('Proje Firması')).not.toBeInTheDocument()
  // Diğer süzgeçler yerinde: gizlenen YALNIZ firma kutusu.
  expect(screen.getByLabelText('İl')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Proje Ara...')).toBeInTheDocument()
})
