import type { PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'
import { getWallEndsFrom, buildPointIndex } from './wall'

/**
 * Sürüklenen köşenin İKİ komşusundan geçen doğru — 180° yakalamasının hedefi
 * (K162).
 *
 * ⚠️ Yalnız köşede TAM İKİ duvar buluşuyorsa döner. Üç duvarlı bir köşede
 * "doğrusal" diye bir şey yok: hangi ikisinin hizalanacağı belirsiz olurdu ve
 * seçilen ikisi hizalanırken üçüncüsü rastgele bir açıya düşerdi. Duvarın
 * ucunda (tek duvar) da anlamsız — hizalanacak ikinci kol yok.
 *
 * Dönen doğru komşuların KENDİLERİNDEN geçer, sürüklenen köşeden değil: köşe
 * zaten bu doğrunun üstüne çekilmeye çalışılıyor.
 */
export function getCollinearGuide(
  pointId: Id | undefined,
  walls: readonly Wall[],
  points: readonly Point[],
  floorId: Id,
): { from: PlanPoint; to: PlanPoint } | undefined {
  if (pointId === undefined) return undefined

  const touching = walls.filter(
    (wall) => wall.floorId === floorId && (wall.p1Id === pointId || wall.p2Id === pointId),
  )
  if (touching.length !== 2) return undefined

  const pointIndex = buildPointIndex(points)
  const farPointOf = (wall: Wall): PlanPoint | undefined => {
    const ends = getWallEndsFrom(wall, pointIndex)
    if (!ends) return undefined
    return wall.p1Id === pointId ? ends.p2 : ends.p1
  }

  const from = farPointOf(touching[0])
  const to = farPointOf(touching[1])
  if (!from || !to) return undefined

  // İki komşu AYNI noktadaysa doğru tanımsız; sıfır boylu kılavuz yakalamayı
  // her yere yapıştırırdı.
  if (from.x === to.x && from.y === to.y) return undefined

  return { from, to }
}
