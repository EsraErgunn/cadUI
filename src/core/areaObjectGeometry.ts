import { getAreaObjectCorners, toAreaObjectPlanPoints, type AreaObjectShape } from './areaObject'
import type { PlanPoint } from './coords'
import type { AreaObjectType } from './model'

/** Gövde (dış hat) kalın, ayrıntı (basamak/ok/çember) ince çizilir — PointSymbol ile aynı ayrım. */
export type AreaObjectStrokeRole = 'body' | 'detail'

export type AreaObjectStroke = {
  name: string
  role: AreaObjectStrokeRole
  points: PlanPoint[]
}

/**
 * İçi tamamen ŞEFFAF (tasarım referansı) — hiçbir tip dolgu taşımaz, yalnız
 * çizgi. `fills` alanı bilerek YOK: renderer (`scene/AreaObject.tsx`) tek bir
 * mesh bile üretmiyor.
 */
export type AreaObjectGeometry = {
  strokes: AreaObjectStroke[]
}

/** Basamak aralığı (cm) — tipik rıht/basamak derinliği yaklaşık değeri, salt görsel. */
const STAIR_TREAD_DEPTH_CM = 28
const MIN_STAIR_TREADS = 3
const MAX_STAIR_TREADS = 12
/** Ok, kolun tamamını kaplamaz: kenardan biraz içeride durur. */
const STAIR_ARROW_MARGIN_RATIO = 0.12
const STAIR_ARROW_HEAD_CM = 16
/** Çember neredeyse iç teğet — köşelere değmesin diye çok az küçültülür (tasarım referansı). */
const FLUE_SHAFT_CIRCLE_RATIO = 0.92
const CIRCLE_SEGMENT_COUNT = 24

function buildCirclePoints(radiusCm: number): PlanPoint[] {
  const points: PlanPoint[] = []
  for (let index = 0; index <= CIRCLE_SEGMENT_COUNT; index += 1) {
    const angle = (index / CIRCLE_SEGMENT_COUNT) * 2 * Math.PI
    points.push({ x: radiusCm * Math.cos(angle), y: radiusCm * Math.sin(angle) })
  }
  return points
}

/**
 * Merdivenin basamak çizgileri — yerel eksende genişliği (x) baştan sona kat
 * eden, uzunluk (y) boyunca eşit aralıklı çizgiler. Salt görsel, ölçü taşımaz.
 */
function buildStairTreadLines(widthCm: number, lengthCm: number): PlanPoint[][] {
  const halfWidth = widthCm / 2
  const halfLength = lengthCm / 2
  const treadCount = Math.min(
    MAX_STAIR_TREADS,
    Math.max(MIN_STAIR_TREADS, Math.round(lengthCm / STAIR_TREAD_DEPTH_CM)),
  )

  const lines: PlanPoint[][] = []
  for (let index = 1; index < treadCount; index += 1) {
    const y = -halfLength + (lengthCm / treadCount) * index
    lines.push([
      { x: -halfWidth, y },
      { x: halfWidth, y },
    ])
  }
  return lines
}

/**
 * İniş yönü oku — İNCE ÇİZGİ (kullanıcı üç stil arasından bunu seçti: gövde
 * çizgisi + ok başı). Merdivenin -y (yerel) ucuna doğru bakar — ekranda
 * "aşağı" `Cameras.tsx`'te plan +Y'ye denk geliyor, iniş yönü bu yüzden -Y.
 * Model iniş yönünü TAŞIMIYOR (henüz karara bağlanmadı); yön sabit bir çizim
 * kuralı, veri değil.
 */
function buildStairArrowLines(widthCm: number, lengthCm: number): PlanPoint[][] {
  const halfWidth = widthCm / 2
  const halfLength = lengthCm / 2
  const marginCm = Math.min(halfLength * STAIR_ARROW_MARGIN_RATIO, halfLength - 1)
  const tailY = halfLength - marginCm
  const tipY = -halfLength + marginCm
  // Çok kısa kolda ok dejenere olur (baş gövdeyi yutar) — hiç çizilmez.
  if (tailY - tipY < STAIR_ARROW_HEAD_CM) return []

  const headSizeCm = Math.min(halfWidth * 0.5, STAIR_ARROW_HEAD_CM)
  const headBaseY = tipY + headSizeCm

  return [
    [
      { x: 0, y: tailY },
      { x: 0, y: tipY },
    ],
    [
      { x: -headSizeCm, y: headBaseY },
      { x: 0, y: tipY },
    ],
    [
      { x: headSizeCm, y: headBaseY },
      { x: 0, y: tipY },
    ],
  ]
}

/**
 * Tipe göre çizim — üçü de İÇİ ŞEFFAF, yalnız çizgi (tasarım referansı):
 * kolon sade dikdörtgen, baca şaftı + iç çember, merdiven + basamak + iniş
 * oku. Sahne (`scene/AreaObject.tsx`) yalnız bu geometriyi çizer, trigonometri
 * yok (CLAUDE.md kural 3).
 */
export function getAreaObjectPlanGeometry(
  type: AreaObjectType,
  areaObject: AreaObjectShape,
): AreaObjectGeometry {
  const corners = getAreaObjectCorners(areaObject)
  const outline: AreaObjectStroke = { name: 'outline', role: 'body', points: [...corners, corners[0]] }

  if (type === 'flueShaft') {
    const radiusCm = (Math.min(areaObject.widthCm, areaObject.lengthCm) / 2) * FLUE_SHAFT_CIRCLE_RATIO
    // role: 'body' — kullanıcı çemberi karenin dış hattıyla AYNI kalınlıkta istedi,
    // ayrıntı (basamak/ok) gibi ince değil.
    const circle: AreaObjectStroke = {
      name: 'circle',
      role: 'body',
      points: toAreaObjectPlanPoints(areaObject, buildCirclePoints(radiusCm)),
    }
    return { strokes: [outline, circle] }
  }

  if (type === 'structuralColumn') {
    return { strokes: [outline] }
  }

  // stairs
  const treadStrokes: AreaObjectStroke[] = buildStairTreadLines(
    areaObject.widthCm,
    areaObject.lengthCm,
  ).map((points, index) => ({
    name: `tread-${index}`,
    role: 'detail',
    points: toAreaObjectPlanPoints(areaObject, points),
  }))
  const arrowStrokes: AreaObjectStroke[] = buildStairArrowLines(
    areaObject.widthCm,
    areaObject.lengthCm,
  ).map((points, index) => ({
    name: `arrow-${index}`,
    role: 'detail',
    points: toAreaObjectPlanPoints(areaObject, points),
  }))

  return { strokes: [outline, ...treadStrokes, ...arrowStrokes] }
}
