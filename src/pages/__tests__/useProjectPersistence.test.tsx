import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID, type ProjectData } from '../../core/model'
import { selectIsProjectDirty, useCadStore } from '../../store/cadStore'
import { useProjectPersistence } from '../useProjectPersistence'

const api = vi.hoisted(() => ({
  loadLatestProjectVersion: vi.fn(),
  loadProjectVersion: vi.fn(),
  saveProjectVersion: vi.fn(),
}))

vi.mock('../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projects')>()),
  ...api,
}))

/** Uç artık çizimi KİMLİĞİYLE döndürüyor: editör hangi sürümün açık olduğunu bilir. */
function latestVersion(data: ProjectData, versionId = 100) {
  return { versionId, data }
}

/** Bir duvarı olan proje: "önceki projenin çizimi" olarak kullanılıyor. */
function projectWithWall(): ProjectData {
  return {
    nextUniqueId: 10,
    activeFloorId: DEFAULT_FLOOR_ID,
    floors: [createGroundFloor()],
    points: [
      { id: 1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
      { id: 2, floorId: DEFAULT_FLOOR_ID, x: 100, y: 0 },
    ],
    walls: [
      { id: 3, floorId: DEFAULT_FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 },
    ],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    beams: [],
    texts: [],
    installationElements: [],
    installationLines: [],
    installationConnections: [],
    floorPipeLinks: [],
  }
}

function wrapperFor(projectId: number) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
        <Routes>
          <Route path="/projects/:projectId" element={children} />
        </Routes>
      </MemoryRouter>
    )
  }
}

beforeEach(() => {
  api.loadLatestProjectVersion.mockReset()
  api.loadProjectVersion.mockReset()
  api.saveProjectVersion.mockReset()
  api.saveProjectVersion.mockResolvedValue({
    id: 1,
    projectId: 1,

    
    objectKey: 'k',
    label: null,
    createdAt: '2026-08-04T00:00:00Z',
  })
  useCadStore.getState().resetProject()
})

describe('useProjectPersistence — projeler birbirine karışmaz', () => {
  it('kaydı olmayan projeye geçince önceki projenin çizimi TEMİZLENİR', async () => {
    // 1. proje: sunucuda çizimi var, store'a yükleniyor.
    api.loadLatestProjectVersion.mockResolvedValue(latestVersion(projectWithWall()))
    const first = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(1) })
    await waitFor(() => expect(useCadStore.getState().walls).toHaveLength(1))
    first.unmount()

    // 2. proje: sunucuda HİÇ kaydı yok.
    api.loadLatestProjectVersion.mockResolvedValue(undefined)
    const second = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(2) })

    await waitFor(() => expect(second.result.current.isLoading).toBe(false))
    // Store modül düzeyinde tek örnek; temizlenmeseydi 1. projenin duvarı burada
    // durur ve ilk "Kaydet"te 2. projeye yazılırdı.
    expect(useCadStore.getState().walls).toHaveLength(0)
    expect(useCadStore.getState().points).toHaveLength(0)
  })

  it('kaydı olmayan projede kaydedilen veri BOŞ projedir, öncekinin çizimi değil', async () => {
    api.loadLatestProjectVersion.mockResolvedValue(latestVersion(projectWithWall()))
    const first = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(1) })
    await waitFor(() => expect(useCadStore.getState().walls).toHaveLength(1))
    first.unmount()

    api.loadLatestProjectVersion.mockResolvedValue(undefined)
    const second = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(2) })
    await waitFor(() => expect(second.result.current.isLoading).toBe(false))

    await act(async () => {
      await second.result.current.save()
    })

    const [projectId, data] = api.saveProjectVersion.mock.calls[0]
    expect(projectId).toBe(2)
    expect(data.walls).toHaveLength(0)
  })

  it('yükleme sürerken kaydetmeyi reddeder', async () => {
    // İstek askıda: yükleme bitmeden kaydetmek, görülmemiş çizimin üstüne yazardı.
    api.loadLatestProjectVersion.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(3) })

    await act(async () => {
      await result.current.save()
    })

    expect(api.saveProjectVersion).not.toHaveBeenCalled()
    expect(result.current.error).toContain('yükleniyor')
  })

  it('yükleme hata verdiyse kaydetmeyi reddeder', async () => {
    api.loadLatestProjectVersion.mockRejectedValue(new Error('Sunucuya ulaşılamadı.'))
    const { result } = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(4) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.save()
    })

    expect(api.saveProjectVersion).not.toHaveBeenCalled()
    expect(result.current.error).toContain('yüklenemedi')
  })

  it('kaydı olan projeyi normal şekilde kaydeder', async () => {
    api.loadLatestProjectVersion.mockResolvedValue(latestVersion(projectWithWall()))
    const { result } = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(5) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.save()
    })

    const [projectId, data] = api.saveProjectVersion.mock.calls[0]
    expect(projectId).toBe(5)
    expect(data.walls).toHaveLength(1)
  })
})

describe('useProjectPersistence — kayıt geçmişinden sürüm yükleme', () => {
  /** Boş çizim: yüklenen sürümün öncekinin ÜSTÜNE yazdığını duvar sayısı gösteriyor. */
  function emptyProjectData(): ProjectData {
    return { ...projectWithWall(), points: [], walls: [] }
  }

  it('seçilen sürüm store\'a yüklenir ve açık sürüm kimliği güncellenir', async () => {
    api.loadLatestProjectVersion.mockResolvedValue(latestVersion(projectWithWall(), 100))
    api.loadProjectVersion.mockResolvedValue(emptyProjectData())
    const { result } = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(6) })

    await waitFor(() => expect(result.current.currentVersionId).toBe(100))
    expect(useCadStore.getState().walls).toHaveLength(1)

    await act(async () => {
      await result.current.loadVersion(42)
    })

    expect(useCadStore.getState().walls).toHaveLength(0)
    expect(result.current.currentVersionId).toBe(42)
    // Yükleme bir düzenleme değil: kirli işaret sıfırlanır, uyarı çıkmaz.
    expect(selectIsProjectDirty(useCadStore.getState())).toBe(false)
  })

  it('açılış yüklemesi sürerken sürüm değiştirmeyi reddeder', async () => {
    // İki yazar yarışırdı: geç dönen açılış isteği seçilen sürümün üstüne yazardı.
    api.loadLatestProjectVersion.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(7) })

    await act(async () => {
      await result.current.loadVersion(42)
    })

    expect(api.loadProjectVersion).not.toHaveBeenCalled()
    expect(result.current.error).toContain('yükleniyor')
  })

  it('açılış yüklemesi hata verdiyse sürüm yüklemek kaydetme kilidini AÇAR', async () => {
    // Projenin sunucudaki çizimi artık biliniyor; üstüne yazma riski kalktı.
    api.loadLatestProjectVersion.mockRejectedValue(new Error('Sunucuya ulaşılamadı.'))
    api.loadProjectVersion.mockResolvedValue(emptyProjectData())
    const { result } = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(8) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.loadVersion(42)
    })
    await act(async () => {
      await result.current.save()
    })

    expect(api.saveProjectVersion).toHaveBeenCalledTimes(1)
  })

  it('kaydetme yeni sürümü açık sürüm yapar (liste bu değişimle tazeleniyor)', async () => {
    api.loadLatestProjectVersion.mockResolvedValue(latestVersion(projectWithWall(), 100))
    api.saveProjectVersion.mockResolvedValue({
      id: 101,
      projectId: 9,
      objectKey: 'k',
      label: 'Kolon hattı eklendi',
      createdAt: '2026-08-19T00:00:00Z',
    })
    const { result } = renderHook(() => useProjectPersistence(), { wrapper: wrapperFor(9) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.save('Kolon hattı eklendi')
    })

    expect(api.saveProjectVersion.mock.calls[0][2]).toBe('Kolon hattı eklendi')
    expect(result.current.currentVersionId).toBe(101)
  })
})
