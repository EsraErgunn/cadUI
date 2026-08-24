import { describe, expect, it } from 'vitest'

import { DEFAULT_WALL_THICKNESS_CM } from '../../core/wall'
import {
  AREA_OBJECT_STROKE_WIDTHS_CM,
  BEAM_STROKE_WIDTH_CM,
  getArchitectureStrokeWidthPx,
  MIN_ARCHITECTURE_STROKE_PX,
} from '../architectureStrokeStyle'
import { getWallLineWidthPx } from '../wallStyle'

/** En uzak zoom (ZOOM_MIN): silikleşme şikâyeti buraya doğru artıyordu. */
const FAR_ZOOM = 0.1

describe('getArchitectureStrokeWidthPx', () => {
  it('kalınlığı `cm × zoom` ile piksele çevirir — görünen boyut worldUnits ile AYNI', () => {
    expect(getArchitectureStrokeWidthPx(5, 1)).toBe(5)
    expect(getArchitectureStrokeWidthPx(5, 2)).toBe(10)
    expect(getArchitectureStrokeWidthPx(5, 0.5)).toBe(2.5)
  })

  it('uzaklaşınca tabana dayanır — çizgi piksel altına düşüp GRİLEŞMEZ', () => {
    // Eski davranış: 5 cm × 0,1 = 0,5 px, yani pikselin yarısı → soluk gri.
    expect(getArchitectureStrokeWidthPx(5, FAR_ZOOM)).toBe(MIN_ARCHITECTURE_STROKE_PX)
    expect(getArchitectureStrokeWidthPx(AREA_OBJECT_STROKE_WIDTHS_CM.detail, FAR_ZOOM)).toBe(
      MIN_ARCHITECTURE_STROKE_PX,
    )
  })

  it('taban duvarınkinden İNCE: uzakta ayrıntı çizgisi duvarla eşitlenmesin', () => {
    expect(MIN_ARCHITECTURE_STROKE_PX).toBeLessThan(
      getWallLineWidthPx(DEFAULT_WALL_THICKNESS_CM, FAR_ZOOM),
    )
  })
})

describe('mimari kontur kalınlıkları', () => {
  it('gövde ayrıntıdan KALIN — dış hat okunur, iç çizgiler geri çekilir', () => {
    expect(AREA_OBJECT_STROKE_WIDTHS_CM.body).toBeGreaterThan(
      AREA_OBJECT_STROKE_WIDTHS_CM.detail,
    )
  })

  it('kiriş konturu alan nesnesinin gövdesinden İNCE (kullanıcı isteği)', () => {
    // Eskiden ikisi de duvarın dörtte biriydi; kiriş planda gereğinden ağırdı.
    expect(BEAM_STROKE_WIDTH_CM).toBeLessThan(AREA_OBJECT_STROKE_WIDTHS_CM.body)
  })

  it('kalınlıklar duvardan TÜRETİLİR — varsayılan duvar değişince oran korunur', () => {
    expect(AREA_OBJECT_STROKE_WIDTHS_CM.body).toBe(DEFAULT_WALL_THICKNESS_CM / 6)
    expect(BEAM_STROKE_WIDTH_CM).toBe(DEFAULT_WALL_THICKNESS_CM / 8)
  })
})
