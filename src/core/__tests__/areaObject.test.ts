import { describe, expect, it } from 'vitest'

import {
  findBlockingOpeningForAreaObject,
  formatAreaObjectLabel,
  getAreaObjectCorners,
  getAreaObjectTypeForTool,
  getNextAreaObjectLabel,
  isAreaObjectLabelTaken,
  isAreaObjectLabelValid,
  isPointInAreaObject,
} from '../areaObject'
import type { AreaObject, Opening, Wall } from '../model'

const FLOOR_ID = 1

function makeAreaObject(overrides: Partial<AreaObject> = {}): AreaObject {
  return {
    id: 1,
    type: 'structuralColumn',
    floorId: FLOOR_ID,
    x: 0,
    y: 0,
    widthCm: 20,
    lengthCm: 40,
    angleDeg: 0,
    label: 'K-01',
    ...overrides,
  }
}

describe('formatAreaObjectLabel', () => {
  it('tipe göre önek + iki basamaklı sıra üretir', () => {
    expect(formatAreaObjectLabel('structuralColumn', 3)).toBe('K-03')
    expect(formatAreaObjectLabel('stairs', 12)).toBe('M-12')
    expect(formatAreaObjectLabel('flueShaft', 1)).toBe('BS-01')
  })
})

describe('getNextAreaObjectLabel', () => {
  it('aynı kat ve tipteki en yüksek numaranın bir fazlasını döner', () => {
    const areaObjects = [
      makeAreaObject({ id: 1, label: 'K-01' }),
      makeAreaObject({ id: 2, label: 'K-03' }),
    ]

    expect(getNextAreaObjectLabel(areaObjects, 'structuralColumn', FLOOR_ID)).toBe('K-04')
  })

  it('silinen numarayı geri kullanmaz (sadece en yükseği sayılır)', () => {
    const areaObjects = [makeAreaObject({ id: 1, label: 'K-05' })]

    expect(getNextAreaObjectLabel(areaObjects, 'structuralColumn', FLOOR_ID)).toBe('K-06')
  })

  it('başka kat veya tipteki nesneleri saymaz', () => {
    const areaObjects = [
      makeAreaObject({ id: 1, label: 'K-09', floorId: 2 }),
      makeAreaObject({ id: 2, label: 'M-09', type: 'stairs' }),
    ]

    expect(getNextAreaObjectLabel(areaObjects, 'structuralColumn', FLOOR_ID)).toBe('K-01')
  })
})

describe('isAreaObjectLabelTaken', () => {
  it('aynı kattaki aynı etiketi çakışma sayar', () => {
    const areaObjects = [makeAreaObject({ id: 1, label: 'Asansör Boşluğu' })]

    expect(isAreaObjectLabelTaken(areaObjects, 'Asansör Boşluğu', FLOOR_ID)).toBe(true)
  })

  it('kendi id\'sini hariç tutar (düzenlerken kendiyle çakışmaz)', () => {
    const areaObjects = [makeAreaObject({ id: 1, label: 'K-01' })]

    expect(isAreaObjectLabelTaken(areaObjects, 'K-01', FLOOR_ID, 1)).toBe(false)
  })
})

describe('isAreaObjectLabelValid', () => {
  it('boş veya yalnız boşluk içeren etiketi reddeder', () => {
    expect(isAreaObjectLabelValid('  ')).toBe(false)
    expect(isAreaObjectLabelValid('K-01')).toBe(true)
  })
})

describe('getAreaObjectTypeForTool', () => {
  it('bilinen araç id\'sini tipe çevirir', () => {
    expect(getAreaObjectTypeForTool('structuralColumn')).toBe('structuralColumn')
  })

  it('bilinmeyen araç id\'sinde undefined döner', () => {
    expect(getAreaObjectTypeForTool('wall')).toBeUndefined()
  })
})

describe('getAreaObjectCorners', () => {
  it('döndürülmemişken merkez etrafında beklenen dikdörtgeni üretir', () => {
    const areaObject = makeAreaObject({ x: 100, y: 200, widthCm: 20, lengthCm: 40, angleDeg: 0 })

    expect(getAreaObjectCorners(areaObject)).toEqual([
      { x: 90, y: 180 },
      { x: 110, y: 180 },
      { x: 110, y: 220 },
      { x: 90, y: 220 },
    ])
  })

  it('90 derece dönünce genişlik/uzunluk ekseni yer değiştirir', () => {
    const areaObject = makeAreaObject({ x: 0, y: 0, widthCm: 20, lengthCm: 40, angleDeg: 90 })
    const corners = getAreaObjectCorners(areaObject)

    for (const corner of corners) {
      expect(Math.abs(corner.x)).toBeCloseTo(20, 5)
      expect(Math.abs(corner.y)).toBeCloseTo(10, 5)
    }
  })
})

describe('isPointInAreaObject', () => {
  it('merkezdeki nokta her zaman içeride sayılır', () => {
    const areaObject = makeAreaObject({ x: 50, y: 50, angleDeg: 45 })

    expect(isPointInAreaObject({ x: 50, y: 50 }, areaObject)).toBe(true)
  })

  it('döndürülmüş dikdörtgenin dışındaki nokta içeride sayılmaz', () => {
    const areaObject = makeAreaObject({ x: 0, y: 0, widthCm: 20, lengthCm: 40, angleDeg: 0 })

    expect(isPointInAreaObject({ x: 0, y: 100 }, areaObject)).toBe(false)
  })

  it('90 derece dönmüş nesnede eksen takas edilmiş alanı doğru tanır', () => {
    const areaObject = makeAreaObject({ x: 0, y: 0, widthCm: 20, lengthCm: 40, angleDeg: 90 })

    // Döndürülmeden önce (0, 15) uzunluk ekseninin dışındaydı; 90° dönünce
    // uzunluk ekseni x'e gelir, bu nokta artık genişlik ekseninde ve içeride.
    expect(isPointInAreaObject({ x: 15, y: 0 }, areaObject)).toBe(true)
    expect(isPointInAreaObject({ x: 0, y: 15 }, areaObject)).toBe(false)
  })
})

describe('findBlockingOpeningForAreaObject', () => {
  // Duvar (0,0)-(400,0), üstünde 90cm'lik kapı, merkezi x=200 (155-245 arası).
  const walls: Wall[] = [{ id: 1, floorId: FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 }]
  const points = [
    { id: 1, floorId: FLOOR_ID, x: 0, y: 0 },
    { id: 2, floorId: FLOOR_ID, x: 400, y: 0 },
  ]
  const openings: Opening[] = [{ id: 1, wallId: 1, offsetCm: 200, widthCm: 90, type: 'door' }]

  it('kapının tam üstüne dikilen nesneyi engeller', () => {
    // Duvarı dikine kesen bir kolon, kapının ortasından (200,0) geçiyor.
    const areaObject = makeAreaObject({ x: 200, y: 0, widthCm: 20, lengthCm: 20, angleDeg: 0 })

    expect(findBlockingOpeningForAreaObject(areaObject, walls, points, openings)).toBe(openings[0])
  })

  it('kapıdan uzaktaki nesneyi engellemez', () => {
    const areaObject = makeAreaObject({ x: 350, y: 0, widthCm: 20, lengthCm: 20, angleDeg: 0 })

    expect(findBlockingOpeningForAreaObject(areaObject, walls, points, openings)).toBeUndefined()
  })

  it('kapıyı TAMAMEN saran ama hiçbir kenarı aralığın İÇİNDE kesişmeyen geniş nesneyi de engeller', () => {
    // 100cm'lik kolon merkezi kapıyla aynı: kenarları x=150/x=250, kapı aralığı
    // 155-245 — kenar-kesişimi bunu KAÇIRIR (bkz. findBlockingOpeningForAreaObject
    // yorumu), merkez-nokta kontrolü yakalamalı.
    const areaObject = makeAreaObject({ x: 200, y: 0, widthCm: 100, lengthCm: 100, angleDeg: 0 })

    expect(findBlockingOpeningForAreaObject(areaObject, walls, points, openings)).toBe(openings[0])
  })
})
