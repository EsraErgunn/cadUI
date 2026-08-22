import type { IsometricSvgInput } from './isometricSvg'
import { svgLine, svgText, SVG_COLORS } from './svgPrimitives'
import type { IsometricElevationContext } from '../../isometric/core/isometricElevation'
import { layoutIsometricLabels } from '../../isometric/core/isometricLabelLayout'
import {
  getIsometricElementLabelLines,
  getIsometricLabelDistanceCm,
  getIsometricLineLabelAnchor,
  getIsometricLineLabelLines,
  isConsumptionLine,
} from '../../isometric/core/isometricLabels'
import { projectIsometric } from '../../isometric/core/isometricProjection'
import type { buildIsometricScene } from '../../isometric/core/isometricScene'
import type { PlanPoint, ThreePosition } from '../coords'

/** Ekrandaki halka yerleşiminin çarpanları; kâğıtta da aynı iki halka. */
export const LINE_LABEL_DISTANCE_FACTOR = 1
export const ELEMENT_LABEL_DISTANCE_FACTOR = 1.6

export const LABEL_LINE_HEIGHT = 1.25

/** Komşu etiketler arasında bırakılan pay; 1 = tam bir etiket boyu. */
export const LABEL_SEPARATION_FACTOR = 1.15

/**
 * Etiket halkasını KÂĞIT için daraltan çarpan.
 *
 * `layoutIsometricLabels` halkayı sahne boyutunun YARISI kadar dışarı koyuyor.
 * Ekranda doğru: yazı ekran-sabit boyutta, kamera uzaklaşınca da okunur kalıyor.
 * Kâğıtta her şey BİRLİKTE küçüldüğü için aynı halka çizimi sayfanın ortasında
 * minik bir leke, kalanını kılavuz çizgileri yapıyordu (ölçüldü: 1500 cm'lik
 * sahne 3883 cm'lik kutuya yayılıyordu).
 */
export const PAPER_RING_TIGHTNESS = 0.18

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
  distanceFactor: number
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
 * Kullanıcı bir etiketi elle taşıdıysa (`isometricLabelOffsetCm`) onun yeri
 * kullanılır; taşımadıysa halka yerleşimi hesaplanır — ekranla aynı öncelik.
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
    if (!isConsumptionLine(line, input.installationElements, input.installationConnections)) {
      continue
    }

    const anchor = getIsometricLineLabelAnchor(geometry.positions)
    if (!anchor) continue

    order += 1
    entries.push({
      key: `line-${geometry.lineId}`,
      anchor,
      distanceFactor: LINE_LABEL_DISTANCE_FACTOR,
      textLines: getIsometricLineLabelLines(line, order, context),
      storedOffsetCm: line.isometricLabelOffsetCm,
    })
  }

  for (const placement of scene.elements) {
    const element = elementById.get(placement.elementId)
    if (!element) continue

    entries.push({
      key: `element-${placement.elementId}`,
      anchor: placement.position,
      distanceFactor: ELEMENT_LABEL_DISTANCE_FACTOR,
      textLines: getIsometricElementLabelLines(element),
      storedOffsetCm: element.isometricLabelOffsetCm,
    })
  }

  if (entries.length === 0) return []

  // Ayırma payı EKRANDA piksel/zoom ile hesaplanıyor; kâğıtta zoom yok, ölçü
  // doğrudan cm.
  //
  // ⚠️ Pay yalnız satır YÜKSEKLİĞİNDEN hesaplanamaz: künyeler geniş
  // ("12000 kcal/h" bir satırda dört satır yüksekliği kadar yer kaplıyor) ve
  // yükseklikle ayrılan iki etiket yan yana çakışıyordu (ölçüldü). En geniş
  // etiket neyse pay ondan geliyor.
  const maxWidthCm = entries.reduce((widest, entry) => {
    const longest = Math.max(...entry.textLines.map((text) => text.length))
    return Math.max(widest, longest * sizes.labelSizeCm * CHAR_WIDTH_RATIO)
  }, 0)
  const maxHeightCm =
    entries.reduce((tallest, entry) => Math.max(tallest, entry.textLines.length), 1) *
    sizes.labelSizeCm *
    LABEL_LINE_HEIGHT
  const minSeparationCm = Math.max(maxWidthCm, maxHeightCm) * LABEL_SEPARATION_FACTOR

  const placements = layoutIsometricLabels(
    entries.map(({ key, anchor, distanceFactor }) => ({ key, anchor, distanceFactor })),
    scene.bounds.center,
    input.angles,
    scene.bounds.sizeCm * PAPER_RING_TIGHTNESS,
    minSeparationCm,
  )

  const body: string[] = []
  for (const entry of entries) {
    const anchorPoint = projectIsometric(entry.anchor, input.angles)
    const offsetCm = entry.storedOffsetCm ?? placements.get(entry.key) ?? { x: 0, y: 0 }
    const at = { x: anchorPoint.x + offsetCm.x, y: anchorPoint.y + offsetCm.y }

    // Kılavuz çizgisi: etiket çapasından uzaktaysa hangi nesneye ait olduğu
    // ancak çizgiyle anlaşılıyor (plan sayfasındaki `buildLabelSvg` ile aynı iş).
    const gapCm = Math.hypot(offsetCm.x, offsetCm.y)
    if (gapCm > getIsometricLabelDistanceCm(sizes.extentCm, 0.2)) {
      body.push(svgLine(anchorPoint, at, sizes.leaderWidthCm, SVG_COLORS.leader))
    }

    // Yazı ORTALANMIŞ çiziliyor; sınıra yalnız çapası katılsaydı kenardaki
    // etiketlerin yarısı kutunun dışında kalır ve kırpılırdı.
    const halfWidthCm =
      (Math.max(...entry.textLines.map((text) => text.length)) *
        sizes.labelSizeCm *
        CHAR_WIDTH_RATIO) /
      2

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
