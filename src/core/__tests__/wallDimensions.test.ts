import { describe, expect, it } from 'vitest'

import type { Point, Wall } from '../model'
import { getWallDimensionAnnotations } from '../wallDimensions'

const FLOOR_ID = 1
const OTHER_FLOOR_ID = 2
const WALL_HEIGHT_CM = 280
const THICKNESS_CM = 20

const POINTS: Point[] = [
  { id: 10, floorId: FLOOR_ID, x: 0, y: 0 },
  { id: 11, floorId: FLOOR_ID, x: 400, y: 0 },
  { id: 12, floorId: FLOOR_ID, x: 0, y: 300 },
]

function makeWall(id: number, p1Id: number, p2Id: number, floorId = FLOOR_ID): Wall {
  return { id, floorId, p1Id, p2Id, thickness: THICKNESS_CM, height: WALL_HEIGHT_CM }
}

/** Duvar yüzü + boşluk: fonksiyon kalınlığın yarısını kendisi ekliyor. */
const GAP_CM = 5
const EXPECTED_OFFSET_CM = THICKNESS_CM / 2 + GAP_CM

const OPTIONS = { activeFloorId: FLOOR_ID, gapCm: GAP_CM }

describe('getWallDimensionAnnotations', () => {
  it('yatay duvarın ölçüsünü ekseninin dikinde konumlandırır', () => {
    const [annotation] = getWallDimensionAnnotations([makeWall(20, 10, 11)], POINTS, OPTIONS)

    expect(annotation?.lengthCm).toBe(400)
    expect(annotation?.angleDeg).toBe(0)
    // Orta nokta (200, 0), sol normal +y yönünde.
    expect(annotation?.position).toEqual({ x: 200, y: EXPECTED_OFFSET_CM })
  })

  it('uzunluk EKSEN boyudur, kalınlık uzunluğa karışmaz', () => {
    const thickWall = { ...makeWall(20, 10, 11), thickness: 60 }

    const [annotation] = getWallDimensionAnnotations([thickWall], POINTS, OPTIONS)

    expect(annotation?.lengthCm).toBe(400)
    // Kaydırma kalınlıkla büyür: yazı kalın duvarın yüzüne binmesin.
    expect(annotation?.position.y).toBe(60 / 2 + GAP_CM)
  })

  it('baş aşağı düşecek yazıyı çevirir — ölçü hep okunur yönde', () => {
    // p1 sağda, p2 solda: ham açı 180°, yazı ters dururdu.
    const reversed = makeWall(21, 11, 10)

    const [annotation] = getWallDimensionAnnotations([reversed], POINTS, OPTIONS)

    expect(annotation?.angleDeg).toBe(0)
    // Yan da aynı kalır: etiketin düştüğü taraf duvarın GEOMETRİSİNDEN geliyor,
    // hangi ucun p1 olduğundan değil. Aynı duvar ters yönde çizilseydi ölçüsü
    // öbür yana atlardı ve plan, çizim sırasına göre farklı görünürdü.
    expect(annotation?.position).toEqual({ x: 200, y: EXPECTED_OFFSET_CM })
  })

  it('dikey duvarda açı 90° kalır', () => {
    const [annotation] = getWallDimensionAnnotations([makeWall(22, 10, 12)], POINTS, OPTIONS)

    expect(annotation?.angleDeg).toBe(90)
    expect(annotation?.lengthCm).toBe(300)
    // Sol normal (-1, 0): dikey duvarın yazısı soluna düşer.
    expect(annotation?.position).toEqual({ x: -EXPECTED_OFFSET_CM, y: 150 })
  })

  it('başka kattaki duvarı atlar', () => {
    const otherFloorWall = makeWall(23, 10, 11, OTHER_FLOOR_ID)

    const annotations = getWallDimensionAnnotations([otherFloorWall], POINTS, OPTIONS)

    expect(annotations).toHaveLength(0)
  })

  it('wallIds verilince yalnız o duvarları yazar', () => {
    const walls = [makeWall(20, 10, 11), makeWall(22, 10, 12)]

    const annotations = getWallDimensionAnnotations(walls, POINTS, { ...OPTIONS, wallIds: [22] })

    expect(annotations.map((annotation) => annotation.wallId)).toEqual([22])
  })

  it('boş wallIds hiçbir ölçü üretmez — "hepsi" ile karıştırılmaz', () => {
    const annotations = getWallDimensionAnnotations([makeWall(20, 10, 11)], POINTS, {
      ...OPTIONS,
      wallIds: [],
    })

    expect(annotations).toHaveLength(0)
  })

  it('sıfır boy duvara ölçü yazmaz', () => {
    const degenerate = makeWall(24, 10, 10)

    const annotations = getWallDimensionAnnotations([degenerate], POINTS, OPTIONS)

    expect(annotations).toHaveLength(0)
  })

  it('köşesi çözülemeyen duvarı atlar', () => {
    const orphan = makeWall(25, 10, 999)

    const annotations = getWallDimensionAnnotations([orphan], POINTS, OPTIONS)

    expect(annotations).toHaveLength(0)
  })

  it('sürüklenen köşenin GEÇİCİ konumunu kullanır', () => {
    // Sahne cadStore yerine useArchitecturePoints veriyor; ölçü canlı olmalı.
    const draggedPoints = POINTS.map((point) =>
      point.id === 11 ? { ...point, x: 500 } : point,
    )

    const [annotation] = getWallDimensionAnnotations([makeWall(20, 10, 11)], draggedPoints, OPTIONS)

    expect(annotation?.lengthCm).toBe(500)
  })
})
