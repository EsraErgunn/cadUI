import { describe, expect, it } from 'vitest'

import { isSameTarget, resolveArchitectureTarget } from '../architectureHover'
import type { Opening, Point, Wall } from '../model'
import { isCornerHandleAtPoint } from '../openingTool'

const FLOOR_ID = 1
const TOLERANCE_CM = 10

function makePoint(id: number, x: number, y: number, floorId = FLOOR_ID): Point {
  return { id, floorId, x, y }
}

function makeWall(id: number, p1Id: number, p2Id: number, floorId = FLOOR_ID): Wall {
  return { id, floorId, p1Id, p2Id, thickness: 20, height: 280 }
}

// L köşesi: (0,0)-(400,0) yatay, (400,0)-(400,300) dikey.
const points = [makePoint(1, 0, 0), makePoint(2, 400, 0), makePoint(3, 400, 300)]
const walls = [makeWall(10, 1, 2), makeWall(11, 2, 3)]
const context = {
  points,
  walls,
  openings: [] as Opening[],
  floorId: FLOOR_ID,
  toleranceCm: TOLERANCE_CM,
}

describe('resolveArchitectureTarget', () => {
  it('duvar gövdesinin üstünde duvarı verir', () => {
    expect(resolveArchitectureTarget({ x: 200, y: 0 }, context)).toEqual({
      kind: 'wall',
      wallId: 10,
    })
  })

  it('duvar kalınlığının içinde, eksenin dışında da duvarı verir', () => {
    // Kalınlık 20 → yarısı 10; eksene 8 cm uzaklık hâlâ duvarın üstü.
    expect(resolveArchitectureTarget({ x: 200, y: 8 }, context)).toEqual({
      kind: 'wall',
      wallId: 10,
    })
  })

  it('duvardan uzakta hiçbir şey vermez', () => {
    // Yarı kalınlık 10 + tolerans 10 = 20; 25 cm dışarıda.
    expect(resolveArchitectureTarget({ x: 200, y: 25 }, context)).toBeUndefined()
  })

  it('başka kattaki duvarı hedef saymaz', () => {
    const otherFloor = {
      ...context,
      points: [makePoint(1, 0, 0, 2), makePoint(2, 400, 0, 2)],
      walls: [makeWall(10, 1, 2, 2)],
    }
    expect(resolveArchitectureTarget({ x: 200, y: 0 }, otherFloor)).toBeUndefined()
  })
})

/**
 * Sıra ekranda üstte durandan alta: köşe → açıklık → duvar. Aynı sıra jest
 * sahipliğiyle birebir aynı olmalı, yoksa vurgu "şunu tutarsın" der ve basış
 * başkasını tutar (knowledge/gesture-bus-precedence.md).
 */
describe('resolveArchitectureTarget — öncelik sırası', () => {
  const opening: Opening = { id: 20, wallId: 10, offsetCm: 200, widthCm: 90, type: 'door' }
  const withOpening = { ...context, openings: [opening] }

  it('köşe duvarı yener', () => {
    expect(resolveArchitectureTarget({ x: 400, y: 0 }, context)).toEqual({
      kind: 'point',
      pointId: 2,
    })
  })

  it('köşe toleransından çıkınca duvara döner', () => {
    expect(resolveArchitectureTarget({ x: 385, y: 0 }, context)).toEqual({
      kind: 'wall',
      wallId: 10,
    })
  })

  it('açıklık duvarı yener', () => {
    // Açıklık 200 ± 45 → 155..245 aralığını kaplıyor.
    expect(resolveArchitectureTarget({ x: 200, y: 0 }, withOpening)).toEqual({
      kind: 'opening',
      openingId: 20,
    })
  })

  it('açıklığın dışında yine duvar kazanır', () => {
    expect(resolveArchitectureTarget({ x: 100, y: 0 }, withOpening)).toEqual({
      kind: 'wall',
      wallId: 10,
    })
  })

  it('köşe açıklığı da yener', () => {
    const atCorner: Opening = { id: 21, wallId: 10, offsetCm: 380, widthCm: 30, type: 'window' }
    expect(
      resolveArchitectureTarget({ x: 400, y: 0 }, { ...context, openings: [atCorner] }),
    ).toEqual({ kind: 'point', pointId: 2 })
  })
})

/**
 * Seçim aracındaki tüketiciler TEK köşe koşulunu paylaşır. Ayrışırsa tek basış
 * iki jest başlatır ve tek hareket için iki Ctrl+Z gerekir.
 */
describe('köşe koşulu açıklık tarafıyla aynı', () => {
  it.each([
    ['köşenin tam üstü', { x: 400, y: 0 }],
    ['tolerans içi', { x: 394, y: 0 }],
    ['tolerans dışı', { x: 385, y: 0 }],
    ['duvardan uzak', { x: 200, y: 25 }],
  ])('%s', (_name, target) => {
    const isCornerForTarget = resolveArchitectureTarget(target, context)?.kind === 'point'
    expect(isCornerForTarget).toBe(isCornerHandleAtPoint(target, context))
  })
})

describe('isSameTarget', () => {
  it('aynı nesne için true', () => {
    expect(isSameTarget({ kind: 'wall', wallId: 1 }, { kind: 'wall', wallId: 1 })).toBe(true)
    expect(isSameTarget({ kind: 'opening', openingId: 4 }, { kind: 'opening', openingId: 4 })).toBe(
      true,
    )
    expect(isSameTarget(undefined, undefined)).toBe(true)
  })

  it('farklı nesne, farklı tür veya tek taraflı boş için false', () => {
    expect(isSameTarget({ kind: 'wall', wallId: 1 }, { kind: 'wall', wallId: 2 })).toBe(false)
    expect(isSameTarget({ kind: 'wall', wallId: 1 }, { kind: 'point', pointId: 1 })).toBe(false)
    expect(isSameTarget({ kind: 'wall', wallId: 1 }, undefined)).toBe(false)
  })
})
