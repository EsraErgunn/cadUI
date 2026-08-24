import { describe, expect, it } from 'vitest'

import {
  fitPlanToPage,
  getDrawableArea,
  getPageSizePt,
  getPlanBounds,
  mmToPoints,
  planCmToPoints,
  planPointToPage,
} from '../pdf/paper'

/** 1 punto = 1/72 inç; A4 dikey 210×297 mm = 595.28×841.89 punto (PDF standardı). */
describe('kâğıt ölçüleri', () => {
  it('A4 dikey standart punto değerlerini verir', () => {
    const { widthPt, heightPt } = getPageSizePt('A4', 'portrait')
    expect(widthPt).toBeCloseTo(595.28, 1)
    expect(heightPt).toBeCloseTo(841.89, 1)
  })

  it('yatay yön kenarları TAKAS eder, ayrı bir ölçü tablosu yoktur', () => {
    const portrait = getPageSizePt('A3', 'portrait')
    const landscape = getPageSizePt('A3', 'landscape')

    expect(landscape.widthPt).toBeCloseTo(portrait.heightPt, 6)
    expect(landscape.heightPt).toBeCloseTo(portrait.widthPt, 6)
  })
})

describe('ölçek', () => {
  it('1:100 — 100 cm plan tam 1 cm kâğıt eder', () => {
    expect(planCmToPoints(100, '1:100')).toBeCloseTo(mmToPoints(10), 6)
  })

  it('1:50 aynı planı 1:100 in İKİ KATI büyüklükte basar', () => {
    expect(planCmToPoints(100, '1:50')).toBeCloseTo(planCmToPoints(100, '1:100') * 2, 6)
  })

  it('1:200 yarısı kadar basar', () => {
    expect(planCmToPoints(100, '1:200')).toBeCloseTo(planCmToPoints(100, '1:100') / 2, 6)
  })

  it('10 m duvar 1:100 A3 yatayda ~283 punto (kâğıtta 10 cm) tutar', () => {
    // Elle doğrulanabilir çapa: 1000 cm / 100 = 10 cm kâğıt = 100 mm.
    expect(planCmToPoints(1000, '1:100')).toBeCloseTo(mmToPoints(100), 6)
  })
})

describe('sayfaya yerleştirme', () => {
  const area = getDrawableArea(getPageSizePt('A3', 'landscape'))

  it('çizim alana ORTALANIR', () => {
    const bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 500 }
    const { transform, isOverflowing } = fitPlanToPage(bounds, area, '1:100')

    const bottomLeft = planPointToPage({ x: 0, y: 0 }, transform)
    const topRight = planPointToPage({ x: 1000, y: 500 }, transform)

    expect(isOverflowing).toBe(false)
    // Sol boşluk = sağ boşluk, alt boşluk = üst boşluk.
    expect(bottomLeft.xPt - area.xPt).toBeCloseTo(area.xPt + area.widthPt - topRight.xPt, 6)
    expect(bottomLeft.yPt - area.yPt).toBeCloseTo(area.yPt + area.heightPt - topRight.yPt, 6)
  })

  it('ölçek sığdırma için OYNATILMAZ: taşan çizim yine 1:50 de basılır', () => {
    // A3 yatayın çizilebilir eni ~397 mm; 1:50 de bu ~19.8 m eder.
    const huge = { minX: 0, minY: 0, maxX: 4000, maxY: 500 }
    const { transform, isOverflowing } = fitPlanToPage(huge, area, '1:50')

    expect(isOverflowing).toBe(true)
    // Katsayı hâlâ 1:50 nin katsayısı — "sığdırmak için küçültme" YOK.
    expect(transform.scalePt).toBeCloseTo(planCmToPoints(1, '1:50'), 9)
  })

  it('aynı çizim daha küçük ölçekte sığar', () => {
    const wide = { minX: 0, minY: 0, maxX: 4000, maxY: 500 }
    expect(fitPlanToPage(wide, area, '1:200').isOverflowing).toBe(false)
  })

  it('BOŞ kat dönüşüm üretir: sayfa antetiyle basılabilsin', () => {
    const fit = fitPlanToPage(undefined, area, '1:100')

    expect(fit.isOverflowing).toBe(false)
    expect(fit.drawingWidthPt).toBe(0)
    expect(Number.isFinite(fit.transform.originXPt)).toBe(true)
  })

  it('plan +y sayfada da YUKARI: çevirme yok', () => {
    const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    const { transform } = fitPlanToPage(bounds, area, '1:100')

    const low = planPointToPage({ x: 0, y: 0 }, transform)
    const high = planPointToPage({ x: 0, y: 100 }, transform)

    expect(high.yPt).toBeGreaterThan(low.yPt)
  })
})

describe('sınırlar', () => {
  it('noktalardan en küçük kutuyu bulur', () => {
    const bounds = getPlanBounds([
      { x: 10, y: -5 },
      { x: -3, y: 40 },
      { x: 25, y: 12 },
    ])

    expect(bounds).toEqual({ minX: -3, minY: -5, maxX: 25, maxY: 40 })
  })

  it('nokta yoksa undefined — boş kat çağıranca ayırt edilebilmeli', () => {
    expect(getPlanBounds([])).toBeUndefined()
  })
})
