import { describe, expect, it } from 'vitest'

import { getCornerAngleAnnotations, getCornerAngleMarkerPoints } from '../cornerAngles'
import type { Point, Wall } from '../model'

const FLOOR_ID = 1
const OTHER_FLOOR_ID = 2
const WALL_HEIGHT_CM = 280
const THICKNESS_CM = 20
const OFFSET_CM = 40

/** Köşe (0,0); kollar doğu, kuzey, batı ve güneye gidiyor. */
const CORNER_ID = 10
const POINTS: Point[] = [
  { id: CORNER_ID, floorId: FLOOR_ID, x: 0, y: 0 },
  { id: 11, floorId: FLOOR_ID, x: 400, y: 0 },
  { id: 12, floorId: FLOOR_ID, x: 0, y: 300 },
  { id: 13, floorId: FLOOR_ID, x: -400, y: 0 },
  { id: 14, floorId: FLOOR_ID, x: 0, y: -300 },
]

function makeWall(id: number, p1Id: number, p2Id: number, floorId = FLOOR_ID): Wall {
  return { id, floorId, p1Id, p2Id, thickness: THICKNESS_CM, height: WALL_HEIGHT_CM }
}

const OPTIONS = { activeFloorId: FLOOR_ID, offsetCm: OFFSET_CM }

/** Köşedeki açıları büyükten küçüğe değil, kararlı biçimde karşılaştırmak için. */
function anglesOf(annotations: { angleDeg: number }[]): number[] {
  return annotations.map((item) => item.angleDeg).sort((a, b) => a - b)
}

describe('getCornerAngleAnnotations', () => {
  it('dik köşede 90° yazar', () => {
    const walls = [makeWall(20, CORNER_ID, 11), makeWall(21, CORNER_ID, 12)]

    const annotations = getCornerAngleAnnotations(walls, POINTS, OPTIONS)

    expect(anglesOf(annotations)).toEqual([90])
  })

  it('etiketi AÇIORTAY üzerine koyar', () => {
    // Doğu + kuzey kolları → açıortay 45°, köşeden offset kadar uzakta.
    const walls = [makeWall(20, CORNER_ID, 11), makeWall(21, CORNER_ID, 12)]

    const [annotation] = getCornerAngleAnnotations(walls, POINTS, OPTIONS)

    const expected = (OFFSET_CM * Math.SQRT2) / 2
    expect(annotation?.position.x).toBeCloseTo(expected)
    expect(annotation?.position.y).toBeCloseTo(expected)
  })

  it('iki kollu köşede TERS açıyı (360−x) yazmaz', () => {
    // Aksi halde her köşede biri gereksiz iki sayı olurdu.
    const walls = [makeWall(20, CORNER_ID, 11), makeWall(21, CORNER_ID, 12)]

    expect(getCornerAngleAnnotations(walls, POINTS, OPTIONS)).toHaveLength(1)
  })

  it('üç kollu birleşimde her boşluğu ayrı yazar, toplamları 360°', () => {
    // Doğu + kuzey + batı: 90 + 90 + 180.
    const walls = [
      makeWall(20, CORNER_ID, 11),
      makeWall(21, CORNER_ID, 12),
      makeWall(22, CORNER_ID, 13),
    ]

    const annotations = getCornerAngleAnnotations(walls, POINTS, OPTIONS)

    expect(anglesOf(annotations)).toEqual([90, 90, 180])
    expect(annotations.reduce((sum, item) => sum + item.angleDeg, 0)).toBeCloseTo(360)
  })

  it('dört kollu birleşimde dört açı çıkar', () => {
    const walls = [
      makeWall(20, CORNER_ID, 11),
      makeWall(21, CORNER_ID, 12),
      makeWall(22, CORNER_ID, 13),
      makeWall(23, CORNER_ID, 14),
    ]

    const annotations = getCornerAngleAnnotations(walls, POINTS, OPTIONS).filter(
      (item) => item.pointId === CORNER_ID,
    )

    expect(anglesOf(annotations)).toEqual([90, 90, 90, 90])
  })

  it('duvarın ÖBÜR ucundaki köşeyi de ölçer', () => {
    // İki duvar 11 noktasında da buluşuyorsa oranın açısı da yazılmalı.
    const walls = [makeWall(20, CORNER_ID, 11), makeWall(21, 11, 12)]

    const annotations = getCornerAngleAnnotations(walls, POINTS, OPTIONS)

    expect(annotations.map((item) => item.pointId)).toEqual([11])
  })

  it('tek duvarlı uçta açı yazmaz', () => {
    const walls = [makeWall(20, CORNER_ID, 11)]

    expect(getCornerAngleAnnotations(walls, POINTS, OPTIONS)).toHaveLength(0)
  })

  it('başka kattaki duvarları saymaz', () => {
    const walls = [
      makeWall(20, CORNER_ID, 11),
      makeWall(21, CORNER_ID, 12, OTHER_FLOOR_ID),
    ]

    expect(getCornerAngleAnnotations(walls, POINTS, OPTIONS)).toHaveLength(0)
  })

  it('pointIds verilince yalnız o köşeleri yazar', () => {
    const walls = [makeWall(20, CORNER_ID, 11), makeWall(21, CORNER_ID, 12), makeWall(22, 11, 12)]

    const annotations = getCornerAngleAnnotations(walls, POINTS, {
      ...OPTIONS,
      pointIds: [CORNER_ID],
    })

    expect(annotations.map((item) => item.pointId)).toEqual([CORNER_ID])
  })

  it('sıfır boy duvar köşeye kol EKLEMEZ', () => {
    // atan2(0,0) sessizce 0 döndürüyor; kol sayılsaydı olmayan bir açı çıkardı.
    const walls = [makeWall(20, CORNER_ID, 11), makeWall(21, CORNER_ID, CORNER_ID)]

    expect(getCornerAngleAnnotations(walls, POINTS, OPTIONS)).toHaveLength(0)
  })

  it('köşesi çözülemeyen duvarı atlar', () => {
    const walls = [makeWall(20, CORNER_ID, 11), makeWall(21, CORNER_ID, 999)]

    expect(getCornerAngleAnnotations(walls, POINTS, OPTIONS)).toHaveLength(0)
  })

  it('her açının anahtarı benzersiz', () => {
    const walls = [
      makeWall(20, CORNER_ID, 11),
      makeWall(21, CORNER_ID, 12),
      makeWall(22, CORNER_ID, 13),
    ]

    const keys = getCornerAngleAnnotations(walls, POINTS, OPTIONS).map((item) => item.key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('işaret için köşeyi ve başlangıç yönünü de verir', () => {
    // Çizim tarafı yayı buradan üretiyor; konum tek başına yetmez.
    const walls = [makeWall(20, CORNER_ID, 11), makeWall(21, CORNER_ID, 12)]

    const [annotation] = getCornerAngleAnnotations(walls, POINTS, OPTIONS)

    expect(annotation?.corner).toEqual({ x: 0, y: 0 })
    expect(annotation?.startAngleDeg).toBe(0)
  })

  it('dar açıyı da yazar — 45°', () => {
    const diagonalPoints: Point[] = [
      ...POINTS,
      { id: 15, floorId: FLOOR_ID, x: 300, y: 300 },
    ]
    const walls = [makeWall(20, CORNER_ID, 11), makeWall(21, CORNER_ID, 15)]

    const annotations = getCornerAngleAnnotations(walls, diagonalPoints, OPTIONS)

    expect(annotations[0]?.angleDeg).toBeCloseTo(45)
  })
})

describe('getCornerAngleMarkerPoints', () => {
  const corner = { x: 0, y: 0 }
  const radiusCm = 10

  it('dik açıda KARE çizer — üç nokta, iki çizgi', () => {
    const points = getCornerAngleMarkerPoints(
      { corner, startAngleDeg: 0, angleDeg: 90 },
      radiusCm,
    )

    expect(points).toHaveLength(3)
    expect(points[0]?.x).toBeCloseTo(radiusCm)
    expect(points[0]?.y).toBeCloseTo(0)
    // Dış köşe açıortay üzerinde, radius√2 uzakta → (10, 10).
    expect(points[1]?.x).toBeCloseTo(radiusCm)
    expect(points[1]?.y).toBeCloseTo(radiusCm)
    expect(points[2]?.x).toBeCloseTo(0)
    expect(points[2]?.y).toBeCloseTo(radiusCm)
  })

  it('kayan nokta artığı dik açıyı yay yapmaz', () => {
    // Trigonometriden 89.9999 çıkıyor; tolerans olmasaydı kare yerine yay olurdu.
    const points = getCornerAngleMarkerPoints(
      { corner, startAngleDeg: 0, angleDeg: 89.9999 },
      radiusCm,
    )

    expect(points).toHaveLength(3)
  })

  it('dik olmayan açıda YAY çizer, noktalar yarıçap üzerinde durur', () => {
    const points = getCornerAngleMarkerPoints(
      { corner, startAngleDeg: 0, angleDeg: 60 },
      radiusCm,
    )

    expect(points.length).toBeGreaterThan(3)
    for (const point of points) {
      expect(Math.hypot(point.x, point.y)).toBeCloseTo(radiusCm)
    }
  })

  it('yay tam olarak açının başında ve sonunda biter', () => {
    const points = getCornerAngleMarkerPoints(
      { corner, startAngleDeg: 30, angleDeg: 120 },
      radiusCm,
    )

    const first = points[0]!
    const last = points[points.length - 1]!
    expect((Math.atan2(first.y, first.x) * 180) / Math.PI).toBeCloseTo(30)
    expect((Math.atan2(last.y, last.x) * 180) / Math.PI).toBeCloseTo(150)
  })

  it('geniş açıda daha çok nokta üretir — köşeli görünmesin', () => {
    const narrow = getCornerAngleMarkerPoints(
      { corner, startAngleDeg: 0, angleDeg: 30 },
      radiusCm,
    )
    const wide = getCornerAngleMarkerPoints(
      { corner, startAngleDeg: 0, angleDeg: 270 },
      radiusCm,
    )

    expect(wide.length).toBeGreaterThan(narrow.length)
  })

  it('köşe orijinde değilken de köşeye göre çizer', () => {
    const points = getCornerAngleMarkerPoints(
      { corner: { x: 100, y: 50 }, startAngleDeg: 0, angleDeg: 90 },
      radiusCm,
    )

    expect(points[0]).toEqual({ x: 110, y: 50 })
  })
})
