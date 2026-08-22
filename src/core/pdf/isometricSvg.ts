import {
  buildIsometricLabelSvg,
  extendBounds,
  type LabelBounds,
} from './isometricLabelSvg'
import type { PlanSymbolAsset } from './planSvgInstallation'
import { n, svgLine, svgPolyline, svgText, SVG_COLORS } from './svgPrimitives'
import { projectIsometric, type IsometricAngles } from '../../isometric/core/isometricProjection'
import {
  buildIsometricScene,
  getIsometricBoundsDiagonalCm,
  type IsometricSceneInput,
} from '../../isometric/core/isometricScene'
import type { SymbolMetadataLookup } from '../../plumbing/core/elementPicking'
import type { InstallationLine } from '../../plumbing/core/installationModel'
import type { InstallationElementType } from '../../plumbing/core/symbolMetadata'
import type { PlanPoint, ThreePosition } from '../coords'

/** Yazı boyu ve çizgi kalınlıkları, sahne köşegenine oranla. */
const TITLE_SIZE_RATIO = 0.045
const LABEL_SIZE_RATIO = 0.011
const PIPE_WIDTH_RATIO = 0.0016
const LEADER_WIDTH_RATIO = 0.0008

/** Çevreye bırakılan pay; etiketler kutunun dışına taşmasın. */
const MARGIN_RATIO = 0.06


export type IsometricSvgInput = IsometricSceneInput & {
  angles: IsometricAngles
  /** Sembol tanımları dışarıdan: `core/` sahne yükleyicisine bağlanmaz (kural 1/2). */
  getMetadata: SymbolMetadataLookup
  /** Hat rengi sahne katmanından gelir (planSvg ile aynı gerekçe). */
  resolveLineColor: (line: InstallationLine) => string
  /** Eleman sembolü; varlıklar bundler'a bağlı, core saf kalıyor (planSvg ile aynı). */
  resolveSymbol: (type: InstallationElementType) => PlanSymbolAsset | undefined
  /** Yazı tipi ailesi; PDF'e gömülen fontun adıyla AYNI olmalı. */
  fontFamily: string
}

export type IsometricSvg = {
  /** Tam SVG belgesi; birimi izdüşüm santimi, y çevrili (svgPrimitives sözleşmesi). */
  markup: string
  widthCm: number
  heightCm: number
}

/**
 * İzometrik şema sayfası.
 *
 * Ekrandaki izometrikle AYNI kaynaklardan üretilir — `buildIsometricScene`
 * geometriyi, `projectIsometric` izdüşümü, `isometricLabels` etiket metnini,
 * `layoutIsometricLabels` halka yerleşimini veriyor. Kâğıt kendi çizim dilini
 * uydurmuyor (K136'nın kuralı); burada yalnız SVG'ye dökülüyor.
 *
 * ⚠️ Sayfa ÖLÇEKSİZ. İzdüşümde uzunluklar kısalır (foreshortening), cetvelle
 * ölçülemez — bu yüzden alana SIĞDIRILARAK yerleşir ve üstünde ölçek YAZMAZ.
 * Gerçek boy etiketten okunur; referans paftada da öyle.
 *
 * ⚠️ Borular TEK ÇİZGİ, ekrandaki gibi kalınlıklarıyla değil. Şemanın işi
 * güzergâhı ve bağlantıyı göstermek; çap yazıdan (DN25) okunuyor. Kalınlıkla
 * çizilince yoğun projede etiketlere yer kalmıyordu.
 *
 * ⚠️ Açı ÇAĞIRANDAN gelir ve kullanıcının ekranda baktığı açıdır. Sabit bir açı
 * basmak, kullanıcının elle ayırdığı (`isometricOffsetCm`) binmeleri geri
 * getirirdi — o düzenleme baktığı açıya göre yapılmış.
 */
export function buildIsometricSvg(input: IsometricSvgInput): IsometricSvg | undefined {
  const { angles, fontFamily } = input
  const scene = buildIsometricScene(input, { angles, getMetadata: input.getMetadata })
  if (!scene.bounds) return undefined

  const extentCm = getIsometricBoundsDiagonalCm(scene.bounds)
  const titleSizeCm = extentCm * TITLE_SIZE_RATIO
  const labelSizeCm = extentCm * LABEL_SIZE_RATIO
  const pipeWidthCm = extentCm * PIPE_WIDTH_RATIO
  const leaderWidthCm = extentCm * LEADER_WIDTH_RATIO

  const project = (position: ThreePosition) => projectIsometric(position, angles)

  const body: string[] = []
  const bounds: LabelBounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }

  // --- Borular: tek çizgi, rengi çaptan (K27).
  const lineById = new Map(input.installationLines.map((line) => [line.id, line]))
  for (const geometry of scene.lines) {
    const points = geometry.positions.map(project)
    for (const point of points) extendBounds(bounds, point)

    const line = lineById.get(geometry.lineId)
    body.push(
      svgPolyline(points, pipeWidthCm, line ? input.resolveLineColor(line) : SVG_COLORS.ink, true),
    )
  }

  // --- Katlar arası düşey bağlantılar: borunun aynı kalemiyle.
  for (const link of scene.floorLinks) {
    const from = project(link.from)
    const to = project(link.to)
    extendBounds(bounds, from)
    extendBounds(bounds, to)
    body.push(svgLine(from, to, pipeWidthCm, SVG_COLORS.object, true))
  }

  // --- Eleman sembolleri: hatların ÜSTÜNDE, etiketlerin altında (plan sayfasıyla
  // aynı sıra).
  const elementById = new Map(input.installationElements.map((el) => [el.id, el]))
  for (const placement of scene.elements) {
    const element = elementById.get(placement.elementId)
    if (!element) continue

    const asset = input.resolveSymbol(element.type)
    // Sembolü çözülemeyen eleman çizilmez; ekranda da yer tutucuya düşüyor.
    if (!asset) continue

    const at = project(placement.position)
    extendBounds(bounds, at)
    body.push(
      `<g transform="${toBillboardTransform(at, placement.anchorOffsetCm, element.scale, asset)}">` +
        `${asset.body}</g>`,
    )
  }

  body.push(...buildIsometricLabelSvg(input, scene, { extentCm, labelSizeCm, leaderWidthCm }, bounds))

  // --- Başlık
  const centerX = (bounds.minX + bounds.maxX) / 2
  const titleY = bounds.maxY + titleSizeCm * 2
  body.push(
    svgText({ x: centerX, y: titleY }, 'İZOMETRİK ŞEMA', {
      fontFamily,
      sizeCm: titleSizeCm,
      color: SVG_COLORS.label,
    }),
  )

  const marginCm = extentCm * MARGIN_RATIO
  const boxLeft = bounds.minX - marginCm
  const boxRight = bounds.maxX + marginCm
  // Başlığın TABAN çizgisi titleY; harflerin üst uzantısı ve kenar payı üstüne.
  const boxTop = titleY + titleSizeCm + marginCm
  const boxBottom = bounds.minY - marginCm

  return {
    markup:
      `<svg xmlns="http://www.w3.org/2000/svg" ` +
      `viewBox="${n(boxLeft)} ${n(-boxTop)} ${n(boxRight - boxLeft)} ${n(boxTop - boxBottom)}">` +
      body.join('') +
      `</svg>`,
    widthCm: boxRight - boxLeft,
    heightCm: boxTop - boxBottom,
  }
}

/**
 * Sembolün kendi svg uzayından izometrik çıktı uzayına dönüşüm.
 *
 * ⚠️ DÖNDÜRME YOK. İzometrikte sembol bir BILLBOARD: ekrandaki
 * `IsometricElement` de onu kameraya dönük çiziyor, elemanın plan açısı
 * uygulanmıyor. Plan sayfasındaki `toSymbolTransform`dan tek farkı bu.
 *
 * Çapa kaydırması ÖLÇEKTEN ÖNCE ve 1:1 cm uygulanır (ekranla aynı sıra):
 * sembolün boruya değdiği nokta tam `position`a otursun diye.
 *
 * y bir kez çevriliyor: izdüşüm düzleminde +y YUKARI, çıktı svg'sinde AŞAĞI.
 */
function toBillboardTransform(
  at: PlanPoint,
  anchorOffsetCm: PlanPoint,
  scale: number,
  asset: PlanSymbolAsset,
): string {
  return (
    `translate(${n(at.x - anchorOffsetCm.x)} ${n(-(at.y - anchorOffsetCm.y))}) ` +
    `scale(${n(scale)}) ` +
    `translate(${n(-asset.originX)} ${n(-asset.originY)})`
  )
}
