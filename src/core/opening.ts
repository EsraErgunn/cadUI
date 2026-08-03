import type { PlanPoint } from './coords'
import type { Id, Opening, OpeningType, Point, Wall } from './model'
import { getPlacementRange, type PlacementRange } from './wall'
import { getWallFrameAtOffsetCm } from './wallPath'

/**
 * Tipe göre varsayılan genişlik. Record ama yasak olan tür değil: anahtar
 * string-literal union, kaydedilmiyor. Gerekçe TOOL_ICONS ile aynı — yeni tip
 * eklenip genişliği unutulursa derleme kırılır.
 */
export const DEFAULT_OPENING_WIDTH_CM: Record<OpeningType, number> = {
  door: 90,
  window: 120,
}

/** Akıl sağlığı sınırı: 0/negatif genişlik görünmez mesh üretir. Üst sınırı getPlacementRange verir. */
export const MIN_OPENING_WIDTH_CM = 10

/** Sınır karşılaştırma payı. core/wall.ts'teki eşi private olduğu için burada yeniden tanımlı. */
const OPENING_EPSILON_CM = 1e-6

/** [başlangıç, bitiş] — offsetCm ORTAYI ölçtüğü için yarım genişlik iki yana açılır (K10). */
export type OpeningSpan = readonly [startCm: number, endCm: number]

export type OpeningPlacement = {
  wallId: Id
  offsetCm: number
  widthCm: number
  /** Taşınan açıklığın kendisi çakışma sayılmasın. */
  ignoreOpeningId?: Id
}

export function getOpeningSpan(opening: Pick<Opening, 'offsetCm' | 'widthCm'>): OpeningSpan {
  const halfWidthCm = opening.widthCm / 2
  return [opening.offsetCm - halfWidthCm, opening.offsetCm + halfWidthCm]
}

export function getOpeningsOnWall(wallId: Id, openings: readonly Opening[]): Opening[] {
  return openings.filter((opening) => opening.wallId === wallId)
}

/**
 * B→A sözleşmesi: duvar çizerken/kısaltırken açıklığın üstünden geçmemek için
 * A bunu okur. startCm'e göre artan sırada — A'nın taraması ve testin toEqual'ı
 * belirli olsun. Bkz. knowledge/snap-contract.md.
 */
export function getOccupiedRanges(wallId: Id, openings: readonly Opening[]): OpeningSpan[] {
  return getOpeningsOnWall(wallId, openings)
    .map((opening) => getOpeningSpan(opening))
    .sort((a, b) => a[0] - b[0])
}

export function isSpanWithinRange(span: OpeningSpan, range: PlacementRange): boolean {
  return (
    span[0] >= range.minOffsetCm - OPENING_EPSILON_CM &&
    span[1] <= range.maxOffsetCm + OPENING_EPSILON_CM
  )
}

/** Uç uca DEĞEN açıklıklar çakışmaz: iki kapının yan yana durması meşru. */
export function isSpanOverlapping(span: OpeningSpan, others: readonly OpeningSpan[]): boolean {
  return others.some(
    (other) =>
      !(span[1] <= other[0] + OPENING_EPSILON_CM || other[1] <= span[0] + OPENING_EPSILON_CM),
  )
}

/**
 * Köşe payı BURADA hesaplanmaz — çağıran getPlacementRange'den geçirir (K11).
 * Geçersizse yerleştirme REDDEDİLİR, kaydırılmaz (K13).
 */
export function isPlacementValid(
  placement: OpeningPlacement,
  range: PlacementRange,
  openings: readonly Opening[],
): boolean {
  if (placement.widthCm < MIN_OPENING_WIDTH_CM) return false

  const span = getOpeningSpan(placement)
  if (!isSpanWithinRange(span, range)) return false

  const others = getOpeningsOnWall(placement.wallId, openings)
    .filter((opening) => opening.id !== placement.ignoreOpeningId)
    .map((opening) => getOpeningSpan(opening))

  return !isSpanOverlapping(span, others)
}

/**
 * Duvar silinince ya da açıklık sığmayacak kadar kısalınca o açıklık otomatik
 * silinir (K16): duvarsız açıklık temsil edilemez, kalırsa floorClone'un remap
 * assertion'ı sonradan patlar. Kısaltma çakışma üretemeyeceği için yalnız sığma
 * bakılır. Duvar silme fay A'nın action'ı; A bunu tüketen action'ı çağırır.
 */
export function pruneUnfittableOpenings(
  openings: readonly Opening[],
  walls: readonly Wall[],
  points: readonly Point[],
): Opening[] {
  return openings.filter((opening) => {
    const wall = walls.find((candidate) => candidate.id === opening.wallId)
    if (!wall) return false

    const range = getPlacementRange(wall, points, walls)
    if (!range) return false

    return isSpanWithinRange(getOpeningSpan(opening), range)
  })
}

function offsetAlongNormal(point: PlanPoint, normal: PlanPoint, distanceCm: number): PlanPoint {
  return { x: point.x + normal.x * distanceCm, y: point.y + normal.y * distanceCm }
}

/**
 * Açıklık bandının 4 köşesi, PLAN uzayında. Sahne her köşeyi planToThree'den
 * geçirir; burada three dönüşümü yapılmaz (CLAUDE.md kural 3).
 */
export function getOpeningOutline(
  wall: Wall,
  points: readonly Point[],
  opening: Pick<Opening, 'offsetCm' | 'widthCm'>,
): PlanPoint[] | undefined {
  const span = getOpeningSpan(opening)
  const startFrame = getWallFrameAtOffsetCm(wall, points, span[0])
  const endFrame = getWallFrameAtOffsetCm(wall, points, span[1])
  if (!startFrame || !endFrame) return undefined

  const halfThicknessCm = wall.thickness / 2

  return [
    offsetAlongNormal(startFrame.point, startFrame.normal, -halfThicknessCm),
    offsetAlongNormal(endFrame.point, endFrame.normal, -halfThicknessCm),
    offsetAlongNormal(endFrame.point, endFrame.normal, halfThicknessCm),
    offsetAlongNormal(startFrame.point, startFrame.normal, halfThicknessCm),
  ]
}

function getMidpoint(a: PlanPoint, b: PlanPoint): PlanPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Kapı kanadı / pencere kayıdı simgesinin PLAN noktaları; boş dizi = simge yok.
 * Geometri köşelerden TÜRETİLİR (kalınlık yönü c0→c3, eksen yönü c0→c1), böylece
 * çapraz duvarda da duvarın eksenini takip eder ve burada açı dönüşümü yapılmaz.
 */
export function getOpeningSymbolPoints(
  outline: readonly PlanPoint[],
  type: OpeningType,
): PlanPoint[] {
  const [c0, c1, c2, c3] = outline

  // Pencere: iki jamb ortasını birleştiren kayıt çizgisi.
  if (type === 'window') return [getMidpoint(c0, c3), getMidpoint(c1, c2)]

  // Kapı: başlangıç jamb'ından açıklık genişliği kadar dışa açılan düz kanat.
  // Tam yay simgesi ayrı bir simge işi, bu issue'nun kapsamı dışında.
  const hinge = getMidpoint(c0, c3)
  const widthCm = Math.hypot(c1.x - c0.x, c1.y - c0.y)
  const thicknessCm = Math.hypot(c3.x - c0.x, c3.y - c0.y)
  if (thicknessCm === 0) return []

  return [
    hinge,
    {
      x: hinge.x + ((c3.x - c0.x) / thicknessCm) * widthCm,
      y: hinge.y + ((c3.y - c0.y) / thicknessCm) * widthCm,
    },
  ]
}

/**
 * Araç → açıklık tipi eşlemesinin TEK yeri; hem ui/ şerit hem scene/ hook okur.
 * Parametre string: core, ToolId birleşimindeki tesisat araçlarını bilmek zorunda değil.
 */
export function getOpeningTypeForTool(toolId: string): OpeningType | undefined {
  if (toolId === 'door') return 'door'
  if (toolId === 'window') return 'window'
  return undefined
}
