import { describe, expect, it } from 'vitest'

import { isSameHover, resolveArchitectureHover } from '../architectureHover'
import type { Point, Wall } from '../model'
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
const context = { points, walls, floorId: FLOOR_ID, toleranceCm: TOLERANCE_CM }

describe('resolveArchitectureHover', () => {
  it('duvar gövdesinin üstünde duvarı verir', () => {
    expect(resolveArchitectureHover({ x: 200, y: 0 }, context)).toEqual({ kind: 'wall', wallId: 10 })
  })

  it('duvar kalınlığının içinde, eksenin dışında da duvarı verir', () => {
    // Kalınlık 20 → yarısı 10; eksene 8 cm uzaklık hâlâ duvarın üstü.
    expect(resolveArchitectureHover({ x: 200, y: 8 }, context)).toEqual({
      kind: 'wall',
      wallId: 10,
    })
  })

  it('duvardan uzakta hiçbir şey vermez', () => {
    // Yarı kalınlık 10 + tolerans 10 = 20; 25 cm dışarıda.
    expect(resolveArchitectureHover({ x: 200, y: 25 }, context)).toBeUndefined()
  })

  it('başka kattaki duvarı vurgulamaz', () => {
    const otherFloor = {
      points: [makePoint(1, 0, 0, 2), makePoint(2, 400, 0, 2)],
      walls: [makeWall(10, 1, 2, 2)],
      floorId: FLOOR_ID,
      toleranceCm: TOLERANCE_CM,
    }
    expect(resolveArchitectureHover({ x: 200, y: 0 }, otherFloor)).toBeUndefined()
  })
})

/**
 * Vurgu sırası jest önceliğiyle aynı olmalı: hover "basarsam neyi tutarım"ı
 * gösteriyor. Köşede duvar da isabet ediyor ama kazanan köşe.
 */
describe('resolveArchitectureHover — köşe duvarı yener', () => {
  it('köşenin üstünde köşeyi verir, duvarı değil', () => {
    expect(resolveArchitectureHover({ x: 400, y: 0 }, context)).toEqual({
      kind: 'point',
      pointId: 2,
    })
  })

  it('tolerans içinde köşeye yakınken de köşeyi verir', () => {
    expect(resolveArchitectureHover({ x: 394, y: 0 }, context)).toEqual({
      kind: 'point',
      pointId: 2,
    })
  })

  it('köşe toleransından çıkınca duvara döner', () => {
    const hover = resolveArchitectureHover({ x: 385, y: 0 }, context)
    expect(hover).toEqual({ kind: 'wall', wallId: 10 })
  })

  it('duvarı olmayan köşe için de köşe döner — çizen taraf undefined ile başa çıkar', () => {
    const lonely = {
      points: [makePoint(9, 800, 800)],
      walls: [],
      floorId: FLOOR_ID,
      toleranceCm: TOLERANCE_CM,
    }
    expect(resolveArchitectureHover({ x: 800, y: 800 }, lonely)).toEqual({
      kind: 'point',
      pointId: 9,
    })
  })
})

/**
 * Seçim aracındaki üç tüketici (köşe sürükleme, açıklık, hover) TEK köşe
 * koşulunu paylaşır. Ayrışırsa tek basış iki jest başlatır ve tek hareket için
 * iki Ctrl+Z gerekir — knowledge/gesture-bus-precedence.md.
 */
describe('köşe koşulu açıklık tarafıyla aynı', () => {
  const openingContext = { ...context, openings: [] }

  it.each([
    ['köşenin tam üstü', { x: 400, y: 0 }],
    ['tolerans içi', { x: 394, y: 0 }],
    ['tolerans dışı', { x: 385, y: 0 }],
    ['duvardan uzak', { x: 200, y: 25 }],
  ])('%s', (_name, target) => {
    const isCornerForHover = resolveArchitectureHover(target, context)?.kind === 'point'
    expect(isCornerForHover).toBe(isCornerHandleAtPoint(target, openingContext))
  })
})

describe('isSameHover', () => {
  it('aynı nesne için true', () => {
    expect(isSameHover({ kind: 'wall', wallId: 1 }, { kind: 'wall', wallId: 1 })).toBe(true)
    expect(isSameHover(undefined, undefined)).toBe(true)
  })

  it('farklı nesne, farklı tür veya tek taraflı boş için false', () => {
    expect(isSameHover({ kind: 'wall', wallId: 1 }, { kind: 'wall', wallId: 2 })).toBe(false)
    expect(isSameHover({ kind: 'wall', wallId: 1 }, { kind: 'point', pointId: 1 })).toBe(false)
    expect(isSameHover({ kind: 'wall', wallId: 1 }, undefined)).toBe(false)
  })
})
