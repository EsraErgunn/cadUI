import { describe, expect, it } from 'vitest'

import type { InstallationLinePoint } from '../../../plumbing/core/installationModel'
import {
  applyIsometricDrag,
  clearIsometricOffsets,
  getPointIsometricOffsetCm,
  hasDefaultIsometricPosition,
  inheritIsometricOffset,
} from '../isometricOffset'

function makePoints(count: number): InstallationLinePoint[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: index + 1,
    position: { x: index * 100, y: 0 },
  }))
}

describe('getPointIsometricOffsetCm', () => {
  it('alan yokken sıfır döner', () => {
    const [point] = makePoints(1)
    expect(getPointIsometricOffsetCm(point)).toEqual({ x: 0, y: 0 })
    expect(hasDefaultIsometricPosition(point)).toBe(true)
  })

  it('kendi kayması ile mirası TOPLAR', () => {
    const point: InstallationLinePoint = {
      id: 1,
      position: { x: 0, y: 0 },
      isometricOffsetCm: { x: 10, y: -5 },
      inheritedIsometricOffsetCm: { x: -4, y: -255 },
    }
    expect(getPointIsometricOffsetCm(point)).toEqual({ x: 6, y: -260 })
    expect(hasDefaultIsometricPosition(point)).toBe(false)
  })
})

describe('applyIsometricDrag', () => {
  it('sürüklenen noktadan SONRAKİLER mirası alır, ÖNCEKİLER dokunulmaz', () => {
    const points = makePoints(5)
    const result = applyIsometricDrag(points, 3, { x: -4, y: -255 })

    // 1 ve 2: hiç alan yok.
    expect(result[0].isometricOffsetCm).toBeUndefined()
    expect(result[0].inheritedIsometricOffsetCm).toBeUndefined()
    expect(result[1].isometricOffsetCm).toBeUndefined()
    expect(result[1].inheritedIsometricOffsetCm).toBeUndefined()

    // 3: kendi kayması.
    expect(result[2].isometricOffsetCm).toEqual({ x: -4, y: -255 })
    expect(result[2].inheritedIsometricOffsetCm).toBeUndefined()

    // 4 ve 5: miras.
    expect(result[3].inheritedIsometricOffsetCm).toEqual({ x: -4, y: -255 })
    expect(result[4].inheritedIsometricOffsetCm).toEqual({ x: -4, y: -255 })
    expect(result[3].isometricOffsetCm).toBeUndefined()
  })

  it('dalın tamamı AYNI toplam kaymayı görür (izometrik_ornek.wcp deseni)', () => {
    // Referans projede tek bir sürüklemenin izi: 24 nokta birebir aynı
    // `formerIsometricPositionRel` taşıyor.
    const points = makePoints(6)
    const result = applyIsometricDrag(points, 2, { x: -4, y: -255.23318403094322 })

    const downstream = result.slice(1).map((point) => getPointIsometricOffsetCm(point))
    for (const offset of downstream) {
      expect(offset).toEqual({ x: -4, y: -255.23318403094322 })
    }
    expect(getPointIsometricOffsetCm(result[0])).toEqual({ x: 0, y: 0 })
  })

  it('üst üste sürüklemeler BİRİKİR', () => {
    const points = makePoints(3)
    const once = applyIsometricDrag(points, 1, { x: 10, y: 20 })
    const twice = applyIsometricDrag(once, 1, { x: 5, y: -8 })

    expect(twice[0].isometricOffsetCm).toEqual({ x: 15, y: 12 })
    expect(twice[1].inheritedIsometricOffsetCm).toEqual({ x: 15, y: 12 })
  })

  it('geri sürüklenip sıfırlanan kayma alanı SİLER (round-trip temizliği)', () => {
    // `{x:0,y:0}` olarak bırakılsaydı docs/sample-project.json bit-bit testi
    // "yoktan var edilmiş alan" olarak yakalardı.
    const points = makePoints(3)
    const moved = applyIsometricDrag(points, 1, { x: 10, y: 20 })
    const restored = applyIsometricDrag(moved, 1, { x: -10, y: -20 })

    for (const point of restored) {
      expect('isometricOffsetCm' in point).toBe(false)
      expect('inheritedIsometricOffsetCm' in point).toBe(false)
    }
  })

  it('PLAN konumlarına asla dokunmaz', () => {
    const points = makePoints(4)
    const result = applyIsometricDrag(points, 2, { x: 999, y: -999 })

    expect(result.map((point) => point.position)).toEqual(points.map((point) => point.position))
  })

  it('sıfır delta ve bilinmeyen nokta durumu değiştirmez', () => {
    const points = makePoints(3)
    expect(applyIsometricDrag(points, 2, { x: 0, y: 0 })).toEqual(points)
    expect(applyIsometricDrag(points, 99, { x: 5, y: 5 })).toEqual(points)
  })
})

describe('inheritIsometricOffset', () => {
  it('kaydırılmış bir dala eklenen yeni nokta kaymayı DEVRALIR', () => {
    const source: InstallationLinePoint = {
      id: 1,
      position: { x: 0, y: 0 },
      isometricOffsetCm: { x: -4, y: -255 },
    }
    const [fresh] = makePoints(1)

    const result = inheritIsometricOffset({ ...fresh, id: 2 }, source)
    expect(result.inheritedIsometricOffsetCm).toEqual({ x: -4, y: -255 })
  })

  it('kendi kayması olan noktayı EZMEZ', () => {
    const source: InstallationLinePoint = {
      id: 1,
      position: { x: 0, y: 0 },
      isometricOffsetCm: { x: -4, y: -255 },
    }
    const placed: InstallationLinePoint = {
      id: 2,
      position: { x: 0, y: 0 },
      isometricOffsetCm: { x: 70, y: 70 },
    }

    expect(inheritIsometricOffset(placed, source)).toBe(placed)
  })

  it('kaynak kaydırılmamışsa alan AÇMAZ', () => {
    const [source] = makePoints(1)
    const fresh: InstallationLinePoint = { id: 2, position: { x: 0, y: 0 } }

    const result = inheritIsometricOffset(fresh, source)
    expect('inheritedIsometricOffsetCm' in result).toBe(false)
  })
})

describe('clearIsometricOffsets', () => {
  it('iki alanı da temizler, plan konumlarını korur', () => {
    const points = applyIsometricDrag(makePoints(4), 2, { x: 40, y: -60 })
    const cleared = clearIsometricOffsets(points)

    for (const point of cleared) {
      expect(hasDefaultIsometricPosition(point)).toBe(true)
      expect('isometricOffsetCm' in point).toBe(false)
      expect('inheritedIsometricOffsetCm' in point).toBe(false)
    }
    expect(cleared.map((point) => point.position)).toEqual(points.map((point) => point.position))
  })

  it('zaten temiz noktaları yeniden oluşturmaz', () => {
    const points = makePoints(3)
    const cleared = clearIsometricOffsets(points)
    expect(cleared[0]).toBe(points[0])
  })
})
