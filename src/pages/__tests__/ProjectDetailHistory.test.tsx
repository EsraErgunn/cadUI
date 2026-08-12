import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  asMock,
  asUnavailable,
  buildDetail,
  buildHistory,
  buildUnits,
  renderDetail,
} from './projectDetailFixture'

const detailApi = vi.hoisted(() => ({
  getProjectDetail: vi.fn(),
  getProjectUnits: vi.fn(),
  getProjectHistory: vi.fn(),
  getProjectDocuments: vi.fn(),
  getProjectPolicies: vi.fn(),
}))
const canApprove = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectDetail')>()),
  ...detailApi,
}))

vi.mock('../../ui/admin/useCanApproveProject', () => ({ useCanApproveProject: canApprove }))

beforeEach(() => {
  detailApi.getProjectDetail.mockResolvedValue(buildDetail())
  detailApi.getProjectUnits.mockResolvedValue(asMock(buildUnits()))
  detailApi.getProjectHistory.mockResolvedValue(asMock(buildHistory()))
  detailApi.getProjectDocuments.mockResolvedValue(asMock([]))
  detailApi.getProjectPolicies.mockResolvedValue(asMock([]))
  canApprove.mockReturnValue(true)
})

afterEach(() => {
  vi.clearAllMocks()
})

async function openHistoryTab() {
  const user = userEvent.setup()
  renderDetail()
  await user.click(await screen.findByRole('tab', { name: 'Proje İşlem Geçmişi' }))
  return screen.findByRole('table', { name: /Proje işlem geçmişi/ })
}

// KK-8: altı sütun, en yeniden eskiye, rozet renkleri, düzenleme/silme yok.
describe('proje işlem geçmişi (KK-8)', () => {
  it('altı sütunla listelenir', async () => {
    const table = await openHistoryTab()

    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)

    expect(headers).toEqual(['Dosya', 'Tarih', 'İşlem Yapan', 'Yetki', 'İşlem', 'Açıklama'])
  })

  it('kayıtlar en yeniden eskiye sıralıdır', async () => {
    const table = await openHistoryTab()

    const rows = within(table).getAllByRole('row').slice(1)

    // Veri bilerek eski-önce geliyor; sıralamayı ekran yapıyor.
    expect(rows[0]).toHaveTextContent('Proje Güncelleme')
    expect(rows[1]).toHaveTextContent('Proje Kayıt')
  })

  it('PDF rozeti kırmızı, ZPD rozeti mavi tonda', async () => {
    const table = await openHistoryTab()

    expect(within(table).getByText('PDF')).toHaveClass('border-danger')
    expect(within(table).getByText('ZPD')).toHaveClass('border-selection')
  })

  it('Proje Kayıt yeşil, Proje Güncelleme amber tonda', async () => {
    const table = await openHistoryTab()

    expect(within(table).getByText('Proje Kayıt')).toHaveClass('border-success')
    expect(within(table).getByText('Proje Güncelleme')).toHaveClass('border-warning')
  })

  it('yetki sütunu işlemi yapan kaynağı gösterir', async () => {
    const table = await openHistoryTab()

    expect(within(table).getAllByText('Zetacad USER')).toHaveLength(2)
  })

  it('kayıtlar düzenlenemez ve silinemez', async () => {
    const table = await openHistoryTab()

    expect(within(table).queryByRole('button', { name: /Sil/ })).not.toBeInTheDocument()
    expect(within(table).queryByRole('button', { name: /Düzenle/ })).not.toBeInTheDocument()
    expect(within(table).queryAllByRole('button')).toHaveLength(0)
  })

  it('kaynağı olmayan ortamda eksiklik kutusu gösterir', async () => {
    detailApi.getProjectHistory.mockResolvedValue(asUnavailable())

    const user = userEvent.setup()
    renderDetail()
    await user.click(await screen.findByRole('tab', { name: 'Proje İşlem Geçmişi' }))

    expect(await screen.findByText('Bu bölümün veri kaynağı henüz yok.')).toBeInTheDocument()
  })
})
