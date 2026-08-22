import { getAreaObjectCorners, type AreaObjectShape } from './areaObject'
import type { PlanPoint } from './coords'
import type { AreaObjectType, Point, Wall } from './model'
import {
  getSegmentAngleDeg,
  getSegmentLength,
  getWallEnds,
  projectOntoSegment,
} from './wall'

/**
 * Duvara YAPIŞAN türler (kullanıcı seçti: "kolonlar ve baca şaftı duvarlara da
 * snaplenmeli"). Record olduğu için yeni bir tip eklenip burası unutulursa
 * DERLEME kırılır — `isVerticalAxisType` ile aynı gerekçe.
 *
 * Merdiven dışarıda: mahalin ortasında da durabiliyor ve yapışma onu istemediği
 * yere çekerdi. Kolon havalandırması da dışarıda: şaftın yanında duruyor,
 * duvarın değil.
 */
const WALL_SNAPPING_TYPES: Record<AreaObjectType, boolean> = {
  stairs: false,
  structuralColumn: true,
  flueShaft: true,
  columnVentilation: false,
}

export function hasAreaObjectWallSnap(type: AreaObjectType): boolean {
  return WALL_SNAPPING_TYPES[type]
}

export type AreaObjectWallSnap = {
  /** Nesnenin yeni MERKEZİ. */
  position: PlanPoint
  /** Yaslandığı duvarın açısı; yerleştirmede nesne buna döndürülür. */
  wallAngleDeg: number
  wallId: Wall['id']
  /** Hangi hizaya oturdu — arayüz/test okusun diye. */
  kind: AreaObjectWallSnapKind
}

/**
 * İki yaslanma hizası var; hangisi imlece daha yakınsa o kazanır.
 *
 * - `onWall`: nesne duvarın ÜSTÜNDE durur, dış kenarı duvarın KARŞI yüzüyle
 *   hizalanır — kullanıcının asıl istediği bu ("duvarın üstünde olacak şekilde
 *   duvarın kenarına snaplenmeli"). Kolon duvarı kaplar ve mahale taşar.
 * - `besideWall`: nesne duvarın DIŞINDA, yüzüne değerek durur.
 */
export type AreaObjectWallSnapKind = 'onWall' | 'besideWall'

/** Sıfır boy duvarın yönü tanımsız; yakalama adayı değildir. */
const MIN_WALL_LENGTH_FOR_SNAP_CM = 1e-6

/**
 * Nesnenin duvar NORMALİ yönündeki yarı kalınlığı — döndürülmüş nesnede
 * `lengthCm / 2` DEĞİLDİR.
 *
 * Köşeler normale izdüşürülüp en büyüğü alınıyor: 37° dönmüş bir kolon da
 * duvara tam yaslanır, köşesi duvarın içine girmez.
 */
function getHalfExtentAlongCm(shape: AreaObjectShape, normal: PlanPoint): number {
  const corners = getAreaObjectCorners(shape)
  let maxCm = 0

  for (const corner of corners) {
    const projectionCm = Math.abs(
      (corner.x - shape.x) * normal.x + (corner.y - shape.y) * normal.y,
    )
    maxCm = Math.max(maxCm, projectionCm)
  }

  return maxCm
}

/**
 * İmleç bir duvara değecek kadar yakınsa nesnenin oraya YASLANMIŞ hâli, değilse
 * `undefined`.
 *
 * İKİ hiza denenir, imlece yakın olan kazanır (bkz. `AreaObjectWallSnapKind`):
 * nesne ya duvarın ÜSTÜNDE durup dış kenarını duvarın KARŞI yüzüyle hizalar
 * (kullanıcının öncelediği: kolon duvarı kaplar ve mahale taşar), ya da duvarın
 * DIŞINDA kalıp yüzüne değer.
 *
 * Nesne duvar boyunca serbest kayar (izdüşüm imleci izler), yalnız duvarın
 * dışına taşmaz — `projectOntoSegment` uçlara kelepçeliyor.
 *
 * ⚠️ Yakalama YARIÇAPI nesnenin BOYUNU içerir: nesne duvara değebiliyorsa aday
 * sayılır. Yalnız merkez–eksen uzaklığına bakılsaydı 50 cm'lik bir kolon,
 * duvarın tam üstünde dururken bile toleransın dışında kalırdı.
 *
 * ⚠️ `isAlignedToWall` yalnız YERLEŞTİRMEDE açık: yeni nesne duvarın açısını
 * alır, dolayısıyla yaslanma payı da döndürülmüş hâline göre hesaplanmalı.
 * TAŞIMADA kapalı — taşıma jesti nesneyi sessizce DÖNDÜRMEMELİ (döndürmenin
 * kendi tutamacı var), o yüzden nesnenin mevcut açısı korunur ve pay ona göre
 * çıkar.
 *
 * ⚠️ Kazanan hiza, imlecin duvara olan dik uzaklığına EN YAKIN olanı; eşitlikte
 * `onWall` kazanır. Bu yüzden nesne duvara doğru sürüklenirken önce üstüne
 * oturur, uzaklaşınca yanına geçer.
 */
export function findAreaObjectWallSnap(
  shape: AreaObjectShape,
  cursor: PlanPoint,
  walls: readonly Wall[],
  points: readonly Point[],
  toleranceCm: number,
  isAlignedToWall: boolean,
): AreaObjectWallSnap | undefined {
  let nearest: AreaObjectWallSnap | undefined
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const wall of walls) {
    const ends = getWallEnds(wall, points)
    // Sıfır boy duvarın yönü tanımsız: normal hesaplanamaz, aday değil.
    if (!ends || getSegmentLength(ends.p1, ends.p2) < MIN_WALL_LENGTH_FOR_SNAP_CM) continue

    const projection = projectOntoSegment(ends.p1, ends.p2, cursor)
    const wallAngleDeg = getSegmentAngleDeg(ends.p1, ends.p2)
    const radians = (wallAngleDeg * Math.PI) / 180
    // Duvar yönünün dikeyi (birim): +x boyunca giden duvarın normali +y.
    const normal = { x: -Math.sin(radians), y: Math.cos(radians) }

    // Yerleştirmede nesne duvarın açısına dönecek; pay o hâlden ölçülüyor.
    const snapped = isAlignedToWall ? { ...shape, angleDeg: wallAngleDeg } : shape
    const halfExtentCm = getHalfExtentAlongCm(snapped, normal)
    const halfThicknessCm = wall.thickness / 2

    // Nesne duvara DEĞİYOR mu? Değmiyorsa aday bile değil: yarıçap, nesnenin
    // dış kenarının duvarın yüzüne uzanabildiği en uzak merkez konumu.
    if (projection.distanceCm > halfThicknessCm + halfExtentCm + toleranceCm) continue

    const sidePerpCm =
      (cursor.x - projection.point.x) * normal.x + (cursor.y - projection.point.y) * normal.y
    // İmleç tam eksenin üstündeyken taraf belirsiz; deterministik olsun diye +1.
    const side = Math.sign(sidePerpCm) || 1

    // İki hiza, ikisi de merkezin eksene UZAKLIĞI olarak:
    // - onWall: dış kenar KARŞI yüzde → merkez `yarıBoy − yarıKalınlık`
    // - besideWall: iç kenar YAKIN yüzde → merkez `yarıKalınlık + yarıBoy`
    const candidates: { kind: AreaObjectWallSnapKind; distanceCm: number }[] = [
      { kind: 'onWall', distanceCm: halfExtentCm - halfThicknessCm },
      { kind: 'besideWall', distanceCm: halfThicknessCm + halfExtentCm },
    ]

    for (const candidate of candidates) {
      const errorCm = Math.abs(projection.distanceCm - candidate.distanceCm)
      // Eşitlikte İLK aday (onWall) kazanır: kullanıcının asıl istediği o.
      if (errorCm >= nearestDistanceCm) continue

      nearest = {
        position: {
          x: projection.point.x + normal.x * side * candidate.distanceCm,
          y: projection.point.y + normal.y * side * candidate.distanceCm,
        },
        wallAngleDeg,
        wallId: wall.id,
        kind: candidate.kind,
      }
      nearestDistanceCm = errorCm
    }
  }

  return nearest
}

/**
 * Boyutlandırma için: sürüklenen KÖŞEYİ en yakın duvar YÜZÜNE oturtur.
 *
 * Yalnız DİK bileşen değişir — köşe duvar boyunca imleci izlemeye devam eder.
 * Köşe yüze oturunca `resizeAreaObjectFromCorner` kenarı zaten oraya taşıyor;
 * ayrı bir "kenarı hizala" matematiği yazılmadı.
 *
 * Duvarın İKİ yüzü de aday: kullanıcı kolonu duvarın üstünde büyütürken bazen
 * yakın, bazen karşı yüze dayanmak ister (`AreaObjectWallSnapKind`in
 * boyutlandırmadaki karşılığı).
 */
export function snapPointToWallFace(
  target: PlanPoint,
  walls: readonly Wall[],
  points: readonly Point[],
  toleranceCm: number,
): PlanPoint | undefined {
  let nearest: PlanPoint | undefined
  let nearestErrorCm = Number.POSITIVE_INFINITY

  for (const wall of walls) {
    const ends = getWallEnds(wall, points)
    if (!ends || getSegmentLength(ends.p1, ends.p2) < MIN_WALL_LENGTH_FOR_SNAP_CM) continue

    const projection = projectOntoSegment(ends.p1, ends.p2, target)
    const radians = (getSegmentAngleDeg(ends.p1, ends.p2) * Math.PI) / 180
    const normal = { x: -Math.sin(radians), y: Math.cos(radians) }
    const signedCm =
      (target.x - projection.point.x) * normal.x + (target.y - projection.point.y) * normal.y

    for (const faceCm of [wall.thickness / 2, -wall.thickness / 2]) {
      const errorCm = Math.abs(signedCm - faceCm)
      if (errorCm > toleranceCm || errorCm >= nearestErrorCm) continue

      nearest = {
        x: projection.point.x + normal.x * faceCm,
        y: projection.point.y + normal.y * faceCm,
      }
      nearestErrorCm = errorCm
    }
  }

  return nearest
}
