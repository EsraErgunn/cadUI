import {
  canAddBasement,
  canAddFloor,
  getFloorInsertIndex,
  getNextBasementName,
  getNextFloorName,
  isFloorHeightValid,
  isFloorNameTaken,
  isFloorNameValid,
  reorderFloorInList,
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
export type DraftFloor = Floor & {
  /**
   * Yalnız YENİ katlarda anlamlı: içeriği bu kattan kopyalanacak (madde 10,
   * "<Kat adı>'tan kopyalayarak"). `null` = boş kat. Kopyalama Uygula'da yapılır.
   */
  copyFromFloorId: Id | null
}

export type FloorPlanDraft = {
  floors: DraftFloor[]
  activeFloorId: Id
  /** "SEÇ" sütunu — toplu kopyalama/silme için; aktif kattan BAĞIMSIZ (madde 8). */
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
    floors: floors.map((floor) => ({ ...floor, copyFromFloorId: null })),
    activeFloorId,
    selectedFloorIds: [],
  }
}

export type AddDraftFloorInput = {
  isBasement?: boolean
  heightCm?: number
  /** Verilirse yeni kat, o katın çiziminin kopyasıyla gelir. */
  copyFromFloorId?: Id
}

/**
 * Reddedilen her işlem AYNI taslak nesnesini döndürür (yeni referans değil):
 * çağıran `===` ile "değişiklik olmadı"yı anlar ve pencereyi gereksizce
 * kirlenmiş saymaz — core/floors.ts'teki `moveFloorInList` ile aynı sözleşme.
 */
export function addDraftFloor(draft: FloorPlanDraft, input: AddDraftFloorInput = {}): FloorPlanDraft {
  const isBasement = input.isBasement ?? false
  if (isBasement ? !canAddBasement(draft.floors) : !canAddFloor(draft.floors)) return draft

  const heightCm = input.heightCm ?? DEFAULT_FLOOR_HEIGHT_CM
  if (!isFloorHeightValid(heightCm)) return draft

  const name = isBasement ? getNextBasementName(draft.floors) : getNextFloorName(draft.floors)
  if (isFloorNameTaken(draft.floors, name)) return draft

  const added: DraftFloor = {
    id: takeDraftFloorId(draft.floors),
    name,
    heightCm,
    isBasement,
    copyFromFloorId: input.copyFromFloorId ?? null,
  }

  const floors = [...draft.floors]
  floors.splice(getFloorInsertIndex(draft.floors, isBasement), 0, added)
  return { ...draft, floors }
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
    floors,
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

export function renameDraftFloor(draft: FloorPlanDraft, floorId: Id, name: string): FloorPlanDraft {
  const trimmed = name.trim()
  if (!isFloorNameValid(trimmed) || isFloorNameTaken(draft.floors, trimmed, floorId)) return draft

  const floor = draft.floors.find((candidate) => candidate.id === floorId)
  if (!floor || floor.name === trimmed) return draft

  return {
    ...draft,
    floors: draft.floors.map((candidate) =>
      candidate.id === floorId ? { ...candidate, name: trimmed } : candidate,
    ),
  }
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

  return { ...draft, floors: [...floors] }
}

/** Aktif kat yalnız TEK olabilir; rozet satır değiştirir (madde 8). */
export function setDraftActiveFloor(draft: FloorPlanDraft, floorId: Id): FloorPlanDraft {
  if (draft.activeFloorId === floorId) return draft
  if (!draft.floors.some((floor) => floor.id === floorId)) return draft

  return { ...draft, activeFloorId: floorId }
}

/** "SEÇ" işaretleri aktif kat değişiminden ETKİLENMEZ — iki sütun bağımsız. */
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
