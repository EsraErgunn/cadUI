import { describe, expect, it } from 'vitest'

import {
  ZOOM_MAX,
  ZOOM_MIN,
  clampZoom,
  fitToBounds,
  getVisibleBounds,
  panByPixels,
  resetZoomTo100,
  screenToWorld,
  worldToScreen,
  zoomAtCursor,
} from '../viewport'

const SIZE = { widthPx: 800, heightPx: 600 }
const ORIGIN_VIEW = { centerXCm: 0, centerYCm: 0, zoom: 1 }

describe('clampZoom', () => {
  it('%10 ve %1000 sınırlarında doyuma ulaşır (KK-4)', () => {
    expect(clampZoom(0.01)).toBe(ZOOM_MIN)
    expect(clampZoom(100)).toBe(ZOOM_MAX)
    expect(clampZoom(2.5)).toBe(2.5)
  })
})

describe('screenToWorld / worldToScreen', () => {
  it('viewport merkezi kameranın baktığı dünya noktasıdır', () => {
    const view = { centerXCm: 120, centerYCm: -80, zoom: 2 }
    expect(screenToWorld({ xPx: 400, yPx: 300 }, view, SIZE)).toEqual({ x: 120, y: -80 })
  })

  it('ekranda aşağı gitmek planda y azaltır', () => {
    const below = screenToWorld({ xPx: 400, yPx: 400 }, ORIGIN_VIEW, SIZE)
    expect(below.y).toBeLessThan(0)
  })

  it('gidiş-dönüş kimliği korur', () => {
    const view = { centerXCm: -35, centerYCm: 410, zoom: 0.4 }
    const screen = { xPx: 123, yPx: 456 }
    const back = worldToScreen(screenToWorld(screen, view, SIZE), view, SIZE)
    expect(back.xPx).toBeCloseTo(screen.xPx)
    expect(back.yPx).toBeCloseTo(screen.yPx)
  })
})

describe('zoomAtCursor', () => {
  it('imlecin altındaki dünya noktası aynı pikselde kalır (KK-4)', () => {
    const cursor = { xPx: 200, yPx: 150 }
    const anchorBefore = screenToWorld(cursor, ORIGIN_VIEW, SIZE)

    const zoomed = zoomAtCursor(ORIGIN_VIEW, SIZE, cursor, 2)
    const anchorAfter = screenToWorld(cursor, zoomed, SIZE)

    expect(zoomed.zoom).toBe(2)
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x)
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y)
  })

  it('sınıra dayanınca merkezi kaydırmaz', () => {
    const atMax = { centerXCm: 10, centerYCm: 20, zoom: ZOOM_MAX }
    expect(zoomAtCursor(atMax, SIZE, { xPx: 0, yPx: 0 }, 2)).toBe(atMax)
  })

  it('sınırın ötesine geçmez', () => {
    const zoomed = zoomAtCursor(ORIGIN_VIEW, SIZE, { xPx: 0, yPx: 0 }, 1000)
    expect(zoomed.zoom).toBe(ZOOM_MAX)
  })
})

describe('panByPixels', () => {
  it('içerik sürükleme yönünde hareket eder', () => {
    // Sağa 100 px sürükle → içerik sağa kaydı → bakılan merkez sola gitti.
    const panned = panByPixels(ORIGIN_VIEW, 100, 0)
    expect(panned.centerXCm).toBe(-100)
  })

  it('zoom arttıkça aynı piksel daha az cm kaydırır', () => {
    const panned = panByPixels({ ...ORIGIN_VIEW, zoom: 4 }, 100, 0)
    expect(panned.centerXCm).toBe(-25)
  })

  it('ölçeği değiştirmez', () => {
    expect(panByPixels(ORIGIN_VIEW, 50, 50).zoom).toBe(1)
  })
})

describe('getVisibleBounds', () => {
  it('görünür alanı plan cm cinsinden verir', () => {
    expect(getVisibleBounds(ORIGIN_VIEW, SIZE)).toEqual({
      minXCm: -400,
      minYCm: -300,
      maxXCm: 400,
      maxYCm: 300,
    })
  })
})

describe('fitToBounds', () => {
  it('sınırları merkeze alır ve pay bırakarak sığdırır', () => {
    const fitted = fitToBounds(
      { minXCm: 0, minYCm: 0, maxXCm: 800, maxYCm: 600 },
      SIZE,
    )
    expect(fitted.centerXCm).toBe(400)
    expect(fitted.centerYCm).toBe(300)
    expect(fitted.zoom).toBeCloseTo(0.9)
  })

  it('boş projede varsayılan ölçeğe döner', () => {
    const fitted = fitToBounds({ minXCm: 0, minYCm: 0, maxXCm: 0, maxYCm: 0 }, SIZE)
    expect(fitted.zoom).toBe(1)
  })

  it('çok küçük nesnede %1000 sınırını aşmaz', () => {
    const fitted = fitToBounds({ minXCm: 0, minYCm: 0, maxXCm: 1, maxYCm: 1 }, SIZE)
    expect(fitted.zoom).toBe(ZOOM_MAX)
  })
})

describe('resetZoomTo100', () => {
  it('ölçeği 1:1 yapar, bakılan noktayı korur', () => {
    const view = { centerXCm: 300, centerYCm: -50, zoom: 7 }
    expect(resetZoomTo100(view)).toEqual({ centerXCm: 300, centerYCm: -50, zoom: 1 })
  })
})
