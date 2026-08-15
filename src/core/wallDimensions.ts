import { normalizeZero, type PlanPoint } from './coords'
import type { Id, Point, Wall } from './model'
import { getSegmentAngleDeg, getSegmentLength, getSegmentMidpoint, getWallEnds } from './wall'

/** Bu boyun altındaki duvara ölçü yazılmaz: yazı duvardan uzun olurdu. */
const MIN_LABELED_LENGTH_CM = 1

/** Yazı bu açıların dışına çıkarsa 180° çevrilir — baş aşağı ölçü okunmaz. */
const READABLE_MAX_ANGLE_DEG = 90

export type WallDimensionAnnotation = {
  wallId: Id
  /** Etiketin duracağı plan noktası; duvar ekseninden dik kaydırılmış. */
  position: PlanPoint
  /** Yazının plan düzlemindeki dönüşü (derece), (-90, 90] aralığında. */
  angleDeg: number
  /** Ölçülen uzunluk = duvarın EKSEN boyu (p1→p2), cm. */
  lengthCm: number
}

export type WallDimensionOptions = {
  activeFloorId: Id
  /**
   * Yazı ile duvar YÜZÜ arasındaki boşluk (cm). Ekran-sabit bir aralık isteniyorsa
   * çağıran `px / zoom` verir; kalınlığın yarısını bu fonksiyon kendisi ekler,
   * çünkü kalınlığı bilen taraf burası.
   */
  gapCm: number
  /**
   * Verilirse YALNIZ bu duvarlara ölçü yazılır. Ölçü katmanı kapalıyken
   * sürüklenen duvarı geçici göstermek için: tüm plan yerine düzenlenen parça.
   */
  wallIds?: readonly Id[]
}

/**
 * Ölçü yazısı duvarın HANGİ yanına düşer? Yön normalleştirildikten SONRA (yazı
 * hep okunur yönde) eksenin sol normali alınır. Sıralama önemli: normalleştirme
 * önce geldiği için yan, duvarın geometrisinden çıkıyor, hangi ucun p1 olduğundan
 * değil — aynı duvar ters yönde çizilseydi ölçüsü öbür yana atlardı ve plan,
 * çizim sırasına göre farklı görünürdü.
 *
 * "Dışarısı" hesaplanmıyor: dış taraf ancak kapalı bir oda çevriminde tanımlı,
 * serbest duvarda tanımsız olurdu (bkz. K72).
 */
function getLeftNormal(from: PlanPoint, to: PlanPoint, lengthCm: number): PlanPoint {
  return { x: -(to.y - from.y) / lengthCm, y: (to.x - from.x) / lengthCm }
}

/**
 * Kat planındaki duvarların ölçü etiketleri. Uzunluk HER ZAMAN geometriden
 * hesaplanır; modelde `lengthCm` alanı yok — olsaydı köşe taşındığında bayatlardı
 * (tesisattaki `LengthLabels` ile aynı gerekçe).
 *
 * Noktalar çağırandan gelir, store'dan değil: sahne `useArchitecturePoints()`
 * ile sürüklenen köşenin GEÇİCİ konumunu veriyor, böylece ölçü sürükleme
 * boyunca canlı güncelleniyor ve bu dosya React'ten habersiz kalıyor.
 */
export function getWallDimensionAnnotations(
  walls: readonly Wall[],
  points: readonly Point[],
  options: WallDimensionOptions,
): WallDimensionAnnotation[] {
  const annotations: WallDimensionAnnotation[] = []

  for (const wall of walls) {
    if (wall.floorId !== options.activeFloorId) continue
    if (options.wallIds && !options.wallIds.includes(wall.id)) continue

    const ends = getWallEnds(wall, points)
    if (!ends) continue

    const lengthCm = getSegmentLength(ends.p1, ends.p2)
    if (lengthCm < MIN_LABELED_LENGTH_CM) continue

    // Yön normalleştirme: yazı baş aşağı düşecekse duvarı ters yönde okuruz.
    // Ölçü aynı sayı, yalnız yazının yönü ve düştüğü yan değişir.
    const rawAngleDeg = getSegmentAngleDeg(ends.p1, ends.p2)
    const isReadable = rawAngleDeg > -READABLE_MAX_ANGLE_DEG && rawAngleDeg <= READABLE_MAX_ANGLE_DEG
    const from = isReadable ? ends.p1 : ends.p2
    const to = isReadable ? ends.p2 : ends.p1

    const midpoint = getSegmentMidpoint(from, to)
    const normal = getLeftNormal(from, to, lengthCm)
    const offsetCm = wall.thickness / 2 + options.gapCm

    annotations.push({
      wallId: wall.id,
      position: {
        x: normalizeZero(midpoint.x + normal.x * offsetCm),
        y: normalizeZero(midpoint.y + normal.y * offsetCm),
      },
      angleDeg: getSegmentAngleDeg(from, to),
      lengthCm,
    })
  }

  return annotations
}
