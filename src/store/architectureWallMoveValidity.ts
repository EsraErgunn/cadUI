import { pruneOpeningsInDraft } from './architectureOpeningOps'
import { recomputeRoomsInDraft } from './architectureRooms'
import { splitWallsAtIntersections } from './architectureSplit'
import { mergeCoincidentPointsInDraft, mergeCollinearWallsInDraft } from './architectureWallMerge'
import { applyWallOffsetInDraft } from './architectureWallOffset'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import type { Id, Point, Wall } from '../core/model'
import { getSegmentLength, MIN_WALL_LENGTH_CM, projectOntoSegment } from '../core/wall'

/** Kayan nokta payı; snap noktaları zaten hizaya koyuyor. */
const EPSILON = 1e-6

/** Taşımanın neden reddedildiği; `undefined` ise taşıma geçerli. */
export type WallMoveBlocker = 'freeEnd' | 'collapse' | 'roomLost'

/**
 * Duvar ötelemesinin TAMAMI: geometri + temizlik + oda hesabı, tek yerde.
 *
 * `offsetWall` bunu store'a yazmak için, `findWallMoveBlocker` ise atılabilir
 * bir kopya üzerinde denemek için çağırır. Tek gövde olması ŞART: denetim
 * başka bir sıra izleseydi, kabul ettiği çizim ile yazılan çizim ayrışırdı.
 *
 * Sıra önemli ve her adımın gerekçesi var:
 * - Kopan köşe eski yerine döndüyse klonunun üstüne gelmiştir; aynı yerdeki iki
 *   nokta grafı kopuk bırakır (K24 ilkesi), önce kaynatılır.
 * - Komşular kısalmış olabilir; sığmayan açıklık aynı adımda düşer (K16).
 * - Taşınan duvar başkalarının üstünden geçmiş olabilir (K24).
 * - Bölmeden SONRA önceki taşımaların bıraktığı ara düğümler temizlenir, yoksa
 *   komşu kenar her harekette bir parça daha artardı (K103).
 * - Oda çevrimi bölünmüş VE birleştirilmiş duvarları görmeli (K31).
 */
export function runWallOffsetInDraft(
  draft: CadState,
  wallId: Id,
  dxCm: number,
  dyCm: number,
): boolean {
  if (!applyWallOffsetInDraft(draft, wallId, dxCm, dyCm)) return false

  mergeCoincidentPointsInDraft(draft)
  pruneOpeningsInDraft(draft)
  splitWallsAtIntersections(draft)
  mergeCollinearWallsInDraft(draft)
  recomputeRoomsInDraft(draft)
  return true
}

/**
 * Boru hattının üzerinde koşacağı ATILABİLİR kopya.
 *
 * Öğeler de kopyalanır, yalnız diziler değil: `applyWallOffsetInDraft` nokta
 * koordinatını, `mergeCollinearWallsInDraft` duvar ucunu ve açıklık offset'ini
 * YERİNDE değiştiriyor. Sığ dizi kopyası bırakılsaydı denetim, hiç
 * onaylanmamış bir hareketi gerçek store'a yazardı.
 */
function cloneForSimulation(state: CadState): CadState {
  return {
    ...state,
    points: state.points.map((point) => ({ ...point })),
    walls: state.walls.map((wall) => ({ ...wall })),
    openings: state.openings.map((opening) => ({ ...opening })),
    rooms: state.rooms.map((room) => ({ ...room, wallIds: [...room.wallIds] })),
  }
}

/** Uç başka bir duvarın ucuna ya da GÖVDESİNE değiyor mu? (K24 orada T kurar) */
function isEndAttached(
  walls: readonly Wall[],
  pointById: ReadonlyMap<Id, Point>,
  wallId: Id,
  endId: Id,
  end: Point,
  floorId: Id,
): boolean {
  return walls.some((other) => {
    if (other.id === wallId || other.floorId !== floorId) return false
    if (other.p1Id === endId || other.p2Id === endId) return true

    const p1 = pointById.get(other.p1Id)
    const p2 = pointById.get(other.p2Id)
    if (!p1 || !p2) return false
    if (getSegmentLength(p1, p2) < MIN_WALL_LENGTH_CM) return false

    return projectOntoSegment(p1, p2, end).distanceCm < MIN_WALL_LENGTH_CM
  })
}

function lengthOf(state: CadState, wall: Wall): number | undefined {
  const p1 = state.points.find((point) => point.id === wall.p1Id)
  const p2 = state.points.find((point) => point.id === wall.p2Id)
  return p1 && p2 ? getSegmentLength(p1, p2) : undefined
}

/**
 * Taşıma çizimi bozacak mı? Geçersiz yerleştirme REDDEDİLİR (K13 deseni, K103).
 *
 * Denetim, ötelemenin GERÇEK sonucuna bakar: boru hattı atılabilir bir kopya
 * üzerinde sonuna kadar koşturulur, sorular ondan sonra sorulur. Eskiden
 * temizlik ÖNCESİ ara duruma bakılıyordu ve store'un asla yazmadığı bir hâl
 * yüzünden meşru hareketler reddediliyordu: bir odanın çıkıntısını komşu
 * hizasına oturtmak, çıkıntı duvarlarını sıfır boya indirdiği için
 * `collapse` sayılıyordu — oysa kaynatma onları temizleyip çizimi düzgün
 * bırakıyor. Kullanıcı duvarı hizaya getiremiyordu (K107).
 *
 * Geriye üç gerçek bozulma kalıyor:
 * - `collapse`: temizlikten SAĞ ÇIKAN, çizilemeyecek kadar kısa bir duvar var.
 * - `roomLost`: var olan bir oda yok oldu. Duvarı komşusunun üstüne itmek
 *   çevrimi koparıyor, yan oda dolgusuyla ve etiketiyle kayboluyordu.
 * - `freeEnd`: taşınan duvarın bir ucu hiçbir duvara değmiyor, duvar havada.
 *
 * ⚠️ Üç denetim de "ÖNCEDEN de böyleydi" durumunu geçirir: yarım kalmış zinciri
 * ya da zaten güdük bir duvarı taşımak yasaklanmamalı. Kural YENİ bir bozulma
 * yaratmayı engelliyor, var olanı düzeltmeyi değil.
 */
export function findWallMoveBlocker(
  state: CadState,
  wallId: Id,
  dxCm: number,
  dyCm: number,
): WallMoveBlocker | undefined {
  if (Math.abs(dxCm) < EPSILON && Math.abs(dyCm) < EPSILON) return undefined

  const after = cloneForSimulation(state)
  // Plan çıkmadıysa ortada hareket de yok: reddedilecek bir şey yok.
  if (!runWallOffsetInDraft(after, wallId, dxCm, dyCm)) return undefined

  const floorId = state.activeFloorId

  for (const wall of after.walls) {
    if (wall.floorId !== floorId) continue

    const lengthCm = lengthOf(after, wall)
    if (lengthCm === undefined || lengthCm >= MIN_WALL_LENGTH_CM) continue

    const source = state.walls.find((candidate) => candidate.id === wall.id)
    const wasShort = source ? (lengthOf(state, source) ?? 0) < MIN_WALL_LENGTH_CM : false
    if (!wasShort) return 'collapse'
  }

  // Serbest uç ODA KAYBINDAN ÖNCE sorulur. Duvarı havada bırakan bir taşıma
  // çevrimi de kopardığı için ikisi birden doğru çıkıyor; kullanıcıya sebebi
  // bildiren asıl kusur serbest uç, oda kaybı onun sonucu.
  //
  // Taşınan duvar temizlikte kaybolmuş olabilir: eş doğrultulu komşusuyla
  // birleşmiştir, yani geometri kopmadı — kontrol edilecek serbest uç yok.
  const moved = after.walls.find((candidate) => candidate.id === wallId)
  const source = state.walls.find((candidate) => candidate.id === wallId)
  if (moved && source && moved.floorId === floorId) {
    const afterIndex = new Map(after.points.map((point) => [point.id, point]))
    const beforeIndex = new Map(state.points.map((point) => [point.id, point]))

    for (const endId of [moved.p1Id, moved.p2Id]) {
      const end = afterIndex.get(endId)
      if (!end) continue
      if (isEndAttached(after.walls, afterIndex, wallId, endId, end, floorId)) continue

      const beforeEnd = beforeIndex.get(endId)
      const wasFree =
        !beforeEnd || !isEndAttached(state.walls, beforeIndex, wallId, endId, beforeEnd, floorId)
      if (!wasFree) return 'freeEnd'
    }
  }

  // Oda SAYISI karşılaştırılır, KİMLİK değil. Taşıma bir odanın duvar kümesini
  // yeterince değiştirdiğinde K106'nın eşleştirmesi tutmuyor ve oda AYNI YERDE
  // dururken yeni bir id alıyor. Kimliğe bakan denetim bunu "oda öldü" sanıp
  // meşru hareketleri reddediyordu: paylaşılan duvarı olan iki odada duvar
  // HİÇBİR yöne oynatılamıyordu (id [12,20] → [12,25] iken oda sayısı 2 → 2,
  // yani iki oda da yaşıyordu — kullanıcı bildirimi).
  //
  // Sayının ARTMASI serbest: duvarı odanın içinden geçirmek çevrimi ikiye
  // böler, bu kullanıcının kendi kararı (K31).
  if (after.rooms.length < state.rooms.length) return 'roomLost'

  return undefined
}
