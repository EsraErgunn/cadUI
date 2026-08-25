// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import { mergePointInto } from './architectureWallOps'
import type { CadState } from './cadStore'
import type { Id, Wall } from '../core/model'
import { getSegmentLength } from '../core/wall'

/** Doğrultu karşılaştırması için kayan nokta payı. */
const EPSILON = 1e-6

/**
 * Gereksiz ara düğümleri temizler: bir köşede YALNIZ İKİ duvar buluşuyor ve
 * ikisi de AYNI DOĞRULTUDAysa tek duvara birleştirilir (K103).
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
  const removedWallIds = new Set<Id>()
  const winnerByLoser = new Map<Id, Id>()

  for (const joint of draft.points) {
    const merged = mergeWallsAtJoint(draft, joint.id, removedWallIds)
    if (!merged) continue

    removedWallIds.add(merged.loserId)
    winnerByLoser.set(merged.loserId, merged.winnerId)
  }

  return applyWallMerges(draft, removedWallIds, winnerByLoser)
}

/**
 * Birleşmenin ORTAK son adımı: kaybedenleri sil, odaların kaydını düzelt.
 *
 * Kaybedeni sınırında sayan oda kaydı kazanana GÜNCELLENİR — yoksa taze yüz
 * taraması eski kaydı eşleştiremez ve kullanıcının verdiği ad kaybolur (K31).
 */
function applyWallMerges(
  draft: CadState,
  removedWallIds: ReadonlySet<Id>,
  winnerByLoser: ReadonlyMap<Id, Id>,
): boolean {
  if (removedWallIds.size === 0) return false

  draft.walls = draft.walls.filter((wall) => !removedWallIds.has(wall.id))
  for (const room of draft.rooms) {
    room.wallIds = [...new Set(room.wallIds.map((id) => winnerByLoser.get(id) ?? id))]
  }

  return true
}

/**
 * TEK bir eklemi dener: orada yalnız iki duvar buluşuyor ve ikisi de aynı
 * doğrultudaysa birleştirir, kazanan/kaybeden çiftini döndürür.
 *
 * Taramadan AYRI durmak zorunda çünkü çift tıkla düğüm kaldırma (K161) aynı
 * kararı TEK nokta için soruyor. İki kopya olsaydı biri "aynı doğrultu" ölçüsünü
 * ya da açıklık kaydırmasını farklı yapabilirdi.
 *
 * ⚠️ Duvarları SİLMEZ ve odalara dokunmaz; onu çağıran `applyWallMerges` yapar.
 * Tarama birden çok eklemi biriktirip tek seferde uyguluyor.
 */
export function mergeWallsAtJoint(
  draft: CadState,
  jointId: Id,
  removedWallIds: ReadonlySet<Id> = new Set<Id>(),
  maxDeviationDeg = 0,
): { winnerId: Id; loserId: Id } | undefined {
  const floorId = draft.activeFloorId
  const joint = draft.points.find((point) => point.id === jointId)
  if (!joint || joint.floorId !== floorId) return undefined

  const touching = draft.walls.filter(
    (wall) =>
      wall.floorId === floorId &&
      !removedWallIds.has(wall.id) &&
      (wall.p1Id === joint.id || wall.p2Id === joint.id),
  )
  if (touching.length !== 2) return undefined

  const [first, second] = touching
  // ⚠️ Kalınlığı veya yüksekliği FARKLI iki duvar birleştirilmez: kullanıcının
  // bilerek koyduğu bir ayrım olabilir, sessizce silmek veri kaybı olurdu.
  if (first.thickness !== second.thickness || first.height !== second.height) {
    return undefined
  }

  const pointById = new Map(draft.points.map((point) => [point.id, point]))
  const farIdOf = (wall: Wall) => (wall.p1Id === joint.id ? wall.p2Id : wall.p1Id)
  const farFirst = pointById.get(farIdOf(first))
  const farSecond = pointById.get(farIdOf(second))
  if (!farFirst || !farSecond) return undefined

  // Aynı doğrultu: eklemden çıkan iki kol TERS yönlerde ve çapraz çarpımı sıfır.
  //
  // ⚠️ Tolerans ÇAĞIRANDAN gelir ve varsayılanı SIFIR (yalnız kayan nokta payı).
  // Tarama, taşımanın KENDİ ürettiği artık düğümleri temizliyor ve onlar birebir
  // doğrusal — orada tolerans açmak, kullanıcının bilerek çizdiği hafif açılı
  // köşeleri her taşımada sessizce düzleştirirdi.
  //
  // Çift tık (K161) ise açık bir kullanıcı isteği ve düğümü ELLE sürüklenmiş
  // olabilir; el hiçbir zaman tam 180° tutturamıyor, o yol kendi insan ölçekli
  // payını veriyor (kullanıcı bildirimi: "180'e tamamlanmıyor, zorlanıyor").
  //
  // Ölçü |sin(sapma)|: kollar tam ters yöndeyken çapraz çarpım sıfırdır.
  const a = { x: farFirst.x - joint.x, y: farFirst.y - joint.y }
  const b = { x: farSecond.x - joint.x, y: farSecond.y - joint.y }
  const lengths = getSegmentLength(joint, farFirst) * getSegmentLength(joint, farSecond)
  if (lengths < EPSILON) return undefined

  const maxSin = Math.max(EPSILON, Math.sin((maxDeviationDeg * Math.PI) / 180))
  if (Math.abs(a.x * b.y - a.y * b.x) / lengths > maxSin) return undefined
  if (a.x * b.x + a.y * b.y >= 0) return undefined

  const [winner, loser] = first.id < second.id ? [first, second] : [second, first]
  const winnerFar = pointById.get(farIdOf(winner))
  const loserFar = pointById.get(farIdOf(loser))
  if (!winnerFar || !loserFar) return undefined

  const winnerLengthCm = getSegmentLength(joint, winnerFar)
  const loserLengthCm = getSegmentLength(joint, loserFar)
  const isWinnerP1AtJoint = winner.p1Id === joint.id
  const isLoserP1AtJoint = loser.p1Id === joint.id

  /**
   * Duvara bağlı bir nesnenin birleşme sonrası yeni duvarı ve offset'i.
   *
   * ⚠️ Açıklık ile duvara bağlı SEMBOL aynı modelde duruyor (wallId + offsetCm,
   * K9), dolayısıyla aynı dönüşümden geçmek ZORUNDALAR. Yalnız açıklık
   * taşınıyordu ve kaybeden duvardaki cihaz sahipsiz kalıp çizilemez oluyordu
   * (K178, kullanıcı bildirimi: "birleştirdiğim duvarlardaki cihazlar yok
   * oluyor"). İki ayrı kopya yazılsaydı biri zamanla yine ayrışırdı — bölmede
   * tam bu olmuştu (K177).
   */
  const remapToWinner = (attached: { wallId: Id; offsetCm: number }) => {
    if (attached.wallId === loser.id) {
      // Kaybendeki offset kendi p1'inden; önce EKLEME olan uzaklığa çevir.
      const fromJointCm = isLoserP1AtJoint
        ? attached.offsetCm
        : loserLengthCm - attached.offsetCm
      attached.wallId = winner.id
      // Birleşik duvarın p1'i: kazananın ucu eklemdeyse kaybedenin uzak ucu,
      // değilse kazananın kendi uzak ucu.
      attached.offsetCm = isWinnerP1AtJoint
        ? loserLengthCm - fromJointCm
        : winnerLengthCm + fromJointCm
      return
    }

    // Kazananın p1'i eklemdeyse birleşmeyle p1 değişiyor: kendi nesneleri de kayar.
    if (attached.wallId === winner.id && isWinnerP1AtJoint) {
      attached.offsetCm = loserLengthCm + attached.offsetCm
    }
  }

  for (const opening of draft.openings) remapToWinner(opening)
  for (const symbol of draft.symbols) {
    // Serbest sembolün duvarı yok; birleşme onu ilgilendirmiyor.
    if (symbol.attachment === 'wall') remapToWinner(symbol)
  }

  // Kazananın EKLEMDEKİ ucu, kaybedenin uzak ucuna uzatılır.
  if (isWinnerP1AtJoint) winner.p1Id = farIdOf(loser)
  else winner.p2Id = farIdOf(loser)

  return { winnerId: winner.id, loserId: loser.id }
}

/** Aynı koordinatta sayılma eşiği; kayan nokta payı kadar dar. */
const COINCIDENT_EPSILON_CM = 1e-6

/**
 * Aynı koordinata düşen köşeleri kaynatır (K103).
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
