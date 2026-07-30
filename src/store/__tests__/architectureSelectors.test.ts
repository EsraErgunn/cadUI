import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_WALL_THICKNESS_CM } from '../../core/wall'
import { selectWallPlacementRange, selectWallsAtPoint, selectWallSnapPoints } from '../architectureSlice'
import { useCadStore } from '../cadStore'

const initialState = useCadStore.getState()

function addHorizontalWall() {
  useCadStore.getState().addWall({
    start: { position: { x: 0, y: 0 } },
    end: { position: { x: 400, y: 0 } },
  })
}

beforeEach(() => {
  useCadStore.setState(initialState, true)
})

describe('selectorlar', () => {
  it('köşede birleşen duvarları verir', () => {
    addHorizontalWall()
    const cornerId = useCadStore.getState().points[1].id
    useCadStore.getState().addWall({
      start: { pointId: cornerId },
      end: { position: { x: 400, y: 300 } },
    })

    expect(selectWallsAtPoint(useCadStore.getState(), cornerId)).toHaveLength(2)
  })

  it('duvarın yakalama noktalarını verir', () => {
    addHorizontalWall()
    const wallId = useCadStore.getState().walls[0].id

    expect(selectWallSnapPoints(useCadStore.getState(), wallId)).toContainEqual({ x: 200, y: 0 })
  })

  it('yerleştirme aralığını köşe payıyla verir', () => {
    addHorizontalWall()
    const cornerId = useCadStore.getState().points[1].id
    useCadStore.getState().addWall({
      start: { pointId: cornerId },
      end: { position: { x: 400, y: 300 } },
    })

    expect(selectWallPlacementRange(useCadStore.getState(), useCadStore.getState().walls[0].id))
      .toEqual({ minOffsetCm: 0, maxOffsetCm: 400 - DEFAULT_WALL_THICKNESS_CM })
  })

  it('olmayan duvarda boş/undefined döner', () => {
    expect(selectWallSnapPoints(useCadStore.getState(), 404)).toEqual([])
    expect(selectWallPlacementRange(useCadStore.getState(), 404)).toBeUndefined()
  })
})
