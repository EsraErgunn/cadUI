// cadStore ↔ history karşılıklı import eder; bu taraf TİP-ONLY olduğu için
// derlemede silinir ve çalışma zamanında döngü oluşmaz (slice'larla aynı desen).
import type { CadState } from './cadStore'
import type {
  AreaObject,
  Beam,
  Floor,
  Id,
  Opening,
  Point,
  PointSymbol,
  Room,
  TextLabel,
  Wall,
} from '../core/model'

/** Kaç adım geriye gidilebilir. Sınırsız geçmiş uzun oturumda belleği şişirir. */
export const HISTORY_LIMIT = 100

/**
 * Geçmişe giren alanlar = MİMARİ ÇİZİM verisi (CLAUDE.md kural 4).
 * Zoom/pan/araç/seçim zaten cadStore'da değil (uiStore + architectureUiStore),
 * bu yüzden buraya hiç uğramıyor — "Ctrl+Z zoom'u geri aldı" olmaz.
 *
 * `nextUniqueId` ve `revision` bilerek DIŞARIDA (K71): ikisini de tesisat
 * eklemesi artırıyor ve bu geçmiş yalnız mimariyi tutuyor. İçerideyken her
 * tesisat işlemi mimari geçmişe görünürde hiçbir şey yapmayan bir adım
 * bırakıyordu; üstelik o adımı geri almak sayacı geriye düşürüp var olan bir
 * id'yi ikinci kez ürettirebiliyordu (knowledge/id-scheme.md'nin yasağı).
 */
export type TrackedProjectState = {
  floors: Floor[]
  activeFloorId: Id
  points: Point[]
  walls: Wall[]
  openings: Opening[]
  rooms: Room[]
  symbols: PointSymbol[]
  areaObjects: AreaObject[]
  beams: Beam[]
  texts: TextLabel[]
}

/**
 * Kirli işareti (`revision`/`savedRevision`) geçmişin DIŞINDA: geri alma onu
 * eski değerine döndürseydi, araya giren bir tesisat düzenlemesinden sonraki
 * Ctrl+Z sayacı geriye çeker ve KAYDEDİLMEMİŞ tesisat işi "temiz" görünürdü —
 * kullanıcı uyarı almadan kapatıp kaybederdi. Bedeli ters yönde: kaydedilen
 * noktaya kadar geri alınan proje kirli görünmeye devam eder, yani fazladan bir
 * kaydetme uyarısı. Fazladan uyarı, kaybolan işten iyidir.
 */
export function partializeProjectState(state: CadState): TrackedProjectState {
  return {
    floors: state.floors,
    activeFloorId: state.activeFloorId,
    points: state.points,
    walls: state.walls,
    openings: state.openings,
    rooms: state.rooms,
    symbols: state.symbols,
    areaObjects: state.areaObjects,
    beams: state.beams,
    texts: state.texts,
  }
}

/**
 * Sığ karşılaştırma yeter: immer değişmeyen dizileri AYNI referansla bırakıyor.
 * Reddedilen bir action (K13 geçersiz taşıma, sığmayan yerleştirme) set()
 * çağırıp hiçbir şeye dokunmuyor — bu kontrol olmasa her reddedilen deneme
 * geçmişe boş bir adım yazar, Ctrl+Z hiçbir şey yapmıyormuş gibi görünürdü.
 * Aynı kontrol tesisat düzenlemelerini de eliyor: onlar mimari dizilere hiç
 * dokunmadığı için hepsi "eşit" çıkar (K71).
 *
 * `activeFloorId` KARŞILAŞTIRILMAZ ama anlık görüntüde DURUR: kat değiştirmek
 * çizim verisini değiştirmediği için geçmişe adım yazmamalı (Ctrl+Z kullanıcıyı
 * başka kata ışınlamasın). Yine de kat silme activeFloorId'yi kaydırıyor ve o
 * işlem `floors` dizisini de değiştirdiği için adım zaten yazılıyor — geri
 * alındığında aktif kat anlık görüntüden eski değerine döner.
 */
export function areProjectStatesEqual(
  past: TrackedProjectState,
  next: TrackedProjectState,
): boolean {
  return (
    past.floors === next.floors &&
    past.points === next.points &&
    past.walls === next.walls &&
    past.openings === next.openings &&
    past.rooms === next.rooms &&
    past.symbols === next.symbols &&
    past.areaObjects === next.areaObjects &&
    past.beams === next.beams &&
    past.texts === next.texts
  )
}
