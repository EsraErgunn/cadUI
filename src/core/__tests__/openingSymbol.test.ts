import { describe, expect, it } from 'vitest'

import { getOpeningOutline } from '../opening'
import { getOpeningSymbol, type OpeningSymbolSegment } from '../openingSymbol'
import { horizontal, makePoint, makeWall, points } from './openingFixture'

/** 500 cm yatay duvar (kalınlık 20), açıklık ortası 250'de, genişlik 100. */
const outline = getOpeningOutline(horizontal, points, { offsetCm: 250, widthCm: 100 })!

function findStroke(strokes: ReturnType<typeof getOpeningSymbol>['strokes'], name: string) {
  return strokes.find((stroke) => stroke.name === name)?.points
}

/** Segmentin iki ucunu sırasız karşılaştırır — yön sembolün anlamını değiştirmiyor. */
function toSortedEnds(segment: OpeningSymbolSegment | undefined) {
  return [...(segment ?? [])].sort((a, b) => a.x - b.x || a.y - b.y)
}

describe('getOpeningSymbol', () => {
  it('söveleri açıklığın iki ucuna, duvar kalınlığı boyunca koyar', () => {
    // Açıklık 200..300, duvar kalınlığı 20 → sövelerin y'si ∓10.
    expect(toSortedEnds(findStroke(getOpeningSymbol(outline, 'door').strokes, 'jamb-start')))
      .toEqual([
        { x: 200, y: -10 },
        { x: 200, y: 10 },
      ])
    expect(toSortedEnds(findStroke(getOpeningSymbol(outline, 'door').strokes, 'jamb-end'))).toEqual([
      { x: 300, y: -10 },
      { x: 300, y: 10 },
    ])
  })

  it('duvar yüzü hizasındaki uzun kenarları açıklık boyunca çizer', () => {
    expect(toSortedEnds(findStroke(getOpeningSymbol(outline, 'window').strokes, 'face-near')))
      .toEqual([
        { x: 200, y: -10 },
        { x: 300, y: -10 },
      ])
  })

  it('pencerede iki cam çizgisi verir, dolu alan vermez', () => {
    const symbol = getOpeningSymbol(outline, 'window')

    // SVG y=±3, kalınlık 22 birim → 20 cm duvarda ∓3/22 * 20 ≈ 2.727 cm.
    const glassOffsetCm = (3 / 22) * 20
    const [glassStart, glassEnd] = toSortedEnds(findStroke(symbol.strokes, 'glass-near'))
    expect(glassStart.x).toBe(200)
    expect(glassEnd.x).toBe(300)
    expect(glassStart.y).toBeCloseTo(-glassOffsetCm, 10)
    expect(glassEnd.y).toBeCloseTo(-glassOffsetCm, 10)

    expect(findStroke(symbol.strokes, 'glass-far')).toBeDefined()
    expect(symbol.panel).toBeUndefined()
  })

  it('kapıda dolu kanat verir, cam çizgisi vermez', () => {
    const symbol = getOpeningSymbol(outline, 'door')

    // SVG rect x=-48..48 (genişlik 100 birim) → 100 cm açıklıkta 202..298.
    // y=±4.5 (kalınlık 22 birim) → 20 cm duvarda ∓4.5/22 * 20 ≈ 4.09 cm.
    const leafDepthCm = (4.5 / 22) * 20
    expect(symbol.panel?.map((corner) => corner.x)).toEqual([202, 298, 298, 202])
    for (const [index, corner] of (symbol.panel ?? []).entries()) {
      expect(corner.y).toBeCloseTo(index < 2 ? -leafDepthCm : leafDepthCm, 10)
    }

    expect(findStroke(symbol.strokes, 'glass-near')).toBeUndefined()
  })

  it('çapraz duvarda sembol duvarın eksenini takip eder', () => {
    // 3-4-5 çapraz: (0,0) → (300,400), uzunluk 500. Kanat duvara paralel kalmalı.
    const diagonalPoints = [makePoint(20, 0, 0), makePoint(21, 300, 400)]
    const diagonalWall = makeWall(22, 20, 21, 20)
    const diagonalOutline = getOpeningOutline(diagonalWall, diagonalPoints, {
      offsetCm: 250,
      widthCm: 100,
    })!

    const panel = getOpeningSymbol(diagonalOutline, 'door').panel!
    const leafAngleDeg = (Math.atan2(panel[1].y - panel[0].y, panel[1].x - panel[0].x) * 180) / Math.PI
    expect(leafAngleDeg).toBeCloseTo(Math.atan2(400, 300) * (180 / Math.PI), 10)
  })

  it('sembol adları benzersizdir — React key olarak kullanılıyor', () => {
    for (const type of ['door', 'window'] as const) {
      const names = getOpeningSymbol(outline, type).strokes.map((stroke) => stroke.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})
