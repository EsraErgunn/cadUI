import type { PlanPoint } from './coords'
import { normalizeZero } from './coords'
import type { Id, Point, Wall } from './model'
import { getSegmentLength, MIN_WALL_LENGTH_CM } from './wall'
import { getWallNormal } from './wallMove'

/** Yön karşılaştırmaları için kayan nokta payı; snap noktaları zaten hizaya koyuyor. */
const EPSILON = 1e-6

/** Bir köşede takip EDEMEYEN, yerinde bırakılacak duvarlar. */
export type CornerDetachment = {
  pointId: Id
  wallIds: Id[]
}

export type WallOffsetPlan = {
  /** Taşınan duvarın yeni uç konumları — p1Id/p2Id sırasında. */
  p1: PlanPoint
  p2: PlanPoint
  detachments: CornerDetachment[]
}

type Ray = { origin: PlanPoint; direction: PlanPoint }

/**
 * İki doğrunun kesişimi. Paralellerde `undefined` — kesişecek nokta yok.
 *
 * Doğru parçası DEĞİL doğru: komşu duvar kısalabildiği gibi UZAYABİLİR de,
 * kesişim onun mevcut uçlarının dışına düşebilir.
 */
function intersectLines(a: Ray, b: Ray): PlanPoint | undefined {
  const cross = a.direction.x * b.direction.y - a.direction.y * b.direction.x
  if (Math.abs(cross) < EPSILON) return undefined

  const t =
    ((b.origin.x - a.origin.x) * b.direction.y - (b.origin.y - a.origin.y) * b.direction.x) / cross

  return {
    x: normalizeZero(a.origin.x + a.direction.x * t),
    y: normalizeZero(a.origin.y + a.direction.y * t),
  }
}

function directionOf(from: PlanPoint, to: PlanPoint): PlanPoint | undefined {
  const lengthCm = getSegmentLength(from, to)
  if (lengthCm < MIN_WALL_LENGTH_CM) return undefined
  return { x: (to.x - from.x) / lengthCm, y: (to.y - from.y) / lengthCm }
}

/**
 * Duvarı kendine PARALEL kaydırır ve her ucunu komşusunun doğrusuna oturtur.
 *
 * Eski model duvarı KATI taşıyordu: iki köşe de aynı vektörle giderdi. Bu ancak
 * komşu duvar hareket yönüne paralelken işe yarıyor — dik açılı planlarda
 * tesadüfen hep doğru, EĞİK planda hiç doğru değil. Yamuk bir odada hiçbir duvar
 * hiçbir yöne taşınamıyordu (K102 düzeltmesi).
 *
 * Yeni model: duvar kendi doğrultusunu korur, ucu komşunun DOĞRUSU boyunca kayar.
 * Komşunun açısı korunur, yalnız boyu değişir — istenen davranış tam olarak bu.
 *
 * ⚠️ Bunun bedeli: taşınan duvarın BOYU değişebilir (yamukta uzar/kısalır). Dik
 * açılı planda değişmez, sonuç eski katı ötelemeyle birebir aynı çıkar.
 *
 * Takip EDEMEYEN komşu, taşınan duvara PARALEL olandır: doğruları kesişmez,
 * kesişecek bir köşe yoktur. Yerinde bırakılır (kopar). Bir köşede birden çok
 * uygun komşu varsa köşeyi ÖZGÜN köşeye en yakın kesişim belirler; kalanlar
 * kopar, çünkü tek köşe hepsinin doğrusunda birden duramaz.
 */
export function planWallOffset(
  walls: readonly Wall[],
  points: readonly Point[],
  wallId: Id,
  dxCm: number,
  dyCm: number,
  floorId: Id,
): WallOffsetPlan | undefined {
  const wall = walls.find((candidate) => candidate.id === wallId)
  if (!wall || wall.floorId !== floorId) return undefined

  const pointById = new Map(points.map((point) => [point.id, point]))
  const origin1 = pointById.get(wall.p1Id)
  const origin2 = pointById.get(wall.p2Id)
  if (!origin1 || !origin2) return undefined

  const normal = getWallNormal(origin1, origin2)
  const direction = directionOf(origin1, origin2)
  if (!normal || !direction) return undefined

  // Öteleme normale izdüşürülür: imleç nereye giderse gitsin duvar kendine paralel kalır.
  const distanceCm = dxCm * normal.x + dyCm * normal.y
  // Yer değişmiyorsa plan da yok: sıfır ötelemede kopma üretmek, aynı koordinatta
  // klonlar doğurup K24'ün onları geri birleştirmesine yol açardı.
  if (Math.abs(distanceCm) < EPSILON) return undefined
  const shifted = (point: PlanPoint): PlanPoint => ({
    x: normalizeZero(point.x + normal.x * distanceCm),
    y: normalizeZero(point.y + normal.y * distanceCm),
  })

  const movedLine: Ray = { origin: shifted(origin1), direction }
  const detachments: CornerDetachment[] = []

  const solveCorner = (cornerId: Id, fallback: PlanPoint): PlanPoint => {
    const corner = pointById.get(cornerId)
    if (!corner) return fallback

    const neighbours = walls.flatMap((candidate) => {
      if (candidate.id === wallId || candidate.floorId !== floorId) return []
      if (candidate.p1Id !== cornerId && candidate.p2Id !== cornerId) return []

      const farPoint = pointById.get(candidate.p1Id === cornerId ? candidate.p2Id : candidate.p1Id)
      const neighbourDirection = farPoint ? directionOf(corner, farPoint) : undefined
      if (!neighbourDirection) return []

      const meeting = intersectLines(movedLine, { origin: corner, direction: neighbourDirection })
      // Köşe komşunun UZAK UCUNA doğru mu gidiyor? Öyleyse komşu kısalıyor.
      const isShrinking =
        meeting !== undefined &&
        (meeting.x - corner.x) * neighbourDirection.x +
          (meeting.y - corner.y) * neighbourDirection.y >
          EPSILON
      return [{ wallId: candidate.id, meeting, isShrinking }]
    })

    // Kesişimi olanlar arasında ÖZGÜN köşeye en yakın olan kazanır: en az bozan seçim.
    const followers = neighbours.filter(
      (candidate): candidate is { wallId: Id; meeting: PlanPoint; isShrinking: boolean } =>
        candidate.meeting !== undefined,
    )
    followers.sort(
      (left, right) =>
        getSegmentLength(corner, left.meeting) - getSegmentLength(corner, right.meeting),
    )

    const winner = followers[0]
    // AYNI kesişimi veren komşular birlikte gelir: ortak köşe hepsini karşılıyor,
    // koparmak gereksiz. Duvar taşındıkça komşu kenar bölünüyor; sonraki taşımada
    // o parçalar eş doğrultulu olduğu için aynı noktayı istiyor — biri koparılsaydı
    // her harekette bir artık düğüm daha kalırdı (K102).
    const detaching = neighbours
      .filter(
        (candidate) =>
          candidate.wallId !== winner?.wallId &&
          (candidate.meeting === undefined ||
            winner === undefined ||
            getSegmentLength(candidate.meeting, winner.meeting) > EPSILON),
      )
      .map((candidate) => candidate.wallId)

    // Köşede kopan biri varsa, KISALAN kazanan da yerinde bırakılır: köşeyi
    // izleseydi eski köşeden geri çekilir ve orada kalan duvarı havada bırakırdı
    // (yan odanın çevrimi kopar, oda dolgusuyla etiketiyle kaybolurdu). Yerinde
    // kalınca tam boyunu korur, taşınan duvarın yeni ucu GÖVDESİNE denk gelir ve
    // K24 oradan böler — iki oda da kapanır.
    if (winner && winner.isShrinking && detaching.length > 0) detaching.push(winner.wallId)

    if (detaching.length > 0) detachments.push({ pointId: cornerId, wallIds: detaching })

    return winner ? winner.meeting : fallback
  }

  return {
    p1: solveCorner(wall.p1Id, shifted(origin1)),
    p2: solveCorner(wall.p2Id, shifted(origin2)),
    detachments,
  }
}
