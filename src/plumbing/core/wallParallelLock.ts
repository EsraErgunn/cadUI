import { findNearestWallParallel, getWallParallelPosition, type WallParallelCandidate } from './wallSnap'
import type { PlanPoint } from '../../core/coords'
import type { Id, Point, Wall } from '../../core/model'

export type WallParallelLock = {
  /**
   * Bir duvara AYAK UYDURULDUĞUNDA (hangi duvar + hangi anchor'da), bu adımın
   * SONUNA kadar o duvarın açısı YARIÇAPSIZ uygulanır — "boru bitse (duvarın
   * kendi uzunluğu tükense) bile aynı eksende düz çizmeye devam et, kullanıcı
   * durdurana kadar" (2026-08 ürün isteği). Yarıçaplı arama yalnız kilit YOKKEN
   * çalışır; kilitliyken duvarın ucundan ne kadar öteye geçilirse geçilsin
   * (eskiden `projectOntoSegment`in kelepçelenmiş mesafesi büyüyüp kilidi
   * kırıyordu) yön sabit kalır.
   *
   * Kilit yalnız İKİ yolla açılır: anchor değişir (yeni adım — zincirin
   * SONRAKİ köşesi farklı bir duvara yaklaşabilir, eskisiyle bir ilgisi yok)
   * ya da `reset()` çağrılır (araç değişimi/temizlik).
   */
  resolve(
    walls: readonly Wall[],
    points: readonly Point[],
    anchor: PlanPoint,
    cursor: PlanPoint,
    radiusCm: number,
  ): WallParallelCandidate | null
  reset(): void
}

export function createWallParallelLock(): WallParallelLock {
  let lock: { anchorKey: string; wallId: Id } | null = null

  return {
    resolve(walls, points, anchor, cursor, radiusCm) {
      // Kilit ÖNCEKİ adıma aitse (anchor değişti) artık anlamsız — yeni adımın
      // hangi duvara yaklaşacağıyla bir ilgisi yok.
      const anchorKey = `${anchor.x},${anchor.y}`
      if (lock !== null && lock.anchorKey !== anchorKey) lock = null

      if (lock !== null) {
        const lockedWall = walls.find((wall) => wall.id === lock?.wallId)
        const position = lockedWall
          ? getWallParallelPosition(lockedWall, points, anchor, cursor)
          : null
        if (lockedWall && position) return { wallId: lockedWall.id, position }
        lock = null
      }

      const found = findNearestWallParallel(walls, points, anchor, cursor, radiusCm)
      if (found) lock = { anchorKey, wallId: found.wallId }
      return found
    },

    reset() {
      lock = null
    },
  }
}
