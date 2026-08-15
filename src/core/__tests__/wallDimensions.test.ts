import { describe, expect, it } from 'vitest'

import type { Opening, Point, Wall } from '../model'
import { getWallDimensionAnnotations } from '../wallDimensions'

/** Açıklıksız duvar: bölme yok, tek ölçü. */
const NO_OPENINGS: Opening[] = []

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
    const [annotation] = getWallDimensionAnnotations([makeWall(20, 10, 11)], POINTS, NO_OPENINGS, OPTIONS)

    expect(annotation?.lengthCm).toBe(400)
    expect(annotation?.angleDeg).toBe(0)
    // Orta nokta (200, 0), sol normal +y yönünde.
    expect(annotation?.position).toEqual({ x: 200, y: EXPECTED_OFFSET_CM })
  })

  it('uzunluk EKSEN boyudur, kalınlık uzunluğa karışmaz', () => {
    const thickWall = { ...makeWall(20, 10, 11), thickness: 60 }

    const [annotation] = getWallDimensionAnnotations([thickWall], POINTS, NO_OPENINGS, OPTIONS)

    expect(annotation?.lengthCm).toBe(400)
    // Kaydırma kalınlıkla büyür: yazı kalın duvarın yüzüne binmesin.
    expect(annotation?.position.y).toBe(60 / 2 + GAP_CM)
  })

  it('baş aşağı düşecek yazıyı çevirir — ölçü hep okunur yönde', () => {
    // p1 sağda, p2 solda: ham açı 180°, yazı ters dururdu.
    const reversed = makeWall(21, 11, 10)

    const [annotation] = getWallDimensionAnnotations([reversed], POINTS, NO_OPENINGS, OPTIONS)

    expect(annotation?.angleDeg).toBe(0)
    // Yan da aynı kalır: etiketin düştüğü taraf duvarın GEOMETRİSİNDEN geliyor,
    // hangi ucun p1 olduğundan değil. Aynı duvar ters yönde çizilseydi ölçüsü
    // öbür yana atlardı ve plan, çizim sırasına göre farklı görünürdü.
    expect(annotation?.position).toEqual({ x: 200, y: EXPECTED_OFFSET_CM })
  })

  it('dikey duvarda açı 90° kalır', () => {
    const [annotation] = getWallDimensionAnnotations([makeWall(22, 10, 12)], POINTS, NO_OPENINGS, OPTIONS)

    expect(annotation?.angleDeg).toBe(90)
    expect(annotation?.lengthCm).toBe(300)
    // Sol normal (-1, 0): dikey duvarın yazısı soluna düşer.
    expect(annotation?.position).toEqual({ x: -EXPECTED_OFFSET_CM, y: 150 })
  })

  it('başka kattaki duvarı atlar', () => {
    const otherFloorWall = makeWall(23, 10, 11, OTHER_FLOOR_ID)

    const annotations = getWallDimensionAnnotations([otherFloorWall], POINTS, NO_OPENINGS, OPTIONS)

    expect(annotations).toHaveLength(0)
  })

  it('wallIds verilince yalnız o duvarları yazar', () => {
    const walls = [makeWall(20, 10, 11), makeWall(22, 10, 12)]

    const annotations = getWallDimensionAnnotations(walls, POINTS, NO_OPENINGS, { ...OPTIONS, wallIds: [22] })

    expect(annotations.map((annotation) => annotation.wallId)).toEqual([22])
  })

  it('boş wallIds hiçbir ölçü üretmez — "hepsi" ile karıştırılmaz', () => {
    const annotations = getWallDimensionAnnotations([makeWall(20, 10, 11)], POINTS, NO_OPENINGS, {
      ...OPTIONS,
      wallIds: [],
    })

    expect(annotations).toHaveLength(0)
  })

  it('sıfır boy duvara ölçü yazmaz', () => {
    const degenerate = makeWall(24, 10, 10)

    const annotations = getWallDimensionAnnotations([degenerate], POINTS, NO_OPENINGS, OPTIONS)

    expect(annotations).toHaveLength(0)
  })

  it('köşesi çözülemeyen duvarı atlar', () => {
    const orphan = makeWall(25, 10, 999)

    const annotations = getWallDimensionAnnotations([orphan], POINTS, NO_OPENINGS, OPTIONS)

    expect(annotations).toHaveLength(0)
  })

  it('sürüklenen köşenin GEÇİCİ konumunu kullanır', () => {
    // Sahne cadStore yerine useArchitecturePoints veriyor; ölçü canlı olmalı.
    const draggedPoints = POINTS.map((point) =>
      point.id === 11 ? { ...point, x: 500 } : point,
    )

    const [annotation] = getWallDimensionAnnotations(
      [makeWall(20, 10, 11)],
      draggedPoints,
      NO_OPENINGS,
      OPTIONS,
    )

    expect(annotation?.lengthCm).toBe(500)
  })
})

describe('getWallDimensionAnnotations — açıklıklı duvar', () => {
  const WALL = makeWall(20, 10, 11)

  function makeOpening(id: number, offsetCm: number, widthCm: number, wallId = WALL.id): Opening {
    return { id, wallId, offsetCm, widthCm, type: 'window' }
  }

  it('duvarı açıklığın iki yanındaki parçalara böler', () => {
    // 400 cm duvar, ortası 200'de 100 cm pencere → 150 | 100 | 150.
    const annotations = getWallDimensionAnnotations(
      [WALL],
      POINTS,
      [makeOpening(30, 200, 100)],
      OPTIONS,
    )

    expect(annotations.map((item) => [item.kind, item.lengthCm])).toEqual([
      ['wall', 150],
      ['opening', 100],
      ['wall', 150],
    ])
  })

  it('parçaların etiketi KENDİ ortasında durur, duvarın ortasında değil', () => {
    const [first, opening, last] = getWallDimensionAnnotations(
      [WALL],
      POINTS,
      [makeOpening(30, 200, 100)],
      OPTIONS,
    )

    expect(first?.position.x).toBe(75)
    expect(opening?.position.x).toBe(200)
    expect(last?.position.x).toBe(325)
    // Yan ve açı bölünmeden etkilenmez: hepsi aynı duvarın hizasında.
    for (const annotation of [first, opening, last]) {
      expect(annotation?.position.y).toBe(EXPECTED_OFFSET_CM)
      expect(annotation?.angleDeg).toBe(0)
    }
  })

  it('iki açıklığı offset SIRASINA göre yerleştirir', () => {
    // Diziye ters sırada verildi: sıralama girdiye bırakılmamalı.
    const annotations = getWallDimensionAnnotations(
      [WALL],
      POINTS,
      [makeOpening(31, 300, 40), makeOpening(30, 100, 40)],
      OPTIONS,
    )

    expect(annotations.map((item) => [item.kind, item.lengthCm])).toEqual([
      ['wall', 80],
      ['opening', 40],
      ['wall', 160],
      ['opening', 40],
      ['wall', 80],
    ])
  })

  it('köşeye dayanan açıklıkta sıfır boy parça yazılmaz', () => {
    // Açıklık p1 ucundan başlıyor: solunda ölçülecek duvar yok.
    const annotations = getWallDimensionAnnotations(
      [WALL],
      POINTS,
      [makeOpening(30, 50, 100)],
      OPTIONS,
    )

    expect(annotations.map((item) => [item.kind, item.lengthCm])).toEqual([
      ['opening', 100],
      ['wall', 300],
    ])
  })

  it('başka duvarın açıklığı bu duvarı bölmez', () => {
    const otherWallOpening = makeOpening(30, 200, 100, 999)

    const annotations = getWallDimensionAnnotations([WALL], POINTS, [otherWallOpening], OPTIONS)

    expect(annotations.map((item) => [item.kind, item.lengthCm])).toEqual([['wall', 400]])
  })

  it('duvardan taşan açıklığı duvar boyuna kelepçeler', () => {
    // Duvar kısaldığında sığmayan açıklık siliniyor (K16); silinme ile yeniden
    // çizim arasındaki karede taşan span gelebilir, ölçü negatife düşmemeli.
    const annotations = getWallDimensionAnnotations(
      [WALL],
      POINTS,
      [makeOpening(30, 390, 100)],
      OPTIONS,
    )

    expect(annotations.map((item) => [item.kind, item.lengthCm])).toEqual([
      ['wall', 340],
      ['opening', 60],
    ])
  })

  it('her parçanın anahtarı benzersiz — React aynı duvarda çoklu etiket çiziyor', () => {
    const annotations = getWallDimensionAnnotations(
      [WALL],
      POINTS,
      [makeOpening(30, 100, 40), makeOpening(31, 300, 40)],
      OPTIONS,
    )

    const keys = annotations.map((item) => item.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
