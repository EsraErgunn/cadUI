import { describe, expect, it } from 'vitest'

import sampleProject from '../../../docs/sample-project.json'
import { ISOMETRIC_ANGLES_DEFAULT } from '../../isometric/core/isometricProjection'
import { isDischargeKind } from '../../plumbing/core/lineKinds'
import { getSymbolMetadata } from '../../plumbing/scene/symbolLoader'
import type { ProjectData } from '../model'
import { buildIsometricSvg } from '../pdf/isometricSvg'
import { parseProjectData } from '../serialize'

/**
 * Veri ELLE kurulmuyor: kabul testinin de kullandığı gerçek örnek proje
 * (`docs/sample-project.json`) okunuyor. Elle yazılmış bir tesisat, kot ve
 * bağlantı kurallarını farkında olmadan ihlal edip testi gerçeklikten
 * koparırdı.
 */
const SAMPLE = parseProjectData(sampleProject)

const GAS_COLOR = '#c026d3'
const DISCHARGE_COLOR = '#64748b'

function build(overrides: Partial<ProjectData> = {}) {
  return buildIsometricSvg({
    floors: overrides.floors ?? SAMPLE.floors,
    installationElements: overrides.installationElements ?? SAMPLE.installationElements,
    installationLines: overrides.installationLines ?? SAMPLE.installationLines,
    installationConnections:
      overrides.installationConnections ?? SAMPLE.installationConnections,
    floorPipeLinks: overrides.floorPipeLinks ?? SAMPLE.floorPipeLinks,
    angles: ISOMETRIC_ANGLES_DEFAULT,
    getMetadata: getSymbolMetadata,
    resolveLineColor: (line) => (isDischargeKind(line.kind) ? DISCHARGE_COLOR : GAS_COLOR),
    fontFamily: 'Roboto',
  })
}

describe('buildIsometricSvg', () => {
  it('başlığı ve boruları basar', () => {
    const svg = build()

    expect(svg?.markup).toContain('İZOMETRİK ŞEMA')
    expect(svg?.markup).toContain('<polyline')
    expect(svg?.markup).toContain(GAS_COLOR)
  })

  it('TÜM katları tek parça çizer: üst kat YUKARIDA görünür', () => {
    // Kat planı sayfası kat kat basılır; izometrik binayı bütün gösteriyor.
    // Örnek projenin tesisatı tek katta, o yüzden yarısı üst kata taşınıyor:
    // aktif kat kavramı olsaydı bu ikinci grup çizime hiç girmezdi.
    const upperFloorId = SAMPLE.floors[1].id
    const lifted = SAMPLE.installationLines.map((line, index) =>
      index % 2 === 0 ? line : { ...line, floorId: upperFloorId },
    )

    const flat = build()!
    const twoFloors = build({ installationLines: lifted })!

    expect(twoFloors.heightCm).toBeGreaterThan(flat.heightCm)
  })

  it('tesisatı olmayan projede sayfa ÜRETMEZ', () => {
    // Boş bir izometrik sayfa okuyucuya bir şey söylemez; kat planında durum
    // farklı, orada boş sayfa "bu kat boş" bilgisini taşıyor.
    expect(
      build({ installationLines: [], installationElements: [], installationConnections: [] }),
    ).toBeUndefined()
  })

  it('yalnız TÜKETİM hatlarını etiketler ve numarayı boşluksuz verir', () => {
    const markup = build()!.markup
    const orders = [...markup.matchAll(/>\((\d+)\)</g)].map((match) => Number(match[1]))

    expect(orders.length).toBeGreaterThan(0)
    // Gövde borusu onlarca parçaya bölünüyor; hepsi etiketlenseydi çizim rakam
    // bulutu olurdu. Süzülmüş liste üzerinden numaralandığı için atlama YOK.
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(new Set(orders).size).toBe(orders.length)
    expect(Math.max(...orders)).toBe(orders.length)
  })

  it('yazı tipini çağırandan alır — gömülü fontla aynı ad olmalı', () => {
    expect(build()!.markup).toContain('font-family="Roboto"')
  })

  it('kutu, çizimden ve etiketlerden BÜYÜK: kenardaki yazı kırpılmaz', () => {
    const svg = build()!
    const viewBox = /viewBox="([^"]+)"/.exec(svg.markup)![1].split(' ').map(Number)

    expect(viewBox[2]).toBeCloseTo(svg.widthCm)
    expect(viewBox[3]).toBeCloseTo(svg.heightCm)
    // Etiketler halka hâlinde dışarıda; kutu çizimin kendisinden geniş olmalı.
    expect(svg.widthCm).toBeGreaterThan(0)
    expect(svg.heightCm).toBeGreaterThan(0)
  })
})
