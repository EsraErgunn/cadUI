import type { Floor, Id } from './model'

/**
 * Kat sırası dizinin KENDİSİDİR, ayrı bir `order` alanı yoktur: iki yerde tutulan
 * sıra zamanla ayrışır ve JSON'a fazladan alan girer. Dizinin başı en ALT kat,
 * indeks arttıkça yukarı çıkılır — "alt kat gölgesi" bu yüzden index-1'dir.
 */
export const LOWEST_FLOOR_INDEX = 0

/** Proje en az bir kat taşır: son kat silinirse çizilecek yüzey kalmaz. */
export const MIN_FLOOR_COUNT = 1

export type FloorDirection = 'up' | 'down'

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

/** Yeni katın dizideki yeri: her zaman en üst. Bina yukarı doğru büyür. */
export function getFloorInsertIndex(floors: readonly Floor[]): number {
  return floors.length
}

const ORDINAL_FLOOR_NAME_PATTERN = /^(\d+)\. Kat$/

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
 * Katı bir sıra yukarı/aşağı taşır. Sınırdaysa AYNI diziyi döndürür (yeni referans
 * değil): çağıran `===` ile "değişiklik olmadı"yı anlar ve boş bir geri alma adımı
 * üretmez.
 */
export function moveFloorInList(
  floors: readonly Floor[],
  floorId: Id,
  direction: FloorDirection,
): readonly Floor[] {
  const index = getFloorIndex(floors, floorId)
  if (index < 0) return floors

  const targetIndex = direction === 'up' ? index + 1 : index - 1
  if (targetIndex < 0 || targetIndex >= floors.length) return floors

  const reordered = [...floors]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(targetIndex, 0, moved)
  return reordered
}
