import { beforeEach, describe, expect, it } from 'vitest'

import type { ProjectData } from '../../core/model'
import { selectIsProjectDirty, selectProjectData, useCadStore } from '../cadStore'

function makeFileData(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    ...selectProjectData(useCadStore.getState()),
    nextUniqueId: 500,
    floors: [
      { id: 300, name: 'Bodrum', heightCm: 260, isBasement: true },
      { id: 301, name: 'Zemin Kat', heightCm: 300, isBasement: false },
    ],
    activeFloorId: 301,
    points: [
      { id: 310, floorId: 301, x: 0, y: 0 },
      { id: 311, floorId: 301, x: 400, y: 0 },
    ],
    walls: [{ id: 312, floorId: 301, p1Id: 310, p2Id: 311, thickness: 20, height: 280 }],
    ...overrides,
  }
}

describe('loadProjectDrawing', () => {
  beforeEach(() => {
    useCadStore.getState().resetProject()
  })

  it('çizimi ve KAT YAPISINI dosyadan yükler', () => {
    useCadStore.getState().loadProjectDrawing(makeFileData())
    const state = useCadStore.getState()

    expect(state.walls).toHaveLength(1)
    expect(state.floors.map((floor) => floor.name)).toEqual(['Bodrum', 'Zemin Kat'])
    expect(state.activeFloorId).toBe(301)
  })

  it('GERİ ALINABİLİR: Ctrl+Z önceki çizime döndürür', () => {
    // `loadProject` geçmişi siliyor (başka projeye geçiş); dosya açmak ise bir
    // düzenleme, tek adımda geri alınmalı.
    useCadStore.getState().addFloor()
    const floorsBefore = useCadStore.getState().floors.length

    useCadStore.getState().loadProjectDrawing(makeFileData())
    expect(useCadStore.getState().walls).toHaveLength(1)

    useCadStore.temporal.getState().undo()

    expect(useCadStore.getState().walls).toHaveLength(0)
    expect(useCadStore.getState().floors).toHaveLength(floorsBefore)
  })

  it('KİRLİ işaret bırakır: açılan çizim kaydedilmemiş bir değişikliktir', () => {
    expect(selectIsProjectDirty(useCadStore.getState())).toBe(false)

    useCadStore.getState().loadProjectDrawing(makeFileData())

    expect(selectIsProjectDirty(useCadStore.getState())).toBe(true)
  })

  it('id sayacını GERİYE çekmez', () => {
    // Geri alma açılan çizimi kaldırıp eski nesneleri geri getiriyor; küçülen
    // bir sayaç var olan bir id'yi ikinci kez üretirdi.
    useCadStore.setState({ nextUniqueId: 900 })

    useCadStore.getState().loadProjectDrawing(makeFileData({ nextUniqueId: 500 }))

    expect(useCadStore.getState().nextUniqueId).toBe(900)
  })

  it('dosyanın sayacı daha ileriyse ONU alır', () => {
    useCadStore.setState({ nextUniqueId: 10 })

    useCadStore.getState().loadProjectDrawing(makeFileData({ nextUniqueId: 500 }))

    expect(useCadStore.getState().nextUniqueId).toBe(500)
  })

  it('PROJE KÜNYESİ store"da hiç durmuyor: dosya onu ezemez', () => {
    // Proje adı, numarası, taraflar ve tarihler uçtan geliyor
    // (pages/useProjectSummary.ts). Buraya bir kimlik alanı eklenirse başkasının
    // dosyasını açmak açık projenin künyesini ezer — bu test onu yakalar.
    const drawingFields = Object.keys(selectProjectData(useCadStore.getState()))

    expect(drawingFields).toEqual([
      'nextUniqueId',
      'activeFloorId',
      'floors',
      'points',
      'walls',
      'openings',
      'rooms',
      'symbols',
      'areaObjects',
      'beams',
      'texts',
      'installationElements',
      'installationLines',
      'installationConnections',
      'floorPipeLinks',
      'isometricAngles',
    ])
  })

  it('izometrik AÇIYA dokunmaz: o çizim verisi değil, bakış ayarı', () => {
    // Dosya açmak "yalnız çizim ve kat yapısı" yüklüyor. Açı `ProjectData`da
    // taşınıyor ama `PersistedContent`e girmiyor (core/model.ts) — kullanıcının
    // o an baktığı yön, dosyadan gelen bir içerik değil.
    useCadStore.getState().setIsometricAngles({ alphaDeg: 12, betaDeg: 34 })

    useCadStore
      .getState()
      .loadProjectDrawing(makeFileData({ isometricAngles: { alphaDeg: 60, betaDeg: 70 } }))

    expect(useCadStore.getState().isometricAngles).toEqual({ alphaDeg: 12, betaDeg: 34 })
  })
})
