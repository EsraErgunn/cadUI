// cadStore ↔ history karşılıklı import eder; bu taraf TİP-ONLY olduğu için
// derlemede silinir ve çalışma zamanında döngü oluşmaz (slice'larla aynı desen).
import type { CadState } from './cadStore'
import type { Floor, Id, Opening, Point, Wall } from '../core/model'

/** Kaç adım geriye gidilebilir. Sınırsız geçmiş uzun oturumda belleği şişirir. */
export const HISTORY_LIMIT = 100

/**
 * Geçmişe giren alanlar = KAYDEDİLECEK veri (CLAUDE.md kural 4).
 * Zoom/pan/araç/seçim zaten cadStore'da değil (uiStore + architectureUiStore),
 * bu yüzden buraya hiç uğramıyor — "Ctrl+Z zoom'u geri aldı" olmaz.
 */
export type TrackedProjectState = {
  nextUniqueId: Id
  revision: number
  floors: Floor[]
  activeFloorId: Id
  points: Point[]
  walls: Wall[]
  openings: Opening[]
}

/**
 * `revision` İÇERİDE, `savedRevision` DIŞARIDA. Geri alma revision'ı da eski
 * değerine döndürdüğü için kaydedilen noktaya kadar geri alınan proje yeniden
 * "temiz" görünür. savedRevision ise sunucuya dair bir bilgi — onu geri almak
 * "kaydettiğimi unut" demek olurdu.
 */
export function partializeProjectState(state: CadState): TrackedProjectState {
  return {
    nextUniqueId: state.nextUniqueId,
    revision: state.revision,
    floors: state.floors,
    activeFloorId: state.activeFloorId,
    points: state.points,
    walls: state.walls,
    openings: state.openings,
  }
}

/**
 * Sığ karşılaştırma yeter: immer değişmeyen dizileri AYNI referansla bırakıyor.
 * Reddedilen bir action (K13 geçersiz taşıma, sığmayan yerleştirme) set()
 * çağırıp hiçbir şeye dokunmuyor — bu kontrol olmasa her reddedilen deneme
 * geçmişe boş bir adım yazar, Ctrl+Z hiçbir şey yapmıyormuş gibi görünürdü.
 */
export function areProjectStatesEqual(
  past: TrackedProjectState,
  next: TrackedProjectState,
): boolean {
  return (
    past.nextUniqueId === next.nextUniqueId &&
    past.revision === next.revision &&
    past.activeFloorId === next.activeFloorId &&
    past.floors === next.floors &&
    past.points === next.points &&
    past.walls === next.walls &&
    past.openings === next.openings
  )
}
