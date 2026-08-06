import type { PlanPoint } from './coords'

/**
 * Sembol şekillerinin çizim yardımcıları. `architectureSymbol.ts`'ten ayrıldı
 * (max-lines); orası hangi cihazın hangi şekilde çizileceğine karar verir,
 * burası o şekli üretir.
 *
 * Hepsi YEREL cm uzayında çalışır: orijin duvar yüzünde, +x duvar boyunca.
 */

const CIRCLE_SEGMENTS = 28
/** Menfez tarasının çizgi sayısı; referansta dar bir bantta birkaç dikey çizgi. */
const HATCH_LINE_COUNT = 5
/** Aydınlatma yıldızının ışın sayısı. */
const STAR_RAY_COUNT = 12

/** Çizgi kalınlığını sahne bu role göre seçer; px değeri core'da tutulmaz. */
export type SymbolStrokeRole = 'body' | 'detail'

export type SymbolStroke = {
  /** Benzersiz ad — React key (indeks DEĞİL, CLAUDE.md kural 6). */
  name: string
  role: SymbolStrokeRole
  points: PlanPoint[]
}

export type SymbolGeometry = {
  strokes: SymbolStroke[]
  /** Dolu alanların köşeleri; boşsa dolgu yok. */
  fills: PlanPoint[][]
}

export function rectangleCorners(halfWidth: number, halfDepth: number, centerY = 0): PlanPoint[] {
  return [
    { x: -halfWidth, y: centerY - halfDepth },
    { x: halfWidth, y: centerY - halfDepth },
    { x: halfWidth, y: centerY + halfDepth },
    { x: -halfWidth, y: centerY + halfDepth },
  ]
}

export function circlePoints(radius: number, centerY: number, centerX = 0): PlanPoint[] {
  const points: PlanPoint[] = []
  for (let step = 0; step <= CIRCLE_SEGMENTS; step += 1) {
    const angle = (step / CIRCLE_SEGMENTS) * Math.PI * 2
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    })
  }
  return points
}

export function starStrokes(radius: number, centerY: number): SymbolStroke[] {
  const strokes: SymbolStroke[] = []
  for (let ray = 0; ray < STAR_RAY_COUNT; ray += 1) {
    const angle = (ray / STAR_RAY_COUNT) * Math.PI * 2
    strokes.push({
      name: `ray-${ray}`,
      role: 'detail',
      points: [
        { x: 0, y: centerY },
        { x: Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius },
      ],
    })
  }
  // İç halka: ışınların ortasını toplar, referanstaki yıldız gibi okunur.
  strokes.push({ name: 'hub', role: 'body', points: circlePoints(radius * 0.35, centerY) })
  return strokes
}

export function hatchStrokes(halfWidth: number, halfDepth: number, centerY: number): SymbolStroke[] {
  const strokes: SymbolStroke[] = []
  for (let line = 1; line <= HATCH_LINE_COUNT; line += 1) {
    const x = -halfWidth + ((halfWidth * 2) / (HATCH_LINE_COUNT + 1)) * line
    strokes.push({
      name: `hatch-${line}`,
      role: 'detail',
      points: [
        { x, y: centerY - halfDepth },
        { x, y: centerY + halfDepth },
      ],
    })
  }
  return strokes
}

