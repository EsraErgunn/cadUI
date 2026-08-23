import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import {
  buildPointIndex,
  getOrphanPointIds,
  getPlacementRange,
  getSegmentAngleDeg,
  getSegmentEndAtLength,
  getSegmentLength,
  getSegmentMidpoint,
  getSnapPoints,
  getWallEnds,
  getWallsAtPoint,
  projectOntoSegment,
  projectPointOntoWall,
} from '../wall'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number): Point {
  return { id, floorId: FLOOR_ID, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, thickness: number): Wall {
  return { id, floorId: FLOOR_ID, p1Id, p2Id, thickness, height: 280 }
}

// L köşesi: yatay duvar (400 cm, kalınlık 20) + dikey duvar (300 cm, kalınlık 30).
const points = [makePoint(1, 0, 0), makePoint(2, 400, 0), makePoint(3, 400, 300)]
const horizontal = makeWall(10, 1, 2, 20)
const vertical = makeWall(11, 2, 3, 30)
const walls = [horizontal, vertical]

describe('getWallEnds', () => {
  it('duvarın uçlarını ortak havuzdan çözer', () => {
    expect(getWallEnds(horizontal, points)).toEqual({ p1: { x: 0, y: 0 }, p2: { x: 400, y: 0 } })
  })

  it('nokta havuzda yoksa undefined döner', () => {
    expect(getWallEnds(makeWall(99, 1, 404, 20), points)).toBeUndefined()
  })
})

describe('segment ölçüleri', () => {
  it('uzunluk hesaplar', () => {
    expect(getSegmentLength({ x: 0, y: 0 }, { x: 300, y: 400 })).toBe(500)
  })

  it('orta noktayı bulur', () => {
    expect(getSegmentMidpoint({ x: 0, y: 0 }, { x: 400, y: 0 })).toEqual({ x: 200, y: 0 })
  })

  it('açıyı derece olarak verir', () => {
    expect(getSegmentAngleDeg({ x: 0, y: 0 }, { x: 400, y: 0 })).toBe(0)
    expect(getSegmentAngleDeg({ x: 400, y: 0 }, { x: 400, y: 300 })).toBe(90)
  })
})

describe('projectOntoSegment', () => {
  const a = { x: 0, y: 0 }
  const b = { x: 400, y: 0 }

  it('duvarın üstüne dik izdüşürür', () => {
    expect(projectOntoSegment(a, b, { x: 200, y: 50 })).toEqual({
      point: { x: 200, y: 0 },
      offsetCm: 200,
      distanceCm: 50,
    })
  })

  it('p1 ucundan önceye taşan hedefi uca sabitler', () => {
    const result = projectOntoSegment(a, b, { x: -100, y: 0 })
    expect(result.point).toEqual({ x: 0, y: 0 })
    expect(result.offsetCm).toBe(0)
    expect(result.distanceCm).toBe(100)
  })

  it('p2 ucundan sonraya taşan hedefi uca sabitler', () => {
    const result = projectOntoSegment(a, b, { x: 900, y: 0 })
    expect(result.point).toEqual({ x: 400, y: 0 })
    expect(result.offsetCm).toBe(400)
    expect(result.distanceCm).toBe(500)
  })

  it('iki ucu çakışık duvarda sıfıra bölmez', () => {
    const result = projectOntoSegment(a, { x: 0, y: 0 }, { x: 30, y: 40 })
    expect(result.offsetCm).toBe(0)
    expect(result.distanceCm).toBe(50)
  })
})

describe('projectPointOntoWall', () => {
  it('duvarı çözüp izdüşümü döndürür', () => {
    expect(projectPointOntoWall(horizontal, points, { x: 120, y: -10 })?.offsetCm).toBe(120)
  })

  it('ucu eksik duvarda undefined döner', () => {
    expect(projectPointOntoWall(makeWall(99, 1, 404, 20), points, { x: 0, y: 0 })).toBeUndefined()
  })
})

describe('getWallsAtPoint', () => {
  it('köşede birleşen duvarların hepsini verir', () => {
    expect(getWallsAtPoint(2, walls).map((wall) => wall.id)).toEqual([10, 11])
  })

  it('hiçbir duvarın kullanmadığı noktada boş döner', () => {
    expect(getWallsAtPoint(404, walls)).toEqual([])
  })
})

describe('getOrphanPointIds', () => {
  it('hiçbir duvarın kullanmadığı noktayı bildirir', () => {
    const withOrphan = [...points, makePoint(4, 900, 900)]
    expect(getOrphanPointIds(withOrphan, walls)).toEqual([4])
  })

  it('duvarların kullandığı noktalara dokunmaz', () => {
    expect(getOrphanPointIds(points, walls)).toEqual([])
  })

  it('duvar kalmayınca tüm noktalar sahipsizdir', () => {
    expect(getOrphanPointIds(points, [])).toEqual([1, 2, 3])
  })
})

/**
 * İndeks çağrı başına kurulur, modül seviyesinde ÖNBELLEKLENMEZ: immer draft'ı
 * yerinde değişen bir dizidir, referansa bağlı bir önbellek üretici ortasında
 * bayatlar ve yeni eklenen nokta kaybolur (duvar bölme tam bundan kırılmıştı).
 * Bu blok o sözleşmeyi sabitliyor.
 */
describe('buildPointIndex', () => {
  it('id ile noktayı çözer', () => {
    expect(buildPointIndex(points).get(2)).toEqual({ id: 2, floorId: FLOOR_ID, x: 400, y: 0 })
  })

  it('olmayan id için undefined döner', () => {
    expect(buildPointIndex(points).get(404)).toBeUndefined()
  })

  it('boş havuzda boş indeks verir', () => {
    expect(buildPointIndex([]).size).toBe(0)
  })

  it('dizi sonradan büyüyünce YENİ indeks yeni noktayı görür', () => {
    const pool = [makePoint(1, 0, 0)]
    const before = buildPointIndex(pool)

    pool.push(makePoint(2, 50, 50))

    expect(before.get(2)).toBeUndefined()
    expect(buildPointIndex(pool).get(2)).toEqual({ id: 2, floorId: FLOOR_ID, x: 50, y: 50 })
  })
})

describe('getSnapPoints', () => {
  it('iki ucu ve orta noktayı verir', () => {
    expect(getSnapPoints(horizontal, points, [horizontal])).toEqual([
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 200, y: 0 },
    ])
  })

  it('sabit aralıklı bölüm noktası üretmez', () => {
    // 400 cm'lik duvar 2 m'de bölünseydi 200 cm'de fazladan nokta beklenirdi;
    // orta nokta dışında ara nokta yok.
    expect(getSnapPoints(horizontal, points, [horizontal])).toHaveLength(3)
  })

  it('ortak köşeyi iki kez eklemez', () => {
    const snapPoints = getSnapPoints(horizontal, points, walls)
    expect(snapPoints.filter((point) => point.x === 400 && point.y === 0)).toHaveLength(1)
  })

  it('kesişen duvarın kesişim noktasını ekler', () => {
    const crossingPoints = [...points, makePoint(4, 300, -100), makePoint(5, 300, 100)]
    const crossing = makeWall(12, 4, 5, 20)

    expect(getSnapPoints(horizontal, crossingPoints, [horizontal, crossing])).toContainEqual({
      x: 300,
      y: 0,
    })
  })

  it('başka kattaki duvarla kesişim aramaz', () => {
    const otherFloorPoints = [
      ...points,
      { id: 4, floorId: 2, x: 300, y: -100 },
      { id: 5, floorId: 2, x: 300, y: 100 },
    ]
    const otherFloorWall = { id: 12, floorId: 2, p1Id: 4, p2Id: 5, thickness: 20, height: 280 }

    expect(getSnapPoints(horizontal, otherFloorPoints, [horizontal, otherFloorWall])).toHaveLength(3)
  })

  it('ucu eksik duvarda boş döner', () => {
    expect(getSnapPoints(makeWall(99, 1, 404, 20), points, walls)).toEqual([])
  })
})

describe('getPlacementRange', () => {
  it('boştaki uçta pay bırakmaz, köşede dik duvarın kalınlığı kadar bırakır', () => {
    // p1 (0,0) boşta → 0. p2 (400,0) dikey duvarla birleşiyor (kalınlık 30) → 400 - 30.
    expect(getPlacementRange(horizontal, points, walls)).toEqual({
      minOffsetCm: 0,
      maxOffsetCm: 370,
    })
  })

  it('payı doğru uca uygular', () => {
    // Dikey duvarın p1'i köşe (yatay duvar, kalınlık 20), p2'si boşta.
    expect(getPlacementRange(vertical, points, walls)).toEqual({
      minOffsetCm: 20,
      maxOffsetCm: 300,
    })
  })

  it('köşede birden çok duvar varsa en kalınını esas alır', () => {
    const thick = makeWall(12, 2, 3, 45)
    expect(getPlacementRange(horizontal, points, [...walls, thick])?.maxOffsetCm).toBe(355)
  })

  it('duvarsız köşede tüm duvar boyu kullanılabilir', () => {
    expect(getPlacementRange(horizontal, points, [horizontal])).toEqual({
      minOffsetCm: 0,
      maxOffsetCm: 400,
    })
  })

  it('ucu eksik duvarda undefined döner', () => {
    expect(getPlacementRange(makeWall(99, 1, 404, 20), points, walls)).toBeUndefined()
  })
})

/**
 * Panelden uzunluk yazmanın çekirdeği (K141): p1 sabit, p2 doğrultu üzerinde
 * kayar. Duvar ve kiriş panelleri aynı fonksiyonu kullanıyor.
 */
describe('getSegmentEndAtLength', () => {
  const a = { x: 100, y: 100 }

  it('yönü KORUR, yalnız boyu değiştirir', () => {
    // (100,100) → (400,100): yatay, 300 cm. 500 istenince x 600 olur.
    expect(getSegmentEndAtLength(a, { x: 400, y: 100 }, 500)).toEqual({ x: 600, y: 100 })
  })

  it('eğik parçada da oran korunur', () => {
    // 3-4-5 üçgeni: (0,0) → (30,40) 50 cm; 100 istenince iki katı.
    expect(getSegmentEndAtLength({ x: 0, y: 0 }, { x: 30, y: 40 }, 100)).toEqual({ x: 60, y: 80 })
  })

  it('kısaltma da aynı yoldan: uç p1e doğru gelir', () => {
    expect(getSegmentEndAtLength(a, { x: 400, y: 100 }, 100)).toEqual({ x: 200, y: 100 })
  })

  it('SIFIR boylu parçada undefined döner — yön tanımsız, uydurulmaz', () => {
    expect(getSegmentEndAtLength(a, { ...a }, 300)).toBeUndefined()
  })

  it('sıfır uzunluk istenirse uç p1in üstüne gelir (çağıran asgariyi kendi dayatır)', () => {
    expect(getSegmentEndAtLength(a, { x: 400, y: 100 }, 0)).toEqual({ x: 100, y: 100 })
  })
})
