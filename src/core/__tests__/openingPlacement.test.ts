import { describe, expect, it } from 'vitest'

import {
  getOpeningOutline,
  isPlacementValid,
  MIN_OPENING_WIDTH_CM,
  pruneUnfittableOpenings,
} from '../opening'
import { getPlacementRange } from '../wall'
import {
  diagonal,
  horizontal,
  makePoint,
  makeWall,
  points,
  RANGE_OF_WALL_8,
  walls,
  window12,
} from './openingFixture'

const openings = [window12]

describe('isPlacementValid', () => {
  const doorAt = (offsetCm: number, ignoreOpeningId?: number) =>
    isPlacementValid(
      { wallId: 8, offsetCm, widthCm: 90, ignoreOpeningId },
      RANGE_OF_WALL_8,
      openings,
    )

  it('alt sınıra tam oturan kapıyı kabul eder', () => {
    // 70 - 45 = 25 = minOffsetCm.
    expect(doorAt(70)).toBe(true)
  })

  it('alt sınırın 1 mm altında reddeder', () => {
    expect(doorAt(69.9)).toBe(false)
  })

  it('üst sınıra tam oturan kapıyı kabul eder', () => {
    // 425 + 45 = 470 = maxOffsetCm.
    expect(doorAt(425)).toBe(true)
  })

  it('üst sınırın üstünde reddeder', () => {
    expect(doorAt(426)).toBe(false)
  })

  it('köşe payının içine düşen yerleştirmeyi reddeder', () => {
    expect(doorAt(10)).toBe(false)
  })

  it('köşe payını kendisi hesaplamaz, verilen aralığa uyar', () => {
    // Aynı yerleştirme, duvar 8 tek başınaysa (köşe yok) geçerli olur.
    const freeRange = getPlacementRange(horizontal, points, [horizontal])
    expect(freeRange).toEqual({ minOffsetCm: 0, maxOffsetCm: 500 })
    expect(isPlacementValid({ wallId: 8, offsetCm: 10, widthCm: 20 }, freeRange!, [])).toBe(true)
  })

  it('var olan açıklığa uç uca değen yerleştirmeyi kabul eder', () => {
    expect(doorAt(355)).toBe(true)
  })

  it('var olan açıklığa 1 cm binen yerleştirmeyi REDDEDER, kaydırmaz', () => {
    expect(doorAt(354)).toBe(false)
  })

  it('var olan açıklığın içine düşen yerleştirmeyi reddeder', () => {
    expect(
      isPlacementValid({ wallId: 8, offsetCm: 250, widthCm: 20 }, RANGE_OF_WALL_8, openings),
    ).toBe(false)
  })

  it('taşınan açıklık kendisiyle çakışmaz', () => {
    expect(
      isPlacementValid(
        { wallId: 8, offsetCm: 250, widthCm: 120, ignoreOpeningId: 12 },
        RANGE_OF_WALL_8,
        openings,
      ),
    ).toBe(true)
  })

  it('başka duvardaki açıklık engellemez', () => {
    expect(
      isPlacementValid({ wallId: 9, offsetCm: 250, widthCm: 120 }, RANGE_OF_WALL_8, openings),
    ).toBe(true)
  })

  it('asgari genişliğin altını reddeder', () => {
    expect(
      isPlacementValid(
        { wallId: 8, offsetCm: 100, widthCm: MIN_OPENING_WIDTH_CM - 1 },
        RANGE_OF_WALL_8,
        [],
      ),
    ).toBe(false)
  })
})

describe('pruneUnfittableOpenings', () => {
  it('duvarı duran açıklığı korur', () => {
    expect(pruneUnfittableOpenings(openings, walls, points)).toEqual([window12])
  })

  it('duvarı silinen açıklığı siler', () => {
    const withoutWall8 = walls.filter((wall) => wall.id !== 8)
    expect(pruneUnfittableOpenings(openings, withoutWall8, points)).toEqual([])
  })

  it('duvar kısalıp açıklık sığmayınca siler', () => {
    // p3 500 → 300: aralık [25, 270] olur, açıklığın [190, 310] aralığı taşar.
    const shortened = points.map((point) => (point.id === 3 ? makePoint(3, 300, 0) : point))
    expect(pruneUnfittableOpenings(openings, walls, shortened)).toEqual([])
  })

  it('duvar kısalıp açıklık hâlâ sığıyorsa korur', () => {
    const shortened = points.map((point) => (point.id === 3 ? makePoint(3, 400, 0) : point))
    expect(pruneUnfittableOpenings(openings, walls, shortened)).toEqual([window12])
  })

  it('noktası eksik duvardaki açıklığı siler', () => {
    const missingPoints = points.filter((point) => point.id !== 3)
    expect(pruneUnfittableOpenings(openings, walls, missingPoints)).toEqual([])
  })
})

describe('getOpeningOutline', () => {
  it('yatay duvarda kalınlık bandının 4 köşesini verir', () => {
    expect(getOpeningOutline(horizontal, points, window12)).toEqual([
      { x: 190, y: -10 },
      { x: 310, y: -10 },
      { x: 310, y: 10 },
      { x: 190, y: 10 },
    ])
  })

  it('çapraz duvarda kenarları duvarın eksenini takip eder', () => {
    const outline = getOpeningOutline(diagonal, points, { offsetCm: 250, widthCm: 120 })!
    const alongCm = Math.hypot(outline[1].x - outline[0].x, outline[1].y - outline[0].y)
    const acrossCm = Math.hypot(outline[2].x - outline[1].x, outline[2].y - outline[1].y)
    const dot =
      (outline[1].x - outline[0].x) * (outline[2].x - outline[1].x) +
      (outline[1].y - outline[0].y) * (outline[2].y - outline[1].y)

    expect(alongCm).toBeCloseTo(120, 9)
    expect(acrossCm).toBeCloseTo(20, 9)
    // Dik olmayan normal sessizce yamuk bir delik çizer; nokta çarpımı sıfır olmalı.
    expect(dot).toBeCloseTo(0, 9)
  })

  it('ucu eksik duvarda undefined döner', () => {
    expect(getOpeningOutline(makeWall(99, 2, 404, 20), points, window12)).toBeUndefined()
  })
})
