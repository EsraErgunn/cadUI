// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import { mergePointInto } from './architectureWallOps'
import type { CadState } from './cadStore'
import type { Id, Wall } from '../core/model'
import { getSegmentLength } from '../core/wall'

/** Doğrultu karşılaştırması için kayan nokta payı. */
const EPSILON = 1e-6

/**
 * Gereksiz ara düğümleri temizler: bir köşede YALNIZ İKİ duvar buluşuyor ve
 * ikisi de AYNI DOĞRULTUDAysa tek duvara birleştirilir (K102).
 *
 * Neden: duvar taşındıkça komşusu her seferinde yeni köşede bölünüyor. Bir
 * sonraki taşımada önceki bölme noktası geride kalıyordu — kullanıcı duvarı her
 * oynattığında komşu kenar bir parça daha artıyor, düğümler birikiyordu.
 *
 * Kimlik korunur: küçük id kazanır ("ilk çizilen kazanır", K34 ile aynı kural).
 * Kaybedenin açıklıkları kazanana TAŞINIR; offset kazananın YENİ p1'ine göre
 * yeniden hesaplanır (K10: offset p1'den ölçülür).
 *
 * ⚠️ Kalınlığı veya yüksekliği FARKLI iki duvar birleştirilmez: kullanıcının
 * bilerek koyduğu bir ayrım olabilir, sessizce silmek veri kaybı olurdu.
 *
 * ⚠️ Yalnız taşıma yolunda çağrılır. `splitWallsAtIntersections`'a konsaydı
 * "bölünme geri birleşmez" sözleşmesi (knowledge/wall-graph.md) her yerde
 * değişirdi; burada temizlenen yalnız taşımanın kendi ürettiği artık.
 */
export function mergeCollinearWallsInDraft(draft: CadState): boolean {
  const floorId = draft.activeFloorId
  const removedWallIds = new Set<Id>()
  const winnerByLoser = new Map<Id, Id>()
  let isChanged = false

  for (const joint of draft.points) {
    if (joint.floorId !== floorId) continue

    const touching = draft.walls.filter(
      (wall) =>
        wall.floorId === floorId &&
        !removedWallIds.has(wall.id) &&
        (wall.p1Id === joint.id || wall.p2Id === joint.id),
    )
    if (touching.length !== 2) continue

    const [first, second] = touching
    if (first.thickness !== second.thickness || first.height !== second.height) continue

    const pointById = new Map(draft.points.map((point) => [point.id, point]))
    const farIdOf = (wall: Wall) => (wall.p1Id === joint.id ? wall.p2Id : wall.p1Id)
    const farFirst = pointById.get(farIdOf(first))
    const farSecond = pointById.get(farIdOf(second))
    if (!farFirst || !farSecond) continue

    // Aynı doğrultu: eklemden çıkan iki kol TERS yönlerde ve çapraz çarpımı sıfır.
    const a = { x: farFirst.x - joint.x, y: farFirst.y - joint.y }
    const b = { x: farSecond.x - joint.x, y: farSecond.y - joint.y }
    const lengths = getSegmentLength(joint, farFirst) * getSegmentLength(joint, farSecond)
    if (lengths < EPSILON) continue
    if (Math.abs(a.x * b.y - a.y * b.x) / lengths > EPSILON) continue
    if (a.x * b.x + a.y * b.y >= 0) continue

    const [winner, loser] = first.id < second.id ? [first, second] : [second, first]
    const winnerFar = pointById.get(farIdOf(winner))
    const loserFar = pointById.get(farIdOf(loser))
    if (!winnerFar || !loserFar) continue

    const winnerLengthCm = getSegmentLength(joint, winnerFar)
    const loserLengthCm = getSegmentLength(joint, loserFar)
    const isWinnerP1AtJoint = winner.p1Id === joint.id
    const isLoserP1AtJoint = loser.p1Id === joint.id

    for (const opening of draft.openings) {
      if (opening.wallId === loser.id) {
        // Kaybendeki offset kendi p1'inden; önce EKLEME olan uzaklığa çevir.
        const fromJointCm = isLoserP1AtJoint
          ? opening.offsetCm
          : loserLengthCm - opening.offsetCm
        opening.wallId = winner.id
        // Birleşik duvarın p1'i: kazananın ucu eklemdeyse kaybedenin uzak ucu,
        // değilse kazananın kendi uzak ucu.
        opening.offsetCm = isWinnerP1AtJoint
          ? loserLengthCm - fromJointCm
          : winnerLengthCm + fromJointCm
        continue
      }

      // Kazananın p1'i eklemdeyse birleşmeyle p1 değişiyor: kendi açıklıkları da kayar.
      if (opening.wallId === winner.id && isWinnerP1AtJoint) {
        opening.offsetCm = loserLengthCm + opening.offsetCm
      }
    }

    // Kazananın EKLEMDEKİ ucu, kaybedenin uzak ucuna uzatılır.
    if (isWinnerP1AtJoint) winner.p1Id = farIdOf(loser)
    else winner.p2Id = farIdOf(loser)

    removedWallIds.add(loser.id)
    winnerByLoser.set(loser.id, winner.id)
    isChanged = true
  }

  if (!isChanged) return false

  draft.walls = draft.walls.filter((wall) => !removedWallIds.has(wall.id))
  for (const room of draft.rooms) {
    room.wallIds = [...new Set(room.wallIds.map((id) => winnerByLoser.get(id) ?? id))]
  }

  return true
}

/** Aynı koordinatta sayılma eşiği; kayan nokta payı kadar dar. */
const COINCIDENT_EPSILON_CM = 1e-6

/**
 * Aynı koordinata düşen köşeleri kaynatır (K102).
 *
 * Taşımada kopan köşe, duvar eski yerine geri getirildiğinde klonunun ÜSTÜNE
 * geliyor. İki ayrı `Point` aynı yerde durursa duvarlar ekranda bitişik görünür
 * ama GRAF KOPUKTUR (K24 ilkesi) ve aralarında sıfır boylu bir parça kalır —
 * kullanıcı duvarı geri aldığında kenarda artık düğüm görüyordu.
 *
 * `mergePointInto` kaynatmayı, sıfır boy ve yinelenen duvarların elenmesini
 * birlikte yapıyor; burada yalnız hangi çiftlerin kaynayacağı seçiliyor.
 */
export function mergeCoincidentPointsInDraft(draft: CadState): boolean {
  const floorId = draft.activeFloorId
  let isChanged = false

  for (;;) {
    const points = draft.points.filter((point) => point.floorId === floorId)
    const pair = findCoincidentPair(points)
    if (!pair) break

    // Küçük id kalır: "ilk çizilen kazanır" (K34 ile aynı kural).
    const [target, source] = pair[0].id < pair[1].id ? pair : [pair[1], pair[0]]
    if (!mergePointInto(draft, source.id, target.id)) break
    draft.points = draft.points.filter((point) => point.id !== source.id)
    isChanged = true
  }

  return isChanged
}

function findCoincidentPair(points: readonly { id: Id; x: number; y: number }[]) {
  for (let index = 0; index < points.length; index += 1) {
    for (let other = index + 1; other < points.length; other += 1) {
      const a = points[index]
      const b = points[other]
      if (
        Math.abs(a.x - b.x) < COINCIDENT_EPSILON_CM &&
        Math.abs(a.y - b.y) < COINCIDENT_EPSILON_CM
      ) {
        return [a, b] as const
      }
    }
  }
  return undefined
}
