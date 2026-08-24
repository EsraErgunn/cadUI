import { describe, expect, it } from 'vitest'

import type { Floor } from '../model'
import { buildSitePlanSvg } from '../pdf/sitePlanSvg'

function makeFloor(id: number, name: string, heightCm: number, isBasement = false): Floor {
  return { id, name, heightCm, isBasement }
}

// Dizide index 0 EN ALT kat.
const FLOORS: Floor[] = [
  makeFloor(1, 'Zemin Kat', 300),
  makeFloor(2, '1. Kat', 300),
]

const buildMarkup = (floors: readonly Floor[], overrides = {}) =>
  buildSitePlanSvg({
    floors,
    streetName: '1. Yerli Sokak',
    doorNumber: '66',
    footprint: undefined,
    fontFamily: 'Roboto',
    ...overrides,
  }).markup

describe('buildSitePlanSvg', () => {
  it('kat adlarını, kotları ve başlığı yazar', () => {
    const markup = buildMarkup(FLOORS)

    expect(markup).toContain('VAZİYET PLANI')
    expect(markup).toContain('Zemin Kat')
    expect(markup).toContain('1. Kat')
    expect(markup).toContain('300 cm')
    expect(markup).toContain('600 cm')
    // Zemin kotu her zaman yazılır: kesitin sıfır noktası orası.
    expect(markup).toContain('0 cm')
  })

  it('bodrumun kotunu TABANINDAN yazar; "0 cm" ikilenmez', () => {
    const markup = buildMarkup([makeFloor(0, '1. Bodrum', 280, true), ...FLOORS])

    // Bodrumun tavanı zaten 0; tavandan yazsaydık zemin çizgisinin etiketiyle
    // aynı yere iki kez "0 cm" düşerdi.
    expect(markup).toContain('-280 cm')
    expect(markup.match(/>0 cm</g)).toHaveLength(1)
  })

  it('sokak adını ve kapı numarasını parsel çerçevesine taşır', () => {
    const markup = buildMarkup(FLOORS)

    expect(markup).toContain('1. Yerli Sokak')
    expect(markup).toContain('NO: 66')
  })

  it('sokak ve kapı bilinmiyorsa boş etiket YAZMAZ', () => {
    const markup = buildMarkup(FLOORS, { streetName: '', doorNumber: '' })

    expect(markup).not.toContain('NO: ')
    // Parsel çerçevesi yine çizilir; elle tamamlanacak alan.
    expect(markup).toContain('<polygon')
  })

  it('katsız projede de geçerli bir SVG üretir', () => {
    const svg = buildSitePlanSvg({
      floors: [],
      streetName: '',
      doorNumber: '',
      footprint: undefined,
      fontFamily: 'Roboto',
    })

    expect(svg.markup).toContain('<svg')
    expect(svg.widthCm).toBeGreaterThan(0)
    expect(svg.heightCm).toBeGreaterThan(0)
  })

  it('yazı tipini çağırandan alır — gömülü fontla aynı ad olmalı', () => {
    expect(buildMarkup(FLOORS)).toContain('font-family="Roboto"')
    expect(buildMarkup(FLOORS)).not.toContain('font-family=""')
  })

  it('kontur verilince parsel çerçevesine kuşbakışı bina ve servis kutusu girer', () => {
    const markup = buildMarkup(FLOORS, {
      footprint: {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 400, y: 0 },
          ],
          [
            { x: 400, y: 0 },
            { x: 400, y: 300 },
          ],
        ],
        bounds: { minX: 0, minY: 0, maxX: 400, maxY: 300 },
        serviceBox: { x: 400, y: 20 },
      },
    })

    expect(markup).toContain('Servis Kutusu')
    // Servis kutusu paletteki tek sıcak renk; kesitin grisinden ayrışmalı.
    expect(markup).toContain('#b91c1c')
  })

  it('kontur yokken servis kutusu da parsel de boş kalır', () => {
    const markup = buildMarkup(FLOORS)

    expect(markup).not.toContain('Servis Kutusu')
    expect(markup).not.toContain('#b91c1c')
  })

  it('servis kutusu olmayan projede kontur yine çizilir', () => {
    const markup = buildMarkup(FLOORS, {
      footprint: {
        segments: [
          [
            { x: 0, y: 0 },
            { x: 400, y: 0 },
          ],
        ],
        bounds: { minX: 0, minY: 0, maxX: 400, maxY: 300 },
        serviceBox: undefined,
      },
    })

    expect(markup).not.toContain('Servis Kutusu')
    expect(markup).toContain('NO: 66')
  })

  it('bina genişliği verilince kesitin en-boy oranı onunla değişir', () => {
    const narrow = buildSitePlanSvg({
      floors: FLOORS,
      buildingWidthCm: 400,
      streetName: '',
      doorNumber: '',
      footprint: undefined,
      fontFamily: 'Roboto',
    })
    const wide = buildSitePlanSvg({
      floors: FLOORS,
      buildingWidthCm: 1600,
      streetName: '',
      doorNumber: '',
      footprint: undefined,
      fontFamily: 'Roboto',
    })

    expect(wide.widthCm / wide.heightCm).toBeGreaterThan(narrow.widthCm / narrow.heightCm)
  })
})
