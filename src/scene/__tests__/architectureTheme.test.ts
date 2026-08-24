import { describe, expect, it } from 'vitest'

import { DEFAULT_WALL_THICKNESS_CM } from '../../core/wall'
import { AREA_OBJECT_STROKE_WIDTHS_CM, BEAM_STROKE_WIDTH_CM } from '../architectureStrokeStyle'
import { ARCHITECTURE_COLORS, POINT_SYMBOL_COLORS } from '../architectureTheme'
import { SCENE_COLORS } from '../sceneTheme'

const SECURITY_TYPES = [
  'fireExtinguisher',
  'mainCutoffSwitch',
  'alarmDevice',
  'earthquakeSensor',
] as const

/** Bir hex rengin algılanan parlaklığı (0-255). Ton karşılaştırmaları için. */
function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = (value >> 16) & 0xff
  const green = (value >> 8) & 0xff
  const blue = value & 0xff
  return 0.299 * red + 0.587 * green + 0.114 * blue
}

describe('cihaz renkleri türe göre gruplanır', () => {
  it('güvenlik ekipmanının hepsi AYNI kırmızı', () => {
    const colors = new Set(SECURITY_TYPES.map((type) => POINT_SYMBOL_COLORS[type].symbol))

    expect(colors.size).toBe(1)
  })

  it('menfez ve pano aynı, aydınlatma AYRI', () => {
    expect(POINT_SYMBOL_COLORS.vent.symbol).toBe(POINT_SYMBOL_COLORS.panel.symbol)
    expect(POINT_SYMBOL_COLORS.lighting.symbol).not.toBe(POINT_SYMBOL_COLORS.vent.symbol)
  })

  it('güvenlik kırmızısı REDDEDİLEN yerleştirmenin kırmızısı DEĞİL', () => {
    // İkisi karışırsa kullanıcı her yangın söndürücüyü hata sanar.
    expect(POINT_SYMBOL_COLORS.fireExtinguisher.symbol).not.toBe(
      ARCHITECTURE_COLORS.previewInvalid,
    )
  })

  it('marka sarısı tuvale girmez — aydınlatma bile', () => {
    expect(POINT_SYMBOL_COLORS.lighting.symbol.toLowerCase()).not.toBe('#ffc107')
  })
})

describe('ton yönleri', () => {
  it('hover her ailede AÇILIR (kullanıcı kuralı)', () => {
    for (const family of Object.values(POINT_SYMBOL_COLORS)) {
      expect(luminance(family.hover)).toBeGreaterThan(luminance(family.symbol))
    }
  })

  it('ad etiketi her ailede KOYULAŞIR — beyaz zeminde okunsun', () => {
    for (const family of Object.values(POINT_SYMBOL_COLORS)) {
      expect(luminance(family.label)).toBeLessThan(luminance(family.symbol))
    }
  })

  it('alan nesnesinin hover tonu da AÇILIR', () => {
    expect(luminance(ARCHITECTURE_COLORS.areaObjectHover)).toBeGreaterThan(
      luminance(ARCHITECTURE_COLORS.areaObjectStroke),
    )
  })
})

describe('duvarla ayrışma', () => {
  it('kiriş duvarla AYNI renk — ikisi de taşıyıcı yapı', () => {
    expect(ARCHITECTURE_COLORS.beam).toBe(SCENE_COLORS.wallFill)
  })

  it('alan nesnesi duvardan AÇIK: çoğu kez duvarın ÜSTÜNE oturuyor', () => {
    expect(luminance(ARCHITECTURE_COLORS.areaObjectStroke)).toBeGreaterThan(
      luminance(SCENE_COLORS.wallFill),
    )
  })
})

describe('ölçü katmanı', () => {
  it('duvar ölçüsünün KENDİ rengi var — artık duvarı ödünç almıyor', () => {
    expect(ARCHITECTURE_COLORS.wallDimension).not.toBe(SCENE_COLORS.wallFill)
    expect(ARCHITECTURE_COLORS.wallDimension).not.toBe(ARCHITECTURE_COLORS.beam)
  })

  it('açıklık ölçüsü duvar ölçüsünden AÇIK — aynı ailenin iki tonu', () => {
    expect(luminance(ARCHITECTURE_COLORS.openingDimension)).toBeGreaterThan(
      luminance(ARCHITECTURE_COLORS.wallDimension),
    )
  })
})

describe('alan nesnesi kontur kalınlıkları', () => {
  it('gövde ayrıntıdan KALIN, ikisi de duvardan İNCE', () => {
    expect(AREA_OBJECT_STROKE_WIDTHS_CM.body).toBeGreaterThan(
      AREA_OBJECT_STROKE_WIDTHS_CM.detail,
    )
    expect(AREA_OBJECT_STROKE_WIDTHS_CM.body).toBeLessThan(DEFAULT_WALL_THICKNESS_CM)
  })

  it('gövde kirişten KALIN kalır — inceltme bu sırayı bozmamalı', () => {
    // Nesneler inceltilirken kiriş de inceltildi; ikisi eşitlenseydi
    // "kiriş nesneden ince" kuralı sessizce kaybolurdu.
    expect(AREA_OBJECT_STROKE_WIDTHS_CM.body).toBeGreaterThan(BEAM_STROKE_WIDTH_CM)
  })
})
