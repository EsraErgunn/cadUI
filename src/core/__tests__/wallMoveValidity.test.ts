import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import { findWallMoveBlocker } from '../wallMoveValidity'

const FLOOR = 1

function point(id: number, x: number, y: number): Point {
  return { id, floorId: FLOOR, x, y }
}

function wall(id: number, p1Id: number, p2Id: number): Wall {
  return { id, floorId: FLOOR, p1Id, p2Id, thickness: 20, height: 280 }
}

/**
 * Yan yana iki oda; ortadaki bölme (400,0)-(400,300).
 *
 *   1--------2--------3   y = 300
 *   |        |        |
 *   4--------5--------6   y = 0
 */
function twoRooms() {
  const points = [
    point(1, 0, 300),
    point(2, 400, 300),
    point(3, 800, 300),
    point(4, 0, 0),
    point(5, 400, 0),
    point(6, 800, 0),
  ]
  const walls = [
    wall(10, 1, 2), // sol üst
    wall(11, 2, 3), // sağ üst
    wall(12, 4, 5), // sol alt
    wall(13, 5, 6), // sağ alt
    wall(14, 1, 4), // sol kenar
    wall(15, 2, 5), // BÖLME
    wall(16, 3, 6), // sağ kenar
  ]
  return { points, walls }
}

const check = (dyCm: number, movingId = 10) => {
  const { points, walls } = twoRooms()
  return findWallMoveBlocker(walls, points, movingId, 0, dyCm, FLOOR)
}

describe('findWallMoveBlocker', () => {
  it('bölmenin gövdesine denk gelen taşıma GEÇERLİ', () => {
    // Sol üst duvar 100 aşağı: köşesi bölmenin (400,300)-(400,0) gövdesinde kalır,
    // K24 orada T kurar ve duvar bağlı kalmaya devam eder.
    expect(check(-100)).toBeUndefined()
  })

  it('bölmenin ucunu geçen taşıma duvarı SERBEST bırakır', () => {
    // 350 aşağı: köşe y = -50'ye iner, bölme y = 0'da bitiyor. Değecek gövde yok.
    expect(check(-350)).toBe('freeEnd')
  })

  it('komşu duvarın üstüne oturan taşıma ÇÖKME üretir', () => {
    // Tam 300 aşağı: bölme sıfır boya iner, duvar alt duvarın üstüne biner.
    expect(check(-300)).toBe('collapse')
  })

  it('yukarı taşıma serbest: komşular uzayarak izler', () => {
    expect(check(500)).toBeUndefined()
  })

  it('hareketsiz taşıma reddedilmez', () => {
    const { points, walls } = twoRooms()
    expect(findWallMoveBlocker(walls, points, 10, 0, 0, FLOOR)).toBeUndefined()
  })

  it('ZATEN serbest duran duvarı taşımak yasak değil', () => {
    // Hiçbir şeye bağlı olmayan tek duvar: ucu önceden de serbestti.
    const points = [point(1, 0, 0), point(2, 400, 0)]
    const walls = [wall(10, 1, 2)]

    expect(findWallMoveBlocker(walls, points, 10, 0, 100, FLOOR)).toBeUndefined()
  })
})
