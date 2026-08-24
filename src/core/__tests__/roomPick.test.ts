import { describe, expect, it } from 'vitest'

import type { Point, Room, Wall } from '../model'
import { findRoomIdAt } from '../roomPick'

const FLOOR_ID = 1
const OTHER_FLOOR_ID = 2

function makePoint(id: number, x: number, y: number, floorId = FLOOR_ID): Point {
  return { id, floorId, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, floorId = FLOOR_ID): Wall {
  return { id, floorId, p1Id, p2Id, thickness: 20, height: 280 }
}

/** 400 x 300 dikdörtgen. */
const rectPoints = [
  makePoint(1, 0, 0),
  makePoint(2, 400, 0),
  makePoint(3, 400, 300),
  makePoint(4, 0, 300),
]
const rectWalls = [makeWall(10, 1, 2), makeWall(11, 2, 3), makeWall(12, 3, 4), makeWall(13, 4, 1)]
const rectRoom: Room = { id: 20, wallIds: [10, 11, 12, 13], usageType: 'livingRoom' }

const base = {
  walls: rectWalls,
  points: rectPoints,
  rooms: [rectRoom],
  floorId: FLOOR_ID,
}

describe('findRoomIdAt', () => {
  it('içindeki noktada mahali bulur', () => {
    expect(findRoomIdAt({ x: 200, y: 150 }, base)).toBe(20)
  })

  it('dışarıdaki noktada UNDEFINED döner', () => {
    expect(findRoomIdAt({ x: 900, y: 150 }, base)).toBeUndefined()
  })

  it('duvar kaydı olmayan yüzde UNDEFINED döner', () => {
    // Yüz duvarlardan türüyor ama `Room` kaydı henüz yazılmamış olabilir (ara
    // kare). O durumda seçilecek bir mahal yok.
    expect(findRoomIdAt({ x: 200, y: 150 }, { ...base, rooms: [] })).toBeUndefined()
  })

  it('BAŞKA kattaki duvarlardan mahal üretmez', () => {
    expect(findRoomIdAt({ x: 200, y: 150 }, { ...base, floorId: OTHER_FLOOR_ID })).toBeUndefined()
  })

  it('duvar kümesi TAM eşleşmezse mahali bulmaz', () => {
    // Eşleşme tam küme eşitliğiyle: `Room.tsx` neyi çiziyorsa tıklama da onu
    // bulmalı, yoksa seçili görünen mahal ile işlem yapılan mahal ayrışır.
    const wrongRoom: Room = { ...rectRoom, wallIds: [10, 11, 12] }
    expect(findRoomIdAt({ x: 200, y: 150 }, { ...base, rooms: [wrongRoom] })).toBeUndefined()
  })

  it('iç içe alanlarda EN KÜÇÜK yüzü seçer', () => {
    // Büyük dikdörtgenin içine bölme duvarı: nokta küçük gözde kalıyor.
    const points = [...rectPoints, makePoint(5, 200, 0), makePoint(6, 200, 300)]
    const walls = [
      makeWall(10, 1, 5),
      makeWall(14, 5, 2),
      makeWall(11, 2, 3),
      makeWall(12, 3, 6),
      makeWall(15, 6, 4),
      makeWall(13, 4, 1),
      makeWall(16, 5, 6),
    ]
    const left: Room = { id: 21, wallIds: [10, 16, 15, 13], usageType: 'kitchen' }
    const right: Room = { id: 22, wallIds: [14, 11, 12, 16], usageType: 'bathroom' }

    expect(findRoomIdAt({ x: 100, y: 150 }, { walls, points, rooms: [left, right], floorId: FLOOR_ID })).toBe(21)
    expect(findRoomIdAt({ x: 300, y: 150 }, { walls, points, rooms: [left, right], floorId: FLOOR_ID })).toBe(22)
  })
})
