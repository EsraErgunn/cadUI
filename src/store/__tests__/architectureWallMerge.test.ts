import { beforeEach, describe, expect, it } from 'vitest'

import { resetEmpty, rooms } from './roomFixture'
import { useCadStore } from '../cadStore'

/**
 * Yan yana üç oda (Y, X, Z), her biri 200×200:
 *
 *   -300,250 -- -100,250 -- 100,250 -- 300,250
 *      |   Y      |    X     |    Z     |
 *   -300,450 -- -100,450 -- 100,450 -- 300,450
 *
 * X'in üst duvarı her taşındığında Y ve Z'nin ortak kenarı yeni köşede
 * bölünüyor. Bir sonraki taşımada önceki bölme noktası geride kalırsa kenar her
 * harekette bir parça daha artar — kullanıcı bildirimi (K103).
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

  return { xTop, dividerLeft: y2, dividerRight: x2 }
}

const move = (wallId: number, dyCm: number) =>
  useCadStore.getState().offsetWall(wallId, 0, dyCm)

/** Belirli bir x hattındaki dikey duvar parçalarının sayısı. */
function verticalPieces(atX: number) {
  const state = useCadStore.getState()
  return state.walls.filter((wall) => {
    const p1 = state.points.find((point) => point.id === wall.p1Id)
    const p2 = state.points.find((point) => point.id === wall.p2Id)
    return p1 && p2 && p1.x === atX && p2.x === atX
  }).length
}

describe('taşıma artığı ara düğümler (K103)', () => {
  beforeEach(resetEmpty)

  it('kurulum: üç oda, bölmeler tek parça', () => {
    drawThreeRooms()

    expect(rooms()).toHaveLength(3)
    expect(verticalPieces(-100)).toBe(1)
    expect(verticalPieces(100)).toBe(1)
  })

  it('tek taşımada bölme ikiye ayrılır — çevrimler için gerekli', () => {
    const { xTop } = drawThreeRooms()

    move(xTop.wallId, -100)

    expect(verticalPieces(-100)).toBe(2)
    expect(rooms()).toHaveLength(3)
  })

  it('ART ARDA taşımada parça BİRİKMEZ', () => {
    const { xTop } = drawThreeRooms()

    move(xTop.wallId, -100)
    move(xTop.wallId, -50)
    move(xTop.wallId, -30)

    // Her harekette bir parça daha eklenseydi 4 olurdu.
    expect(verticalPieces(-100)).toBe(2)
    expect(verticalPieces(100)).toBe(2)
    expect(rooms()).toHaveLength(3)
  })

  it('geri döndürünce ara düğüm KALMAZ', () => {
    const { xTop } = drawThreeRooms()

    move(xTop.wallId, -100)
    move(xTop.wallId, 100)

    // Duvar başladığı yere döndü: bölmeler yine tek parça olmalı.
    expect(verticalPieces(-100)).toBe(1)
    expect(verticalPieces(100)).toBe(1)
    expect(rooms()).toHaveLength(3)
  })

  it('oda adları art arda taşımada korunur', () => {
    const { xTop } = drawThreeRooms()
    useCadStore.setState({
      rooms: useCadStore.getState().rooms.map((room, index) => ({
        ...room,
        name: ['Y', 'X', 'Z'][index],
      })),
    })

    move(xTop.wallId, -100)
    move(xTop.wallId, 50)
    move(xTop.wallId, -25)

    expect(
      rooms()
        .map((room) => room.name)
        .sort(),
    ).toEqual(['X', 'Y', 'Z'])
  })
})
