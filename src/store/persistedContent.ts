// cadStore ↔ bu dosya karşılıklı import eder; buradaki cadStore importu TİP-ONLY
// olduğu için derlemede silinir ve çalışma zamanında döngü oluşmaz (history.ts
// ile aynı desen).
import type { CadState } from './cadStore'

/**
 * Kaydedilecek JSON'un İÇERİK alanları. Kirli işareti bunlara bakar.
 *
 * `nextUniqueId` ve `activeFloorId` JSON'a giriyor ama BURADA YOK:
 * - `nextUniqueId` bir sayaç, içerik değil. Çizip geri alan kullanıcıda sayaç
 *   ileride kalır (K71: geçmişte izlenmiyor) ve dahil edilseydi ekranda hiçbir
 *   şey değişmediği hâlde kaydetme uyarısı çıkardı. Kaydedilmemesi güvenli:
 *   sayaç yalnız İLERİ gider, geri alınan nesnenin id'si de artık kullanımda
 *   değildir (knowledge/id-scheme.md).
 * - `activeFloorId` hangi kata BAKILDIĞI, ne çizildiği değil. Kat değiştirmek
 *   geçmişe de adım yazmıyor (history.ts, aynı gerekçe).
 */
export type PersistedContent = {
  floors: CadState['floors']
  points: CadState['points']
  walls: CadState['walls']
  openings: CadState['openings']
  rooms: CadState['rooms']
  symbols: CadState['symbols']
  areaObjects: CadState['areaObjects']
  beams: CadState['beams']
  texts: CadState['texts']
  installationElements: CadState['installationElements']
  installationLines: CadState['installationLines']
  installationConnections: CadState['installationConnections']
}

/** Kaydetme ve yükleme anında alınır; `selectIsProjectDirty` buna karşı bakar. */
export function takePersistedContent(state: PersistedContent): PersistedContent {
  return {
    floors: state.floors,
    points: state.points,
    walls: state.walls,
    openings: state.openings,
    rooms: state.rooms,
    symbols: state.symbols,
    areaObjects: state.areaObjects,
    beams: state.beams,
    texts: state.texts,
    installationElements: state.installationElements,
    installationLines: state.installationLines,
    installationConnections: state.installationConnections,
  }
}

/**
 * Sığ karşılaştırma: immer dokunulmayan diziyi AYNI referansla bırakıyor, zundo
 * da geri alırken kaydettiği referansları geri koyuyor. Bu yüzden "çiz + Ctrl+Z"
 * sonrasında diziler kaydetme anındaki referanslara döner ve proje temiz çıkar
 * — düzeltilen hata buydu.
 *
 * MİMARİ + TESİSAT dizilerinin hepsi burada. Yalnız mimari geçmişinin izlediği
 * alt küme (`history.ts` → `TrackedProjectState`) kullanılsaydı kaydedilmemiş
 * tesisat işi "temiz" görünür ve kullanıcı uyarı almadan kapatıp kaybederdi.
 *
 * Yanılma yönü GÜVENLİ tarafta: aynı içeriği yeni bir diziye yazan bir action
 * projeyi kirli gösterir (fazladan uyarı), tersi olmaz (kaybolan iş).
 */
export function isSamePersistedContent(a: PersistedContent, b: PersistedContent): boolean {
  return (
    a.floors === b.floors &&
    a.points === b.points &&
    a.walls === b.walls &&
    a.openings === b.openings &&
    a.rooms === b.rooms &&
    a.symbols === b.symbols &&
    a.areaObjects === b.areaObjects &&
    a.beams === b.beams &&
    a.texts === b.texts &&
    a.installationElements === b.installationElements &&
    a.installationLines === b.installationLines &&
    a.installationConnections === b.installationConnections
  )
}
