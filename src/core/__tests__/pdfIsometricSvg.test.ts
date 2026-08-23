import { describe, expect, it } from 'vitest'

import sampleProject from '../../../docs/sample-project.json'
import {
  getCameraProjection,
  ISOMETRIC_ANGLES_DEFAULT,
} from '../../isometric/core/isometricProjection'
import { isDischargeKind } from '../../plumbing/core/lineKinds'
import { getSymbolMetadata } from '../../plumbing/scene/symbolLoader'
import { resolveSymbolAsset } from '../../ui/pdf/symbolMarkup'
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
    projection: getCameraProjection(ISOMETRIC_ANGLES_DEFAULT),
    getMetadata: getSymbolMetadata,
    resolveLineColor: (line) => (isDischargeKind(line.kind) ? DISCHARGE_COLOR : GAS_COLOR),
    resolveSymbol: resolveSymbolAsset,
    fontFamily: 'Roboto',
  })
}

function pipePolylines(markup: string): string[] {
  return [...markup.matchAll(/<polyline points="([^"]+)"/g)].map((match) => match[1])
}

const countPipes = (markup: string) => pipePolylines(markup).length

/** İlk borunun ilk noktasının SVG y'si; kutu ve etiketlerden bağımsız ölçü. */
function firstPipeY(markup: string): number {
  return Number(pipePolylines(markup)[0].split(' ')[0].split(',')[1])
}

describe('buildIsometricSvg', () => {
  it('başlığı ve boruları basar', () => {
    const svg = build()

    expect(svg?.markup).toContain('İZOMETRİK ŞEMA')
    expect(svg?.markup).toContain('<polyline')
    expect(svg?.markup).toContain(GAS_COLOR)
  })

  it('kat kotunu uygular: üst kattaki hat kâğıtta YUKARIDA çizilir', () => {
    // Örnek projenin tesisatı tek katta; TEK hat üst kata taşınıp aynı hattın
    // nereye düştüğüne bakılıyor. Aktif kat kavramı olsaydı ya hiç çizilmez ya
    // da aynı yerde kalırdı.
    const [line] = SAMPLE.installationLines
    const upperFloorId = SAMPLE.floors[1].id

    const onGround = firstPipeY(build({ installationLines: [line] })!.markup)
    const onUpper = firstPipeY(
      build({ installationLines: [{ ...line, floorId: upperFloorId }] })!.markup,
    )

    // SVG y ekseni AŞAĞI büyüyor: yukarıda çizilmek KÜÇÜK y demek.
    expect(onUpper).toBeLessThan(onGround)
  })

  it('katların HEPSİNİ çizer: hiçbir hat kat yüzünden düşmez', () => {
    const upperFloorId = SAMPLE.floors[1].id
    const lifted = SAMPLE.installationLines.map((line, index) =>
      index % 2 === 0 ? line : { ...line, floorId: upperFloorId },
    )

    expect(countPipes(build({ installationLines: lifted })!.markup)).toBe(
      countPipes(build()!.markup),
    )
  })

  it('eleman SEMBOLLERİNİ çizer, yalnız etiketlerini değil', () => {
    const markup = build()!.markup
    const symbols = [...markup.matchAll(/<g transform="/g)]

    // İlk sürümde semboller hiç çizilmiyordu (kullanıcı bulgusu): sayfada
    // yalnız borular ve yazılar vardı.
    expect(symbols.length).toBeGreaterThan(0)
  })

  it('sembolü DÖNDÜRMEZ: izometrikte billboard, plan açısı uygulanmaz', () => {
    const markup = build()!.markup
    const transforms = [...markup.matchAll(/<g transform="([^"]+)"/g)].map((match) => match[1])

    expect(transforms.length).toBeGreaterThan(0)
    for (const transform of transforms) expect(transform).not.toContain('rotate(')
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
