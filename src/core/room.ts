import type { PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'
import { isPointInsidePolygon } from './roomLabel'
import { MIN_WALL_LENGTH_CM } from './wall'

/** Bundan küçük yüzler çizim artığıdır (kesişimden kalan ince üçgen), oda sayılmaz. */
const MIN_ROOM_AREA_CM2 = 100

/** Duvarların çevrelediği kapalı alan — henüz kimliği yok, ham geometri. */
export type RoomFace = {
  /** Çevrimi oluşturan duvar id'leri. Room.wallIds ile karşılaştırılacak olan budur. */
  wallIds: Id[]
  /** Çevrimin köşeleri, sırayla. Alan ve etiket konumu bundan hesaplanır. */
  corners: PlanPoint[]
  areaCm2: number
}

type FaceEdge = { toPointId: Id; wallId: Id; angleRad: number }

type Junction = {
  pointId: Id
  x: number
  y: number
  /** Komşular, ortak duvarla birlikte; açıya göre SIRALI. */
  edges: FaceEdge[]
}

function buildJunctions(
  walls: readonly Wall[],
  points: readonly Point[],
  floorId: Id,
): Map<Id, Junction> {
  const byId = new Map<Id, Point>()
  for (const point of points) {
    if (point.floorId === floorId) byId.set(point.id, point)
  }

  const junctions = new Map<Id, Junction>()
  const ensure = (point: Point): Junction => {
    const existing = junctions.get(point.id)
    if (existing) return existing

    const created: Junction = { pointId: point.id, x: point.x, y: point.y, edges: [] }
    junctions.set(point.id, created)
    return created
  }

  for (const wall of walls) {
    if (wall.floorId !== floorId) continue

    const p1 = byId.get(wall.p1Id)
    const p2 = byId.get(wall.p2Id)
    // Sıfır boy duvar yön tanımlamaz ve çevrim takibini bozar.
    if (!p1 || !p2 || p1.id === p2.id) continue

    ensure(p1).edges.push({
      toPointId: p2.id,
      wallId: wall.id,
      angleRad: Math.atan2(p2.y - p1.y, p2.x - p1.x),
    })
    ensure(p2).edges.push({
      toPointId: p1.id,
      wallId: wall.id,
      angleRad: Math.atan2(p1.y - p2.y, p1.x - p2.x),
    })
  }

  // Yüz takibi "geldiğim kenarın bir gerisi" ile ilerliyor; bu ancak komşular
  // açıya göre sıralıysa hep aynı tarafta kalır.
  for (const junction of junctions.values()) {
    junction.edges.sort((left, right) => left.angleRad - right.angleRad)
  }

  return junctions
}

/** Ayakkabı bağı formülü. İşaret yön verir: pozitif = saat yönünün tersi. */
function getSignedArea(corners: readonly PlanPoint[]): number {
  let total = 0
  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index]
    const next = corners[(index + 1) % corners.length]
    total += current.x * next.y - next.x * current.y
  }
  return total / 2
}

function edgeKey(fromPointId: Id, toPointId: Id): string {
  return `${fromPointId}->${toPointId}`
}

/**
 * Yönlü bir kenardan başlayıp yüzü takip eder.
 *
 * Her düğümde, geldiğimiz kenarın açı sıralamasındaki BİR GERİSİNDEN devam
 * edilir. Düzlemsel grafta bu, hep aynı tarafta kalmayı garanti eder; çevrim
 * başladığı yönlü kenara dönünce elde edilen tam olarak bir yüzdür.
 */
function traceFace(
  junctions: Map<Id, Junction>,
  startPointId: Id,
  startEdge: FaceEdge,
  maxSteps: number,
): { wallIds: Id[]; corners: PlanPoint[]; usedEdges: string[] } | undefined {
  const wallIds: Id[] = []
  const corners: PlanPoint[] = []
  const usedEdges: string[] = []

  let fromId = startPointId
  let edge = startEdge

  for (let step = 0; step < maxSteps; step += 1) {
    const from = junctions.get(fromId)
    const to = junctions.get(edge.toPointId)
    if (!from || !to) return undefined

    corners.push({ x: from.x, y: from.y })
    wallIds.push(edge.wallId)
    usedEdges.push(edgeKey(fromId, edge.toPointId))

    const backIndex = to.edges.findIndex(
      (candidate) => candidate.toPointId === fromId && candidate.wallId === edge.wallId,
    )
    if (backIndex === -1) return undefined

    const nextEdge = to.edges[(backIndex - 1 + to.edges.length) % to.edges.length]
    fromId = to.pointId
    edge = nextEdge

    if (fromId === startPointId && edge === startEdge) {
      return { wallIds, corners, usedEdges }
    }
  }

  return undefined
}

/**
 * Aktif kattaki duvarların çevrelediği kapalı alanlar.
 *
 * Graf DÜZLEMSEL olmak zorunda — kenarlar yalnız düğümlerde buluşmalı. Kesişip
 * geçen duvarlar varsa buradan çıkan yüzler yanlış olur; bölmeyi
 * store/architectureSplit.ts yapıyor (K24).
 *
 * Dış yüz (bütün çizimi saran sonsuz alan) da bir çevrimdir ama ters yönlü
 * dolaşılır, yani işaretli alanı negatif çıkar ve elenir.
 */
export function findRoomFaces(
  walls: readonly Wall[],
  points: readonly Point[],
  floorId: Id,
): RoomFace[] {
  const junctions = buildJunctions(walls, points, floorId)
  if (junctions.size === 0) return []

  const totalEdges = [...junctions.values()].reduce(
    (sum, junction) => sum + junction.edges.length,
    0,
  )
  // Her yönlü kenar en fazla bir kez kullanılır; tur bu sayıyı aşarsa graf bozuk.
  const maxSteps = totalEdges + 1

  const seenEdges = new Set<string>()
  const faces: RoomFace[] = []

  for (const junction of junctions.values()) {
    for (const edge of junction.edges) {
      const key = edgeKey(junction.pointId, edge.toPointId)
      if (seenEdges.has(key)) continue

      const traced = traceFace(junctions, junction.pointId, edge, maxSteps)
      if (!traced) {
        seenEdges.add(key)
        continue
      }

      for (const used of traced.usedEdges) seenEdges.add(used)
      if (traced.corners.length < 3) continue

      // Dış yüz negatif alanlı çıkar; yalnız pozitif olanlar gerçek odadır.
      const areaCm2 = getSignedArea(traced.corners)
      if (areaCm2 <= MIN_ROOM_AREA_CM2) continue

      faces.push({ wallIds: traced.wallIds, corners: traced.corners, areaCm2 })
    }
  }

  return faces
}

/**
 * Sürüklenerek çizilen dikdörtgen odanın köşeleri; `from` ve `to` KARŞIT
 * köşelerdir, hangi yöne sürüklendiği fark etmez.
 *
 * Sıra saat yönünün TERSİ — `findRoomFaces`'in ürettiği yönle aynı olsun diye,
 * yoksa aynı odanın köşe dizisi nereden geldiğine göre ters dönerdi.
 *
 * Kenarlardan biri duvar sayılamayacak kadar kısaysa `undefined`: yarım
 * dikdörtgen yazmaktansa hiç yazmamak doğru, çünkü kısa kenar `appendWall`
 * tarafından atılır ve geriye çevrimi kapatmayan üç duvar kalırdı.
 */
export function getRoomRectangleCorners(
  from: PlanPoint,
  to: PlanPoint,
): PlanPoint[] | undefined {
  const minX = Math.min(from.x, to.x)
  const maxX = Math.max(from.x, to.x)
  const minY = Math.min(from.y, to.y)
  const maxY = Math.max(from.y, to.y)

  if (maxX - minX < MIN_WALL_LENGTH_CM || maxY - minY < MIN_WALL_LENGTH_CM) return undefined

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]
}

/**
 * Noktanın düştüğü yüz. Birden çok yüz içeriyorsa EN KÜÇÜĞÜ kazanır: iç içe
 * odalarda (bir odanın içine çizilmiş küçük oda) tıklama görsel olarak üstte
 * duranı seçmeli, onu saran büyük olanı değil.
 */
export function findRoomFaceAt(
  faces: readonly RoomFace[],
  target: PlanPoint,
): RoomFace | undefined {
  let best: RoomFace | undefined

  for (const face of faces) {
    if (!isPointInsidePolygon(target, face.corners)) continue
    if (!best || face.areaCm2 < best.areaCm2) best = face
  }

  return best
}
