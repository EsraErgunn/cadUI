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
  /** Nesnenin yeni MERKEZİ: duvarın yüzüne yaslanmış hâli. */
  position: PlanPoint
  /** Yaslandığı duvarın açısı; yerleştirmede nesne buna döndürülür. */
  wallAngleDeg: number
  wallId: Wall['id']
}

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
 * İmleç bir duvarın yüzüne yakınsa nesnenin oraya YASLANMIŞ hâli, değilse
 * `undefined`.
 *
 * Nesne duvarın İÇİNE girmez, yüzüne DEĞER: merkez = duvar ekseni üzerindeki
 * izdüşüm + normal × (duvar yarı kalınlığı + nesnenin o yöndeki yarı kalınlığı).
 * Duvar boyunca serbest kayar (izdüşüm imleci izler), yalnız duvarın dışına
 * taşmaz — `projectOntoSegment` uçlara kelepçeliyor.
 *
 * ⚠️ Yakınlık, nesnenin KENARI ile duvarın YÜZÜ arasındaki boşlukla ölçülüyor
 * (merkez–eksen uzaklığıyla değil): yaslanmış bir kolonun merkezi zaten yüzden
 * yarım kolon kadar uzakta durur, merkezden ölçen bir mıknatıs ancak nesne
 * duvara gömülüyken tutardı.
 *
 * ⚠️ `isAlignedToWall` yalnız YERLEŞTİRMEDE açık: yeni nesne duvarın açısını
 * alır, dolayısıyla yaslanma payı da döndürülmüş hâline göre hesaplanmalı.
 * TAŞIMADA kapalı — taşıma jesti nesneyi sessizce DÖNDÜRMEMELİ (döndürmenin
 * kendi tutamacı var), o yüzden nesnenin mevcut açısı korunur ve pay ona göre
 * çıkar.
 *
 * ⚠️ Hangi duvarın seçileceği şekilden BAĞIMSIZ (yalnız imleç ↔ duvar
 * uzaklığı): şekil sadece yaslanma payını belirliyor.
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
    const offsetCm = wall.thickness / 2 + getHalfExtentAlongCm(snapped, normal)

    // Ölçülen şey nesnenin KENARI ile duvarın yüzü arasındaki boşluk. Merkezden
    // ölçülseydi mıknatıs ancak nesne duvara YARIYA KADAR GÖMÜLÜYKEN tutardı
    // (50 cm'lik kolonun merkezi, yaslanmış hâlde bile yüzden 25 cm uzakta).
    // Negatif boşluk = nesne duvarın içinde; o da yakalanır ve dışarı itilir.
    const gapCm = projection.distanceCm - offsetCm
    if (gapCm > toleranceCm || gapCm >= nearestDistanceCm) continue

    const sidePerpCm =
      (cursor.x - projection.point.x) * normal.x + (cursor.y - projection.point.y) * normal.y
    // İmleç tam eksenin üstündeyken taraf belirsiz; deterministik olsun diye +1.
    const side = Math.sign(sidePerpCm) || 1

    nearest = {
      position: {
        x: projection.point.x + normal.x * side * offsetCm,
        y: projection.point.y + normal.y * side * offsetCm,
      },
      wallAngleDeg,
      wallId: wall.id,
    }
    nearestDistanceCm = gapCm
  }

  return nearest
}
