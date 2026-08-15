import { normalizeZero, type PlanPoint } from './coords'
import type { Id, Opening, Point, Wall } from './model'
import { getOpeningsOnWall, getOpeningSpan } from './opening'
import { getSegmentAngleDeg, getSegmentLength, getWallEnds } from './wall'

/** Bu boyun altındaki parçaya ölçü yazılmaz: yazı parçadan uzun olurdu. */
const MIN_LABELED_LENGTH_CM = 1

/** Yazı bu açıların dışına çıkarsa duvar ters yönde okunur — baş aşağı ölçü olmaz. */
const READABLE_MAX_ANGLE_DEG = 90

/**
 * Duvar parçası mı, açıklığın kendisi mi? Çağıran ikisini farklı renkte çiziyor:
 * aynı hizada yan yana duran sayıların hangisinin duvar hangisinin boşluk
 * olduğu, yalnız konumdan okunamazdı.
 */
export type WallDimensionKind = 'wall' | 'opening'

export type WallDimensionAnnotation = {
  /** React anahtarı: bir duvar artık BİRDEN ÇOK ölçü üretiyor, id tek başına yetmez. */
  key: string
  wallId: Id
  kind: WallDimensionKind
  /** Etiketin duracağı plan noktası; parçanın ortasından dik kaydırılmış. */
  position: PlanPoint
  /** Yazının plan düzlemindeki dönüşü (derece), (-90, 90] aralığında. */
  angleDeg: number
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

type DimensionPart = {
  kind: WallDimensionKind
  key: string
  /** p1 ucundan itibaren, cm. */
  startCm: number
  endCm: number
}

/**
 * Duvarı açıklıkların KESTİĞİ parçalara böler: kapı/pencere olan bir duvarda
 * kullanıcıyı ilgilendiren sayı duvarın toplam boyu değil, açıklığın iki
 * yanında kalan dolu parçalardır (imalatta ölçülen budur). Açıklığın kendi
 * genişliği de ayrı bir parça olarak çıkar — çağıran onu farklı renkte yazar.
 *
 * Açıklık modelde duvarı BÖLMÜYOR (tek parça duvarın üstünde bir delik,
 * knowledge/opening-placement.md); bölme yalnız burada, gösterim için yapılır.
 */
function getDimensionParts(
  wall: Wall,
  openings: readonly Opening[],
  wallLengthCm: number,
): DimensionPart[] {
  const spans = getOpeningsOnWall(wall.id, openings)
    .map((opening) => ({ opening, span: getOpeningSpan(opening) }))
    .sort((a, b) => a.span[0] - b.span[0])

  const parts: DimensionPart[] = []
  let cursorCm = 0

  for (const { opening, span } of spans) {
    // Kelepçe savunma amaçlı: duvar kısaldığında sığmayan açıklık siliniyor
    // (K16) ama silinme ile yeniden çizim arasındaki karede taşan span gelebilir.
    const startCm = Math.max(span[0], 0)
    const endCm = Math.min(span[1], wallLengthCm)
    if (endCm <= startCm) continue

    if (startCm - cursorCm >= MIN_LABELED_LENGTH_CM) {
      parts.push({
        kind: 'wall',
        key: `wall-${wall.id}-${parts.length}`,
        startCm: cursorCm,
        endCm: startCm,
      })
    }

    parts.push({ kind: 'opening', key: `opening-${opening.id}`, startCm, endCm })
    cursorCm = endCm
  }

  if (wallLengthCm - cursorCm >= MIN_LABELED_LENGTH_CM) {
    parts.push({
      kind: 'wall',
      key: `wall-${wall.id}-${parts.length}`,
      startCm: cursorCm,
      endCm: wallLengthCm,
    })
  }

  return parts
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
  openings: readonly Opening[],
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
    // Etiketin düştüğü yan bu normalleştirmeden SONRA seçildiği için duvarın
    // GEOMETRİSİNDEN çıkıyor, hangi ucun p1 olduğundan değil — sıra ters olsaydı
    // aynı duvar ters çizildiğinde ölçüleri öbür yana atlardı (K72).
    const rawAngleDeg = getSegmentAngleDeg(ends.p1, ends.p2)
    const isReadable = rawAngleDeg > -READABLE_MAX_ANGLE_DEG && rawAngleDeg <= READABLE_MAX_ANGLE_DEG
    const sign = isReadable ? 1 : -1

    // p1→p2 birim yönü: parça konumları offset (p1'den uzaklık) ile geliyor.
    const axis = { x: (ends.p2.x - ends.p1.x) / lengthCm, y: (ends.p2.y - ends.p1.y) / lengthCm }
    // Okunur yönün SOL normali. "Dışarısı" hesaplanmıyor: dış taraf ancak kapalı
    // bir oda çevriminde tanımlı, serbest duvarda tanımsız olurdu (K72).
    const normal = { x: sign * -axis.y, y: sign * axis.x }
    const offsetCm = wall.thickness / 2 + options.gapCm
    const angleDeg = isReadable ? rawAngleDeg : getSegmentAngleDeg(ends.p2, ends.p1)

    for (const part of getDimensionParts(wall, openings, lengthCm)) {
      const midCm = (part.startCm + part.endCm) / 2

      annotations.push({
        key: part.key,
        wallId: wall.id,
        kind: part.kind,
        position: {
          x: normalizeZero(ends.p1.x + axis.x * midCm + normal.x * offsetCm),
          y: normalizeZero(ends.p1.y + axis.y * midCm + normal.y * offsetCm),
        },
        angleDeg,
        lengthCm: part.endCm - part.startCm,
      })
    }
  }

  return annotations
}
