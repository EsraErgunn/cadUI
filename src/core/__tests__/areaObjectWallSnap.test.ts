import { describe, expect, it } from 'vitest'

import type { AreaObjectShape } from '../areaObject'
import { findAreaObjectWallSnap, hasAreaObjectWallSnap } from '../areaObjectWallSnap'
import type { Point, Wall } from '../model'
import { DEFAULT_WALL_THICKNESS_CM } from '../wall'

const FLOOR_ID = 1

/** Yatay duvar: (0,0) → (600,0), 20 cm kalın. Yüzleri y = ±10. */
const POINTS: Point[] = [
  { id: 1, floorId: FLOOR_ID, x: 0, y: 0 },
  { id: 2, floorId: FLOOR_ID, x: 600, y: 0 },
]
const WALL: Wall = {
  id: 10,
  floorId: FLOOR_ID,
  p1Id: 1,
  p2Id: 2,
  thickness: DEFAULT_WALL_THICKNESS_CM,
  height: 280,
}

/** 50×50 kolon; yaslanınca merkezi yüzden 25 cm uzakta durur. */
const COLUMN: AreaObjectShape = { x: 0, y: 0, widthCm: 50, lengthCm: 50, angleDeg: 0 }

const TOLERANCE_CM = 15

function snap(cursor: { x: number; y: number }, shape = COLUMN, isAligned = true) {
  return findAreaObjectWallSnap(
    { ...shape, x: cursor.x, y: cursor.y },
    cursor,
    [WALL],
    POINTS,
    TOLERANCE_CM,
    isAligned,
  )
}

describe('hasAreaObjectWallSnap', () => {
  it('yalnız kolon ve baca şaftı yapışır (kullanıcı seçti)', () => {
    expect(hasAreaObjectWallSnap('structuralColumn')).toBe(true)
    expect(hasAreaObjectWallSnap('flueShaft')).toBe(true)
    // Merdiven mahalin ortasında da durabiliyor; havalandırma şaftın yanında.
    expect(hasAreaObjectWallSnap('stairs')).toBe(false)
    expect(hasAreaObjectWallSnap('columnVentilation')).toBe(false)
  })
})

describe('findAreaObjectWallSnap', () => {
  it('nesneyi duvarın YÜZÜNE yaslar, içine sokmaz', () => {
    // Duvar yüzü y = 10; 50 cm kolonun merkezi 10 + 25 = 35'te olmalı.
    const result = snap({ x: 300, y: 30 })

    expect(result?.position).toEqual({ x: 300, y: 35 })
    expect(result?.wallId).toBe(WALL.id)
  })

  it('imlecin bulunduğu TARAFA yaslar', () => {
    expect(snap({ x: 300, y: -30 })?.position.y).toBeCloseTo(-35, 6)
  })

  it('duvar boyunca SERBEST kayar: yalnız dik yön kelepçelenir', () => {
    expect(snap({ x: 120, y: 30 })?.position.x).toBeCloseTo(120, 6)
    expect(snap({ x: 480, y: 30 })?.position.x).toBeCloseTo(480, 6)
  })

  it('duvarın UCUNU geçen nesne uca kelepçelenir, ötesine kaymaz', () => {
    // Duvar 0–600 arası; ucun biraz ötesindeki nesne uca oturur.
    expect(snap({ x: 610, y: 20 })?.position.x).toBeCloseTo(600, 6)
  })

  it('duvardan ÇOK uzaktaki nesne uca yapışmaz — orası artık duvar değil', () => {
    // Ucun 300 cm ötesi: izdüşüm uca kelepçelenir ama uzaklık toleransı aşar.
    expect(snap({ x: 900, y: 20 })).toBeUndefined()
  })

  it('yakınlık nesnenin KENARINDAN ölçülür, merkezinden değil', () => {
    // Merkez yüzden 35 cm uzakken kenar TAM yüze değiyor: boşluk 0, yakalanır.
    expect(snap({ x: 300, y: 35 })).toBeDefined()
    // Kenar toleransın dışına çıkınca bırakır (35 + 25 = 60 > 10 + 15).
    expect(snap({ x: 300, y: 60 })).toBeUndefined()
  })

  it('duvara GÖMÜLÜ nesne dışarı itilir (negatif boşluk da yakalanır)', () => {
    const result = snap({ x: 300, y: 4 })

    expect(result?.position.y).toBeCloseTo(35, 6)
  })

  it('duvarın açısını bildirir; yaslanma payı DÖNDÜRÜLMÜŞ hâlden hesaplanır', () => {
    // Dikey duvar: (0,0) → (0,600). Yüzleri x = ±10.
    const verticalPoints: Point[] = [
      { id: 1, floorId: FLOOR_ID, x: 0, y: 0 },
      { id: 2, floorId: FLOOR_ID, x: 0, y: 600 },
    ]
    const result = findAreaObjectWallSnap(
      { ...COLUMN, x: 30, y: 300 },
      { x: 30, y: 300 },
      [WALL],
      verticalPoints,
      TOLERANCE_CM,
      true,
    )

    expect(result?.wallAngleDeg).toBeCloseTo(90, 6)
    expect(result?.position.x).toBeCloseTo(35, 6)
    expect(result?.position.y).toBeCloseTo(300, 6)
  })

  it('dikdörtgen nesnede pay dik yöndeki YARI BOYDAN gelir', () => {
    // 50 geniş × 100 uzun, duvara hizalı: dik yönde yarı boy 50.
    const result = snap({ x: 300, y: 30 }, { ...COLUMN, lengthCm: 100 })

    expect(result?.position.y).toBeCloseTo(10 + 50, 6)
  })

  it('hizalanmayan (taşınan) nesnede pay MEVCUT açıdan hesaplanır', () => {
    // 45° dönmüş 50×50 karenin dik yöndeki yarı kalınlığı 25√2 ≈ 35.36.
    const rotated = { ...COLUMN, angleDeg: 45 }
    const result = snap({ x: 300, y: 40 }, rotated, false)

    expect(result?.position.y).toBeCloseTo(10 + Math.SQRT2 * 25, 4)
  })

  it('uzaktaki imleç hiçbir duvara yaslanmaz', () => {
    expect(snap({ x: 300, y: 400 })).toBeUndefined()
  })

  it('duvarı olmayan projede undefined döner', () => {
    expect(
      findAreaObjectWallSnap(COLUMN, { x: 0, y: 0 }, [], [], TOLERANCE_CM, true),
    ).toBeUndefined()
  })

  it('EN YAKIN duvarı seçer', () => {
    const farWall: Wall = { ...WALL, id: 11, p1Id: 3, p2Id: 4 }
    const points: Point[] = [
      ...POINTS,
      { id: 3, floorId: FLOOR_ID, x: 0, y: 100 },
      { id: 4, floorId: FLOOR_ID, x: 600, y: 100 },
    ]
    const cursor = { x: 300, y: 80 }

    const result = findAreaObjectWallSnap(
      { ...COLUMN, ...cursor },
      cursor,
      [WALL, farWall],
      points,
      TOLERANCE_CM,
      true,
    )

    // y = 100'deki duvar daha yakın; kolon onun alt yüzüne (100 − 10 − 25) yaslanır.
    expect(result?.wallId).toBe(farWall.id)
    expect(result?.position.y).toBeCloseTo(65, 6)
  })
})
