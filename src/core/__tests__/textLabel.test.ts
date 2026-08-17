import { describe, expect, it } from 'vitest'

import type { TextLabel } from '../model'
import {
  findTextLabelAt,
  getTextLabelBounds,
  getTextLabelCorners,
  isBlankText,
  isPointOnTextLabel,
} from '../textLabel'

const FLOOR_ID = 1
const OTHER_FLOOR_ID = 2

function makeText(overrides: Partial<TextLabel> = {}): TextLabel {
  return {
    id: 30,
    floorId: FLOOR_ID,
    x: 0,
    y: 0,
    text: 'ABCDE',
    heightCm: 20,
    angleDeg: 0,
    ...overrides,
  }
}

describe('getTextLabelBounds', () => {
  it('kutu yazı UZUNLUĞUYLA genişler', () => {
    const short = getTextLabelBounds(makeText({ text: 'A' }))
    const long = getTextLabelBounds(makeText({ text: 'AAAAAAAAAA' }))

    expect(long.halfWidthCm).toBeGreaterThan(short.halfWidthCm)
  })

  it('yükseklik yazı boyunun yarısıdır', () => {
    expect(getTextLabelBounds(makeText({ heightCm: 40 })).halfHeightCm).toBe(20)
  })

  it('tek harflik metin bile tutulabilir genişlikte', () => {
    // Kutu sıfıra inseydi kullanıcı yazısını tıklayarak seçemezdi.
    expect(getTextLabelBounds(makeText({ text: 'A' })).halfWidthCm).toBeGreaterThan(0)
  })
})

describe('isPointOnTextLabel', () => {
  it('merkez kutunun içindedir', () => {
    expect(isPointOnTextLabel({ x: 0, y: 0 }, makeText())).toBe(true)
  })

  it('uzaktaki nokta dışarıdadır', () => {
    expect(isPointOnTextLabel({ x: 1000, y: 1000 }, makeText())).toBe(false)
  })

  it('döndürülmüş metinde kutu da DÖNER', () => {
    // 90° dönmüş metnin kutusu artık dikey: yatayda dar, düşeyde geniş.
    const rotated = makeText({ angleDeg: 90, text: 'AAAAAAAAAA', heightCm: 20 })
    const bounds = getTextLabelBounds(rotated)

    // Dönmemiş hâlde kutunun İÇİNDE kalan bir nokta, dönünce dışarı çıkar.
    const farAlongX = { x: bounds.halfWidthCm - 1, y: 0 }
    expect(isPointOnTextLabel(farAlongX, makeText({ ...rotated, angleDeg: 0 }))).toBe(true)
    expect(isPointOnTextLabel(farAlongX, rotated)).toBe(false)
    // Aynı uzaklık DÜŞEYDE artık içeride.
    expect(isPointOnTextLabel({ x: 0, y: bounds.halfWidthCm - 1 }, rotated)).toBe(true)
  })

  it('konumu kaymış metinde kutu da kayar', () => {
    const moved = makeText({ x: 500, y: 300 })

    expect(isPointOnTextLabel({ x: 500, y: 300 }, moved)).toBe(true)
    expect(isPointOnTextLabel({ x: 0, y: 0 }, moved)).toBe(false)
  })
})

describe('getTextLabelCorners', () => {
  it('dört köşe verir ve hepsi kutunun sınırındadır', () => {
    const corners = getTextLabelCorners(makeText())
    const { halfWidthCm, halfHeightCm } = getTextLabelBounds(makeText())

    expect(corners).toHaveLength(4)
    for (const corner of corners) {
      expect(Math.abs(corner.x)).toBeCloseTo(halfWidthCm)
      expect(Math.abs(corner.y)).toBeCloseTo(halfHeightCm)
    }
  })

  it('-0 üretmez', () => {
    // Koordinatlarda -0 dolaşırsa karşılaştırmalar şaşar.
    for (const corner of getTextLabelCorners(makeText())) {
      expect(Object.is(corner.x, -0)).toBe(false)
      expect(Object.is(corner.y, -0)).toBe(false)
    }
  })
})

describe('findTextLabelAt', () => {
  it('üst üste binenlerde SONUNCU kazanır — kullanıcı gördüğünü tutar', () => {
    const below = makeText({ id: 30 })
    const above = makeText({ id: 31 })

    expect(findTextLabelAt({ x: 0, y: 0 }, [below, above], FLOOR_ID)?.id).toBe(31)
  })

  it('başka kattaki metni bulmaz', () => {
    const other = makeText({ floorId: OTHER_FLOOR_ID })

    expect(findTextLabelAt({ x: 0, y: 0 }, [other], FLOOR_ID)).toBeUndefined()
  })

  it('boşlukta undefined döner', () => {
    expect(findTextLabelAt({ x: 999, y: 999 }, [makeText()], FLOOR_ID)).toBeUndefined()
  })
})

describe('isBlankText', () => {
  it('boş ve yalnız boşluktan oluşan metni boş sayar', () => {
    // Kutuyu boşaltıp onaylamak SİLME anlamına geliyor (K81 eki); kuralı
    // düzenleme kutusu ve store aynı fonksiyondan okuyor.
    expect(isBlankText('')).toBe(true)
    expect(isBlankText('   ')).toBe(true)
    expect(isBlankText('\n\t ')).toBe(true)
  })

  it('yazı varsa boş saymaz', () => {
    expect(isBlankText('Kazan')).toBe(false)
    expect(isBlankText('  Kazan  ')).toBe(false)
  })
})
