import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { asMock, buildDetail, buildHistory, buildUnits, renderDetail } from './projectDetailFixture'
import type { ProjectData } from '../../core/model'

const detailApi = vi.hoisted(() => ({
  getProjectDetail: vi.fn(),
  getProjectUnits: vi.fn(),
  getProjectHistory: vi.fn(),
  getProjectDocuments: vi.fn(),
  getProjectPolicies: vi.fn(),
  requestProjectFile: vi.fn(),
}))
const projectsApi = vi.hoisted(() => ({ loadLatestProjectVersion: vi.fn() }))
const canApprove = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectDetail')>()),
  ...detailApi,
}))

vi.mock('../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projects')>()),
  ...projectsApi,
}))

vi.mock('../../ui/admin/useCanApproveProject', () => ({ useCanApproveProject: canApprove }))

/** İki katlı, dört duvarlı ve tek kapılı bir kayıt; sayfa geçişi için iki kat şart. */
function buildDrawing(): ProjectData {
  return {
    nextUniqueId: 100,
    activeFloorId: 1,
    floors: [
      { id: 1, name: 'Zemin Kat', heightCm: 300, isBasement: false },
      { id: 2, name: '1. Kat', heightCm: 300, isBasement: false },
    ],
    points: [
      { id: 10, floorId: 1, x: 0, y: 0 },
      { id: 11, floorId: 1, x: 400, y: 0 },
      { id: 12, floorId: 1, x: 400, y: 300 },
      { id: 13, floorId: 1, x: 0, y: 300 },
    ],
    walls: [
      { id: 20, floorId: 1, p1Id: 10, p2Id: 11, thickness: 20, height: 280 },
      { id: 21, floorId: 1, p1Id: 11, p2Id: 12, thickness: 20, height: 280 },
      { id: 22, floorId: 1, p1Id: 12, p2Id: 13, thickness: 20, height: 280 },
      { id: 23, floorId: 1, p1Id: 13, p2Id: 10, thickness: 20, height: 280 },
    ],
    openings: [{ id: 30, wallId: 20, offsetCm: 200, widthCm: 90, type: 'door' }],
    rooms: [],
    symbols: [],
    areaObjects: [],
  }
}

beforeEach(() => {
  detailApi.getProjectDetail.mockResolvedValue(buildDetail())
  detailApi.getProjectUnits.mockResolvedValue(asMock(buildUnits()))
  detailApi.getProjectHistory.mockResolvedValue(asMock(buildHistory()))
  detailApi.getProjectDocuments.mockResolvedValue(asMock([]))
  detailApi.getProjectPolicies.mockResolvedValue(asMock([]))
  detailApi.requestProjectFile.mockResolvedValue({ ok: false, reason: 'unimplemented' })
  projectsApi.loadLatestProjectVersion.mockResolvedValue(buildDrawing())
  canApprove.mockReturnValue(true)
})

afterEach(() => {
  vi.clearAllMocks()
})

async function openPlanTab() {
  const user = userEvent.setup()
  renderDetail()
  await user.click(await screen.findByRole('tab', { name: 'Proje Planı' }))
  return user
}

// KK-7: görüntüleyici açılır, yakınlaştırma/tam ekran çalışır, sayfa geçişi var.
describe('proje planı (KK-7)', () => {
  it('gerçek çizimden plan görüntüleyicisi açılır', async () => {
    await openPlanTab()

    expect(await screen.findByRole('img', { name: 'Zemin Kat kat planı' })).toBeInTheDocument()
    expect(projectsApi.loadLatestProjectVersion).toHaveBeenCalledWith(42, expect.anything())
  })

  it('yakınlaştırma oranı yüzde olarak görünür ve düğmelerle değişir', async () => {
    const user = await openPlanTab()

    expect(await screen.findByText('100%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Yakınlaştır' }))
    expect(screen.getByText('125%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Uzaklaştır' }))
    await user.click(screen.getByRole('button', { name: 'Uzaklaştır' }))
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('yakınlaştırma çizimin kadrajını daraltır', async () => {
    const user = await openPlanTab()

    const svg = await screen.findByRole('img', { name: 'Zemin Kat kat planı' })
    const initial = svg.getAttribute('viewBox')

    await user.click(screen.getByRole('button', { name: 'Yakınlaştır' }))

    expect(svg.getAttribute('viewBox')).not.toBe(initial)
  })

  it('tam ekran düğmesi görüntüleyiciyi tam ekrana alır', async () => {
    const requestFullscreen = vi.fn()
    // jsdom Fullscreen API'sini uygulamıyor; düğmenin doğru öğeyi çağırdığını
    // görmek için yalnız bu yöntem takılıyor.
    Element.prototype.requestFullscreen = requestFullscreen

    const user = await openPlanTab()
    await screen.findByRole('img', { name: 'Zemin Kat kat planı' })

    await user.click(screen.getByRole('button', { name: 'Tam ekran' }))

    expect(requestFullscreen).toHaveBeenCalled()
  })

  it('çok katlı projede sayfa bilgisi görünür ve sayfalar arasında geçilir', async () => {
    const user = await openPlanTab()

    expect(await screen.findByText('Sayfa 1 / 2 — Zemin Kat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Önceki sayfa' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Sonraki sayfa' }))

    expect(await screen.findByText('Sayfa 2 / 2 — 1. Kat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sonraki sayfa' })).toBeDisabled()
  })

  it('Planı İndir (DWG) dosyayı ister ve eksik ucu söyler', async () => {
    const user = await openPlanTab()

    await user.click(await screen.findByRole('button', { name: /Planı İndir \(DWG\)/ }))

    expect(detailApi.requestProjectFile).toHaveBeenCalledWith('planDwg')
    expect(await screen.findByRole('alert')).toHaveTextContent(/DWG olarak üreten uç/)
  })

  it('kayıtlı çizimi olmayan projede bilgilendirme gösterir', async () => {
    projectsApi.loadLatestProjectVersion.mockResolvedValue(undefined)

    await openPlanTab()

    expect(await screen.findByText(/Bu projenin kayıtlı bir çizimi yok/)).toBeInTheDocument()
  })

  it('görüntüleyicinin yalnız mimari katmanı çizdiğini söyler', async () => {
    await openPlanTab()

    expect(
      await screen.findByText(/şimdilik yalnız mimari katmanı/),
    ).toBeInTheDocument()
  })
})
