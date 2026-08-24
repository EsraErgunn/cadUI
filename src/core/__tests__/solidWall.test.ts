import { describe, expect, it } from 'vitest'

import type { Opening, Wall } from '../model'
import {
  DOOR_HEIGHT_CM,
  WINDOW_HEIGHT_CM,
  WINDOW_SILL_HEIGHT_CM,
  getWallSolids,
  type SolidBox,
} from '../solidWall'
import type { WallCapsule } from '../wallShape'

const FLOOR_ID = 1
const WALL_HEIGHT_CM = 280
const THICKNESS_CM = 20

// Yatay duvar: (0,0) → (400,0), kalınlık 20 → kapsül yarıçapı 10.
const wall: Wall = {
  id: 10,
  floorId: FLOOR_ID,
  p1Id: 1,
  p2Id: 2,
  thickness: THICKNESS_CM,
  height: WALL_HEIGHT_CM,
}
const capsule: WallCapsule = { p1: { x: 0, y: 0 }, p2: { x: 400, y: 0 }, radiusCm: 10 }

function makeOpening(id: number, type: Opening['type'], offsetCm: number, widthCm: number): Opening {
  return { id, wallId: wall.id, offsetCm, widthCm, type }
}

/** Kutunun eksen üstündeki [başlangıç, bitiş] aralığı — yatay duvarda x ekseni. */
function getSpan(box: SolidBox): [number, number] {
  return [box.center.x - box.lengthCm / 2, box.center.x + box.lengthCm / 2]
}

describe('getWallSolids', () => {
  it('açıklıksız duvar tek kutudur ve iki uçtan yarım kalınlık uzar', () => {
    const { body, glazing } = getWallSolids(wall, capsule, [], 0)

    expect(glazing).toEqual([])
    expect(body).toHaveLength(1)
    // Kapsülün yuvarlak ucu köşeyi dolduruyordu; kutu aynı ayak izini kaplasın
    // diye −10 ile 410 arasında uzanır (K23'ün katı model karşılığı).
    expect(getSpan(body[0])).toEqual([-10, 410])
    expect(body[0].widthCm).toBe(THICKNESS_CM)
    expect(body[0].heightCm).toBe(WALL_HEIGHT_CM)
    expect(body[0].angleDeg).toBe(0)
  })

  it('kutu düşeyde tabanı değil MERKEZİ verir, taban kotu kat kotundan başlar', () => {
    const [box] = getWallSolids(wall, capsule, [], 300).body

    expect(box.baseCm).toBe(300)
    expect(box.heightCm).toBe(WALL_HEIGHT_CM)
  })

  it('kapı duvarı ikiye böler ve üstünde lento bırakır', () => {
    const door = makeOpening(20, 'door', 200, 90)
    const { body, glazing } = getWallSolids(wall, capsule, [door], 0)

    // Kapıda denizlik yok: zeminden başlıyor, altında duvar parçası doğmamalı.
    expect(glazing).toEqual([])
    expect(body.map(getSpan)).toEqual([
      [-10, 155],
      [155, 245],
      [245, 410],
    ])

    const lintel = body[1]
    expect(lintel.baseCm).toBe(DOOR_HEIGHT_CM)
    expect(lintel.heightCm).toBe(WALL_HEIGHT_CM - DOOR_HEIGHT_CM)
  })

  it('pencerede hem denizlik hem lento kalır, arada cam durur', () => {
    const window = makeOpening(21, 'window', 200, 100)
    const { body, glazing } = getWallSolids(wall, capsule, [window], 0)

    const sill = body.find((box) => box.baseCm === 0 && getSpan(box)[0] === 150)
    expect(sill?.heightCm).toBe(WINDOW_SILL_HEIGHT_CM)

    const lintel = body.find((box) => box.baseCm === WINDOW_SILL_HEIGHT_CM + WINDOW_HEIGHT_CM)
    expect(lintel?.heightCm).toBe(WALL_HEIGHT_CM - WINDOW_SILL_HEIGHT_CM - WINDOW_HEIGHT_CM)

    expect(glazing).toHaveLength(1)
    expect(glazing[0].baseCm).toBe(WINDOW_SILL_HEIGHT_CM)
    expect(glazing[0].heightCm).toBe(WINDOW_HEIGHT_CM)
    // Cam duvardan İNCE: delikte yüzen bir levha, duvarın yerini almıyor.
    expect(glazing[0].widthCm).toBeLessThan(THICKNESS_CM)
  })

  it('birden çok açıklık soldan sağa sıralanır, aralarında duvar kalır', () => {
    const door = makeOpening(20, 'door', 100, 90)
    const window = makeOpening(21, 'window', 300, 100)
    // Bilerek TERS sırada veriliyor: sıralama fonksiyonun işi.
    const { body } = getWallSolids(wall, capsule, [window, door], 0)

    const fullHeight = body.filter((box) => box.heightCm === WALL_HEIGHT_CM).map(getSpan)
    expect(fullHeight).toEqual([
      [-10, 55],
      [145, 250],
      [350, 410],
    ])
  })

  it('duvardan alçak açıklık duvarı tepesine kadar açar, lento üretmez', () => {
    const lowWall: Wall = { ...wall, height: 200 }
    const door = makeOpening(20, 'door', 200, 90)
    const { body } = getWallSolids(lowWall, capsule, [door], 0)

    // Kapı yüksekliği (210) duvarı (200) aşıyor: üstte kalan parça sıfır boyda,
    // hiç yazılmamalı — sıfır yükseklikli kutu görünmez ama boşuna geometri.
    expect(body.map(getSpan)).toEqual([
      [-10, 155],
      [245, 410],
    ])
  })

  it('sıfır boy duvar ve sıfır yükseklik hiç kutu üretmez', () => {
    const degenerate: WallCapsule = { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, radiusCm: 10 }

    expect(getWallSolids(wall, degenerate, [], 0)).toEqual({ body: [], glazing: [] })
    expect(getWallSolids({ ...wall, height: 0 }, capsule, [], 0)).toEqual({
      body: [],
      glazing: [],
    })
  })
})
