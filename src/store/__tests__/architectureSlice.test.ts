import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_WALL_HEIGHT_CM, DEFAULT_WALL_THICKNESS_CM } from '../../core/wall'
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

describe('addWall', () => {
  it('iki yeni uç için Point üretir ve duvarı ekler', () => {
    addHorizontalWall()
    const { points, walls } = useCadStore.getState()

    expect(points).toHaveLength(2)
    expect(walls).toHaveLength(1)
    expect(walls[0].p1Id).toBe(points[0].id)
    expect(walls[0].p2Id).toBe(points[1].id)
  })

  it('kalınlık ve yükseklik verilmezse varsayılanları kullanır', () => {
    addHorizontalWall()
    const wall = useCadStore.getState().walls[0]

    expect(wall.thickness).toBe(DEFAULT_WALL_THICKNESS_CM)
    expect(wall.height).toBe(DEFAULT_WALL_HEIGHT_CM)
  })

  it('var olan köşeye bağlanınca yeni Point üretmez', () => {
    addHorizontalWall()
    const cornerId = useCadStore.getState().points[1].id

    useCadStore.getState().addWall({
      start: { pointId: cornerId },
      end: { position: { x: 400, y: 300 } },
    })
    const { points, walls } = useCadStore.getState()

    // 2 eski + 1 yeni uç = 3; köşe paylaşıldığı için 4 değil.
    expect(points).toHaveLength(3)
    expect(walls[1].p1Id).toBe(cornerId)
  })

  it('sıfır boylu duvarı reddeder ve sahipsiz Point bırakmaz', () => {
    useCadStore.getState().addWall({
      start: { position: { x: 100, y: 100 } },
      end: { position: { x: 100, y: 100 } },
    })
    const { points, walls } = useCadStore.getState()

    expect(walls).toHaveLength(0)
    expect(points).toHaveLength(0)
  })

  it('var olmayan bir uç id\'sinde hiçbir şey yazmaz', () => {
    useCadStore.getState().addWall({
      start: { pointId: 404 },
      end: { position: { x: 400, y: 0 } },
    })
    const { points, walls } = useCadStore.getState()

    expect(walls).toHaveLength(0)
    expect(points).toHaveLength(0)
  })

  it('projeyi kirli işaretler', () => {
    expect(useCadStore.getState().revision).toBe(0)
    addHorizontalWall()
    expect(useCadStore.getState().revision).toBe(1)
  })
})

describe('movePoint', () => {
  it('ortak köşeyi taşıyınca her iki duvar da yeni yere bağlı kalır', () => {
    addHorizontalWall()
    const cornerId = useCadStore.getState().points[1].id
    useCadStore.getState().addWall({
      start: { pointId: cornerId },
      end: { position: { x: 400, y: 300 } },
    })

    useCadStore.getState().movePoint(cornerId, { x: 420, y: 0 })
    const { points, walls } = useCadStore.getState()

    expect(points.find((point) => point.id === cornerId)).toMatchObject({ x: 420, y: 0 })
    // Koordinat duvarlarda tekrarlanmadığı için ikisi de tek güncellemeyle geldi.
    expect(walls[0].p2Id).toBe(cornerId)
    expect(walls[1].p1Id).toBe(cornerId)
  })

  it('olmayan noktada hiçbir şey değiştirmez', () => {
    addHorizontalWall()
    const before = useCadStore.getState().revision

    useCadStore.getState().movePoint(404, { x: 10, y: 10 })

    expect(useCadStore.getState().revision).toBe(before)
  })
})

describe('deleteWall', () => {
  it('duvarı ve sahipsiz kalan noktalarını siler', () => {
    addHorizontalWall()
    const wallId = useCadStore.getState().walls[0].id

    useCadStore.getState().deleteWall(wallId)
    const { points, walls } = useCadStore.getState()

    expect(walls).toHaveLength(0)
    expect(points).toHaveLength(0)
  })

  it('başka duvarın kullandığı köşeyi silmez', () => {
    addHorizontalWall()
    const cornerId = useCadStore.getState().points[1].id
    useCadStore.getState().addWall({
      start: { pointId: cornerId },
      end: { position: { x: 400, y: 300 } },
    })

    useCadStore.getState().deleteWall(useCadStore.getState().walls[0].id)
    const { points } = useCadStore.getState()

    expect(points.map((point) => point.id)).toContain(cornerId)
    // Yalnız ilk duvarın kullandığı (0,0) köşesi gitti.
    expect(points).toHaveLength(2)
  })

  it('olmayan duvarda hiçbir şey değiştirmez', () => {
    addHorizontalWall()
    const before = useCadStore.getState().revision

    useCadStore.getState().deleteWall(404)

    expect(useCadStore.getState().revision).toBe(before)
  })
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
