import { DEFAULT_FLOOR_ID, type Opening, type Point, type Wall } from '../../core/model'
import { deriveNextUniqueId } from '../architectureSlice'
import { useCadStore } from '../cadStore'

/**
 * Açıklık testlerinin sabit sahnesi. Store artık boş başlıyor (gerçek duvar
 * çizimi fay A'da), bu yüzden hazır bir sahne yalnız TEST verisidir — üretim
 * seed'i değildir.
 *
 * Bilinçli içerik: iki ucu da köşeye bağlı bir duvar (8), farklı kalınlıkta iki
 * dik duvar (9/10 → köşe payı iki uçta ayrı sınanır) ve serbest bir çapraz duvar
 * (11 → ertelenmiş yay vakası, bkz. knowledge/arc-walls.md).
 */
const WALL_HEIGHT_CM = 280

export const WALL_ID = 8
export const WINDOW_ID = 12

export const FIXTURE_POINTS: Point[] = [
  { id: 2, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
  { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
  { id: 4, floorId: DEFAULT_FLOOR_ID, x: 500, y: 400 },
  { id: 5, floorId: DEFAULT_FLOOR_ID, x: 0, y: 400 },
  { id: 6, floorId: DEFAULT_FLOOR_ID, x: 600, y: 0 },
  { id: 7, floorId: DEFAULT_FLOOR_ID, x: 900, y: 400 },
]

export const FIXTURE_WALLS: Wall[] = [
  // 500 cm yatay. Köşe payıyla yerleştirme aralığı [25, 470] olur.
  { id: WALL_ID, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: WALL_HEIGHT_CM },
  { id: 9, floorId: DEFAULT_FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 30, height: WALL_HEIGHT_CM },
  { id: 10, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 5, thickness: 25, height: WALL_HEIGHT_CM },
  // Çapraz (3-4-5, uzunluk tam 500): açıklık duvarın eksenini takip ediyor mu?
  { id: 11, floorId: DEFAULT_FLOOR_ID, p1Id: 6, p2Id: 7, thickness: 20, height: WALL_HEIGHT_CM },
]

export const FIXTURE_OPENINGS: Opening[] = [
  { id: WINDOW_ID, wallId: WALL_ID, offsetCm: 250, widthCm: 120, type: 'window' },
]

/** Üretimdeki kuralın aynısı: sayaç veriden türetilir, elle yazılmaz. */
export const FIXTURE_NEXT_FREE_ID = deriveNextUniqueId({
  points: FIXTURE_POINTS,
  walls: FIXTURE_WALLS,
  openings: FIXTURE_OPENINGS,
  rooms: [],
  symbols: [],
  areaObjects: [],
})

/** Her testin aynı sahneden başlaması için. beforeEach içinde çağrılır. */
export function resetArchitectureState(): void {
  useCadStore.setState({
    points: FIXTURE_POINTS,
    walls: FIXTURE_WALLS,
    openings: FIXTURE_OPENINGS,
    rooms: [],
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
    savedRevision: 0,
  })
}
