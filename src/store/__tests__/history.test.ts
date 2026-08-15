import { beforeEach, describe, expect, it } from 'vitest'

import { resetArchitectureState, WALL_ID, WINDOW_ID } from './architectureFixture'
import { createGroundFloor } from '../../core/floors'
import { redoProject, undoProject, useCadStore } from '../cadStore'
import { HISTORY_LIMIT } from '../history'

function temporal() {
  return useCadStore.temporal.getState()
}

beforeEach(() => {
  resetArchitectureState()
  // setState geçmişe yazıyor; her test sıfır adımdan başlasın.
  temporal().clear()
})

describe('geri al / yinele', () => {
  it('eklenen açıklığı geri alır ve yineler', () => {
    useCadStore.getState().addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    expect(useCadStore.getState().openings).toHaveLength(2)

    undoProject()
    expect(useCadStore.getState().openings).toHaveLength(1)

    redoProject()
    expect(useCadStore.getState().openings).toHaveLength(2)
  })

  it('taşımayı geri alır', () => {
    useCadStore.getState().moveOpening(WINDOW_ID, { wallId: WALL_ID, offsetCm: 120 })

    undoProject()

    expect(useCadStore.getState().openings[0]?.offsetCm).toBe(250)
  })

  it('adımları tek tek geri alır', () => {
    const { addOpening, removeOpening } = useCadStore.getState()
    addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    removeOpening(WINDOW_ID)
    expect(useCadStore.getState().openings).toHaveLength(1)

    undoProject()
    expect(useCadStore.getState().openings).toHaveLength(2)

    undoProject()
    expect(useCadStore.getState().openings).toHaveLength(1)
    expect(useCadStore.getState().openings[0]?.id).toBe(WINDOW_ID)
  })

  it('REDDEDİLEN action geçmişe adım yazmaz', () => {
    // K13: geçersiz taşıma reddedilir. set() yine de çalışıyor ama hiçbir şeye
    // dokunmuyor; equality kontrolü olmasa Ctrl+Z burada boşa basardı.
    expect(useCadStore.getState().moveOpening(WINDOW_ID, { wallId: WALL_ID, offsetCm: 470 })).toBe(
      false,
    )

    expect(temporal().pastStates).toHaveLength(0)
  })

  it('geri alma revision’ı da döndürür — proje yeniden temiz görünür', () => {
    useCadStore.getState().markSaved()
    useCadStore.getState().addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    expect(useCadStore.getState().revision).not.toBe(useCadStore.getState().savedRevision)

    undoProject()

    const state = useCadStore.getState()
    expect(state.revision).toBe(state.savedRevision)
  })

  it('kaydetmek geçmişe adım yazmaz', () => {
    // markSaved yalnız savedRevision'a dokunuyor: o alan izlenmiyor.
    useCadStore.getState().markSaved()

    expect(temporal().pastStates).toHaveLength(0)
  })

  it('yeni bir işlem yinele yığınını temizler', () => {
    const { addOpening } = useCadStore.getState()
    addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    undoProject()
    expect(temporal().futureStates).toHaveLength(1)

    addOpening({ wallId: WALL_ID, offsetCm: 400, widthCm: 90, type: 'door' })

    expect(temporal().futureStates).toHaveLength(0)
  })

  it('proje yüklemek geçmişi sıfırlar', () => {
    // Aksi halde Ctrl+Z kullanıcıyı ÖNCEKİ projenin çizimine götürürdü.
    useCadStore.getState().addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    expect(temporal().pastStates.length).toBeGreaterThan(0)

    useCadStore.getState().loadProject({
      nextUniqueId: 2,
      activeFloorId: 1,
      floors: [createGroundFloor()],
      points: [],
      walls: [],
      openings: [],
      rooms: [],
      symbols: [],
      areaObjects: [],
      beams: [],
      installationElements: [],
      installationLines: [],
      installationConnections: [],
    })

    expect(temporal().pastStates).toHaveLength(0)
    expect(temporal().futureStates).toHaveLength(0)
  })

  it('geçmiş sınırı aşıldığında en eski adım düşer', () => {
    const { addOpening, removeOpening } = useCadStore.getState()
    for (let step = 0; step < HISTORY_LIMIT + 10; step += 1) {
      const createdId = addOpening({
        wallId: WALL_ID,
        offsetCm: 100,
        widthCm: 90,
        type: 'door',
      })
      if (createdId !== undefined) removeOpening(createdId)
    }

    expect(temporal().pastStates).toHaveLength(HISTORY_LIMIT)
  })
})
