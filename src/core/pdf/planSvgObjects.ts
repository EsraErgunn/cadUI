import { buildLabelSvg, type PlanLabelledItem } from './planSvgLabels'
import { n, svgPolygon, svgPolyline, svgText, PLAN_COLORS } from './svgPrimitives'
import { getPointSymbolPlanGeometry } from '../architectureSymbol'
import { getAreaObjectPlanGeometry } from '../areaObjectGeometry'
import {
  getAreaObjectNameLabel,
  getAreaObjectWorldBoundsCm,
  hasAreaObjectNameLabel,
} from '../areaObjectLabel'
import { getBeamCorners } from '../beam'
import type { AreaObject, Beam, Id, Point, PointSymbol, TextLabel, Wall } from '../model'
import { getSymbolPose, getSymbolsOnFloor } from '../symbolPlacement'

/** Kontur kalınlıkları (cm). Ekranda ekran-pikseli; kâğıtta ölçekle büyüsün diye cm. */
const OBJECT_STROKE_CM = 2
const OBJECT_DETAIL_STROKE_CM = 1
const SYMBOL_BODY_STROKE_CM = 2
const SYMBOL_DETAIL_STROKE_CM = 1

/** Kirişin kesikli konturu (cm) — ekrandaki `Beam.tsx` ile aynı çizim dili. */
const BEAM_DASH_CM = 12
const BEAM_GAP_CM = 8

/** Etiketin nesne kutusunun üstünde duracağı pay (cm). */
const LABEL_MARGIN_CM = 12

export type PlanObjectsInput = {
  points: readonly Point[]
  walls: readonly Wall[]
  areaObjects: readonly AreaObject[]
  beams: readonly Beam[]
  symbols: readonly PointSymbol[]
  floorId: Id
  fontFamily: string
}

/**
 * Kiriş, alan nesnesi ve nokta sembolü — hepsi EKRANDAKİ geometriyle.
 *
 * Alan nesnesi kaba bir dikdörtgen DEĞİL: `getAreaObjectPlanGeometry` merdivenin
 * basamaklarını, baca şaftının taramasını, kolon havalandırmasının çemberini
 * üretiyor ve kâğıtta da aynısı basılıyor. Önce yalnız sınır kutusu çiziliyordu
 * ve nesneler birbirinden ayırt edilemiyordu (kullanıcı bildirimi).
 *
 * Kiriş KESİKLİ konturla çiziliyor (`Beam.tsx` ile aynı): üstten geçen bir taşıyıcı
 * olduğu, duvardan bu şekilde ayrılıyor.
 */
export function buildPlanObjectsSvg(input: PlanObjectsInput): string[] {
  const { points, walls, areaObjects, beams, symbols, floorId, fontFamily } = input
  const body: string[] = []
  const labelled: PlanLabelledItem[] = []

  for (const beam of beams) {
    if (beam.floorId !== floorId) continue

    const corners = getBeamCorners(beam)
    if (!corners) continue

    body.push(
      `<polygon points="${corners.map((corner) => `${n(corner.x)},${n(-corner.y)}`).join(' ')}" ` +
        `fill="none" stroke="${PLAN_COLORS.faint}" stroke-width="${n(OBJECT_STROKE_CM)}" ` +
        `stroke-dasharray="${n(BEAM_DASH_CM)} ${n(BEAM_GAP_CM)}" />`,
    )
  }

  for (const areaObject of areaObjects) {
    if (areaObject.floorId !== floorId) continue

    const geometry = getAreaObjectPlanGeometry(areaObject.type, areaObject)
    // Kolon da dahil hiçbiri DOLU değil (K154): pafta tesisat odaklı, altından
    // geçen boru hiçbir mimari yüzeyin arkasında kalmamalı. Sınır yine çizilir,
    // yalnız konturla.
    if (geometry.fill.length > 0) {
      body.push(
        svgPolygon(geometry.fill, 'none', {
          color: PLAN_COLORS.faint,
          widthCm: OBJECT_STROKE_CM,
        }),
      )
    }
    for (const stroke of geometry.strokes) {
      body.push(
        svgPolyline(
          stroke.points,
          stroke.role === 'body' ? OBJECT_STROKE_CM : OBJECT_DETAIL_STROKE_CM,
          PLAN_COLORS.faint,
        ),
      )
    }

    // Ekranda hangi nesne adlanıyorsa kâğıtta da o (`AreaObjectNameLabels`):
    // merdiven etiketsiz, oku ve basamakları zaten anlatıyor.
    if (!hasAreaObjectNameLabel(areaObject.type)) continue

    const bounds = getAreaObjectWorldBoundsCm(areaObject.type, areaObject)
    labelled.push({
      origin: { x: areaObject.x, y: areaObject.y },
      anchor: areaObject.labelOffsetCm
        ? { x: areaObject.x + areaObject.labelOffsetCm.x, y: areaObject.y + areaObject.labelOffsetCm.y }
        : { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY + LABEL_MARGIN_CM },
      lines: [getAreaObjectNameLabel(areaObject.type)],
    })
  }

  // Sembol kendi katını TAŞIMAZ: duvara bağlı olan katını duvarından alır.
  for (const symbol of getSymbolsOnFloor(symbols, floorId, walls)) {
    const pose = getSymbolPose(symbol, walls, points)
    // Duvarı çözülemeyen bağlı sembol çizilmez — ekranda da çizilmiyor.
    if (!pose) continue

    const geometry = getPointSymbolPlanGeometry(symbol.type, pose)

    // Cihaz sembolleri de İÇİ BOŞ (K154). Duvarın üstüne oturuyorlar ama artık
    // duvarın içi de beyaz: dolu bir sembol duvardan taşan tek koyu leke olur
    // ve gözü tesisattan çalardı.
    for (const fill of geometry.fills) {
      body.push(
        svgPolygon(fill, 'none', {
          color: PLAN_COLORS.faint,
          widthCm: SYMBOL_BODY_STROKE_CM,
        }),
      )
    }
    for (const stroke of geometry.strokes) {
      body.push(
        svgPolyline(
          stroke.points,
          stroke.role === 'body' ? SYMBOL_BODY_STROKE_CM : SYMBOL_DETAIL_STROKE_CM,
          PLAN_COLORS.faint,
        ),
      )
    }
  }

  return [...body, ...buildLabelSvg(labelled, fontFamily, PLAN_COLORS.architectureText)]
}

/**
 * Serbest metinler AYRI dönüyor: yazılar en üstte basılmalı, nesnelerin altında
 * kalmamalı. Sıralamayı çağıran kuruyor (bkz. planSvg.ts).
 */
export function buildPlanTextsSvg(
  texts: readonly TextLabel[],
  floorId: Id,
  fontFamily: string,
): string[] {
  return texts
    .filter((label) => label.floorId === floorId)
    .map((label) =>
      svgText({ x: label.x, y: label.y }, label.text, {
        fontFamily,
        sizeCm: label.heightCm,
        anchor: 'middle',
        angleDeg: label.angleDeg,
        color: PLAN_COLORS.architectureText,
      }),
    )
}
