import { describe, expect, it } from 'vitest'

import { getMeasurementAnchor, getSegmentNormal } from '../measurement'

const OFFSET_CM = 10

describe('getSegmentNormal', () => {
  it('yatay bölümün normali yukarı bakar', () => {
    expect(getSegmentNormal({ x: 0, y: 0 }, { x: 100, y: 0 })).toEqual({ x: 0, y: 1 })
  })

  it('dikey bölümün normali sola bakar', () => {
    expect(getSegmentNormal({ x: 0, y: 0 }, { x: 0, y: 100 })).toEqual({ x: -1, y: 0 })
  })

  it('normal BİRİM uzunluktadır', () => {
    const normal = getSegmentNormal({ x: 0, y: 0 }, { x: 30, y: 40 })

    expect(Math.hypot(normal.x, normal.y)).toBeCloseTo(1)
  })

  it('sıfır boy bölümde yön tanımsız — sıfır vektör', () => {
    // Yön uydurulsaydı etiket rastgele bir tarafa kaçardı.
    expect(getSegmentNormal({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 0, y: 0 })
  })

  it('-0 üretmez', () => {
    // Koordinatlarda -0 dolaşırsa karşılaştırmalar şaşar.
    const normal = getSegmentNormal({ x: 100, y: 0 }, { x: 0, y: 0 })

    expect(Object.is(normal.x, -0)).toBe(false)
    expect(Object.is(normal.y, -0)).toBe(false)
  })
})

describe('getMeasurementAnchor', () => {
  it('orta noktayı bölümün DİKİNDE kaydırır', () => {
    const anchor = getMeasurementAnchor({ x: 0, y: 0 }, { x: 100, y: 0 }, OFFSET_CM)

    expect(anchor).toEqual({ x: 50, y: OFFSET_CM })
  })

  it('kaydırma sıfırken tam orta noktada durur', () => {
    expect(getMeasurementAnchor({ x: 0, y: 0 }, { x: 100, y: 50 }, 0)).toEqual({ x: 50, y: 25 })
  })

  it('sıfır boy bölümde orta noktada kalır', () => {
    expect(getMeasurementAnchor({ x: 7, y: 3 }, { x: 7, y: 3 }, OFFSET_CM)).toEqual({ x: 7, y: 3 })
  })
})
