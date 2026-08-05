import { beforeEach, describe, expect, it } from 'vitest'

import type { PlanPoint } from '../../core/coords'
import { DEFAULT_ROOM_NAME } from '../../core/model'
import { getRoomRectangleCorners } from '../../core/room'
import { findCornerPointIdAt } from '../../core/snap'
import type { WallEnd } from '../architectureSlice'
import { useCadStore } from '../cadStore'
import { resetEmpty, rooms } from './roomFixture'

/** Araçta zoom'dan gelir; testte sabit, davranışı etkilemiyor. */
const TOLERANCE_CM = 10

/** useRoomTool'un bırakma anında yaptığının aynısı. */
function drawRectangleRoom(from: PlanPoint, to: PlanPoint): boolean {
  const corners = getRoomRectangleCorners(from, to)
  if (!corners) return false

  const cad = useCadStore.getState()
  const context = { points: cad.points, walls: cad.walls, floorId: cad.activeFloorId }
  const ends: WallEnd[] = corners.map((corner) => {
    const pointId = findCornerPointIdAt(corner, context, TOLERANCE_CM)
    return pointId === undefined ? { position: corner } : { pointId }
  })

  useCadStore.getState().addWallChain({ ends, isClosed: true })
  return true
}

describe('dikdörtgen oda aracı', () => {
  beforeEach(resetEmpty)

  it('dört duvar yazar ve çevrim KAPANIR — oda doğar', () => {
    drawRectangleRoom({ x: 0, y: 0 }, { x: 400, y: 300 })

    expect(useCadStore.getState().walls).toHaveLength(4)
    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].name).toBe(DEFAULT_ROOM_NAME)
  })

  it('köşede İKİ nokta üretmez — dört köşe, dört nokta', () => {
    // Kapanış kenarı konumla yazılsaydı başlangıç köşesinde ikinci bir Point
    // oluşur, çevrim kapanmaz ve oda hiç doğmazdı.
    drawRectangleRoom({ x: 0, y: 0 }, { x: 400, y: 300 })

    expect(useCadStore.getState().points).toHaveLength(4)
  })

  it('hangi yöne sürüklenirse sürüklensin aynı odayı verir', () => {
    drawRectangleRoom({ x: 400, y: 300 }, { x: 0, y: 0 })

    expect(rooms()).toHaveLength(1)
    expect(useCadStore.getState().points).toHaveLength(4)
  })

  it('tüm dikdörtgen TEK geri alma adımıdır', () => {
    drawRectangleRoom({ x: 0, y: 0 }, { x: 400, y: 300 })
    expect(rooms()).toHaveLength(1)

    useCadStore.temporal.getState().undo()

    expect(useCadStore.getState().walls).toEqual([])
    expect(rooms()).toEqual([])
  })

  it('sürüklenmemiş tıklamada hiçbir şey yazılmaz', () => {
    expect(drawRectangleRoom({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(false)

    expect(useCadStore.getState().walls).toEqual([])
    expect(rooms()).toEqual([])
  })

  it('bir kenarı duvar sayılamayacak kadar kısaysa yazılmaz', () => {
    // Yarım dikdörtgen yazmaktansa hiç yazmamak doğru: kısa kenar atılır ve
    // geriye çevrimi kapatmayan üç duvar kalırdı.
    expect(drawRectangleRoom({ x: 0, y: 0 }, { x: 400, y: 0.5 })).toBe(false)

    expect(useCadStore.getState().walls).toEqual([])
  })

  it('bitişik ikinci dikdörtgen ortak kenarda duvarı PAYLAŞIR', () => {
    drawRectangleRoom({ x: 0, y: 0 }, { x: 400, y: 300 })
    drawRectangleRoom({ x: 400, y: 0 }, { x: 800, y: 300 })

    // 4 + 3: ortak kenar ikinci kez YAZILMAZ, köşeler de paylaşılır. Yinelenseydi
    // ekranda görünmezdi (duvarlar aynı renk) ama malzeme dökümünde iki kez
    // sayılır, silme de tek kopyayı kaldırırdı.
    expect(useCadStore.getState().walls).toHaveLength(7)
    expect(useCadStore.getState().points).toHaveLength(6)
    expect(rooms()).toHaveLength(2)
  })
})
