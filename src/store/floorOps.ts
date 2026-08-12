// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { pruneSymbolsInDraft } from './pointSymbolOps'
import { takeNextId } from './projectMeta'
import {
  canAddBasement,
  canAddFloor,
  getFloorIdAfterRemoval,
  getFloorInsertIndex,
  getNextBasementName,
  getNextFloorName,
  isFloorHeightValid,
  isFloorNameTaken,
  isFloorNameValid,
  moveFloorInList,
  reorderFloorInList,
  type FloorDirection,
} from '../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, type Id } from '../core/model'

export type AddFloorInput = {
  /** Verilmezse sıradaki "N. Kat" (bodrumda "Bodrum Kat") adı üretilir. */
  name?: string
  /** Bodrum en ALTA eklenir ve kendi tavanına (5) tabidir. */
  isBasement?: boolean
  /** Madde 3: "Yeni kat yüksekliği" alanından gelir, mevcut katlara dokunmaz. */
  heightCm?: number
}

export function appendFloor(draft: CadState, input: AddFloorInput): Id | undefined {
  const isBasement = input.isBasement ?? false
  if (isBasement ? !canAddBasement(draft.floors) : !canAddFloor(draft.floors)) return undefined

  const name =
    input.name?.trim() ??
    (isBasement ? getNextBasementName(draft.floors) : getNextFloorName(draft.floors))
  if (!isFloorNameValid(name) || isFloorNameTaken(draft.floors, name)) return undefined

  const heightCm = input.heightCm ?? DEFAULT_FLOOR_HEIGHT_CM
  if (!isFloorHeightValid(heightCm)) return undefined

  const id = takeNextId(draft)
  draft.floors.splice(getFloorInsertIndex(draft.floors, isBasement), 0, {
    id,
    name,
    heightCm,
    isBasement,
  })
  return id
}

/** Kot bu değerden TÜRETİLİR; sınır dışı yükseklik reddedilir, kırpılmaz. */
export function setFloorHeightInDraft(draft: CadState, floorId: Id, heightCm: number): boolean {
  if (!isFloorHeightValid(heightCm)) return false

  const floor = draft.floors.find((candidate) => candidate.id === floorId)
  if (!floor || floor.heightCm === heightCm) return false

  floor.heightCm = heightCm
  return true
}

export function reorderFloorInDraft(draft: CadState, floorId: Id, targetIndex: number): boolean {
  const reordered = reorderFloorInList(draft.floors, floorId, targetIndex)
  if (reordered === draft.floors) return false

  draft.floors = [...reordered]
  return true
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

  removeFloorContentInDraft(draft, floorId)
  draft.floors.splice(index, 1)

  if (draft.activeFloorId === floorId) draft.activeFloorId = nextActiveFloorId
  return true
}

/**
 * Katın MİMARİ çizimini siler. Tür bazlı ayrım kat kopyalamanın "üzerine yaz"
 * kipi için şart: yalnız mimari kopyalanırken hedefteki tesisata dokunulmaz
 * (madde 18, "aynı türden çizim silinip").
 */
export function removeFloorArchitectureInDraft(draft: CadState, floorId: Id): void {
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
  // Serbest sembol katını kendi taşır; duvara bağlı olan duvarıyla düşer
  // (pruneSymbolsInDraft, duvarlar yukarıda silindikten SONRA çalışır).
  draft.symbols = draft.symbols.filter(
    (symbol) => symbol.attachment !== 'free' || symbol.floorId !== floorId,
  )
  pruneSymbolsInDraft(draft)
  // Alan nesnesi her zaman serbest, floorId'yi kendi taşır (sembolün free dalıyla aynı gerekçe).
  // Mimari tarafta: merdiven/kolon/baca şaftı çizimin yapısal parçası, tesisat değil.
  draft.areaObjects = draft.areaObjects.filter((areaObject) => areaObject.floorId !== floorId)
  // Kiriş de kat taşır ve mimarinin parçası — alan nesnesiyle aynı gerekçe.
  draft.beams = draft.beams.filter((beam) => beam.floorId !== floorId)
}

/** Katın TESİSAT çizimini siler. Gerekçesi için bkz. removeFloorArchitectureInDraft. */
export function removeFloorInstallationInDraft(draft: CadState, floorId: Id): void {
  // Bağlantı kaydı silinen hattı ve elemanı referansla tuttuğu için ONLARDAN
  // ÖNCE toplanır; ters sırada hangi kayıtların sahipsiz kaldığı anlaşılamazdı
  // (açıklık–duvar sırasıyla aynı gerekçe).
  const removedElementIds = new Set(
    draft.installationElements
      .filter((element) => element.floorId === floorId)
      .map((element) => element.id),
  )
  const removedLineIds = new Set(
    draft.installationLines.filter((line) => line.floorId === floorId).map((line) => line.id),
  )
  draft.installationConnections = draft.installationConnections.filter(
    (connection) =>
      !removedLineIds.has(connection.lineId) &&
      (connection.target.kind !== 'port' || !removedElementIds.has(connection.target.elementId)),
  )
  draft.installationElements = draft.installationElements.filter(
    (element) => element.floorId !== floorId,
  )
  draft.installationLines = draft.installationLines.filter((line) => line.floorId !== floorId)
}

/**
 * Katın ÇİZİMİNİ siler, kat kaydının kendisine dokunmaz. Kat yapısının toplu
 * uygulanmasında (applyFloorPlan) kat listesi baştan kurulduğu için buradan
 * ayrıldı — iki yol tek temizlik mantığını paylaşır, biri unutulup sahipsiz
 * duvar bırakamaz.
 */
export function removeFloorContentInDraft(draft: CadState, floorId: Id): void {
  removeFloorArchitectureInDraft(draft, floorId)
  removeFloorInstallationInDraft(draft, floorId)
}

