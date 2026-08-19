import { getSegmentLengthCm } from './lineGeometry'
import { projectOntoClosestOrthogonalAxis } from './orthogonalAxis'
import type { PlanPoint } from '../../core/coords'
import type { Id, Point, Wall } from '../../core/model'
import { getSegmentAngleDeg, getWallEnds, projectOntoSegment } from '../../core/wall'

export type WallParallelCandidate = {
  wallId: Wall['id']
  position: PlanPoint
}

const DEG_TO_RAD = Math.PI / 180

/** `wall`ın açısı; uçları çözülemiyorsa (kopuk/silinmiş nokta) null. */
export function getWallAngleDeg(wall: Wall, points: readonly Point[]): number | null {
  const ends = getWallEnds(wall, points)
  return ends ? getSegmentAngleDeg(ends.p1, ends.p2) : null
}

function getWallNormal(wallAngleDeg: number): PlanPoint {
  const angleRad = wallAngleDeg * DEG_TO_RAD
  return { x: -Math.sin(angleRad), y: Math.cos(angleRad) }
}

/**
 * `position`in duvar HATTINA (eksenine) olan dik uzaklığı `wall.thickness/2 +
 * clearanceCm`'in altındaysa, sonucu bu payın en az kadarına DİK olarak
 * güvenli tarafa iter — yön hâlâ korunur (yalnız bu ender köşede `position`in
 * kendi payını miras aldığı anchor'la aynı dik ofseti paylaşmaz). Hangi tarafa
 * itileceği `sideHint`in payından okunur (`position` payı ~0'a çok yakınsa,
 * ör. anchor tam duvarın eksenindeyse, belirsizlik `sideHint`ten çözülür).
 */
export function applyWallEdgeClearance(
  wall: Wall,
  points: readonly Point[],
  position: PlanPoint,
  clearanceCm: number,
  sideHint: PlanPoint = position,
): PlanPoint {
  const ends = getWallEnds(wall, points)
  if (!ends) return position

  const normal = getWallNormal(getSegmentAngleDeg(ends.p1, ends.p2))
  const minClearanceCm = wall.thickness / 2 + clearanceCm
  const perpCm = (position.x - ends.p1.x) * normal.x + (position.y - ends.p1.y) * normal.y
  if (Math.abs(perpCm) >= minClearanceCm) return position

  const hintPerpCm = (sideHint.x - ends.p1.x) * normal.x + (sideHint.y - ends.p1.y) * normal.y
  const sign = Math.abs(perpCm) < 1e-9 ? Math.sign(hintPerpCm) || 1 : Math.sign(perpCm)
  const pushCm = sign * minClearanceCm - perpCm
  return { x: position.x + normal.x * pushCm, y: position.y + normal.y * pushCm }
}

/**
 * Anchor'dan geçen, `wall`ın AÇISINA PARALEL YA DA ona DİK doğrulardan
 * imlece daha yakın olanı üzerinde imlece en yakın nokta, duvar YÜZÜNDEN
 * `clearanceCm` payın altına düşmeyecek şekilde — mesafe/yarıçap KONTROLÜ
 * YOK, çağıran karar verir (bkz. `findNearestWallParallel`nin yarıçaplı
 * sürümü). KİLİTSİZ: her çağrı bağımsız, önceki karar hatırlanmaz —
 * kullanıcı isteği (2026-08): "hiçbir zaman tek eksene yapışmasın".
 *
 * **İki eksen** (`orthogonalAxis.ts`): yalnız duvara paralel değil, ona DİK
 * yön de aday — kullanıcı bir duvarın yanında dururken boruyu 90° döndürüp o
 * duvarın DİK ekseninde de ilerletebilmeli (köşe dönüşü).
 */
export function getWallParallelPosition(
  wall: Wall,
  points: readonly Point[],
  anchor: PlanPoint,
  cursor: PlanPoint,
  clearanceCm: number,
): PlanPoint | null {
  const wallAngleDeg = getWallAngleDeg(wall, points)
  if (wallAngleDeg === null) return null

  const projected = projectOntoClosestOrthogonalAxis(wallAngleDeg, anchor, cursor)
  return applyWallEdgeClearance(wall, points, projected, clearanceCm, cursor)
}

/**
 * Devam eden bir çizimde (zincirin bir ANCHOR'ı varken) yeni köşeyi imlece en
 * yakın duvarın AÇISINA paralel bir doğruya kelepçeler; sonuç yalnız YÖNÜ
 * kelepçeler, belirli bir NOKTAYA yapışmaz. Yakınlık imlecin duvarın
 * EKSENİNE (segment, uçlarda kelepçeli) dik uzaklığıyla ölçülür.
 */
export function findNearestWallParallel(
  walls: readonly Wall[],
  points: readonly Point[],
  anchor: PlanPoint,
  cursor: PlanPoint,
  radiusCm: number,
  clearanceCm: number,
): WallParallelCandidate | null {
  if (radiusCm <= 0) return null

  let nearest: WallParallelCandidate | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const wall of walls) {
    const ends = getWallEnds(wall, points)
    if (!ends) continue

    const projection = projectOntoSegment(ends.p1, ends.p2, cursor)
    if (projection.distanceCm > radiusCm || projection.distanceCm >= nearestDistanceCm) continue

    const position = getWallParallelPosition(wall, points, anchor, cursor, clearanceCm)
    if (!position) continue

    nearest = { wallId: wall.id, position }
    nearestDistanceCm = projection.distanceCm
  }

  return nearest
}

/**
 * İmlecin toleransta olduğu en yakın duvar KÖŞESİ (uç noktası) — T/X
 * birleşimleri de içerir, çünkü orada birleşen duvarlar ortak `Point`ı
 * paylaşır. Yapışma KESKİN: yön kelepçesinin (`findNearestWallParallel`)
 * aksine bir yarıçap/eksen ARAMASI değil, tolerans içindeyse KARARLI bir
 * sonuç üretir. Yalnız gerçek köşeler (uç) aday — duvarın gövdesi
 * `findNearestWallFace`nin işi.
 *
 * Köşenin KENDİSİ duvarın üstüdür (yasaklı alan, kullanıcı isteği 2026-08:
 * "duvar üstü yasaklı alan, köşeler dahil") — sonuç asla tam o koordinata
 * oturmaz, orada BİRLEŞEN duvarların HER BİRİNİN payını temizleyecek şekilde
 * imlecin tarafına doğru itilir (`applyWallEdgeClearance`, art arda her
 * duvar için). Bu, dik köşelerde tam sonuç verir; dik olmayan (30°/60° vb.)
 * birleşimlerde yaklaşık bir çözüm — payın tam kesişimi genel açı için ayrı
 * bir geometri ister, kapsam dışı.
 */
export function findNearestWallCorner(
  walls: readonly Wall[],
  points: readonly Point[],
  cursor: PlanPoint,
  toleranceCm: number,
  gapCm: number,
): PlanPoint | null {
  let nearestPointId: Id | null = null
  let nearest: PlanPoint | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const wall of walls) {
    const ends = getWallEnds(wall, points)
    if (!ends) continue

    for (const [pointId, corner] of [
      [wall.p1Id, ends.p1],
      [wall.p2Id, ends.p2],
    ] as const) {
      const distanceCm = getSegmentLengthCm(cursor, corner)
      if (distanceCm > toleranceCm || distanceCm >= nearestDistanceCm) continue
      nearestPointId = pointId
      nearest = corner
      nearestDistanceCm = distanceCm
    }
  }

  if (nearestPointId === null || !nearest) return null

  let position = nearest
  for (const wall of walls) {
    if (wall.p1Id !== nearestPointId && wall.p2Id !== nearestPointId) continue
    position = applyWallEdgeClearance(wall, points, position, gapCm, cursor)
  }

  return position
}

/** Bunun altındaki/üstündeki offsetCm izdüşümün UCA kelepçelendiğini gösterir. */
const CLAMPED_END_EPSILON_CM = 1e-6

/**
 * İmleç bir duvarın GÖVDESİNE yakınken, imlecin bulunduğu TARAFTAKİ yüzün
 * (eksenden `wall.thickness/2 + gapCm`) üzerinde imlece en yakın nokta —
 * `applyWallEdgeClearance`in aksine PASİF bir "üst üste binme" güvencesi
 * değil, AKTİF bir mıknatıs: yarıçap içindeyse imleç yüzden uzakta olsa bile
 * sonuç yüze çekilir. Serbest köşe taşımasında (`useSelectionTool`) kullanılır
 * — orada bir anchor/yön yok, yalnız tek bir nokta imleci izliyor.
 *
 * UÇLARDA (izdüşüm ucA KELEPÇELİYSE) aday DEĞİL: orası köşenin işi. Duvarlar
 * kapsül (yuvarlak uçlu, bkz. knowledge/capsule-walls.md) render edilse de
 * köşe yakalaması İKİ duvarı birden hesaba katan `findNearestWallCorner`/
 * `findNearestWallParallel`e ait — tek duvarın ucundan kelepçeli bir yüz
 * noktası cursor'a bazen bu ikisinden daha yakın çıkıyor ve köşeyi "oval"
 * tek-duvar yüzeyine çeviriyordu (kullanıcı bulgusu: dikdörtgen köşe hissi
 * kayboldu).
 */
export function findNearestWallFace(
  walls: readonly Wall[],
  points: readonly Point[],
  cursor: PlanPoint,
  radiusCm: number,
  gapCm: number,
): PlanPoint | null {
  let nearest: PlanPoint | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const wall of walls) {
    const ends = getWallEnds(wall, points)
    if (!ends) continue

    const projection = projectOntoSegment(ends.p1, ends.p2, cursor)
    const wallLengthCm = getSegmentLengthCm(ends.p1, ends.p2)
    if (
      projection.offsetCm <= CLAMPED_END_EPSILON_CM ||
      projection.offsetCm >= wallLengthCm - CLAMPED_END_EPSILON_CM
    ) {
      continue
    }
    const wallAngleDeg = getSegmentAngleDeg(ends.p1, ends.p2)
    const normal = getWallNormal(wallAngleDeg)
    const faceOffsetCm = wall.thickness / 2 + gapCm
    const sidePerpCm = (cursor.x - ends.p1.x) * normal.x + (cursor.y - ends.p1.y) * normal.y
    const sign = Math.sign(sidePerpCm) || 1
    const face = {
      x: projection.point.x + normal.x * sign * faceOffsetCm,
      y: projection.point.y + normal.y * sign * faceOffsetCm,
    }

    const distanceCm = getSegmentLengthCm(cursor, face)
    if (distanceCm > radiusCm || distanceCm >= nearestDistanceCm) continue
    nearest = face
    nearestDistanceCm = distanceCm
  }

  return nearest
}
