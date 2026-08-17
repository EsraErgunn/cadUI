import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import {
  getSnapToleranceCm,
  isSnapOnExistingGeometry,
  resolveSnap,
  SNAP_TOLERANCE_PX,
  type SnapContext,
  type SnapOptions,
} from '../snap'

const FLOOR_ID = 1

function makePoint(id: number, x: number, y: number, floorId = FLOOR_ID): Point {
  return { id, floorId, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, floorId = FLOOR_ID): Wall {
  return { id, floorId, p1Id, p2Id, thickness: 20, height: 280 }
}

// Yatay duvar: (0,0) → (400,0).
const points = [makePoint(1, 0, 0), makePoint(2, 400, 0)]
const walls = [makeWall(10, 1, 2)]

const context: SnapContext = { points, walls, floorId: FLOOR_ID }
const emptyContext: SnapContext = { points: [], walls: [], floorId: FLOOR_ID }

const options: SnapOptions = { toleranceCm: 20, gridStepCm: 50, isGridSnapEnabled: true }

describe('getSnapToleranceCm', () => {
  it('%100 zoomda px eşiği doğrudan cm karşılığıdır', () => {
    expect(getSnapToleranceCm(1)).toBe(SNAP_TOLERANCE_PX)
  })

  it('uzaklaşınca cm karşılığı büyür, yakınlaşınca küçülür', () => {
    expect(getSnapToleranceCm(0.5)).toBe(SNAP_TOLERANCE_PX * 2)
    expect(getSnapToleranceCm(2)).toBe(SNAP_TOLERANCE_PX / 2)
  })
})

describe('isSnapOnExistingGeometry', () => {
  it('var olan çizime yapışmayı bildirir', () => {
    expect(isSnapOnExistingGeometry('point')).toBe(true)
    expect(isSnapOnExistingGeometry('wallSnapPoint')).toBe(true)
    expect(isSnapOnExistingGeometry('wallEdge')).toBe(true)
  })

  it('ızgara ve serbest imleci saymaz — boşluğa konumlandırma bağlanma değildir', () => {
    expect(isSnapOnExistingGeometry('grid')).toBe(false)
    expect(isSnapOnExistingGeometry('none')).toBe(false)
    expect(isSnapOnExistingGeometry(null)).toBe(false)
  })
})

describe('resolveSnap — öncelik sırası', () => {
  it('var olan köşeye yapışır ve o noktanın id\'sini döndürür', () => {
    const result = resolveSnap({ x: 5, y: 5 }, context, options)

    expect(result.kind).toBe('point')
    expect(result.point).toEqual({ x: 0, y: 0 })
    // id dönmezse çağıran aynı yerde ikinci bir Point üretir.
    expect(result.pointId).toBe(1)
  })

  it('köşe uzaktayken duvarın orta noktasına yapışır', () => {
    const result = resolveSnap({ x: 205, y: 8 }, context, options)

    expect(result.kind).toBe('wallSnapPoint')
    expect(result.point).toEqual({ x: 200, y: 0 })
    expect(result.wallId).toBe(10)
  })

  it('anlamlı nokta yoksa duvarın gövdesine dik izdüşürür', () => {
    const result = resolveSnap({ x: 300, y: 8 }, context, options)

    expect(result.kind).toBe('wallEdge')
    expect(result.point).toEqual({ x: 300, y: 0 })
    expect(result.wallId).toBe(10)
  })

  it('hiçbir hedef yakın değilse ızgaraya yuvarlar', () => {
    const result = resolveSnap({ x: 124, y: 640 }, context, options)

    expect(result.kind).toBe('grid')
    expect(result.point).toEqual({ x: 100, y: 650 })
  })

  it('iki köşe de yakınsa daha yakın olanı seçer', () => {
    const result = resolveSnap({ x: 390, y: 0 }, context, options)

    expect(result.pointId).toBe(2)
    expect(result.point).toEqual({ x: 400, y: 0 })
  })
})

describe('resolveSnap — ızgara var olan köşenin üstüne düşerse', () => {
  it('yeni nokta değil, o köşenin id\'sini döndürür', () => {
    // (0,0) köşesine 20 cm uzak: tolerans (20) dışında değil ama emin olmak için
    // toleransı küçültüyoruz; ızgara yuvarlaması yine de tam (0,0)'a getiriyor.
    const tight: SnapOptions = { ...options, toleranceCm: 5 }
    const result = resolveSnap({ x: 18, y: -14 }, context, tight)

    expect(result.kind).toBe('point')
    expect(result.pointId).toBe(1)
    expect(result.point).toEqual({ x: 0, y: 0 })
  })

  it('köşe olmayan ızgara kesişiminde grid döner', () => {
    const tight: SnapOptions = { ...options, toleranceCm: 5 }

    expect(resolveSnap({ x: 640, y: 640 }, context, tight).kind).toBe('grid')
  })

  it('ızgara kapalıyken de çakışan köşeyi yakalar', () => {
    const gridOff: SnapOptions = { ...options, isGridSnapEnabled: false, toleranceCm: 0 }
    const result = resolveSnap({ x: 400, y: 0 }, context, gridOff)

    expect(result.kind).toBe('point')
    expect(result.pointId).toBe(2)
  })
})

describe('resolveSnap — ızgara kapalıyken', () => {
  const gridOff: SnapOptions = { ...options, isGridSnapEnabled: false }

  it('hedef yoksa imleci olduğu yerde bırakır', () => {
    const result = resolveSnap({ x: 124, y: 640 }, context, gridOff)

    expect(result.kind).toBe('none')
    expect(result.point).toEqual({ x: 124, y: 640 })
  })

  it('duvar hedefleri ızgaradan bağımsız çalışmaya devam eder', () => {
    expect(resolveSnap({ x: 5, y: 5 }, context, gridOff).kind).toBe('point')
  })
})

describe('resolveSnap — tolerans', () => {
  it('tolerans dışındaki köşeye yapışmaz', () => {
    // (0,0)'a uzaklık ~28 cm > 20 cm tolerans.
    expect(resolveSnap({ x: 20, y: 20 }, context, options).kind).not.toBe('point')
  })

  it('tolerans büyütülünce aynı köşe yakalanır', () => {
    const result = resolveSnap({ x: 20, y: 20 }, context, { ...options, toleranceCm: 40 })

    expect(result.kind).toBe('point')
    expect(result.pointId).toBe(1)
  })
})

describe('resolveSnap — kat ayrımı', () => {
  it('başka kattaki noktaya ve duvara yapışmaz', () => {
    const otherFloor: SnapContext = {
      points: [makePoint(1, 0, 0, 2), makePoint(2, 400, 0, 2)],
      walls: [makeWall(10, 1, 2, 2)],
      floorId: FLOOR_ID,
    }

    expect(resolveSnap({ x: 5, y: 5 }, otherFloor, options).kind).toBe('grid')
  })
})

describe('resolveSnap — boş proje', () => {
  it('hiç duvar yokken ızgaraya düşer', () => {
    const result = resolveSnap({ x: 124, y: 126 }, emptyContext, options)

    expect(result.kind).toBe('grid')
    expect(result.point).toEqual({ x: 100, y: 150 })
  })
})

/**
 * Aday duvarlar sınır kutusuyla önceden eleniyor (O(N²) kesişim taramasını
 * kısaltmak için). Eleme fazla agresif olursa yakalama SESSİZCE kaybolur —
 * kullanıcı duvara yapışamaz ama hata da almaz. Bu blok elemenin sınırlarını
 * sabitliyor.
 */
describe('resolveSnap — sınır kutusu elemesi aday kaybetmez', () => {
  // Yatay duvar (0,0)→(400,0) ile onu x=300'de kesen dikey duvar.
  const crossingPoints = [
    makePoint(1, 0, 0),
    makePoint(2, 400, 0),
    makePoint(3, 300, -100),
    makePoint(4, 300, 100),
  ]
  const crossingWalls = [makeWall(10, 1, 2), makeWall(11, 3, 4)]
  const crossingContext: SnapContext = {
    points: crossingPoints,
    walls: crossingWalls,
    floorId: FLOOR_ID,
  }

  it('iki duvarın kesişimini yakalar — kesişim iki uçtan da uzakta', () => {
    const result = resolveSnap({ x: 300, y: 6 }, crossingContext, options)

    expect(result.kind).toBe('wallSnapPoint')
    expect(result.point).toEqual({ x: 300, y: 0 })
  })

  it('uzun duvarın ortasına, iki ucundan da uzakken yapışır', () => {
    const result = resolveSnap({ x: 200, y: 6 }, crossingContext, options)

    expect(result.kind).toBe('wallSnapPoint')
    expect(result.point).toEqual({ x: 200, y: 0 })
  })

  it('kutusu uzak kalan duvara yapışmaz', () => {
    // Dikey duvar x=300'de; hedef x=0 tarafında, tolerans 20 cm.
    const farContext: SnapContext = {
      points: [makePoint(3, 300, -100), makePoint(4, 300, 100)],
      walls: [makeWall(11, 3, 4)],
      floorId: FLOOR_ID,
    }

    expect(resolveSnap({ x: 0, y: 50 }, farContext, options).kind).toBe('grid')
  })

  it('ucu eksik duvar aday üretmez, çökmez', () => {
    const brokenContext: SnapContext = {
      points: [makePoint(1, 0, 0)],
      walls: [makeWall(10, 1, 404)],
      floorId: FLOOR_ID,
    }

    expect(resolveSnap({ x: 2, y: 2 }, brokenContext, options).kind).toBe('point')
  })
})
