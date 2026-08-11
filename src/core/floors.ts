import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from './model'
import type { Floor, Id } from './model'

/**
 * Kat sırası dizinin KENDİSİDİR, ayrı bir `order` alanı yoktur: iki yerde tutulan
 * sıra zamanla ayrışır ve JSON'a fazladan alan girer. Dizinin başı en ALT kat,
 * indeks arttıkça yukarı çıkılır — "alt kat gölgesi" bu yüzden index-1'dir.
 */
export const LOWEST_FLOOR_INDEX = 0

/** Proje en az bir kat taşır: son kat silinirse çizilecek yüzey kalmaz. */
export const MIN_FLOOR_COUNT = 1

/** Madde 10: tavan bodrumları DA kapsar, bodrum için ayrıca kendi tavanı var. */
export const MAX_FLOOR_COUNT = 40
export const MAX_BASEMENT_COUNT = 5

/** Madde 3/6: hem satırdaki yükseklik hem "yeni kat yüksekliği" aynı sınırlara tabi. */
export const MIN_FLOOR_HEIGHT_CM = 200
export const MAX_FLOOR_HEIGHT_CM = 600

export type FloorDirection = 'up' | 'down'

/** Proje açılışındaki tek kat. Üç yerde ayrı ayrı yazılırsa alan ekledikçe ayrışır. */
export function createGroundFloor(): Floor {
  return {
    id: DEFAULT_FLOOR_ID,
    name: DEFAULT_FLOOR_NAME,
    heightCm: DEFAULT_FLOOR_HEIGHT_CM,
    isBasement: false,
  }
}

export function getBasementCount(floors: readonly Floor[]): number {
  return floors.reduce((count, floor) => (floor.isBasement ? count + 1 : count), 0)
}

export function isFloorHeightValid(heightCm: number): boolean {
  return (
    Number.isFinite(heightCm) &&
    heightCm >= MIN_FLOOR_HEIGHT_CM &&
    heightCm <= MAX_FLOOR_HEIGHT_CM
  )
}

export function canAddFloor(floors: readonly Floor[]): boolean {
  return floors.length < MAX_FLOOR_COUNT
}

/** Bodrum iki tavana birden tabi: proje geneli (40) ve bodruma özel (5). */
export function canAddBasement(floors: readonly Floor[]): boolean {
  return canAddFloor(floors) && getBasementCount(floors) < MAX_BASEMENT_COUNT
}

export function getFloorIndex(floors: readonly Floor[], floorId: Id): number {
  return floors.findIndex((floor) => floor.id === floorId)
}

export function getFloorById(floors: readonly Floor[], floorId: Id): Floor | undefined {
  return floors.find((floor) => floor.id === floorId)
}

/** Hizalama referansı olarak gösterilen alt kat. En alttaki katın altı yoktur. */
export function getFloorBelowId(floors: readonly Floor[], floorId: Id): Id | undefined {
  const index = getFloorIndex(floors, floorId)
  if (index <= LOWEST_FLOOR_INDEX) return undefined
  return floors[index - 1].id
}

export function canRemoveFloor(floors: readonly Floor[]): boolean {
  return floors.length > MIN_FLOOR_COUNT
}

/**
 * Silinen kat aktifken hangi kat aktif olur: önce altındaki, o yoksa üstündeki.
 * Aşağı düşmek yukarı zıplamaktan az şaşırtıyor — kullanıcı bina içinde bir kat
 * inmiş olur.
 */
export function getFloorIdAfterRemoval(floors: readonly Floor[], removedId: Id): Id | undefined {
  const index = getFloorIndex(floors, removedId)
  if (index < 0) return undefined

  const below = floors[index - 1]
  const above = floors[index + 1]
  return below?.id ?? above?.id
}

/**
 * Yeni katın dizideki yeri: normal kat en üste (dizinin sonu), bodrum en alta
 * (dizinin başı). Bina yukarı doğru büyür, bodrum aşağı doğru kazılır.
 */
export function getFloorInsertIndex(floors: readonly Floor[], isBasement = false): number {
  return isBasement ? LOWEST_FLOOR_INDEX : floors.length
}

const ORDINAL_FLOOR_NAME_PATTERN = /^(\d+)\. Kat$/
const ORDINAL_BASEMENT_NAME_PATTERN = /^(\d+)\. Bodrum Kat$/
const FIRST_BASEMENT_NAME = 'Bodrum Kat'

/**
 * Yeni kat adı: var olan en yüksek "N. Kat" numarasının bir fazlası. Kat sayısına
 * bakılmaz — zemin ve bodrum katları da dizide olduğu için sayı hemen kayardı.
 * Kullanıcı adı zaten değiştirebilir; bu yalnız makul bir başlangıç.
 */
export function getNextFloorName(floors: readonly Floor[]): string {
  let highest = 0
  for (const floor of floors) {
    const match = ORDINAL_FLOOR_NAME_PATTERN.exec(floor.name.trim())
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return `${highest + 1}. Kat`
}

/**
 * İlk bodrum sade "Bodrum Kat"; ikincisinden itibaren numaralanır. Tek bodrumlu
 * binada "1. Bodrum Kat" demek gereksiz bir numara okutur.
 */
export function getNextBasementName(floors: readonly Floor[]): string {
  const hasFirst = floors.some((floor) => floor.name.trim() === FIRST_BASEMENT_NAME)
  if (!hasFirst) return FIRST_BASEMENT_NAME

  let highest = 1
  for (const floor of floors) {
    const match = ORDINAL_BASEMENT_NAME_PATTERN.exec(floor.name.trim())
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return `${highest + 1}. ${FIRST_BASEMENT_NAME}`
}

/**
 * Ad çakışması: kat adı kullanıcının katları ayırt etme yolu, aynı ad iki katta
 * durum çubuğunu okunamaz yapar. Türkçe büyük/küçük harf tuzağına girmemek için
 * karşılaştırma yalnız boşluk kırpar — bkz. knowledge/turkish-collation.md.
 */
export function isFloorNameTaken(
  floors: readonly Floor[],
  name: string,
  exceptFloorId?: Id,
): boolean {
  const trimmed = name.trim()
  return floors.some((floor) => floor.id !== exceptFloorId && floor.name.trim() === trimmed)
}

export function isFloorNameValid(name: string): boolean {
  return name.trim().length > 0
}

/**
 * Bodrumlar dizinin başında, normal katlar arkasında — bu ayrım kotun işaretini
 * belirlediği için sıralama onu BOZAMAZ (madde 9: "bodrum katlar zemin katın
 * üzerine taşınamaz"). Kısıtı taşıma yönüne değil sonuç dizisine bakarak
 * denetliyoruz: sürükle-bırak katı herhangi bir indekse atabiliyor, yön bazlı
 * kontrol yalnız komşu takasını yakalardı.
 */
function isFloorOrderValid(floors: readonly Floor[]): boolean {
  let hasSeenNonBasement = false
  for (const floor of floors) {
    if (floor.isBasement && hasSeenNonBasement) return false
    if (!floor.isBasement) hasSeenNonBasement = true
  }
  return true
}

/**
 * Katı verilen indekse taşır. Sıra değişmiyorsa ya da bodrum/normal ayrımını
 * bozuyorsa AYNI diziyi döndürür (yeni referans değil): çağıran `===` ile
 * "değişiklik olmadı"yı anlar ve boş bir geri alma adımı üretmez.
 */
export function reorderFloorInList<T extends Floor>(
  floors: readonly T[],
  floorId: Id,
  targetIndex: number,
): readonly T[] {
  const index = getFloorIndex(floors, floorId)
  if (index < 0 || index === targetIndex) return floors
  if (targetIndex < 0 || targetIndex >= floors.length) return floors

  const reordered = [...floors]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(targetIndex, 0, moved)
  return isFloorOrderValid(reordered) ? reordered : floors
}

/**
 * Bir üstteki / bir alttaki kat (madde 20: "Üst Kata Geç", Page Up/Down). Uçta
 * undefined döner — döngüsel geçiş YOK: en üst kattayken Page Up ile bodruma
 * düşmek kullanıcının bina içindeki yerini kaybettirir.
 */
export function getFloorIdInDirection(
  floors: readonly Floor[],
  floorId: Id,
  direction: FloorDirection,
): Id | undefined {
  const index = getFloorIndex(floors, floorId)
  if (index < 0) return undefined

  return floors[direction === 'up' ? index + 1 : index - 1]?.id
}

/** Bir sıra yukarı/aşağı — klavyeyle sıralama. Kısıtlar reorder ile ortak. */
export function moveFloorInList<T extends Floor>(
  floors: readonly T[],
  floorId: Id,
  direction: FloorDirection,
): readonly T[] {
  const index = getFloorIndex(floors, floorId)
  if (index < 0) return floors

  return reorderFloorInList(floors, floorId, direction === 'up' ? index + 1 : index - 1)
}
