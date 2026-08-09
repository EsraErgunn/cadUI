import { describe, expect, it } from 'vitest'

import { createHorizontalLine } from './symbolFixture'
import type { Id } from '../../../core/model'
import { extendLineEnd, splitLineAtSegment } from '../lineSplit'

function createIdFactory(start: Id): () => Id {
  let next = start
  return () => {
    next += 1
    return next
  }
}

describe('splitLineAtSegment', () => {
  it('parçanın ortasına köşe ekler, mevcut kimliklere dokunmaz', () => {
    const line = createHorizontalLine()
    const result = splitLineAtSegment(line, 0, { x: 400, y: 0 }, createIdFactory(100))

    expect(result?.points.map((point) => point.id)).toEqual([1, result?.insertedPointId, 2])
    expect(result?.segments).toHaveLength(2)
    // Bölünen parça KENDİ id'siyle kısalır; yalnız ikinci yarı yeni id alır.
    expect(result?.segments[0].id).toBe(3)
    expect(result?.segments[0].toPointId).toBe(result?.insertedPointId)
    expect(result?.segments[1].fromPointId).toBe(result?.insertedPointId)
    expect(result?.segments[1].toPointId).toBe(2)
  })

  it('olmayan parçada null döner', () => {
    expect(
      splitLineAtSegment(createHorizontalLine(), 5, { x: 0, y: 0 }, createIdFactory(100)),
    ).toBeNull()
  })
})

describe('extendLineEnd', () => {
  it('sondan uzatınca nokta ve parça sona eklenir', () => {
    const line = createHorizontalLine()
    const result = extendLineEnd(line, 'end', { x: 1050, y: 0 }, createIdFactory(100))

    expect(result?.points.map((point) => point.position.x)).toEqual([0, 1000, 1050])
    expect(result?.segments).toHaveLength(2)
    expect(result?.segments[1].fromPointId).toBe(2)
    expect(result?.segments[1].toPointId).toBe(result?.addedPointId)
  })

  it('baştan uzatınca nokta ve parça başa eklenir', () => {
    const line = createHorizontalLine()
    const result = extendLineEnd(line, 'start', { x: -50, y: 0 }, createIdFactory(100))

    expect(result?.points.map((point) => point.position.x)).toEqual([-50, 0, 1000])
    expect(result?.segments[0].fromPointId).toBe(result?.addedPointId)
    expect(result?.segments[0].toPointId).toBe(1)
  })

  it('noktasız hatta null döner', () => {
    const empty = { points: [], segments: [] }

    expect(extendLineEnd(empty, 'end', { x: 0, y: 0 }, createIdFactory(100))).toBeNull()
  })
})
