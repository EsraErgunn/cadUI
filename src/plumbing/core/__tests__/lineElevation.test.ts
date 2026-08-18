import { describe, expect, it } from 'vitest'

import type { InstallationLine } from '../installationModel'
import {
  clampPipeHeightCm,
  findMergeablePipeLineId,
  getElevationAtOffsetCm,
  getInlineElementElevationCm,
  getLine3dLengthCm,
  getLinePointElevationsCm,
  resolvePipeResizeTarget,
} from '../lineElevation'

describe('getLinePointElevationsCm', () => {
  it('iki noktalı hatta doğrudan start/end döner', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    expect(getLinePointElevationsCm(points, 0, 75)).toEqual([0, 75])
  })

  it('çok noktalı hatta kümülatif plan boyuna göre doğrusal enterpolasyon yapar', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 25, y: 0 },
      { x: 100, y: 0 },
    ]
    const elevations = getLinePointElevationsCm(points, 0, 100)
    expect(elevations[0]).toBe(0)
    expect(elevations[1]).toBeCloseTo(25)
    expect(elevations[2]).toBe(100)
  })

  it('plan boyu SIFIR ise (saf dikey) yalnız iki uç anlamlıdır', () => {
    const points = [
      { x: 50, y: 50 },
      { x: 50, y: 50 },
    ]
    expect(getLinePointElevationsCm(points, 0, 75)).toEqual([0, 75])
  })
})

describe('getElevationAtOffsetCm', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]

  it('segment ortasında ara değeri verir', () => {
    expect(getElevationAtOffsetCm(points, 0, 100, 50)).toBe(50)
  })

  it('plan boyu SIFIR ise bitiş kotunu döner', () => {
    const riser = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ]
    expect(getElevationAtOffsetCm(riser, 0, 75, 0)).toBe(75)
  })
})

describe('getLine3dLengthCm', () => {
  it('düz yatay hatta plan boyuyla aynıdır', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    expect(getLine3dLengthCm(points, 0, 0)).toBe(100)
  })

  it('kot farkını Pisagor ile katar', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
    ]
    expect(getLine3dLengthCm(points, 0, 400)).toBeCloseTo(500)
  })

  it('saf dikey (plan boyu sıfır) hatta 3B boy yalnız kot farkıdır', () => {
    const points = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ]
    expect(getLine3dLengthCm(points, 0, 75)).toBe(75)
  })
})

describe('getInlineElementElevationCm', () => {
  const pipeLine: InstallationLine = {
    id: 1,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN20',
    points: [
      { id: 10, position: { x: 0, y: 0 } },
      { id: 11, position: { x: 100, y: 0 }, inlineElementId: 99 },
      { id: 12, position: { x: 200, y: 0 } },
    ],
    segments: [
      { id: 20, fromPointId: 10, toPointId: 11 },
      { id: 21, fromPointId: 11, toPointId: 12 },
    ],
    pipe: { startHeightCm: 0, endHeightCm: 200, description: '' },
  }

  it('boruya oturan elemanın kotunu offset oranına göre türetir', () => {
    expect(getInlineElementElevationCm(99, [pipeLine])).toBeCloseTo(100)
  })

  it('serbest (oturmayan) elemanda 0 döner', () => {
    expect(getInlineElementElevationCm(12345, [pipeLine])).toBe(0)
  })

  it('pipe olmayan hatta oturan elemanda 0 döner', () => {
    const chimney: InstallationLine = { ...pipeLine, id: 2, kind: 'chimney', pipe: undefined }
    expect(getInlineElementElevationCm(99, [chimney])).toBe(0)
  })
})

describe('resolvePipeResizeTarget', () => {
  it('saf yatay boruda yalnız plan uzar, kot değişmez', () => {
    const result = resolvePipeResizeTarget({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, 0, 200)
    expect(result).toEqual({ position: { x: 200, y: 0 }, endHeightCm: 0 })
  })

  it('saf dikey bağlantıda yalnız kot değişir, plan konumu sabit kalır', () => {
    const result = resolvePipeResizeTarget({ x: 10, y: 10 }, { x: 10, y: 10 }, 0, 50, 150)
    expect(result).toEqual({ position: { x: 10, y: 10 }, endHeightCm: 150 })
  })

  it('eğik segmentte plan ve kot orantılı ölçeklenir (mevcut 3B yön korunur)', () => {
    // 3-4-5 üçgeni: plan 300, kot 400, 3B boy 500. Hedef 1000 → tam iki katı.
    const result = resolvePipeResizeTarget({ x: 0, y: 0 }, { x: 300, y: 0 }, 0, 400, 1000)
    expect(result?.position).toEqual({ x: 600, y: 0 })
    expect(result?.endHeightCm).toBe(800)
  })

  it('güncel 3B uzunluk SIFIRSA yön tanımsızdır, null döner', () => {
    expect(resolvePipeResizeTarget({ x: 5, y: 5 }, { x: 5, y: 5 }, 20, 20, 100)).toBeNull()
  })

  it('sıfır ya da negatif hedef reddedilir', () => {
    expect(resolvePipeResizeTarget({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, 0, 0)).toBeNull()
    expect(resolvePipeResizeTarget({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, 0, -50)).toBeNull()
  })
})

describe('findMergeablePipeLineId', () => {
  const riserLine: InstallationLine = {
    id: 5,
    floorId: 1,
    kind: 'pipe',
    pipeTypeName: 'DN20',
    points: [
      { id: 50, position: { x: 20, y: 20 } },
      { id: 51, position: { x: 20, y: 20 } },
    ],
    segments: [{ id: 60, fromPointId: 50, toPointId: 51 }],
    pipe: { startHeightCm: 0, endHeightCm: 75, description: '' },
  }
  const linePointStartTarget = { kind: 'linePoint' as const, lineId: 5, pointId: 51 }

  it('zincir bir dikey segmentin ucundaysa o hattın id\'sini döner', () => {
    expect(findMergeablePipeLineId({ x: 20, y: 20 }, linePointStartTarget, [riserLine])).toBe(5)
  })

  it('startTarget yoksa (serbest) null döner', () => {
    expect(findMergeablePipeLineId({ x: 20, y: 20 }, null, [riserLine])).toBeNull()
  })

  it('startTarget port\'a bağlıysa (linePoint değil) null döner', () => {
    const portTarget = { kind: 'port' as const, elementId: 1, portId: 'in' }
    expect(findMergeablePipeLineId({ x: 20, y: 20 }, portTarget, [riserLine])).toBeNull()
  })

  it('hat yatay (plan boyu sıfır değil) ise null döner', () => {
    const horizontal: InstallationLine = {
      ...riserLine,
      id: 6,
      points: [
        { id: 70, position: { x: 0, y: 0 } },
        { id: 71, position: { x: 100, y: 0 } },
      ],
    }
    const target = { kind: 'linePoint' as const, lineId: 6, pointId: 71 }
    expect(findMergeablePipeLineId({ x: 100, y: 0 }, target, [horizontal])).toBeNull()
  })

  it('anchor hattın ucuyla eşleşmiyorsa (araya yatay adım girmiş) null döner', () => {
    expect(findMergeablePipeLineId({ x: 999, y: 999 }, linePointStartTarget, [riserLine])).toBeNull()
  })
})

describe('clampPipeHeightCm', () => {
  it('sınırlar içinde değeri aynen döner', () => {
    expect(clampPipeHeightCm(125)).toBe(125)
  })

  it('üst sınırı aşan değeri kırpar', () => {
    expect(clampPipeHeightCm(999_999)).toBe(2000)
  })

  it('alt sınırı aşan değeri kırpar', () => {
    expect(clampPipeHeightCm(-999_999)).toBe(-2000)
  })
})
