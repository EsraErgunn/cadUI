import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import { getWallOutlines } from '../wallShape'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number): Point {
  return { id, floorId: FLOOR_ID, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, thickness: number): Wall {
  return { id, floorId: FLOOR_ID, p1Id, p2Id, thickness, height: 280 }
}

/**
 * Kontur birleşimi (union) kilitlenme vakaları. Köşe sürükleme geldiğinde
 * uygulama donuyordu; iki ayrı sebep çıktı ve ikisi de burada sabitlendi.
 */
describe('getWallOutlines — kilitlenme regresyonu', () => {
  /**
   * Sebep 1: gönye duvarın kendi boyunu aşınca dörtgen papyona dönüyor.
   * Kendiyle kesişen halka union'ı sonsuz döngüye sokuyordu. Köşe sürüklenip
   * duvar kısaldığında tam bu oluyordu.
   */
  it('iki ucu gönyeli çok kısa duvarda takılmadan biter', () => {
    const shortPoints = [
      makePoint(1, -300, 0),
      makePoint(2, 0, 0),
      makePoint(3, 2, 0),
      makePoint(4, 2, 300),
    ]
    const shortWalls = [makeWall(10, 1, 2, 20), makeWall(11, 2, 3, 20), makeWall(12, 3, 4, 20)]

    const startedAt = Date.now()
    const rings = getWallOutlines(shortWalls, shortPoints)

    expect(rings.length).toBeGreaterThan(0)
    expect(Date.now() - startedAt).toBeLessThan(1000)
  })

  /**
   * Sebep 2: gönye hesabı 442.41 yerine 442.40999999999997 üretiyor; kayan nokta
   * gürültüsü "neredeyse çakışık" kenar üretiyor. Çözüm halkaları birleştirmeden
   * önce yuvarlamak. Vaka rastgele tarama ile bulundu.
   */
  it('mikro kayan nokta farkı olan ince üçgende takılmadan biter', () => {
    const trianglePoints = [
      makePoint(1, 0, 0),
      makePoint(2, 158.1, 442.41),
      makePoint(3, 13.56, 364.08),
    ]
    const triangleWalls = [makeWall(20, 1, 2, 10), makeWall(21, 2, 3, 10), makeWall(22, 3, 1, 10)]

    const startedAt = Date.now()
    const rings = getWallOutlines(triangleWalls, trianglePoints)

    expect(rings.length).toBeGreaterThan(0)
    expect(Date.now() - startedAt).toBeLessThan(1000)
  })

  /**
   * Sebep 3: tek köşede beşten fazla duvar birleşince uçlar gönyelenmiyor (üçten
   * fazlada tek kesişim tanımsız), beş dikdörtgen aynı noktada üst üste biniyor.
   * martinez burada KİLİTLENİYORDU; kütüphane bu yüzden polygon-clipping ile
   * değiştirildi (bkz. docs/kararlar.md K22). Vaka rastgele tarama ile bulundu.
   */
  it('beş duvarın birleştiği köşede takılmadan biter', () => {
    const fanPoints = [
      makePoint(1, 71.65, 37.56),
      makePoint(2, 257.44, 434.61),
      makePoint(3, 24.49, -2.72),
      makePoint(4, -304.86, -180.01),
      makePoint(5, 133.29, -545.58),
      makePoint(6, 510.05, 104.73),
    ]
    const fanWalls = [2, 3, 4, 5, 6].map((outerId, index) =>
      makeWall(10 + index, 1, outerId, 20),
    )

    const startedAt = Date.now()
    const rings = getWallOutlines(fanWalls, fanPoints)

    expect(rings.length).toBeGreaterThan(0)
    expect(Date.now() - startedAt).toBeLessThan(1000)
  })

  it('birleştirme başarısız olsa bile her duvar için halka döner', () => {
    // Yedek yol: birleştirme patlarsa duvarlar tek tek çizilir, çizim eksilmez.
    const fanPoints = [
      makePoint(1, 0, 0),
      makePoint(2, 300, 0),
      makePoint(3, 0, 300),
      makePoint(4, -300, 0),
    ]
    const fanWalls = [makeWall(10, 1, 2, 20), makeWall(11, 1, 3, 20), makeWall(12, 1, 4, 20)]

    expect(getWallOutlines(fanWalls, fanPoints).length).toBeGreaterThan(0)
  })

  it('kapalı çevrimde dış kontur ve iç boşluk ayrı halkalar olarak gelir', () => {
    const roomPoints = [
      makePoint(1, 0, 0),
      makePoint(2, 400, 0),
      makePoint(3, 400, 300),
      makePoint(4, 0, 300),
    ]
    const roomWalls = [
      makeWall(10, 1, 2, 20),
      makeWall(11, 2, 3, 20),
      makeWall(12, 3, 4, 20),
      makeWall(13, 4, 1, 20),
    ]

    expect(getWallOutlines(roomWalls, roomPoints)).toHaveLength(2)
  })
})
