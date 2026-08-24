import { describe, expect, it } from 'vitest'

import type { PlanPoint } from '../coords'
import {
  appendStrokePoint,
  getStrokeLengthCm,
  isStrokeHit,
  isStrokeWorthKeeping,
} from '../sketchStroke'

describe('appendStrokePoint — örnek seyreltme', () => {
  it('boş darbeye ilk noktayı ekler', () => {
    expect(appendStrokePoint([], { x: 10, y: 10 })).toEqual([{ x: 10, y: 10 }])
  })

  it('yeterince UZAK noktayı ekler', () => {
    const points: PlanPoint[] = [{ x: 0, y: 0 }]
    expect(appendStrokePoint(points, { x: 5, y: 0 })).toHaveLength(2)
  })

  it('çok YAKIN noktayı elemez ama AYNI diziyi döndürür', () => {
    // Aynı referans bilinçli: React tarafı değişmediğini referanstan anlıyor ve
    // gereksiz yeniden çizim yapmıyor. Fare saniyede onlarca olay üretiyor.
    const points: PlanPoint[] = [{ x: 0, y: 0 }]
    expect(appendStrokePoint(points, { x: 1, y: 0 })).toBe(points)
  })

  it('eşik ÇAPRAZ mesafede de geçerli', () => {
    const points: PlanPoint[] = [{ x: 0, y: 0 }]
    // (1.2, 1.2) → 1,70 cm: eşiğin altında.
    expect(appendStrokePoint(points, { x: 1.2, y: 1.2 })).toBe(points)
  })
})

describe('getStrokeLengthCm', () => {
  it('segmentleri toplar', () => {
    const points: PlanPoint[] = [
      { x: 0, y: 0 },
      { x: 30, y: 40 },
      { x: 30, y: 50 },
    ]
    expect(getStrokeLengthCm(points)).toBe(60)
  })

  it('tek noktalı darbenin boyu SIFIR', () => {
    expect(getStrokeLengthCm([{ x: 5, y: 5 }])).toBe(0)
  })
})

describe('isStrokeWorthKeeping', () => {
  it('tek TIKLAMA iz bırakmaz', () => {
    // Aracı seçip tuvale bir kez tıklayan kullanıcı ekranda nokta bulmamalı.
    expect(isStrokeWorthKeeping([{ x: 0, y: 0 }])).toBe(false)
  })

  it('titreme sayılacak kadar KISA darbe elenir', () => {
    expect(
      isStrokeWorthKeeping([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toBe(false)
  })

  it('gerçek darbe saklanır', () => {
    expect(
      isStrokeWorthKeeping([
        { x: 0, y: 0 },
        { x: 50, y: 0 },
      ]),
    ).toBe(true)
  })
})

describe('isStrokeHit — silgi', () => {
  const stroke: PlanPoint[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]

  it('çizginin ORTASINDAN geçen silgi yakalar', () => {
    // Uzaklık noktalara değil SEGMENTLERE bakılıyor; yalnız noktalara bakan bir
    // silgi çizginin ortasında hiçbir şey silmezdi.
    expect(isStrokeHit(stroke, { x: 50, y: 3 }, 10)).toBe(true)
  })

  it('uzaktaki silgi yakalamaz', () => {
    expect(isStrokeHit(stroke, { x: 50, y: 40 }, 10)).toBe(false)
  })

  it('segmentin UZANTISINDA kalan nokta yakalamaz', () => {
    // Sonsuz doğruya bakılsaydı kısa bir segmentin çok uzağı da "değdi" sayılırdı.
    expect(isStrokeHit(stroke, { x: 300, y: 0 }, 10)).toBe(false)
  })

  it('uç noktanın yakınını yakalar', () => {
    expect(isStrokeHit(stroke, { x: -4, y: 0 }, 10)).toBe(true)
  })

  it('KÖŞELİ darbede iç segmenti de yakalar', () => {
    const bent: PlanPoint[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]
    expect(isStrokeHit(bent, { x: 97, y: 60 }, 10)).toBe(true)
  })

  it('boş darbe yakalanmaz', () => {
    expect(isStrokeHit([], { x: 0, y: 0 }, 10)).toBe(false)
  })
})
