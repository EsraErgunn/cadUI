// cadStore ↔ store dosyaları karşılıklı import eder; bu taraf tip-only (K17).
import type { CadState } from './cadStore'
import { takeNextId } from './projectMeta'
import type { Id, Opening, Wall } from '../core/model'
import { getOpeningSpan } from '../core/opening'
import { findWallSplits, type WallSplitPoint } from '../core/wallGraph'

/**
 * Bölme noktası bir açıklığın İÇİNE düşüyorsa o bölme REDDEDİLİR — açıklık
 * silinmez, kaydırılmaz (K24). Geçersiz yerleştirmeyi reddetme kuralının (K13)
 * aynısı: kullanıcının koyduğu veri sessizce kaybolmaz.
 *
 * Kesişimin bir tarafı reddedilirse ÖBÜR tarafı da düşmeli; yoksa bir duvar
 * bölünür, diğeri bölünmez ve ortada hiçbir şeye bağlanmayan bir düğüm kalır.
 */
function collectRejectedSplits(
  splits: Map<Id, WallSplitPoint[]>,
  openings: readonly Opening[],
): { rejectedKeys: Set<string>; rejectedOffsets: Map<Id, Set<number>> } {
  const rejectedKeys = new Set<string>()
  const rejectedOffsets = new Map<Id, Set<number>>()

  for (const [wallId, wallSplits] of splits) {
    const wallOpenings = openings.filter((opening) => opening.wallId === wallId)
    if (wallOpenings.length === 0) continue

    for (const split of wallSplits) {
      const isInsideOpening = wallOpenings.some((opening) => {
        const [startCm, endCm] = getOpeningSpan(opening)
        return split.offsetCm > startCm && split.offsetCm < endCm
      })
      if (!isInsideOpening) continue

      const offsets = rejectedOffsets.get(wallId) ?? new Set<number>()
      offsets.add(split.offsetCm)
      rejectedOffsets.set(wallId, offsets)
      if (split.crossingKey) rejectedKeys.add(split.crossingKey)
    }
  }

  return { rejectedKeys, rejectedOffsets }
}

/** Bölme sonrası duvarın parçaları; açıklıklar bunlara yeniden dağıtılır. */
type WallPiece = {
  wallId: Id
  /** Parçanın ÖZGÜN duvar üzerindeki başlangıç offset'i. */
  startCm: number
  endCm: number
}

/**
 * Duvarı bölme noktalarından parçalar. İlk parça duvarın KENDİ id'sini korur:
 * seçim, açıklık ve geri alma o id'ye bakıyor; hepsini yeni id'ye taşımak
 * gereksiz kırılganlık olurdu.
 */
function splitWall(
  draft: CadState,
  wall: Wall,
  wallSplits: readonly WallSplitPoint[],
  lengthCm: number,
  resolvePointId: (split: WallSplitPoint) => Id,
): WallPiece[] {
  const pieces: WallPiece[] = []
  // wall.p2Id aşağıda ilk parçaya devredilecek; asıl uç önce saklanır.
  const originalP2Id = wall.p2Id
  let previousPointId = wall.p1Id
  let previousOffsetCm = 0

  wallSplits.forEach((split, index) => {
    const splitPointId = resolvePointId(split)
    if (index === 0) {
      wall.p2Id = splitPointId
      pieces.push({ wallId: wall.id, startCm: 0, endCm: split.offsetCm })
    } else {
      const pieceId = takeNextId(draft)
      draft.walls.push({
        id: pieceId,
        floorId: wall.floorId,
        p1Id: previousPointId,
        p2Id: splitPointId,
        thickness: wall.thickness,
        height: wall.height,
      })
      pieces.push({ wallId: pieceId, startCm: previousOffsetCm, endCm: split.offsetCm })
    }
    previousPointId = splitPointId
    previousOffsetCm = split.offsetCm
  })

  // Son parça: son bölmeden duvarın asıl p2 ucuna.
  const tailId = takeNextId(draft)
  draft.walls.push({
    id: tailId,
    floorId: wall.floorId,
    p1Id: previousPointId,
    p2Id: originalP2Id,
    thickness: wall.thickness,
    height: wall.height,
  })
  pieces.push({ wallId: tailId, startCm: previousOffsetCm, endCm: lengthCm })

  return pieces
}

/**
 * Duvar grafını düzlemsel hale getirir: kesişimlerde ve T birleşimlerinde düğüm
 * açar, duvarları oradan böler (K24).
 *
 * Mahal tespiti yüz taramasıyla çalışır ve bu ancak kenarların yalnız
 * düğümlerde buluştuğu bir grafta doğrudur — bu yüzden bölme, oda özelliğinin
 * ön koşuludur.
 *
 * Çağıranın `set()`'i İÇİNDE çalışır: bölme, onu tetikleyen çizim/taşıma ile
 * TEK geri alma adımı olsun. Değişiklik yoksa false döner ki her fare
 * hareketi projeyi kirletmesin.
 */
export function splitWallsAtIntersections(draft: CadState): boolean {
  const splits = findWallSplits(draft.walls, draft.points, draft.activeFloorId)
  if (splits.size === 0) return false

  const { rejectedKeys, rejectedOffsets } = collectRejectedSplits(splits, draft.openings)

  // Kesişim başına TEK Point: iki duvar da aynı düğüme bağlanmalı.
  const crossingPointIds = new Map<string, Id>()
  const resolvePointId = (split: WallSplitPoint): Id => {
    if (split.pointId !== undefined) return split.pointId

    const key = split.crossingKey
    if (key === undefined) throw new Error('bölme noktasının ne pointId ne crossingKey değeri var')

    const existing = crossingPointIds.get(key)
    if (existing !== undefined) return existing

    const created = takeNextId(draft)
    draft.points.push({
      id: created,
      floorId: draft.activeFloorId,
      x: split.position.x,
      y: split.position.y,
    })
    crossingPointIds.set(key, created)
    return created
  }

  let isChanged = false

  for (const [wallId, wallSplits] of splits) {
    const wall = draft.walls.find((candidate) => candidate.id === wallId)
    if (!wall) continue

    const rejected = rejectedOffsets.get(wallId)
    const accepted = wallSplits.filter(
      (split) =>
        !rejected?.has(split.offsetCm) &&
        !(split.crossingKey !== undefined && rejectedKeys.has(split.crossingKey)),
    )
    if (accepted.length === 0) continue

    const p1 = draft.points.find((point) => point.id === wall.p1Id)
    const p2 = draft.points.find((point) => point.id === wall.p2Id)
    if (!p1 || !p2) continue
    const lengthCm = Math.hypot(p2.x - p1.x, p2.y - p1.y)

    const pieces = splitWall(draft, wall, accepted, lengthCm, resolvePointId)

    // Açıklıklar kendilerini İÇEREN parçaya taşınır; offset o parçanın başına göre.
    for (const opening of draft.openings) {
      if (opening.wallId !== wallId) continue

      const piece = pieces.find(
        (candidate) => opening.offsetCm >= candidate.startCm && opening.offsetCm <= candidate.endCm,
      )
      if (!piece) continue

      opening.wallId = piece.wallId
      opening.offsetCm = opening.offsetCm - piece.startCm
    }

    isChanged = true
  }

  return isChanged
}
