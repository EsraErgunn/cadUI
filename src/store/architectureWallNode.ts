import { applyWallSplit } from './architectureSplit'
import { mergeWallsAtJoint } from './architectureWallMerge'
// cadStore ↔ store dosyaları karşılıklı import eder; bu taraf tip-only (K17).
import type { CadState } from './cadStore'
import { takeNextId } from './projectMeta'
import type { PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import { getOpeningSpan } from '../core/opening'
import { getSegmentLength, getWallEnds, projectPointOntoWall } from '../core/wall'

/**
 * Düğümün duvar ucuna en az uzaklığı (cm). Daha yakına açılan düğüm, yanında
 * sıfıra yakın boyda bir parça bırakırdı — kullanıcı onu göremez ama graf
 * taşır, ölçü etiketi "0,00 m" yazar ve taşıma matematiği bölmeye çalışır.
 */
const MIN_PIECE_LENGTH_CM = 1

/**
 * Duvara ÇİFT TIKLA o noktada düğüm açar ve duvarı iki parçaya böler (K161).
 *
 * Bölmenin kendisi `applyWallSplit`ten geçiyor: parça üretimi, odaların duvar
 * kümesinin genişletilmesi ve açıklıkların doğru parçaya taşınması orada tek
 * kapıda toplandı — kesişim bölmesi (K24) ile aynı yol.
 *
 * ⚠️ Nokta bir açıklığın İÇİNE düşüyorsa bölme REDDEDİLİR (K24 kuralının
 * aynısı): açıklık silinmez, kaydırılmaz. Kullanıcının koyduğu veri sessizce
 * kaybolmaz — düğüm açılmaz, kullanıcı kapının dışına tıklar.
 *
 * ⚠️ Uca çok yakın tıklama da reddedilir (`MIN_PIECE_LENGTH_CM`): orada zaten
 * bir düğüm var, ikincisini açmak sıfıra yakın bir parça üretirdi.
 *
 * Çağıranın `set()` İÇİNDE çalışır ki jest tek bir geri alma adımı olsun.
 */
export function splitWallAtPointInDraft(
  draft: CadState,
  wallId: Id,
  target: PlanPoint,
): boolean {
  const wall = draft.walls.find((candidate) => candidate.id === wallId)
  if (!wall || wall.floorId !== draft.activeFloorId) return false

  const ends = getWallEnds(wall, draft.points)
  const projection = projectPointOntoWall(wall, draft.points, target)
  if (!ends || !projection) return false

  const lengthCm = getSegmentLength(ends.p1, ends.p2)
  const offsetCm = projection.offsetCm
  if (offsetCm < MIN_PIECE_LENGTH_CM) return false
  if (lengthCm - offsetCm < MIN_PIECE_LENGTH_CM) return false

  const isInsideOpening = draft.openings.some((opening) => {
    if (opening.wallId !== wallId) return false
    const [startCm, endCm] = getOpeningSpan(opening)
    return offsetCm > startCm && offsetCm < endCm
  })
  if (isInsideOpening) return false

  // Düğüm duvarın ÜSTÜNE oturur: tıklanan ham nokta değil, onun duvara dik
  // izdüşümü. Ham nokta yazılsaydı duvar tıklamanın sapmasi kadar kırılırdı.
  const pointId = takeNextId(draft)
  draft.points.push({
    id: pointId,
    floorId: wall.floorId,
    x: projection.point.x,
    y: projection.point.y,
  })

  applyWallSplit(draft, wall, [{ offsetCm, position: projection.point }], lengthCm, () => pointId)
  return true
}

/**
 * Çift tıkla birleştirmede "doğrusal" sayılan en büyük sapma (derece).
 *
 * Taramanınki (K103) SIFIRDIR ve öyle kalmalı: orada temizlenen, taşımanın kendi
 * ürettiği birebir doğrusal artıklar. Burada ise düğümü ELLE sürüklemiş bir
 * kullanıcı var ve el tam 180°'yi tutturamıyor — kullanıcı bildirimi:
 * "180'e tamamlanmıyor, zorlanıyor; zorla yapsam bile birleştiremiyorum".
 *
 * 3° insan ölçeğinde: 4 metrelik iki kolda eklemin doğrudan sapması yaklaşık
 * 5 cm'e denk geliyor. Daha büyük bir pay, kullanıcının bilerek yaptığı hafif
 * açılı köşeleri de yutmaya başlardı.
 *
 * ⚠️ Birleşme geometriyi bu pay kadar DÜZLEŞTİRİR: düğüm silindiği için duvar
 * uçtan uca düz gider. Bu kaçınılmaz ve zaten istenen — kullanıcı düğümü
 * kaldırmayı açıkça istedi.
 */
const MERGE_MAX_DEVIATION_DEG = 3

/**
 * Düğüme ÇİFT TIKLA onu kaldırır ve iki duvarı tek duvara birleştirir (K161).
 *
 * Karar `mergeWallsAtJoint`te ve taşımanın kullandığı temizlikle AYNI
 * (`mergeCollinearWallsInDraft`, K103): yalnız İKİ duvarın buluştuğu ve ikisinin
 * de AYNI DOĞRULTUDA olduğu eklem birleşir. Tek fark PAYDA:
 * `MERGE_MAX_DEVIATION_DEG`.
 *
 * ⚠️ Üç duvarın buluştuğu köşede ÇALIŞMAZ (kullanıcı kuralı). Orada düğümü
 * kaldırmak üçüncü duvarı havada bırakırdı — hangi iki duvarın birleşeceği de
 * belirsiz olurdu.
 *
 * ⚠️ GERÇEK bir köşede (paydan büyük açı) çalışmaz: iki duvar tek doğruya
 * indirilseydi köşe kaybolur, çizim kullanıcının çizmediği bir yere kayardı.
 * "Doğrusal duvarlarda çalışır" kuralı bunu söylüyor — ama "doğrusal" el
 * ölçüsünde, matematiksel değil.
 *
 * Düğüm boşta kalmasın diye `points`ten de düşürülüyor: iki duvar tek duvara
 * indiğinde o nokta artık hiçbir duvarın ucu değil.
 */
export function mergeWallsAtPointInDraft(draft: CadState, pointId: Id): boolean {
  const merged = mergeWallsAtJoint(draft, pointId, undefined, MERGE_MAX_DEVIATION_DEG)
  if (!merged) return false

  draft.walls = draft.walls.filter((wall) => wall.id !== merged.loserId)
  for (const room of draft.rooms) {
    room.wallIds = [...new Set(room.wallIds.map((id) => (id === merged.loserId ? merged.winnerId : id)))]
  }
  draft.points = draft.points.filter((point) => point.id !== pointId)

  return true
}
