import type { FloorLevel } from './floorLevels'
import { n, svgLine, svgPolygon, svgPolyline, svgText, SVG_COLORS } from './svgPrimitives'

const OUTLINE_WIDTH_CM = 3
const THIN_WIDTH_CM = 1.5
const HATCH_COUNT = 14

export type ElevationInput = {
  /** Kot değerlerine çevrilmiş katlar (bkz. getFloorLevels). */
  levels: readonly FloorLevel[]
  widthCm: number
  topCm: number
  bottomCm: number
  roofCm: number
  overhangCm: number
  fontFamily: string
  labelSizeCm: number
  levelSizeCm: number
}

function formatLevel(valueCm: number): string {
  return `${n(valueCm)} cm`
}

/**
 * Kat yığını kesiti: bina kütlesi, çatı, kat ayırma çizgileri, adlar, kotlar ve
 * zemin çizgisi. Vaziyet planının GERÇEK veriye dayanan yarısı — yükseklikler
 * `Floor.heightCm`ten, kot sıfırı zemin katın tabanından geliyor.
 */
export function buildElevationSvg(input: ElevationInput): string[] {
  const {
    levels,
    widthCm,
    topCm,
    bottomCm,
    roofCm,
    overhangCm,
    fontFamily,
    labelSizeCm,
    levelSizeCm,
  } = input

  const leftCm = 0
  const rightCm = widthCm
  const body: string[] = []

  // --- Bina kütlesi ve çatı
  if (levels.length > 0) {
    body.push(
      svgPolygon(
        [
          { x: leftCm, y: bottomCm },
          { x: rightCm, y: bottomCm },
          { x: rightCm, y: topCm },
          { x: leftCm, y: topCm },
        ],
        'none',
        { color: SVG_COLORS.ink, widthCm: OUTLINE_WIDTH_CM },
      ),
      svgPolyline(
        [
          { x: leftCm, y: topCm },
          { x: widthCm / 2, y: roofCm },
          { x: rightCm, y: topCm },
        ],
        OUTLINE_WIDTH_CM,
        SVG_COLORS.ink,
      ),
    )
  }

  // --- Kat ayırma çizgileri, adlar ve kotlar
  for (const level of levels) {
    // Kot etiketi katın DIŞA bakan yüzünü gösterir: üst katta tavan, bodrumda
    // taban. Bodrumda tavanı yazsaydık en üstteki bodrumun tavanı 0 çıkar ve
    // zemin çizgisinin etiketiyle üst üste binerdi (ölçüldü).
    const levelCm = level.floor.isBasement ? level.baseCm : level.topCm

    body.push(
      svgLine(
        { x: leftCm, y: level.topCm },
        { x: rightCm, y: level.topCm },
        THIN_WIDTH_CM,
        SVG_COLORS.object,
      ),
      svgText(
        { x: leftCm + widthCm * 0.06, y: level.baseCm + level.floor.heightCm / 2 - labelSizeCm / 3 },
        level.floor.name,
        { fontFamily, sizeCm: labelSizeCm, color: SVG_COLORS.label, anchor: 'start' },
      ),
      svgText(
        { x: rightCm + widthCm * 0.03, y: levelCm + levelSizeCm * 0.2 },
        formatLevel(levelCm),
        { fontFamily, sizeCm: levelSizeCm, color: SVG_COLORS.annotation, anchor: 'start' },
      ),
    )
  }

  // --- Zemin çizgisi ve tarama; kot sıfırı burası
  body.push(
    svgLine(
      { x: leftCm - overhangCm, y: 0 },
      { x: rightCm + overhangCm, y: 0 },
      THIN_WIDTH_CM,
      SVG_COLORS.ink,
    ),
    svgText({ x: leftCm - overhangCm, y: levelSizeCm * 0.4 }, formatLevel(0), {
      fontFamily,
      sizeCm: levelSizeCm,
      color: SVG_COLORS.annotation,
      anchor: 'start',
    }),
  )

  const hatchSpanCm = widthCm + overhangCm * 2
  const hatchCm = hatchSpanCm / HATCH_COUNT
  for (let index = 0; index < HATCH_COUNT; index += 1) {
    const startXCm = leftCm - overhangCm + hatchCm * index
    body.push(
      svgLine(
        { x: startXCm, y: 0 },
        { x: startXCm + hatchCm * 0.5, y: -hatchCm * 0.5 },
        THIN_WIDTH_CM * 0.6,
        SVG_COLORS.annotation,
      ),
    )
  }

  return body
}
