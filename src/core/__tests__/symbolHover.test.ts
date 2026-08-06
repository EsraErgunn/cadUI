import { describe, expect, it } from 'vitest'

import { isSameTarget, resolveArchitectureTarget } from '../architectureHover'
import { SYMBOL_FOOTPRINTS_CM } from '../architectureSymbol'
import type { Opening, Point, PointSymbol, Wall } from '../model'

const FLOOR_ID = 1
const UPPER_FLOOR_ID = 14
const TOLERANCE_CM = 10

/** Serbest sembol: konumu kendinde, duvara bağlı olanı ayrı test ediliyor. */
function makeSymbol(id: number, x: number, y: number, floorId = FLOOR_ID): PointSymbol {
  return {
    id,
    type: 'panel',
    label: `P-0${id}`,
    note: '',
    attachment: 'free',
    floorId,
    x,
    y,
    rotationDeg: 0,
  }
}

// Duvar (0,0)-(400,0); sembol duvarın TAM ÜSTÜNDE (200, 0).
const points: Point[] = [
  { id: 1, floorId: FLOOR_ID, x: 0, y: 0 },
  { id: 2, floorId: FLOOR_ID, x: 400, y: 0 },
]
const walls: Wall[] = [
  { id: 10, floorId: FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 },
]

function makeContext(symbols: PointSymbol[]) {
  return {
    points,
    walls,
    openings: [] as Opening[],
    symbols,
    floorId: FLOOR_ID,
    toleranceCm: TOLERANCE_CM,
  }
}

describe('resolveArchitectureTarget — sembol', () => {
  it('sembolün üstündeyken sembolü verir', () => {
    const context = makeContext([makeSymbol(20, 200, 100)])

    expect(resolveArchitectureTarget({ x: 200, y: 100 }, context)).toEqual({
      kind: 'symbol',
      symbolId: 20,
    })
  })

  it('sembol DUVARDAN önce gelir — ekranda üstünde duruyor', () => {
    const context = makeContext([makeSymbol(20, 200, 0)])

    expect(resolveArchitectureTarget({ x: 200, y: 0 }, context)).toEqual({
      kind: 'symbol',
      symbolId: 20,
    })
  })

  it('köşe SEMBOLDEN önce gelir — tutamak en üstte', () => {
    // Sembol (0,0) köşesinin üstüne bırakılmış.
    const context = makeContext([makeSymbol(20, 0, 0)])

    expect(resolveArchitectureTarget({ x: 0, y: 0 }, context)).toEqual({
      kind: 'point',
      pointId: 1,
    })
  })

  it('başka kattaki sembol hedef değildir', () => {
    const context = makeContext([makeSymbol(20, 200, 100, UPPER_FLOOR_ID)])

    expect(resolveArchitectureTarget({ x: 200, y: 100 }, context)).toBeUndefined()
  })

  it('üst üste bırakılan sembollerde SONRA eklenen tutulur', () => {
    const context = makeContext([makeSymbol(20, 200, 100), makeSymbol(21, 200, 100)])

    expect(resolveArchitectureTarget({ x: 200, y: 100 }, context)).toEqual({
      kind: 'symbol',
      symbolId: 21,
    })
  })

  it('sembolün uzağında hedef sembol değildir', () => {
    const context = makeContext([makeSymbol(20, 200, 100)])
    const outside = 100 + SYMBOL_FOOTPRINTS_CM.panel.widthCm

    expect(resolveArchitectureTarget({ x: 200, y: outside }, context)).toBeUndefined()
  })
})

describe('isSameTarget — sembol', () => {
  it('aynı sembol aynıdır', () => {
    expect(
      isSameTarget({ kind: 'symbol', symbolId: 3 }, { kind: 'symbol', symbolId: 3 }),
    ).toBe(true)
  })

  it('farklı sembol farklıdır', () => {
    expect(
      isSameTarget({ kind: 'symbol', symbolId: 3 }, { kind: 'symbol', symbolId: 4 }),
    ).toBe(false)
  })

  it('sembol ile duvar aynı sayılmaz', () => {
    expect(isSameTarget({ kind: 'symbol', symbolId: 3 }, { kind: 'wall', wallId: 3 })).toBe(false)
  })
})
