import { svgText, PLAN_COLORS } from './svgPrimitives'
import type { Id, Opening, Point, Wall } from '../model'
import { getWallDimensionAnnotations } from '../wallDimensions'

/** Ölçü yazısının PLAN santimi cinsinden yüksekliği. */
const DIMENSION_HEIGHT_CM = 14

/**
 * Yazının duvar yüzünden uzaklığı (cm). Ekranda bu boşluk `px / zoom` ile
 * ekran-sabit tutuluyor; kâğıtta ölçek sabit olduğu için doğrudan cm verilir —
 * yoksa 1:50 ile 1:200 çıktısında yazı duvara farklı uzaklıkta dururdu.
 */
const DIMENSION_GAP_CM = 12

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
 * Duvar ve açıklık ölçüleri.
 *
 * Ekranda ölçü katmanı açılıp kapanabiliyor (Görünüm menüsü); kâğıtta HER ZAMAN
 * basılır — pafta ölçüsüz teslim edilmez, ekranda kapalı olması yalnız çizerken
 * kalabalık yapmasın diyedir.
 *
 * ⚠️ KÖŞE AÇILARI basılmıyor (K154). Pafta tesisat odaklı: dik köşede "90°"
 * yazmak mimari bir ayrıntı ve tesisatçıya bir şey söylemiyordu, plandaki
 * yazı kalabalığını artırıyordu. Ekranda duruyorlar.
 */
export function buildPlanAnnotationsSvg(input: PlanAnnotationsInput): string[] {
  const { points, walls, openings, floorId, fontFamily } = input

  const dimensions = getWallDimensionAnnotations(walls, points, openings, {
    activeFloorId: floorId,
    gapCm: DIMENSION_GAP_CM,
    isWallVisible: true,
    isOpeningVisible: true,
  })

  return dimensions.map((dimension) =>
    svgText(dimension.position, formatMetres(dimension.lengthCm), {
      fontFamily,
      sizeCm: DIMENSION_HEIGHT_CM,
      color: PLAN_COLORS.annotation,
      angleDeg: dimension.angleDeg,
    }),
  )
}
