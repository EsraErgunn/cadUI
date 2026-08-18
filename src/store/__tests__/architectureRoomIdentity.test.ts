import { beforeEach, describe, expect, it } from 'vitest'

import { resetEmpty, rooms } from './roomFixture'
import { getWallNormal } from '../../core/wallMove'
import { useCadStore } from '../cadStore'

/**
 * Yan yana üç oda (Y, X, Z). Kullanıcının verdiği ad ve odanın KİMLİĞİ, duvarlar
 * değişse bile oda var olduğu sürece korunmalı (K106).
 *
 *   -300,250 -- -100,250 -- 100,250 -- 300,250
 *      |   Y      |    X     |    Z     |
 *   -300,450 -- -100,450 -- 100,450 -- 300,450
 */
function drawThreeRooms() {
  const add = (input: Parameters<ReturnType<typeof useCadStore.getState>['addWall']>[0]) =>
    useCadStore.getState().addWall(input)!

  const y1 = add({ start: { position: { x: -300, y: 250 } }, end: { position: { x: -100, y: 250 } } })
  const y2 = add({ start: { pointId: y1.p2Id }, end: { position: { x: -100, y: 450 } } })
  const y3 = add({ start: { pointId: y2.p2Id }, end: { position: { x: -300, y: 450 } } })
  add({ start: { pointId: y3.p2Id }, end: { pointId: y1.p1Id } })

  const x1 = add({ start: { pointId: y1.p2Id }, end: { position: { x: 100, y: 250 } } })
  const x2 = add({ start: { pointId: x1.p2Id }, end: { position: { x: 100, y: 450 } } })
  const xTop = add({ start: { pointId: x2.p2Id }, end: { pointId: y2.p2Id } })

  const z1 = add({ start: { pointId: x1.p2Id }, end: { position: { x: 300, y: 250 } } })
  const z2 = add({ start: { pointId: z1.p2Id }, end: { position: { x: 300, y: 450 } } })
  add({ start: { pointId: z2.p2Id }, end: { pointId: x2.p2Id } })

  useCadStore.setState({
    rooms: useCadStore.getState().rooms.map((room, index) => ({
      ...room,
      name: ['Y', 'X', 'Z'][index],
    })),
  })

  return { xTop, xLeft: y2, xRight: x2, xBottom: x1, yTop: y3, zTop: z2 }
}

/** Duvarı kendi normali boyunca kaydırır — sürükleme jestinin store karşılığı. */
function slide(wallId: number, distanceCm: number) {
  const state = useCadStore.getState()
  const wall = state.walls.find((candidate) => candidate.id === wallId)
  if (!wall) return
  const p1 = state.points.find((point) => point.id === wall.p1Id)!
  const p2 = state.points.find((point) => point.id === wall.p2Id)!
  const normal = getWallNormal(p1, p2)
  if (!normal) return
  useCadStore.getState().offsetWall(wallId, normal.x * distanceCm, normal.y * distanceCm)
}

const identity = () =>
  rooms()
    .map((room) => `${room.id}:${room.name}`)
    .sort()

describe('oda kimliği duvar taşımalarına dayanır (K106)', () => {
  beforeEach(resetEmpty)

  it('PAYLAŞILAN duvarı taşımak komşu odanın kimliğini bozmaz', () => {
    const walls = drawThreeRooms()
    const before = identity()

    // Önce üst duvarı oynat: komşu kenarlar bölünür, kayıt ile yüz ayrışmaya başlar.
    slide(walls.xTop.wallId, 100)
    slide(walls.xTop.wallId, -50)
    // Sonra Y ile X'in PAYLAŞTIĞI duvarı taşı: X'in üst duvarı kopup bölünüyor ve
    // artan parça Y'nin sınırına giriyor — yüz, kaydın ÜST kümesi oluyor.
    slide(walls.xLeft.wallId, -50)

    expect(identity()).toEqual(before)
  })

  it('uzun bir oynama dizisi boyunca ad ve id korunur', () => {
    const walls = drawThreeRooms()
    const before = identity()

    const steps: [number, number][] = [
      [walls.xTop.wallId, 100],
      [walls.xTop.wallId, -50],
      [walls.xLeft.wallId, -50],
      [walls.xLeft.wallId, 25],
      [walls.xRight.wallId, 50],
      [walls.xBottom.wallId, -50],
      [walls.yTop.wallId, 50],
      [walls.zTop.wallId, -50],
      [walls.xTop.wallId, 75],
      [walls.xTop.wallId, -75],
      [walls.xLeft.wallId, -40],
      [walls.xRight.wallId, 40],
    ]
    for (const [wallId, distanceCm] of steps) slide(wallId, distanceCm)

    expect(rooms()).toHaveLength(3)
    expect(identity()).toEqual(before)
  })

  it('odanın İÇİNDEN duvar geçince yine İKİ YENİ oda doğar (K31 korunur)', () => {
    const add = (input: Parameters<ReturnType<typeof useCadStore.getState>['addWall']>[0]) =>
      useCadStore.getState().addWall(input)!
    const a = add({ start: { position: { x: 0, y: 0 } }, end: { position: { x: 400, y: 0 } } })
    const b = add({ start: { pointId: a.p2Id }, end: { position: { x: 400, y: 400 } } })
    const c = add({ start: { pointId: b.p2Id }, end: { position: { x: 0, y: 400 } } })
    add({ start: { pointId: c.p2Id }, end: { pointId: a.p1Id } })
    useCadStore.setState({
      rooms: useCadStore.getState().rooms.map((room) => ({ ...room, name: 'Salon' })),
    })

    // Odayı ikiye bölen duvar: kimlik DEVAM ETMEZ, iki yeni oda doğar.
    add({ start: { position: { x: 0, y: 200 } }, end: { position: { x: 400, y: 200 } } })

    expect(rooms()).toHaveLength(2)
    expect(rooms().map((room) => room.name)).toEqual(['Oda', 'Oda'])
  })
})
