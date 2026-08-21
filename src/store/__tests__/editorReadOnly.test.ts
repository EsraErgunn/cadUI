import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID, type ProjectData } from '../../core/model'
import { useCadStore } from '../cadStore'
import { useUiStore } from '../uiStore'

/**
 * Merkezî salt görüntüleme kapısı (`guardReadOnlyActions`).
 *
 * Testler ARAYÜZDEN geçmiyor: action doğrudan çağrılıyor. Amaç tam olarak bu —
 * "düğme görünmüyor" seviyesindeki bir güvence, sahneden ya da klavyeden gelen
 * bir yolu kaçırdığımızda sessizce yanılırdı.
 */
function buildProject(): ProjectData {
  return {
    nextUniqueId: 100,
    floors: [createGroundFloor()],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
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

function setReadOnly(isReadOnly: boolean): void {
  useUiStore.getState().setEditorReadOnly(isReadOnly)
}

beforeEach(() => {
  setReadOnly(false)
  useCadStore.getState().loadProject(buildProject())
})

describe('cadStore salt görüntüleme kapısı', () => {
  it('kip kapalıyken çizim mutasyonu normal çalışır', () => {
    const added = useCadStore.getState().addFloor({})

    expect(added).toBeDefined()
    expect(useCadStore.getState().floors).toHaveLength(2)
  })

  /** ASIL SINAV: action DOĞRUDAN çağrılıyor, hiçbir arayüz katmanı yok. */
  it('kip açıkken çizim mutasyonu durumu değiştirmez', () => {
    setReadOnly(true)

    useCadStore.getState().addFloor({})

    expect(useCadStore.getState().floors).toHaveLength(1)
  })

  it('kip açıkken "Projeyi Temizle" çizimi boşaltmaz', () => {
    setReadOnly(false)
    const added = useCadStore.getState().addWall({
      start: { position: { x: 0, y: 0 } },
      end: { position: { x: 200, y: 0 } },
    })
    expect(added).toBeDefined()
    const wallCount = useCadStore.getState().walls.length
    expect(wallCount).toBeGreaterThan(0)

    setReadOnly(true)
    useCadStore.getState().clearProjectDrawing()

    expect(useCadStore.getState().walls).toHaveLength(wallCount)
  })

  it('kip açıkken silme ve geri alma durumu değiştirmez', () => {
    setReadOnly(false)
    useCadStore.getState().addWall({
      start: { position: { x: 0, y: 0 } },
      end: { position: { x: 200, y: 0 } },
    })
    const before = useCadStore.getState().walls.length

    setReadOnly(true)
    useCadStore.getState().deleteSelection([])
    useCadStore.getState().undoPlumbing()
    useCadStore.getState().redoPlumbing()

    expect(useCadStore.getState().walls).toHaveLength(before)
  })

  /**
   * Beyaz liste. Bu ikisi engellenirse salt görüntüleyen kullanıcı çizimi
   * göremez ya da ilk kattan başka kata geçemez — yani kapı, korumaya
   * çalıştığı ekranı bozar.
   */
  it('kip açıkken loadProject çalışmaya devam eder', () => {
    setReadOnly(true)

    useCadStore.getState().loadProject({ ...buildProject(), nextUniqueId: 555 })

    expect(useCadStore.getState().nextUniqueId).toBe(555)
  })

  it('kip açıkken setActiveFloor çalışmaya devam eder', () => {
    setReadOnly(false)
    const secondFloorId = useCadStore.getState().addFloor({})
    expect(secondFloorId).toBeDefined()

    setReadOnly(true)
    useCadStore.getState().setActiveFloor(secondFloorId ?? DEFAULT_FLOOR_ID)

    expect(useCadStore.getState().activeFloorId).toBe(secondFloorId)
  })

  it('kip açıkken izometrik bakış açısı değiştirilebilir', () => {
    setReadOnly(true)

    useCadStore.getState().setIsometricAngles({ alphaDeg: 30, betaDeg: 45 })

    expect(useCadStore.getState().isometricAngles).toEqual({ alphaDeg: 30, betaDeg: 45 })
  })

  it('kip açıkken markSaved kirli işaretini tazeleyebilir', () => {
    setReadOnly(true)

    expect(() => useCadStore.getState().markSaved()).not.toThrow()
  })

  it('kip kapatılınca mutasyonlar yeniden çalışır', () => {
    setReadOnly(true)
    useCadStore.getState().addFloor({})
    expect(useCadStore.getState().floors).toHaveLength(1)

    setReadOnly(false)
    useCadStore.getState().addFloor({})

    expect(useCadStore.getState().floors).toHaveLength(2)
  })
})
