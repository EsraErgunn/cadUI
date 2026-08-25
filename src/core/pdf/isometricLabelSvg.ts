import type { IsometricSvgInput } from './isometricSvg'
import { svgLine, svgText, SVG_COLORS } from './svgPrimitives'
import type { IsometricElevationContext } from '../../isometric/core/isometricElevation'
import {
  layoutLabelsBesideAnchors,
  type LabelBox,
} from '../../isometric/core/isometricLabelPlacement'
import {
  getIsometricElementLabelLines,
  getIsometricLineLabelAnchor,
  getIsometricLineLabelLines,
  getIsometricRiseLabel,
  hasIsometricElementLabel,
  isConsumptionLine,
} from '../../isometric/core/isometricLabels'
import type { buildIsometricScene } from '../../isometric/core/isometricScene'
import type { PlanPoint, ThreePosition } from '../coords'

export const LABEL_LINE_HEIGHT = 1.25

/** Bir karakterin ortalama genişliği, punto başına (coverPageCells ile aynı tahmin). */
export const CHAR_WIDTH_RATIO = 0.55

export type LabelBounds = { minX: number; minY: number; maxX: number; maxY: number }

export function extendBounds(bounds: LabelBounds, point: PlanPoint): void {
  bounds.minX = Math.min(bounds.minX, point.x)
  bounds.minY = Math.min(bounds.minY, point.y)
  bounds.maxX = Math.max(bounds.maxX, point.x)
  bounds.maxY = Math.max(bounds.maxY, point.y)
}

type LabelEntry = {
  key: string
  anchor: ThreePosition
  textLines: string[]
  storedOffsetCm: PlanPoint | undefined
}

/**
 * Etiketler ve kılavuz çizgileri.
 *
 * Hangi hattın etiketleneceği EKRANDAKİ kuralla aynı (`isConsumptionLine`):
 * yalnız tüketim noktasına varan hatlar. Gövde borusunun her parçasına boy/çap
 * yazılınca çizim rakam bulutuna dönüyordu.
 *
 * ⚠️ Hangi ELEMANIN etiketleneceği ekrandan FARKLI (K156): kâğıtta yalnız
 * künyesi olanlar (`hasIsometricElementLabel`) yazılıyor. Vana/filtre gibi
 * armatürler sembolün zaten söylediği adı tekrarlıyor ve çok katlı binada
 * onlarca satıra çıkıyordu.
 *
 * ⚠️ Yerleşim de ekrandan farklı: halka değil, etiket NESNESİNİN YANINDA
 * (`layoutLabelsBesideAnchors`). Kılavuz çizgisi istisna hâline geldi.
 *
 * Kullanıcı bir etiketi elle taşıdıysa (`isometricLabelOffsetCm`) onun yeri
 * kullanılır; taşımadıysa yerleşim hesaplanır — ekranla aynı öncelik.
 */
export function buildIsometricLabelSvg(
  input: IsometricSvgInput,
  scene: ReturnType<typeof buildIsometricScene>,
  sizes: { extentCm: number; labelSizeCm: number; leaderWidthCm: number },
  bounds: LabelBounds,
): string[] {
  if (!scene.bounds) return []

  const context: IsometricElevationContext = {
    lines: input.installationLines,
    connections: input.installationConnections,
  }
  const lineById = new Map(input.installationLines.map((line) => [line.id, line]))
  const elementById = new Map(
    input.installationElements.map((element) => [element.id, element]),
  )

  const entries: LabelEntry[] = []

  // Sıra numarası SÜZÜLMÜŞ liste üzerinden verilir: atlamalı numaralar
  // ("1, 4, 9") kullanıcıya anlamsız gelirdi (ekranla aynı kural).
  let order = 0
  for (const geometry of scene.lines) {
    const line = lineById.get(geometry.lineId)
    if (!line) continue

    // Yükseklik etiketi TÜKETİM süzgecinin DIŞINDA (ekranla aynı kural):
    // kolon gövde borusunun bir parçası ve `isConsumptionLine` onu eler —
    // süzgece bağlansaydı binanın asıl yükselişleri yazısız kalırdı.
    const rise = getIsometricRiseLabel(line, geometry, context)
    if (rise) {
      entries.push({
        key: rise.key,
        anchor: rise.anchor,
        textLines: [rise.text],
        storedOffsetCm: undefined,
      })
    }

    if (!isConsumptionLine(line, input.installationElements, input.installationConnections)) {
      continue
    }

    const anchor = getIsometricLineLabelAnchor(geometry.positions)
    if (!anchor) continue

    order += 1
    entries.push({
      key: `line-${geometry.lineId}`,
      anchor,
      textLines: getIsometricLineLabelLines(line, order, context),
      storedOffsetCm: line.isometricLabelOffsetCm,
    })
  }

  for (const placement of scene.elements) {
    const element = elementById.get(placement.elementId)
    if (!element) continue
    // Vana/filtre/manometre gibi künyesiz elemanlar KÂĞITTA susar (K156):
    // etiketleri sembolün zaten söylediği adı tekrarlıyordu.
    if (!hasIsometricElementLabel(element)) continue

    entries.push({
      key: `element-${placement.elementId}`,
      anchor: placement.position,
      textLines: getIsometricElementLabelLines(element),
      storedOffsetCm: element.isometricLabelOffsetCm,
    })
  }

  if (entries.length === 0) return []

  // Kutu ölçüsü etiket BAŞINA hesaplanıyor. Halka yerleşimindeyken tek bir
  // "en geniş etiket" payı yetiyordu (hepsi aynı çember üzerindeydi); yan yana
  // dizilen kutularda dar bir etikete geniş pay vermek onu boş yere uzağa
  // itiyor.
  const boxes: LabelBox[] = entries.map((entry) => ({
    key: entry.key,
    anchor: input.projection.project(entry.anchor),
    widthCm:
      Math.max(...entry.textLines.map((text) => text.length)) *
      sizes.labelSizeCm *
      CHAR_WIDTH_RATIO,
    heightCm: entry.textLines.length * sizes.labelSizeCm * LABEL_LINE_HEIGHT,
  }))

  const placements = layoutLabelsBesideAnchors(
    boxes,
    input.projection.project(scene.bounds.center),
    sizes.labelSizeCm,
  )

  const body: string[] = []
  for (const entry of entries) {
    const anchorPoint = input.projection.project(entry.anchor)
    // Kullanıcının elle taşıdığı etiket OLDUĞU YERDE kalır; otomatik yerleşim
    // yalnız taşınmamışlar için.
    const offsetCm = entry.storedOffsetCm ?? placements.get(entry.key) ?? { x: 0, y: 0 }
    const at = { x: anchorPoint.x + offsetCm.x, y: anchorPoint.y + offsetCm.y }

    const halfWidthCm =
      (Math.max(...entry.textLines.map((text) => text.length)) *
        sizes.labelSizeCm *
        CHAR_WIDTH_RATIO) /
      2

    // Kılavuz çizgisi artık İSTİSNA (K156): etiket nesnesinin yanında durduğu
    // için çoğunda gereksiz. Yalnız çakışma çözümü kutuyu kendi payının ötesine
    // ittiyse çiziliyor — o zaman hangi nesneye ait olduğu şekilden okunmuyor.
    const gapCm = Math.hypot(offsetCm.x, offsetCm.y)
    const leaderThresholdCm = halfWidthCm + entry.textLines.length * sizes.labelSizeCm * LABEL_LINE_HEIGHT
    if (gapCm > leaderThresholdCm) {
      body.push(svgLine(anchorPoint, at, sizes.leaderWidthCm, SVG_COLORS.leader))
    }

    entry.textLines.forEach((text, index) => {
      const y = at.y - index * sizes.labelSizeCm * LABEL_LINE_HEIGHT
      extendBounds(bounds, { x: at.x - halfWidthCm, y })
      extendBounds(bounds, { x: at.x + halfWidthCm, y })
      body.push(
        svgText({ x: at.x, y }, text, {
          fontFamily: input.fontFamily,
          sizeCm: sizes.labelSizeCm,
          color: SVG_COLORS.label,
        }),
      )
    })
  }

  return body
}
