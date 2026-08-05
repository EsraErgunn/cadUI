import { describe, expect, it } from 'vitest'

import { createIdRemap, remapId } from '../idRemap'
import {
  applyTransform,
  getBoundsCenter,
  getPointsBounds,
  getPointsCenter,
  snapAngleDeg,
} from '../transform'

const origin = { x: 0, y: 0 }

describe('applyTransform — translate', () => {
  it('öteler', () => {
    expect(applyTransform({ x: 10, y: 20 }, { kind: 'translate', dxCm: 5, dyCm: -5 })).toEqual({
      x: 15,
      y: 15,
    })
  })

  it('-0 üretmez — JSON"a -0 yazılırsa round-trip testi kırılır', () => {
    const moved = applyTransform({ x: 5, y: 0 }, { kind: 'translate', dxCm: -5, dyCm: 0 })
    expect(Object.is(moved.x, -0)).toBe(false)
    expect(moved.x).toBe(0)
  })
})

describe('applyTransform — rotate', () => {
  it('90 derece döndürür', () => {
    const rotated = applyTransform({ x: 100, y: 0 }, { kind: 'rotate', pivot: origin, angleDeg: 90 })

    expect(rotated.x).toBeCloseTo(0)
    expect(rotated.y).toBeCloseTo(100)
  })

  it('dayanak noktası yerinde kalır', () => {
    const pivot = { x: 250, y: 400 }
    const rotated = applyTransform(pivot, { kind: 'rotate', pivot, angleDeg: 37 })

    expect(rotated.x).toBeCloseTo(pivot.x)
    expect(rotated.y).toBeCloseTo(pivot.y)
  })

  it('360 derece başlangıca döner', () => {
    const point = { x: 30, y: 70 }
    const rotated = applyTransform(point, { kind: 'rotate', pivot: origin, angleDeg: 360 })

    expect(rotated.x).toBeCloseTo(point.x)
    expect(rotated.y).toBeCloseTo(point.y)
  })

  it('dayanak seçimin merkezindeyken uzaklık korunur', () => {
    const pivot = { x: 50, y: 50 }
    const point = { x: 150, y: 50 }
    const rotated = applyTransform(point, { kind: 'rotate', pivot, angleDeg: 45 })

    expect(Math.hypot(rotated.x - pivot.x, rotated.y - pivot.y)).toBeCloseTo(100)
  })
})

describe('applyTransform — mirror', () => {
  const pivot = { x: 100, y: 100 }

  it('yatay ayna y"yi çevirir', () => {
    expect(applyTransform({ x: 130, y: 160 }, { kind: 'mirror', pivot, axis: 'horizontal' })).toEqual(
      { x: 130, y: 40 },
    )
  })

  it('dikey ayna x"i çevirir', () => {
    expect(applyTransform({ x: 130, y: 160 }, { kind: 'mirror', pivot, axis: 'vertical' })).toEqual({
      x: 70,
      y: 160,
    })
  })

  it('iki kez aynalamak başlangıca döner', () => {
    const point = { x: 42, y: 17 }
    const once = applyTransform(point, { kind: 'mirror', pivot, axis: 'vertical' })

    expect(applyTransform(once, { kind: 'mirror', pivot, axis: 'vertical' })).toEqual(point)
  })
})

describe('getPointsBounds / getPointsCenter', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 500, y: 0 },
    { x: 500, y: 400 },
  ]

  it('sınır kutusunu verir', () => {
    expect(getPointsBounds(points)).toEqual({ minX: 0, minY: 0, maxX: 500, maxY: 400 })
  })

  it('boş küme için undefined — sıfır kutuyla karışmasın', () => {
    expect(getPointsBounds([])).toBeUndefined()
    expect(getPointsCenter([])).toBeUndefined()
  })

  it('merkez KUTUNUN merkezidir, nokta ortalaması değil', () => {
    // Ortalama (333, 133) olurdu; kutu merkezi (250, 200).
    expect(getPointsCenter(points)).toEqual({ x: 250, y: 200 })
  })

  it('getBoundsCenter kutuyu ortalar', () => {
    expect(getBoundsCenter({ minX: -100, minY: 0, maxX: 100, maxY: 50 })).toEqual({ x: 0, y: 25 })
  })
})

describe('snapAngleDeg', () => {
  it('en yakın adıma yakalar', () => {
    expect(snapAngleDeg(47, 15)).toBe(45)
    expect(snapAngleDeg(53, 15)).toBe(60)
  })

  it('[0, 360) aralığına indirir', () => {
    expect(snapAngleDeg(370, 15)).toBe(15)
    expect(snapAngleDeg(-15, 15)).toBe(345)
    expect(snapAngleDeg(-360, 15)).toBe(0)
  })

  it('adım sıfır veya negatifse açıya dokunmaz', () => {
    expect(snapAngleDeg(47, 0)).toBe(47)
  })
})

describe('createIdRemap / remapId', () => {
  it('her eski id için yeni id üretir', () => {
    let next = 100
    const remap = createIdRemap([2, 3, 4], () => next++)

    expect(remapId(remap, 2)).toBe(100)
    expect(remapId(remap, 4)).toBe(102)
  })

  it('yinelenen id TEK yeni id alır — paylaşılan köşe kopyada ikiye ayrılmasın', () => {
    let next = 100
    const remap = createIdRemap([2, 2, 3], () => next++)

    expect(remapId(remap, 2)).toBe(100)
    expect(remapId(remap, 3)).toBe(101)
    expect(remap.size).toBe(2)
  })

  it('haritada olmayan referans HATA fırlatır, sessizce geçmez', () => {
    const remap = createIdRemap([2], () => 100)

    expect(() => remapId(remap, 999)).toThrow(/id remap eksik/)
  })
})
