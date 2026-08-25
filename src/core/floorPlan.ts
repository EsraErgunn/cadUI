import {
  MAX_BASEMENT_COUNT,
  MAX_FLOOR_COUNT,
  canAddBasement,
  canAddFloor,
  getBasementCount,
  getFloorInsertIndex,
  getNextBasementName,
  getNextFloorName,
  isFloorHeightValid,
  isFloorNameTaken,
  reorderFloorInList,
  canAssignFloorType,
  getFloorType,
  withFloorType,
  withPositionalNames,
  type FloorType,
} from './floors'
import { DEFAULT_FLOOR_HEIGHT_CM, type Floor, type Id } from './model'

/**
 * "Katlar" penceresinde düzenlenen, henüz store'a YAZILMAMIŞ kat yapısı
 * (madde 13: değişiklikler "Uygula" ile yürürlüğe girer, "İptal" hepsini atar).
 *
 * Pencere doğrudan store'a yazsaydı "İptal" bir geri alma yığını gerektirirdi ve
 * kullanıcı iptal edene kadar çizim ekranı yarım bir kat yapısını gösterirdi.
 * Taslak ayrıca KK-20'yi bedava veriyor: Uygula tek yazım, dolayısıyla tek Ctrl+Z.
 */
/**
 * Bu kata Uygula'da yazılacak kopyalama (K166). Hem YENİ kat "X'tan
 * kopyalayarak" eklendiğinde hem de MEVCUT bir kat kopyalama hedefi
 * seçildiğinde aynı alan kullanılır — iki ayrı yol tek kavrama indi.
 *
 * "Üzerine yaz / atla" kipi BURADA saklanmaz: kip, hedef listesini süzen bir
 * karardır ve süzme kullanıcı onay verirken yapılır. Taslakta duran şey kipin
 * SONUCU, yani gerçekten kopyalanacak katlar.
 */
export type DraftFloorCopy = {
  sourceFloorId: Id
  isArchitectureIncluded: boolean
  isInstallationIncluded: boolean
}

export type DraftFloor = Floor & {
  /** `null` = bu kata kopyalama yok. Kopyalama Uygula'da yapılır. */
  pendingCopy: DraftFloorCopy | null
}

export type FloorPlanDraft = {
  floors: DraftFloor[]
  activeFloorId: Id
  /** Toplu işlem seçimi (kopyalama/silme); aktif kattan BAĞIMSIZ. */
  selectedFloorIds: Id[]
}

/**
 * Taslakta eklenen katın id'si GEÇİCİ ve negatiftir. Gerçek id `nextUniqueId`
 * sayacından ancak Uygula'da alınır: taslakta alınsaydı "İptal" edilen her
 * pencere sayacı ilerletir ve kaydedilen JSON'da açıklanamayan boşluklar
 * bırakırdı (bkz. knowledge/id-scheme.md — id bir kez üretilir).
 */
const FIRST_DRAFT_FLOOR_ID = -1

export function isDraftFloorId(floorId: Id): boolean {
  return floorId < 0
}

function takeDraftFloorId(floors: readonly DraftFloor[]): Id {
  const lowest = floors.reduce((min, floor) => Math.min(min, floor.id), 0)
  return Math.min(lowest - 1, FIRST_DRAFT_FLOOR_ID)
}

export function createFloorPlanDraft(floors: readonly Floor[], activeFloorId: Id): FloorPlanDraft {
  return {
    // Adlar AÇILIŞTA da konuma göre normalleşir (K167): pencere yürürlükteki
    // kuralı göstermeli. Store"a yazan yine yalnız "Uygula".
    floors: [...withPositionalNames(floors.map((floor) => ({ ...floor, pendingCopy: null })))],
    activeFloorId,
    selectedFloorIds: [],
  }
}

/**
 * Yapısal her değişiklikten sonra adları konuma göre tazeler (K167). Ekleme,
 * silme ve sıralama katların yerini değiştiriyor; ad yere bağlı olduğu için
 * bu üçünün ardından yeniden hesaplanmak ZORUNDA. Yükseklik ve aktif kat
 * değişimi sırayı bozmaz, oralarda çağrılmıyor.
 */
function withRenumberedFloors(draft: FloorPlanDraft, floors: readonly DraftFloor[]): FloorPlanDraft {
  return { ...draft, floors: [...withPositionalNames(floors)] }
}

export type AddDraftFloorInput = {
  isBasement?: boolean
  /**
   * Verilmezse yeni kat ALTINDAKİ katın yüksekliğini devralır (K166). Eskiden
   * pencerenin üstünde ayrı bir "yeni kat yüksekliği" alanı vardı; alanın
   * kendisi kadar "mevcut katları değiştirmez" feragatnamesi de gerekiyordu.
   * Devralma, üç kat üst üste eklendiğinde de istenen sonucu veriyor.
   */
  heightCm?: number
  /** Verilirse yeni kat, o katın çiziminin TAM kopyasıyla gelir. */
  copyFromFloorId?: Id
}

/** Yeni katın yüksekliği: altındaki kat, o da yoksa proje varsayılanı. */
function getInheritedHeightCm(floors: readonly DraftFloor[], insertIndex: number): number {
  const below = floors[insertIndex - 1] ?? floors[insertIndex] ?? floors[floors.length - 1]
  return below?.heightCm ?? DEFAULT_FLOOR_HEIGHT_CM
}

/**
 * Reddedilen her işlem AYNI taslak nesnesini döndürür (yeni referans değil):
 * çağıran `===` ile "değişiklik olmadı"yı anlar ve pencereyi gereksizce
 * kirlenmiş saymaz — core/floors.ts'teki `moveFloorInList` ile aynı sözleşme.
 */
export function addDraftFloor(draft: FloorPlanDraft, input: AddDraftFloorInput = {}): FloorPlanDraft {
  const isBasement = input.isBasement ?? false
  if (isBasement ? !canAddBasement(draft.floors) : !canAddFloor(draft.floors)) return draft

  const insertIndex = getFloorInsertIndex(draft.floors, isBasement)
  const heightCm = input.heightCm ?? getInheritedHeightCm(draft.floors, insertIndex)
  if (!isFloorHeightValid(heightCm)) return draft

  const name = isBasement ? getNextBasementName(draft.floors) : getNextFloorName(draft.floors)
  if (isFloorNameTaken(draft.floors, name)) return draft

  const added: DraftFloor = {
    id: takeDraftFloorId(draft.floors),
    name,
    heightCm,
    isBasement,
    pendingCopy:
      input.copyFromFloorId === undefined
        ? null
        : {
            sourceFloorId: input.copyFromFloorId,
            isArchitectureIncluded: true,
            isInstallationIncluded: true,
          },
  }

  const floors = [...draft.floors]
  floors.splice(insertIndex, 0, added)
  return withRenumberedFloors(draft, floors)
}

/**
 * Tek işlemde birden çok kat (K166: "3 kat ekle"). Her kat bir öncekinin
 * üstüne biniyor, yani adlar sırayla üretiliyor ve devralınan yükseklik en son
 * eklenen kattan geliyor — üç eşit kat, tipik bir apartmanda istenen sonuç.
 *
 * KISMİ ekleme YOK: istenen sayı tavana sığmıyorsa hiçbiri eklenmez. Onu
 * söylemek arayüzün işi (`getAddableFloorCount`); burada sessizce 10 yerine 4
 * kat eklemek kullanıcının saymadığı bir sonuç doğururdu.
 */
export function addDraftFloors(
  draft: FloorPlanDraft,
  input: AddDraftFloorInput = {},
  count = 1,
): FloorPlanDraft {
  if (!Number.isInteger(count) || count < 1) return draft
  if (getAddableFloorCount(draft.floors, input.isBasement ?? false) < count) return draft

  let next = draft
  for (let index = 0; index < count; index += 1) {
    const added = addDraftFloor(next, input)
    // Bir tanesi bile reddedilirse tamamı geri alınır: yarım yığın bırakmaz.
    if (added === next) return draft
    next = added
  }
  return next
}

/** Tavana kaç kat daha sığdığı — sayı alanının üst sınırı. */
export function getAddableFloorCount(floors: readonly Floor[], isBasement: boolean): number {
  return isBasement
    ? Math.max(0, MAX_BASEMENT_COUNT - getBasementCount(floors))
    : Math.max(0, MAX_FLOOR_COUNT - floors.length)
}

/**
 * Toplu silme (madde 14). Projede en az bir kat kalmalı: seçim katların TAMAMINI
 * kapsıyorsa hiçbiri silinmez — kısmen silmek kullanıcının istemediği bir seçimi
 * kendi kafamıza göre daraltmak olurdu.
 */
export function removeDraftFloors(draft: FloorPlanDraft, floorIds: readonly Id[]): FloorPlanDraft {
  const removed = new Set(floorIds)
  const floors = draft.floors.filter((floor) => !removed.has(floor.id))
  if (floors.length === draft.floors.length || floors.length === 0) return draft

  return {
    ...withRenumberedFloors(draft, floors),
    // Aktif kat silindiyse altındaki, o yoksa üstündeki kat aktif olur —
    // store'daki getFloorIdAfterRemoval ile aynı yön tercihi.
    activeFloorId: removed.has(draft.activeFloorId)
      ? resolveActiveFloorId(draft.floors, floors, draft.activeFloorId)
      : draft.activeFloorId,
    selectedFloorIds: draft.selectedFloorIds.filter((id) => !removed.has(id)),
  }
}

function resolveActiveFloorId(
  before: readonly DraftFloor[],
  after: readonly DraftFloor[],
  removedId: Id,
): Id {
  const remaining = new Set(after.map((floor) => floor.id))
  const index = before.findIndex((floor) => floor.id === removedId)

  for (let below = index - 1; below >= 0; below -= 1) {
    if (remaining.has(before[below].id)) return before[below].id
  }
  for (let above = index + 1; above < before.length; above += 1) {
    if (remaining.has(before[above].id)) return before[above].id
  }
  return after[0].id
}

export function setDraftFloorHeight(
  draft: FloorPlanDraft,
  floorId: Id,
  heightCm: number,
): FloorPlanDraft {
  if (!isFloorHeightValid(heightCm)) return draft

  const floor = draft.floors.find((candidate) => candidate.id === floorId)
  if (!floor || floor.heightCm === heightCm) return draft

  return {
    ...draft,
    floors: draft.floors.map((candidate) =>
      candidate.id === floorId ? { ...candidate, heightCm } : candidate,
    ),
  }
}

export function reorderDraftFloor(
  draft: FloorPlanDraft,
  floorId: Id,
  targetIndex: number,
): FloorPlanDraft {
  const floors = reorderFloorInList(draft.floors, floorId, targetIndex)
  if (floors === draft.floors) return draft

  return withRenumberedFloors(draft, floors)
}

/** Aktif kat yalnız TEK olabilir; rozet satır değiştirir (madde 8). */
export function setDraftActiveFloor(draft: FloorPlanDraft, floorId: Id): FloorPlanDraft {
  if (draft.activeFloorId === floorId) return draft
  if (!draft.floors.some((floor) => floor.id === floorId)) return draft

  return { ...draft, activeFloorId: floorId }
}

/**
 * Kopyalamayı TASLAĞA yazar (K166) — store'a değil. Uygula'ya kadar hiçbir şey
 * değişmez, dolayısıyla "İptal" kopyalamayı da geri alır ve Uygula tek Ctrl+Z
 * kalır. Eskiden kopyalama ayrı bir pencereden doğrudan store'a yazıyor, üstelik
 * açılırken bekleyen taslağı da sessizce uyguluyordu.
 *
 * Kaynak kat kendine hedef OLAMAZ; süzülür, hata verilmez.
 */
export function setDraftFloorCopies(
  draft: FloorPlanDraft,
  targetFloorIds: readonly Id[],
  copy: DraftFloorCopy,
): FloorPlanDraft {
  const targets = new Set(targetFloorIds)
  targets.delete(copy.sourceFloorId)
  if (targets.size === 0) return draft
  if (!draft.floors.some((floor) => floor.id === copy.sourceFloorId)) return draft

  return {
    ...draft,
    floors: draft.floors.map((floor) =>
      targets.has(floor.id) ? { ...floor, pendingCopy: { ...copy } } : floor,
    ),
  }
}

/**
 * Kata tip verir ya da kaldırır (K168). Kural ve adlandırma core/floors.ts'te;
 * taslak yalnız sonucu yazıyor.
 */
export function setDraftFloorType(
  draft: FloorPlanDraft,
  floorId: Id,
  type: FloorType | null,
): FloorPlanDraft {
  const index = draft.floors.findIndex((floor) => floor.id === floorId)
  if (index < 0) return draft

  const isNewMezzanine =
    type === 'mezzanine' && getFloorType(draft.floors[index]) !== 'mezzanine'

  if (!isNewMezzanine) {
    const floors = withFloorType(draft.floors, floorId, type)
    return floors === draft.floors ? draft : { ...draft, floors: [...floors] }
  }

  // ⚠️ Asma kat yapmak kat SAYISINI BİR ARTIRIR (kullanıcı kararı): dönüştürülen
  // kat çizimiyle birlikte kendini korur ve asma kata dönüşür, üstüne de onun
  // adını devralan YENİ boş bir kat girer. Yani "1. Kat"ı asma kat yapmak
  // "1. Kat"ı yok etmiyor, bir üste taşıyor; üstündeki katların adları hiç
  // değişmiyor (asma kat numara tüketmediği için).
  if (!canAddFloor(draft.floors)) return draft
  if (!canAssignFloorType(draft.floors, floorId, 'mezzanine')) return draft

  const added: DraftFloor = {
    id: takeDraftFloorId(draft.floors),
    // Ad boş bırakılıyor; `withFloorType` bütün listeyi baştan adlandırıyor.
    name: '',
    heightCm: draft.floors[index].heightCm,
    isBasement: false,
    pendingCopy: null,
  }

  const floors = [...draft.floors]
  floors.splice(index + 1, 0, added)
  return { ...draft, floors: [...withFloorType(floors, floorId, 'mezzanine')] }
}

/** Bekleyen kopyalamayı geri alır (satır menüsündeki "Kopyalamayı kaldır"). */
export function clearDraftFloorCopy(draft: FloorPlanDraft, floorId: Id): FloorPlanDraft {
  const floor = draft.floors.find((candidate) => candidate.id === floorId)
  if (!floor || floor.pendingCopy === null) return draft

  return {
    ...draft,
    floors: draft.floors.map((candidate) =>
      candidate.id === floorId ? { ...candidate, pendingCopy: null } : candidate,
    ),
  }
}

export function hasPendingCopies(draft: FloorPlanDraft): boolean {
  return draft.floors.some((floor) => floor.pendingCopy !== null)
}

/** Seçimi topluca yazar — satıra Shift ile tıklamada aralık buradan geçer. */
export function setDraftFloorSelection(
  draft: FloorPlanDraft,
  floorIds: readonly Id[],
): FloorPlanDraft {
  const existing = new Set(draft.floors.map((floor) => floor.id))
  const selectedFloorIds = [...new Set(floorIds)].filter((id) => existing.has(id))
  const isSame =
    selectedFloorIds.length === draft.selectedFloorIds.length &&
    selectedFloorIds.every((id) => draft.selectedFloorIds.includes(id))

  return isSame ? draft : { ...draft, selectedFloorIds }
}

/** Seçim işaretleri aktif kat değişiminden ETKİLENMEZ — ikisi bağımsız. */
export function toggleDraftFloorSelection(draft: FloorPlanDraft, floorId: Id): FloorPlanDraft {
  if (!draft.floors.some((floor) => floor.id === floorId)) return draft

  const isSelected = draft.selectedFloorIds.includes(floorId)
  return {
    ...draft,
    selectedFloorIds: isSelected
      ? draft.selectedFloorIds.filter((id) => id !== floorId)
      : [...draft.selectedFloorIds, floorId],
  }
}

export function clearDraftFloorSelection(draft: FloorPlanDraft): FloorPlanDraft {
  if (draft.selectedFloorIds.length === 0) return draft
  return { ...draft, selectedFloorIds: [] }
}

/** Seçili katlar, listedeki SIRAYLA — uyarı metinleri kullanıcının gördüğü sırayı izler. */
export function getSelectedDraftFloors(draft: FloorPlanDraft): DraftFloor[] {
  const selected = new Set(draft.selectedFloorIds)
  return draft.floors.filter((floor) => selected.has(floor.id))
}
