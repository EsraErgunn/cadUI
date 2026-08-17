import { normalizeZero, type PlanPoint } from './coords'
import type { Id, Opening, Point, Wall } from './model'
import { getOpeningsOnWall, getOpeningSpan } from './opening'
import { findRoomFaces } from './room'
import { getRoomLabelAnchor } from './roomLabel'
import {
  buildPointIndex,
  getNeighbourThicknessCm,
  getSegmentAngleDeg,
  getSegmentLength,
  getWallEndsFrom,
} from './wall'

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
  /** Yazının plan düzlemindeki dönüşü (derece), (-90, 90] aralığında. */
  angleDeg: number
  /**
   * İÇTEN ölçü: köşedeki dik duvarların kütlesi düşülmüş, yani odanın içinde
   * kalan net açıklık. Açıklık parçasında genişliğin kendisi.
   */
  innerLengthCm: number
  /** İç ölçünün yazılacağı nokta: duvarın ODA tarafı (K75). */
  innerPosition: PlanPoint
  /**
   * DIŞTAN ölçü: köşedeki dik duvarların dış yüzünden dış yüzüne. Serbest uçta
   * (komşusu olmayan) ikisi eşit çıkar ve çağıran tek sayı yazar.
   */
  outerLengthCm: number
  /** Dış ölçünün yazılacağı nokta: duvarın oda tarafının KARŞISI. */
  outerPosition: PlanPoint
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
   * Verilirse duvar PARÇALARININ ölçüsü yalnız bu duvarlara yazılır. Duvar
   * ölçüleri kapalıyken sürüklenen duvarı geçici göstermek için: tüm plan
   * yerine düzenlenen parça. Açıklık ölçülerini KISITLAMAZ — onların
   * görünürlüğü `isOpeningVisible`a bağlı ve bu ikisi bağımsız (K76).
   */
  wallIds?: readonly Id[]
  /** Duvar parçalarının ölçüsü yazılsın mı (Görünüm ▸ Ölçüler). */
  isWallVisible?: boolean
  /**
   * Duvar id'si → o duvarın ODA tarafında kalan bir nokta
   * (`buildWallInteriorPoints`). Eksik olan duvarda (hiçbir çevrime girmeyen
   * serbest duvar) iç taraf tanımsızdır; etiket geometrik sol normale düşer.
   */
  interiorPoints?: ReadonlyMap<Id, PlanPoint>
  /** Kapı/pencere genişlikleri yazılsın mı (Görünüm ▸ Kapı/pencere ölçüleri). */
  isOpeningVisible?: boolean
}

/**
 * Duvar id'si → o duvarın ODA tarafında kalan bir nokta. İç ölçünün odanın
 * içine, dış ölçünün dışına yazılabilmesi için gereken TEK bilgi bu (K75).
 *
 * Nokta çevrimin en ferah yeri (`getRoomLabelAnchor`), ağırlık merkezi DEĞİL:
 * içbükey odada ağırlık merkezi poligonun dışına düşebiliyor ve o zaman iç/dış
 * ters çevrilirdi.
 *
 * Bir duvar iki odayı ayırıyorsa (iç bölme) İLK çevrim kazanır: iki tarafı da
 * "içerisi" olan bir duvarda "dışarısı" zaten yok, sayıların karşılıklı iki
 * yana düşmesi yeterli.
 *
 * Sonuç çağıranda önbelleğe alınmalı: çevrim arama duvar/nokta değişmedikçe
 * aynı sonucu verir, her karede yeniden koşturmanın anlamı yok.
 */
export function buildWallInteriorPoints(
  walls: readonly Wall[],
  points: readonly Point[],
  floorId: Id,
): Map<Id, PlanPoint> {
  const interiorPoints = new Map<Id, PlanPoint>()

  for (const face of findRoomFaces(walls, points, floorId)) {
    const anchor = getRoomLabelAnchor(face.corners)
    for (const wallId of face.wallIds) {
      if (!interiorPoints.has(wallId)) interiorPoints.set(wallId, anchor)
    }
  }

  return interiorPoints
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
  // Duvar döngüsü uç çözüyor; havuzu duvar başına taramak O(N·P) ederdi.
  const pointIndex = buildPointIndex(points)

  for (const wall of walls) {
    if (wall.floorId !== options.activeFloorId) continue

    // İki tür bağımsız açılıp kapanıyor; bu duvardan hiçbir şey çıkmayacaksa
    // geometriyi hiç hesaplama.
    const isWallPartVisible =
      options.isWallVisible !== false && (!options.wallIds || options.wallIds.includes(wall.id))
    if (!isWallPartVisible && options.isOpeningVisible === false) continue

    const ends = getWallEndsFrom(wall, pointIndex)
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
    // Okunur yönün sol normali. Oda tarafı biliniyorsa bu normal ODAYA BAKACAK
    // şekilde çevrilir (K75): iç ölçü odanın içine, dış ölçü karşı yana yazılır.
    // Çevrim yoksa (serbest duvar) "içerisi" tanımsız, sol normal olduğu gibi
    // kalır — iki sayı yine karşılıklı iki yana düşer, yalnız hangisinin oda
    // tarafı olduğu iddia edilmez.
    const leftNormal = { x: sign * -axis.y, y: sign * axis.x }
    const wallMidpoint = {
      x: (ends.p1.x + ends.p2.x) / 2,
      y: (ends.p1.y + ends.p2.y) / 2,
    }
    const interiorPoint = options.interiorPoints?.get(wall.id)
    const isLeftInterior =
      !interiorPoint ||
      (interiorPoint.x - wallMidpoint.x) * leftNormal.x +
        (interiorPoint.y - wallMidpoint.y) * leftNormal.y >
        0
    const innerNormal = isLeftInterior ? leftNormal : { x: -leftNormal.x, y: -leftNormal.y }
    const offsetCm = wall.thickness / 2 + options.gapCm
    const angleDeg = isReadable ? rawAngleDeg : getSegmentAngleDeg(ends.p2, ends.p1)

    // Köşedeki dik duvarın ekseni köşe noktasında duruyor, yani kütlesi bu
    // duvarın boyunu iki yönde de kalınlığının YARISI kadar etkiliyor: içeride
    // o kadarını yer, dışarıda o kadar uzatır. Açıklığın köşe payı (K11) aynı
    // komşuyu TAM kalınlıkla sayar — o bilinçli olarak temkinli bir paydır,
    // buradaki ise gerçek geometri.
    const p1TrimCm = getNeighbourThicknessCm(wall, wall.p1Id, walls) / 2
    const p2TrimCm = getNeighbourThicknessCm(wall, wall.p2Id, walls) / 2

    for (const part of getDimensionParts(wall, openings, lengthCm)) {
      if (part.kind === 'opening' && options.isOpeningVisible === false) continue
      if (part.kind === 'wall' && !isWallPartVisible) continue

      const midCm = (part.startCm + part.endCm) / 2
      const partLengthCm = part.endCm - part.startCm
      const anchor = { x: ends.p1.x + axis.x * midCm, y: ends.p1.y + axis.y * midCm }
      // Köşe payı yalnız duvarın UCUNA dayanan parçayı ilgilendirir: iki
      // açıklık arasında kalan parçanın komşusu yok, iç ve dış ölçüsü aynıdır.
      const trimCm =
        part.kind === 'opening'
          ? 0
          : (part.startCm === 0 ? p1TrimCm : 0) + (part.endCm === lengthCm ? p2TrimCm : 0)

      annotations.push({
        key: part.key,
        wallId: wall.id,
        kind: part.kind,
        angleDeg,
        // İçten ölçü sıfıra düşebilir (iki kalın duvar arasında kalan kısa
        // parça); negatif bir uzunluk yazmak yerine sıfırda durur, çağıran
        // MIN_LABELED_LENGTH_CM altındakini zaten yazmaz.
        innerLengthCm: Math.max(partLengthCm - trimCm, 0),
        innerPosition: {
          x: normalizeZero(anchor.x + innerNormal.x * offsetCm),
          y: normalizeZero(anchor.y + innerNormal.y * offsetCm),
        },
        outerLengthCm: partLengthCm + trimCm,
        outerPosition: {
          x: normalizeZero(anchor.x - innerNormal.x * offsetCm),
          y: normalizeZero(anchor.y - innerNormal.y * offsetCm),
        },
      })
    }
  }

  return annotations
}
