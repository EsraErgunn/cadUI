// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { takeNextId } from './projectMeta'
import {
  getFloorIdAfterRemoval,
  getFloorInsertIndex,
  getNextFloorName,
  isFloorNameTaken,
  isFloorNameValid,
  moveFloorInList,
  type FloorDirection,
} from '../core/floors'
import type { Id } from '../core/model'

export type AddFloorInput = {
  /** Verilmezse sıradaki "N. Kat" adı üretilir. */
  name?: string
}

export function appendFloor(draft: CadState, input: AddFloorInput): Id | undefined {
  const name = input.name?.trim() ?? getNextFloorName(draft.floors)
  if (!isFloorNameValid(name) || isFloorNameTaken(draft.floors, name)) return undefined

  const id = takeNextId(draft)
  draft.floors.splice(getFloorInsertIndex(draft.floors), 0, { id, name })
  return id
}

export function renameFloorInDraft(draft: CadState, floorId: Id, name: string): boolean {
  const trimmed = name.trim()
  if (!isFloorNameValid(trimmed) || isFloorNameTaken(draft.floors, trimmed, floorId)) return false

  const floor = draft.floors.find((candidate) => candidate.id === floorId)
  if (!floor || floor.name === trimmed) return false

  floor.name = trimmed
  return true
}

export function moveFloorInDraft(
  draft: CadState,
  floorId: Id,
  direction: FloorDirection,
): boolean {
  const reordered = moveFloorInList(draft.floors, floorId, direction)
  // Saf fonksiyon sınırda AYNI diziyi döndürür; referans eşitliği "değişmedi" demek.
  if (reordered === draft.floors) return false

  draft.floors = [...reordered]
  return true
}

/**
 * Katın çizimi de silinir (KK-15). Silme sırası önemli: açıklık duvardan, duvar
 * noktadan türediği için önce açıklıklar toplanır, sonra duvarlar, en sonda
 * noktalar — ters sırada duvar silinince açıklığın hangi kata ait olduğu
 * anlaşılamaz (Opening floorId TAŞIMAZ, K9).
 *
 * Tesisat elemanları da bu katta duruyor ve onların temizliği burada yapılır:
 * kendi slice'ında bırakılsaydı kat silme iki ayrı action olur, tek Ctrl+Z ile
 * geri alınamazdı.
 */
export function removeFloorFromDraft(draft: CadState, floorId: Id): boolean {
  const index = draft.floors.findIndex((floor) => floor.id === floorId)
  if (index < 0) return false

  const nextActiveFloorId = getFloorIdAfterRemoval(draft.floors, floorId)
  // Son kat: silinirse çizilecek yüzey kalmaz.
  if (nextActiveFloorId === undefined) return false

  const removedWallIds = new Set(
    draft.walls.filter((wall) => wall.floorId === floorId).map((wall) => wall.id),
  )

  draft.openings = draft.openings.filter((opening) => !removedWallIds.has(opening.wallId))
  // Oda floorId TAŞIMAZ; kimliği duvar id kümesidir (K31). Katı silinen odanın
  // duvarları gidiyor, kayıt kalırsa sahipsiz wallId'li hayalet oda oluşur ve
  // kaydedilen JSON'a yazılmaya devam eder.
  draft.rooms = draft.rooms.filter(
    (room) => !room.wallIds.some((wallId) => removedWallIds.has(wallId)),
  )
  draft.walls = draft.walls.filter((wall) => wall.floorId !== floorId)
  draft.points = draft.points.filter((point) => point.floorId !== floorId)
  draft.symbols = draft.symbols.filter((symbol) => symbol.floorId !== floorId)
  draft.installationElements = draft.installationElements.filter(
    (element) => element.floorId !== floorId,
  )
  draft.floors.splice(index, 1)

  if (draft.activeFloorId === floorId) draft.activeFloorId = nextActiveFloorId
  return true
}
