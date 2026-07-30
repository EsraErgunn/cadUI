import {
  DEFAULT_FLOOR_ID,
  FIRST_FREE_ID,
  type Id,
  type Opening,
  type Point,
  type Wall,
} from '../core/model'

/**
 * Geçici mock sahne: duvar altyapısı (fay A) henüz hazır değil, açıklık aracının
 * üstüne yerleşeceği bir duvar gerekiyor. A'nın gerçek duvar action'ları gelince
 * bu dosya silinir — slice'ın alanları aynı kalır.
 *
 * Sahne bilinçli olarak şunları içerir: iki ucu da köşeye bağlı bir duvar (8),
 * farklı kalınlıkta iki dik duvar (9/10 → köşe payı iki uçta ayrı ayrı sınanır)
 * ve serbest bir çapraz duvar (11 → ertelenmiş yay vakası, bkz. knowledge/arc-walls.md).
 */
const WALL_HEIGHT_CM = 280

export const MOCK_POINTS: Point[] = [
  { id: 2, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
  { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
  { id: 4, floorId: DEFAULT_FLOOR_ID, x: 500, y: 400 },
  { id: 5, floorId: DEFAULT_FLOOR_ID, x: 0, y: 400 },
  { id: 6, floorId: DEFAULT_FLOOR_ID, x: 600, y: 0 },
  { id: 7, floorId: DEFAULT_FLOOR_ID, x: 900, y: 400 },
]

export const MOCK_WALLS: Wall[] = [
  // 500 cm yatay. Köşe payıyla yerleştirme aralığı [25, 470] olur.
  { id: 8, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: WALL_HEIGHT_CM },
  { id: 9, floorId: DEFAULT_FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 30, height: WALL_HEIGHT_CM },
  { id: 10, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 5, thickness: 25, height: WALL_HEIGHT_CM },
  // Çapraz (3-4-5, uzunluk tam 500): açıklık duvarın eksenini takip ediyor mu?
  { id: 11, floorId: DEFAULT_FLOOR_ID, p1Id: 6, p2Id: 7, thickness: 20, height: WALL_HEIGHT_CM },
]

export const MOCK_OPENINGS: Opening[] = [
  { id: 12, wallId: 8, offsetCm: 250, widthCm: 120, type: 'window' },
]

/**
 * nextUniqueId mock'tan TÜRETİLİR. Elle yazılırsa ilk addOpening var olan bir
 * id'yi ikinci kez üretir, hata vermez ve id aramaları sessizce şaşar.
 * Bkz. knowledge/id-scheme.md.
 */
export const MOCK_NEXT_FREE_ID: Id =
  Math.max(
    FIRST_FREE_ID - 1,
    ...MOCK_POINTS.map((point) => point.id),
    ...MOCK_WALLS.map((wall) => wall.id),
    ...MOCK_OPENINGS.map((opening) => opening.id),
  ) + 1
