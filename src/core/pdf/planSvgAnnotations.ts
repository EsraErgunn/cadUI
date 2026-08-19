import { svgText, SVG_COLORS } from './svgPrimitives'
import { getCornerAngleAnnotations } from '../cornerAngles'
import type { Id, Opening, Point, Wall } from '../model'
import { getWallDimensionAnnotations } from '../wallDimensions'

/** Ölçü ve açı yazılarının PLAN santimi cinsinden yüksekliği. */
const DIMENSION_HEIGHT_CM = 14
const ANGLE_HEIGHT_CM = 12

/**
 * Yazının duvar yüzünden uzaklığı (cm). Ekranda bu boşluk `px / zoom` ile
 * ekran-sabit tutuluyor; kâğıtta ölçek sabit olduğu için doğrudan cm verilir —
 * yoksa 1:50 ile 1:200 çıktısında yazı duvara farklı uzaklıkta dururdu.
 */
const DIMENSION_GAP_CM = 12
const ANGLE_OFFSET_CM = 28

/** Metre cinsinden, iki ondalık: paftada okunan birim metredir. */
function formatMetres(lengthCm: number): string {
  return `${(lengthCm / 100).toFixed(2)} m`
}

export type PlanAnnotationsInput = {
  points: readonly Point[]
  walls: readonly Wall[]
  openings: readonly Opening[]
  floorId: Id
  fontFamily: string
}

/**
 * Duvar/açıklık ölçüleri ve köşe açıları.
 *
 * Ekranda bu iki katman ayrı ayrı açılıp kapanabiliyor (Görünüm menüsü); kâğıtta
 * İKİSİ DE basılır — pafta ölçüsüz teslim edilmez, ekranda kapalı olması yalnız
 * çizerken kalabalık yapmasın diyedir.
 */
export function buildPlanAnnotationsSvg(input: PlanAnnotationsInput): string[] {
  const { points, walls, openings, floorId, fontFamily } = input

  const dimensions = getWallDimensionAnnotations(walls, points, openings, {
    activeFloorId: floorId,
    gapCm: DIMENSION_GAP_CM,
    isWallVisible: true,
    isOpeningVisible: true,
  })

  const angles = getCornerAngleAnnotations(walls, points, {
    activeFloorId: floorId,
    offsetCm: ANGLE_OFFSET_CM,
  })

  return [
    ...dimensions.map((dimension) =>
      svgText(dimension.position, formatMetres(dimension.lengthCm), {
        fontFamily,
        sizeCm: DIMENSION_HEIGHT_CM,
        color: SVG_COLORS.annotation,
        angleDeg: dimension.angleDeg,
      }),
    ),
    ...angles.map((angle) =>
      svgText(angle.position, `${Math.round(angle.angleDeg)}°`, {
        fontFamily,
        sizeCm: ANGLE_HEIGHT_CM,
        color: SVG_COLORS.annotation,
      }),
    ),
  ]
}
