import { FIRST_FREE_ID, type Id, type ProjectData } from '../core/model'

/**
 * Store'un şekli = kaydedilecek JSON'un şekli (CLAUDE.md kural 4). Pick ile
 * bağlandı: ProjectData'dan sapma DERLEME hatası olur, sessiz ayrışma olmaz.
 */
export type ArchitectureData = Pick<
  ProjectData,
  'points' | 'walls' | 'openings' | 'rooms' | 'symbols' | 'areaObjects'
>

export const INITIAL_ARCHITECTURE_DATA: ArchitectureData = {
  points: [],
  walls: [],
  openings: [],
  rooms: [],
  symbols: [],
  areaObjects: [],
}

/**
 * nextUniqueId veriden TÜRETİLİR, sabit yazılmaz: başlangıç verisi bir gün boş
 * olmazsa (örnek proje, şablon) sabit sayaç var olan bir id'yi ikinci kez üretir
 * ve HATA VERMEZ — id aramaları sessizce şaşar. Bkz. knowledge/id-scheme.md.
 *
 * Yeni bir kalıcı dizi eklendiğinde BURAYA da eklenir; unutulursa o dizideki en
 * yüksek id bir kez daha üretilir ve çakışma sessiz kalır.
 */
export function deriveNextUniqueId(data: ArchitectureData): Id {
  return (
    Math.max(
      FIRST_FREE_ID - 1,
      ...data.points.map((point) => point.id),
      ...data.walls.map((wall) => wall.id),
      ...data.openings.map((opening) => opening.id),
      ...data.rooms.map((room) => room.id),
      ...data.symbols.map((symbol) => symbol.id),
      ...data.areaObjects.map((areaObject) => areaObject.id),
    ) + 1
  )
}
