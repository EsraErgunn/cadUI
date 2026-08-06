import type { PlanPoint } from './coords'
import type {
  Id,
  Point,
  PointSymbol,
  PointSymbolType,
  SymbolAttachment,
  Wall,
} from './model'
import { getSegmentAngleDeg, getWallEnds } from './wall'
import { findWallUnderPoint, getWallFrameAtOffsetCm } from './wallPath'

/**
 * Aydınlatma referans formatta duvara BAĞLANMAZ (`x, y` ile serbest duruyor):
 * tavana takılıyor, duvar yüzeyine değil. Kalan altı sembol duvara bağlanabilir.
 */
export function canMountOnWall(type: PointSymbolType): boolean {
  return type !== 'lighting'
}

/** Sembolün katı: duvara bağlıysa DUVARINDAN türer, serbestse kendi alanından. */
export function getSymbolFloorId(
  symbol: PointSymbol,
  walls: readonly Wall[],
): Id | undefined {
  if (symbol.attachment === 'free') return symbol.floorId
  return walls.find((wall) => wall.id === symbol.wallId)?.floorId
}

export function isSymbolOnFloor(
  symbol: PointSymbol,
  floorId: Id,
  walls: readonly Wall[],
): boolean {
  return getSymbolFloorId(symbol, walls) === floorId
}

export function getSymbolsOnFloor(
  symbols: readonly PointSymbol[],
  floorId: Id,
  walls: readonly Wall[],
): PointSymbol[] {
  return symbols.filter((symbol) => isSymbolOnFloor(symbol, floorId, walls))
}

export type SymbolPose = {
  position: PlanPoint
  /** Çizim açısı; duvara bağlı sembolde duvarın açısıdır. */
  rotationDeg: number
  /**
   * Yerel +y'nin duvardan DIŞA mı içe mi baktığı. Çekme çizgisiyle çizilen
   * cihazlar (şalter, alarm, sensör) bu yöne uzar; hangi yüze monte edilmişse
   * işareti o tarafta durmalı, yoksa duvarın içine doğru çizilirdi.
   * Serbest sembolde anlamı yok, +1 verilir.
   */
  outwardSign: 1 | -1
  /**
   * Bağlı olduğu duvarın kalınlığı; serbest sembolde undefined.
   * Gömülü cihaz duvarın İÇİNE çizilirken bu sınıra göre yerleşir — menfez
   * duvarı baştan sona geçer, pano monte edildiği yüzden içeri doğru uzar.
   */
  wallThicknessCm: number | undefined
}

/**
 * Sembolün plandaki konumu ve açısı.
 *
 * Duvara bağlı sembol duvarın YÜZEYİNE oturur: eksenden kalınlığın yarısı kadar
 * normal boyunca kaydırılır, hangi yöne olduğunu `isMountedOnFarFace` söyler
 * (referanstaki `ccw`). Eksenin üstüne konsaydı duvarın içine gömülmüş görünürdü.
 *
 * Duvarı bulunamayan bağlı sembol için undefined döner — çağıran onu çizmez.
 * Bu durum kalıcı olmamalı: duvar silinince semboller de temizleniyor.
 */
export function getSymbolPose(
  symbol: PointSymbol,
  walls: readonly Wall[],
  points: readonly Point[],
): SymbolPose | undefined {
  if (symbol.attachment === 'free') {
    return {
      position: { x: symbol.x, y: symbol.y },
      rotationDeg: symbol.rotationDeg,
      outwardSign: 1,
      wallThicknessCm: undefined,
    }
  }

  const wall = walls.find((candidate) => candidate.id === symbol.wallId)
  if (!wall) return undefined

  const frame = getWallFrameAtOffsetCm(wall, points, symbol.offsetCm)
  const ends = getWallEnds(wall, points)
  if (!frame || !ends) return undefined

  const faceSign: 1 | -1 = symbol.isMountedOnFarFace ? 1 : -1
  const halfThicknessCm = wall.thickness / 2

  return {
    position: {
      x: frame.point.x + frame.normal.x * halfThicknessCm * faceSign,
      y: frame.point.y + frame.normal.y * halfThicknessCm * faceSign,
    },
    // Duvarın açısı; sembol duvarla birlikte döner, ayrıca saklanmaz.
    rotationDeg: getSegmentAngleDeg(ends.p1, ends.p2),
    outwardSign: faceSign,
    wallThicknessCm: wall.thickness,
  }
}

export type SymbolPlacementContext = {
  walls: readonly Wall[]
  points: readonly Point[]
  floorId: Id
  toleranceCm: number
}

/**
 * Bırakma noktası → bağlanma. Duvarın üstündeyse duvara bağlanır (referans
 * formatın modeli), değilse serbest kalır.
 *
 * Duvarı `findWallUnderPoint` seçer, `resolveSnap` DEĞİL: snap köşede `pointId`
 * dönüp `wallId` vermiyor ve ekran toleransı duvar kalınlığını bilmiyor — kapı
 * yerleştirmede alınan kararın aynısı (knowledge/opening-placement.md).
 *
 * Yüz, bırakma noktasının duvar ekseninin hangi tarafında kaldığından çıkar:
 * kullanıcı sembolü hangi yüze bıraktıysa oraya monte edilir.
 */
export function resolveSymbolAttachment(
  target: PlanPoint,
  type: PointSymbolType,
  context: SymbolPlacementContext,
): SymbolAttachment {
  const free: SymbolAttachment = {
    attachment: 'free',
    floorId: context.floorId,
    x: target.x,
    y: target.y,
    rotationDeg: 0,
  }

  if (!canMountOnWall(type)) return free

  const floorWalls = context.walls.filter((wall) => wall.floorId === context.floorId)
  const floorPoints = context.points.filter((point) => point.floorId === context.floorId)
  const hit = findWallUnderPoint(target, floorWalls, floorPoints, context.toleranceCm)
  if (!hit) return free

  const wall = floorWalls.find((candidate) => candidate.id === hit.wallId)
  if (!wall) return free

  const frame = getWallFrameAtOffsetCm(wall, floorPoints, hit.offsetCm)
  if (!frame) return free

  // Normal yönündeki işaret hangi yüz olduğunu söyler; sıfırda uzak yüz seçilir
  // (eksenin tam üstü, kullanıcı için ayırt edilemez bir sınır durumu).
  const toTarget = { x: target.x - frame.point.x, y: target.y - frame.point.y }
  const side = toTarget.x * frame.normal.x + toTarget.y * frame.normal.y

  return {
    attachment: 'wall',
    wallId: wall.id,
    offsetCm: hit.offsetCm,
    isMountedOnFarFace: side >= 0,
  }
}
