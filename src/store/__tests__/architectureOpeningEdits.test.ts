import { beforeEach, describe, expect, it } from 'vitest'

import { MOCK_NEXT_FREE_ID, MOCK_OPENINGS, MOCK_POINTS, MOCK_WALLS } from '../architectureMock'
import {
  selectOccupiedRanges,
  selectOpeningById,
  selectOpeningsOnWall,
  selectPlacementRange,
  selectPointById,
  selectWallById,
  selectWallsAtPoint,
  selectWallsOnFloor,
} from '../architectureSlice'
import { resetArchitectureState, WALL_ID, WINDOW_ID } from './architectureTestState'
import { useCadStore } from '../cadStore'

beforeEach(resetArchitectureState)

describe('setOpeningWidth', () => {
  it('sığan genişliği uygular', () => {
    expect(useCadStore.getState().setOpeningWidth(WINDOW_ID, 200)).toBe(true)
    expect(selectOpeningById(useCadStore.getState(), WINDOW_ID)?.widthCm).toBe(200)
    expect(useCadStore.getState().revision).toBe(1)
  })

  it('aralığı taşıran genişlemeyi reddeder', () => {
    // 250 ortalı 600 cm genişlik [-50, 550] olur, aralık [25, 470].
    expect(useCadStore.getState().setOpeningWidth(WINDOW_ID, 600)).toBe(false)
    expect(selectOpeningById(useCadStore.getState(), WINDOW_ID)?.widthCm).toBe(120)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('komşuya binen genişlemeyi reddeder', () => {
    useCadStore.getState().addOpening({
      wallId: WALL_ID,
      offsetCm: 80,
      widthCm: 90,
      type: 'door',
    })

    // Pencere 260 genişlerse [120, 380] olur: aralığa ([25, 470]) sığar ama
    // kapının [35, 125] ucuna 5 cm biner — reddin nedeni sığma değil çakışma.
    expect(useCadStore.getState().setOpeningWidth(WINDOW_ID, 260)).toBe(false)
    expect(selectOpeningById(useCadStore.getState(), WINDOW_ID)?.widthCm).toBe(120)
  })

  it('asgari genişliğin altını reddeder', () => {
    expect(useCadStore.getState().setOpeningWidth(WINDOW_ID, 5)).toBe(false)
    expect(selectOpeningById(useCadStore.getState(), WINDOW_ID)?.widthCm).toBe(120)
  })
})

describe('removeOpening', () => {
  it('açıklığı siler, id sayacını geri almaz', () => {
    useCadStore.getState().removeOpening(WINDOW_ID)
    const state = useCadStore.getState()

    expect(state.openings).toEqual([])
    expect(state.revision).toBe(1)
    // id bir kez üretilir, ASLA yeniden kullanılmaz (knowledge/id-scheme.md).
    expect(state.nextUniqueId).toBe(MOCK_NEXT_FREE_ID)
  })

  it('olmayan açıklıkta projeyi kirletmez', () => {
    useCadStore.getState().removeOpening(404)
    expect(useCadStore.getState().revision).toBe(0)
  })
})

describe('pruneOpeningsOnWalls', () => {
  it('duvarı silinen açıklığı temizler', () => {
    useCadStore.setState({ walls: MOCK_WALLS.filter((wall) => wall.id !== WALL_ID) })
    useCadStore.getState().pruneOpeningsOnWalls()

    expect(useCadStore.getState().openings).toEqual([])
    expect(useCadStore.getState().revision).toBe(1)
  })

  it('duvar kısalıp açıklık sığmayınca temizler', () => {
    useCadStore.setState({
      points: MOCK_POINTS.map((point) => (point.id === 3 ? { ...point, x: 300 } : point)),
    })
    useCadStore.getState().pruneOpeningsOnWalls()

    expect(useCadStore.getState().openings).toEqual([])
  })

  it('silinecek bir şey yoksa projeyi kirletmez', () => {
    useCadStore.getState().pruneOpeningsOnWalls()

    expect(useCadStore.getState().openings).toEqual(MOCK_OPENINGS)
    // A'nın duvar sürüklemesi her karede revision'ı artırmasın.
    expect(useCadStore.getState().revision).toBe(0)
  })
})

describe('A↔B selectorları', () => {
  it('duvarı ve noktayı id ile çözer', () => {
    const state = useCadStore.getState()

    expect(selectWallById(state, WALL_ID)?.thickness).toBe(20)
    expect(selectWallById(state, 404)).toBeUndefined()
    expect(selectPointById(state, 3)).toEqual({ id: 3, floorId: 1, x: 500, y: 0 })
    expect(selectPointById(state, 404)).toBeUndefined()
  })

  it('kattaki duvarları verir', () => {
    expect(selectWallsOnFloor(useCadStore.getState(), 1)).toHaveLength(4)
    expect(selectWallsOnFloor(useCadStore.getState(), 2)).toEqual([])
  })

  it('köşede birleşen duvarları verir', () => {
    expect(selectWallsAtPoint(useCadStore.getState(), 3).map((wall) => wall.id)).toEqual([8, 9])
  })

  it('köşe payı dahil yerleştirme aralığını verir', () => {
    expect(selectPlacementRange(useCadStore.getState(), WALL_ID)).toEqual({
      minOffsetCm: 25,
      maxOffsetCm: 470,
    })
    expect(selectPlacementRange(useCadStore.getState(), 404)).toBeUndefined()
  })

  it('duvardaki açıklıkları verir', () => {
    expect(selectOpeningsOnWall(useCadStore.getState(), WALL_ID)).toEqual(MOCK_OPENINGS)
    expect(selectOpeningsOnWall(useCadStore.getState(), 9)).toEqual([])
  })

  it('B→A sözleşmesi: dolu aralıkları artan sırada verir', () => {
    useCadStore.getState().addOpening({
      wallId: WALL_ID,
      offsetCm: 80,
      widthCm: 90,
      type: 'door',
    })

    expect(selectOccupiedRanges(useCadStore.getState(), WALL_ID)).toEqual([
      [35, 125],
      [190, 310],
    ])
  })
})
