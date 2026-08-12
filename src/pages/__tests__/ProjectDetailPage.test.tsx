import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  asMock,
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

// KK-1: kırılım, başlık + durum çipi, künye ve sağ üstteki üç aksiyon.
describe('ekranın açılması (KK-1)', () => {
  it('kırılım, başlık, durum çipi ve künyeyi gösterir', async () => {
    renderDetail()

    const heading = await screen.findByRole('heading', { name: 'İlave' })

    const breadcrumb = screen.getByLabelText('Konum')
    expect(breadcrumb).toHaveTextContent('Anasayfa')
    expect(breadcrumb).toHaveTextContent('Projeler')
    expect(breadcrumb).toHaveTextContent('Proje Detay')

    // Durum çipi başlığın HEMEN YANINDA; aynı metin "Proje Durumu" satırında da
    // geçtiği için sorgu başlığın kabına daraltıldı.
    const titleRow = heading.parentElement as HTMLElement
    expect(within(titleRow).getByText('Onay Bekleyen')).toBeInTheDocument()

    // Künye tek paragraf: eşleşen span'dan kabına çıkılıyor.
    const identity = screen.getByText(/^Proje ID:/).closest('p') as HTMLElement
    expect(identity).toHaveTextContent('30006185')
    expect(identity).toHaveTextContent('115736')
    expect(identity).toHaveTextContent('TOROSGAZ-KÜTAHYA')
  })

  it('sağ üstte PDF İndir, Reddet ve Onayla aksiyonları görünür', async () => {
    renderDetail()

    expect(await screen.findByRole('button', { name: 'PDF İndir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reddet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Onayla' })).toBeInTheDocument()
  })

  it('proje kimliği okunamayan adreste hata gösterir', async () => {
    renderDetail('/projects/abc')

    expect(await screen.findByRole('alert')).toHaveTextContent('Proje kimliği okunamadı.')
    expect(detailApi.getProjectDetail).not.toHaveBeenCalled()
  })
})

// KK-3: sekmeler sırayla, ilk açılışta "Proje Bilgileri", tıklamada alt çizgi.
describe('sekmeler (KK-3)', () => {
  it('sekmeler belgedeki sırayla görünür ve ilk açılışta Proje Bilgileri aktiftir', async () => {
    renderDetail()

    const tablist = await screen.findByRole('tablist', { name: 'Proje detayı bölümleri' })
    const labels = within(tablist)
      .getAllByRole('tab')
      .map((tab) => tab.textContent?.replace('Yakında', '').trim())

    expect(labels).toEqual([
      'Proje Bilgileri',
      'Proje Planı',
      'Katı Model',
      'Proje İşlem Geçmişi',
      'Proje Evrakları',
      'Poliçe Bilgileri',
      'Gaz Açma',
      'Proje İşlemleri',
    ])

    expect(screen.getByRole('tab', { name: 'Proje Bilgileri' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('sekme değişince sayfa yeniden yüklenmez, yalnız bölüm değişir', async () => {
    const user = userEvent.setup()
    renderDetail()

    await screen.findByRole('tab', { name: 'Proje İşlem Geçmişi' })
    // Detay sorgusu bir kez çalıştı; sekme geçişi onu TEKRAR çağırmamalı.
    expect(detailApi.getProjectDetail).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('tab', { name: 'Proje İşlem Geçmişi' }))

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Proje İşlem Geçmişi' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
    expect(screen.getByRole('tab', { name: 'Proje Bilgileri' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(detailApi.getProjectDetail).toHaveBeenCalledTimes(1)
  })

  it('sekmeler ok tuşlarıyla gezilir', async () => {
    const user = userEvent.setup()
    renderDetail()

    const first = await screen.findByRole('tab', { name: 'Proje Bilgileri' })
    first.focus()

    await user.keyboard('{ArrowRight}')

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Proje Planı' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
  })

  // Katı Model ve Gaz Açma şeritte DURUR ama seçilemez (K50).
  it('içeriği olmayan sekmeler pasif ve "Yakında" rozetlidir', async () => {
    const user = userEvent.setup()
    renderDetail()

    const solidModel = await screen.findByRole('tab', { name: /Katı Model/ })
    expect(solidModel).toHaveAttribute('aria-disabled', 'true')
    expect(solidModel).toHaveTextContent('Yakında')

    await user.click(solidModel)

    expect(screen.getByRole('tab', { name: 'Proje Bilgileri' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
