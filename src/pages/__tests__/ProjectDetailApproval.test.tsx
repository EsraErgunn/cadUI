import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  asMock,
  buildDetail,
  buildExtras,
  buildHistory,
  buildUnits,
  renderDetail,
} from './projectDetailFixture'
import type { ProjectDetailExtras } from '../../api/projectDetail'

const detailApi = vi.hoisted(() => ({
  getProjectDetail: vi.fn(),
  getProjectUnits: vi.fn(),
  getProjectHistory: vi.fn(),
  getProjectDocuments: vi.fn(),
  getProjectPolicies: vi.fn(),
  submitProjectDecision: vi.fn(),
  requestProjectFile: vi.fn(),
}))
const canApprove = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectDetail')>()),
  ...detailApi,
}))

vi.mock('../../ui/admin/useCanApproveProject', () => ({ useCanApproveProject: canApprove }))

function extrasWithStatus(status: ProjectDetailExtras['general']['status']) {
  const extras = buildExtras()
  return { ...extras, general: { ...extras.general, status } }
}

beforeEach(() => {
  detailApi.getProjectDetail.mockResolvedValue(buildDetail())
  detailApi.getProjectUnits.mockResolvedValue(asMock(buildUnits()))
  detailApi.getProjectHistory.mockResolvedValue(asMock(buildHistory()))
  detailApi.getProjectDocuments.mockResolvedValue(asMock([]))
  detailApi.getProjectPolicies.mockResolvedValue(asMock([]))
  detailApi.requestProjectFile.mockResolvedValue({ ok: false, reason: 'unimplemented' })
  detailApi.submitProjectDecision.mockResolvedValue({
    ok: true,
    status: 'onaylanan',
    approvalCode: 'ONY-42',
    isPersisted: false,
  })
  canApprove.mockReturnValue(true)
})

afterEach(() => {
  vi.clearAllMocks()
})

// KK-2: yalnız yetkiliye görünür, taslakta pasif.
describe('onay aksiyonlarının görünürlüğü (KK-2)', () => {
  it('yetkisi olmayan kullanıcıya Onayla ve Reddet gösterilmez', async () => {
    canApprove.mockReturnValue(false)
    renderDetail()

    // PDF İndir herkese açık; onay/ret hiç render edilmiyor.
    expect(await screen.findByRole('button', { name: 'PDF İndir' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Onayla' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reddet' })).not.toBeInTheDocument()
  })

  it('Taslak durumunda onay ve ret aksiyonları pasiftir', async () => {
    detailApi.getProjectDetail.mockResolvedValue(
      buildDetail({ extras: extrasWithStatus('taslak') }),
    )

    renderDetail()

    expect(await screen.findByRole('button', { name: 'Onayla' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reddet' })).toBeDisabled()
  })

  it('gönderilmiş projede onay ve ret aksiyonları etkindir', async () => {
    renderDetail()

    expect(await screen.findByRole('button', { name: 'Onayla' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reddet' })).toBeEnabled()
  })
})

// KK-10: kısayol kartları, yetkisiz işlem listelenmez, gerekçe zorunlu.
describe('proje işlemleri ve gerekçe (KK-10)', () => {
  async function openOperationsTab() {
    const user = userEvent.setup()
    renderDetail()
    await user.click(await screen.findByRole('tab', { name: 'Proje İşlemleri' }))
    return user
  }

  it('işlemler kısayol kartları hâlinde görünür', async () => {
    await openOperationsTab()

    const section = await screen.findByRole('region', { name: 'Proje İşlemleri' })
    expect(within(section).getByRole('button', { name: 'Projeyi Onayla' })).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'Revizyon İste' })).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'Projeyi Reddet' })).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'PDF Rapor Al' })).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Evrak Ekle' })).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Poliçelendir' })).toBeInTheDocument()
  })

  it('yetkisi olmayan kullanıcıya karar işlemleri listelenmez', async () => {
    canApprove.mockReturnValue(false)
    await openOperationsTab()

    const section = await screen.findByRole('region', { name: 'Proje İşlemleri' })
    expect(within(section).queryByRole('button', { name: 'Projeyi Onayla' })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: 'Revizyon İste' })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: 'Projeyi Reddet' })).not.toBeInTheDocument()
    // Yetki gerektirmeyen kısayollar duruyor.
    expect(within(section).getByRole('button', { name: 'PDF Rapor Al' })).toBeInTheDocument()
  })

  it('gerekçe girilmeden reddetme tamamlanmaz', async () => {
    const user = await openOperationsTab()

    await user.click(await screen.findByRole('button', { name: 'Projeyi Reddet' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Reddet' }))

    expect(await screen.findByText('Gerekçe zorunludur.')).toBeInTheDocument()
    expect(detailApi.submitProjectDecision).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('yalnız boşluktan oluşan gerekçe kabul edilmez', async () => {
    const user = await openOperationsTab()

    await user.click(await screen.findByRole('button', { name: 'Revizyon İste' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Gerekçe'), '   ')
    await user.click(within(dialog).getByRole('button', { name: 'Revizyon İste' }))

    expect(await screen.findByText('Gerekçe zorunludur.')).toBeInTheDocument()
    expect(detailApi.submitProjectDecision).not.toHaveBeenCalled()
  })

  it('gerekçe girilince işlem tamamlanır', async () => {
    detailApi.submitProjectDecision.mockResolvedValue({
      ok: true,
      status: 'revizyonIstendi',
      approvalCode: null,
      isPersisted: false,
    })

    const user = await openOperationsTab()

    await user.click(await screen.findByRole('button', { name: 'Revizyon İste' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Gerekçe'), 'Kolon çapı yanlış.')
    await user.click(within(dialog).getByRole('button', { name: 'Revizyon İste' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(detailApi.submitProjectDecision).toHaveBeenCalledWith(42, 'requestRevision')
  })
})

// KK-11: onay kodu üretilir, durum güncellenir, geçmişe kayıt düşer.
describe('işlem sonrası (KK-11)', () => {
  it('onay sonrası onay kodu üretilir ve durum Onaylandı olur', async () => {
    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Onayla' }))

    // Onay gerekçe İSTEMEZ: diyalog açılmadan tamamlanır.
    expect(await screen.findByText(/Proje onaylandı\./)).toBeInTheDocument()
    expect(screen.getByText(/Onay kodu: ONY-42/)).toBeInTheDocument()

    const heading = screen.getByRole('heading', { name: 'İlave' })
    await waitFor(() =>
      expect(within(heading.parentElement as HTMLElement).getByText('Onaylanan')).toBeInTheDocument(),
    )
  })

  it('sunucuya yazılmadığı uyarısı gösterilir', async () => {
    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Onayla' }))

    expect(
      await screen.findByText(/Sonuç yalnız bu ekranda görünür; sunucuya kaydedilmedi\./),
    ).toBeInTheDocument()
  })

  it('karar sonrası işlem geçmişine yeni kayıt eklenir ve gerekçe açıklamada görünür', async () => {
    detailApi.submitProjectDecision.mockResolvedValue({
      ok: true,
      status: 'reddedilen',
      approvalCode: null,
      isPersisted: false,
    })

    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Reddet' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Gerekçe'), 'Baca tipi uygun değil.')
    await user.click(within(dialog).getByRole('button', { name: 'Reddet' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('tab', { name: 'Proje İşlem Geçmişi' }))

    const table = await screen.findByRole('table', { name: /Proje işlem geçmişi/ })
    const rows = within(table).getAllByRole('row').slice(1)

    // Yeni kayıt en üstte (en yeniden eskiye) ve gerekçeyi taşıyor.
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Proje Ret')
    expect(rows[0]).toHaveTextContent('Baca tipi uygun değil.')
  })

  it('uç olmayan ortamda işlem yapılmadığı söylenir', async () => {
    detailApi.submitProjectDecision.mockResolvedValue({ ok: false, reason: 'unimplemented' })

    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Onayla' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'İşlem yapılamadı: onay/ret/revizyon ucu sunucuda henüz yok.',
    )
  })
})
