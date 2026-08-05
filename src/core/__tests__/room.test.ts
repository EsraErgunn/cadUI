import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import { findRoomFaceAt, findRoomFaces } from '../room'

const FLOOR_ID = 1

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

describe('findRoomFaces — tek kapalı alan', () => {
  it('dikdörtgeni TEK oda olarak bulur', () => {
    expect(findRoomFaces(rectWalls, rectPoints, FLOOR_ID)).toHaveLength(1)
  })

  it('alanı doğru hesaplar', () => {
    const [face] = findRoomFaces(rectWalls, rectPoints, FLOOR_ID)
    expect(face.areaCm2).toBeCloseTo(400 * 300)
  })

  it('çevrimdeki dört duvarı da verir', () => {
    const [face] = findRoomFaces(rectWalls, rectPoints, FLOOR_ID)
    expect([...face.wallIds].sort((a, b) => a - b)).toEqual([10, 11, 12, 13])
  })

  it('köşe sayısı duvar sayısı kadardır', () => {
    const [face] = findRoomFaces(rectWalls, rectPoints, FLOOR_ID)
    expect(face.corners).toHaveLength(4)
  })
})

describe('findRoomFaces — kapanmayan çizim', () => {
  it('açık zincir oda üretmez', () => {
    const open = [makeWall(10, 1, 2), makeWall(11, 2, 3), makeWall(12, 3, 4)]
    expect(findRoomFaces(open, rectPoints, FLOOR_ID)).toEqual([])
  })

  it('tek duvar oda üretmez', () => {
    expect(findRoomFaces([makeWall(10, 1, 2)], rectPoints, FLOOR_ID)).toEqual([])
  })

  it('duvarsız çizimde boş döner', () => {
    expect(findRoomFaces([], rectPoints, FLOOR_ID)).toEqual([])
  })

  it('dışarı uzanan çıkıntı duvar odayı bozmaz', () => {
    const withTail = [...rectWalls, makeWall(14, 2, 5)]
    const points = [...rectPoints, makePoint(5, 700, 0)]

    const faces = findRoomFaces(withTail, points, FLOOR_ID)
    expect(faces).toHaveLength(1)
    expect(faces[0].areaCm2).toBeCloseTo(400 * 300)
  })
})

/** Kullanıcının kuralı: içinden duvar geçen oda İKİYE ayrılır, ikisi de yeni kimlik alır. */
describe('findRoomFaces — içinden duvar geçince ikiye ayrılır', () => {
  const splitPoints = [...rectPoints, makePoint(5, 200, 0), makePoint(6, 200, 300)]
  // Alt ve üst kenar bölünmüş halde — K24 sonrası graf böyle görünür.
  const splitWalls = [
    makeWall(10, 1, 5),
    makeWall(14, 5, 2),
    makeWall(11, 2, 3),
    makeWall(12, 3, 6),
    makeWall(15, 6, 4),
    makeWall(13, 4, 1),
    makeWall(16, 5, 6),
  ]

  it('İKİ oda bulur', () => {
    expect(findRoomFaces(splitWalls, splitPoints, FLOOR_ID)).toHaveLength(2)
  })

  it('iki odanın alanı toplamda bütünü verir', () => {
    const total = findRoomFaces(splitWalls, splitPoints, FLOOR_ID).reduce(
      (sum, face) => sum + face.areaCm2,
      0,
    )
    expect(total).toBeCloseTo(400 * 300)
  })

  it('her iki oda da ortadaki duvarı sınırında sayar', () => {
    const faces = findRoomFaces(splitWalls, splitPoints, FLOOR_ID)
    expect(faces.every((face) => face.wallIds.includes(16))).toBe(true)
  })

  it('odaların duvar kümeleri FARKLIDIR — ayrı kimlik alacaklar', () => {
    const [first, second] = findRoomFaces(splitWalls, splitPoints, FLOOR_ID)
    const asKey = (ids: number[]) => [...ids].sort((a, b) => a - b).join(',')
    expect(asKey(first.wallIds)).not.toBe(asKey(second.wallIds))
  })
})

describe('findRoomFaces — bitişik odalar', () => {
  it('ortak duvarı paylaşan iki dikdörtgeni ayrı ayrı bulur', () => {
    const points = [
      makePoint(1, 0, 0),
      makePoint(2, 400, 0),
      makePoint(3, 400, 300),
      makePoint(4, 0, 300),
      makePoint(5, 800, 0),
      makePoint(6, 800, 300),
    ]
    const walls = [
      makeWall(10, 1, 2),
      makeWall(11, 2, 3),
      makeWall(12, 3, 4),
      makeWall(13, 4, 1),
      makeWall(14, 2, 5),
      makeWall(15, 5, 6),
      makeWall(16, 6, 3),
    ]

    const faces = findRoomFaces(walls, points, FLOOR_ID)
    expect(faces).toHaveLength(2)
    // Ortak duvar (11) ikisinin de sınırında.
    expect(faces.every((face) => face.wallIds.includes(11))).toBe(true)
  })
})

describe('findRoomFaces — kat filtresi', () => {
  it('yalnız istenen kattaki duvarlardan oda üretir', () => {
    const otherFloorPoints = rectPoints.map((point) => ({ ...point, floorId: 2 }))
    const otherFloorWalls = rectWalls.map((wall) => ({ ...wall, floorId: 2 }))

    expect(findRoomFaces(otherFloorWalls, otherFloorPoints, FLOOR_ID)).toEqual([])
    expect(findRoomFaces(otherFloorWalls, otherFloorPoints, 2)).toHaveLength(1)
  })
})

describe('findRoomFaceAt', () => {
  /** Yan yana iki oda: ortadaki duvar ikisinin de sınırı. */
  const pairPoints = [
    makePoint(1, 0, 0),
    makePoint(2, 400, 0),
    makePoint(3, 400, 300),
    makePoint(4, 0, 300),
    makePoint(5, 800, 0),
    makePoint(6, 800, 300),
  ]
  const pairWalls = [
    makeWall(10, 1, 2),
    makeWall(11, 2, 3),
    makeWall(12, 3, 4),
    makeWall(13, 4, 1),
    makeWall(14, 2, 5),
    makeWall(15, 5, 6),
    makeWall(16, 6, 3),
  ]

  it('noktanın düştüğü odayı verir', () => {
    const faces = findRoomFaces(pairWalls, pairPoints, FLOOR_ID)

    const left = findRoomFaceAt(faces, { x: 200, y: 150 })
    const right = findRoomFaceAt(faces, { x: 600, y: 150 })

    expect(left?.wallIds).toContain(13)
    expect(right?.wallIds).toContain(15)
  })

  it('dışarıdaki nokta için oda yok', () => {
    const faces = findRoomFaces(pairWalls, pairPoints, FLOOR_ID)

    expect(findRoomFaceAt(faces, { x: 200, y: 900 })).toBeUndefined()
  })

  it('iç içe odalarda KÜÇÜK olanı seçer', () => {
    // Büyük dikdörtgenin içine ikinci bir kapalı çevrim çizilmiş hâl.
    const innerPoints = [
      ...rectPoints,
      makePoint(5, 100, 100),
      makePoint(6, 300, 100),
      makePoint(7, 300, 200),
      makePoint(8, 100, 200),
    ]
    const innerWalls = [
      ...rectWalls,
      makeWall(20, 5, 6),
      makeWall(21, 6, 7),
      makeWall(22, 7, 8),
      makeWall(23, 8, 5),
    ]
    const faces = findRoomFaces(innerWalls, innerPoints, FLOOR_ID)

    const hit = findRoomFaceAt(faces, { x: 200, y: 150 })

    expect(hit?.areaCm2).toBeCloseTo(200 * 100)
  })
})
