import type { PlanPoint } from './coords'
import type { Opening, Wall } from './model'
import { getOpeningSpan } from './opening'
import { getSegmentAngleDeg, getSegmentLength } from './wall'
import type { WallCapsule } from './wallShape'

/**
 * Kapı/pencere modelde YÜKSEKLİK TAŞIMAZ (core/model.ts → Opening: "yükseklik
 * yok — 2B planda çizilmiyor, gerekince ayrı kararla eklenir"). Katı model o
 * kararı bekleyemez: duvarda delik açmak için bir yükseklik gerekiyor.
 *
 * Aşağıdakiler bu yüzden yalnız GÖSTERİM sabitidir — modele yazılmaz, JSON'a
 * girmez, kaydedilmez. Gerçek yükseklik alanı eklendiğinde bunların yerini alır.
 * Değerler TSE/yapı pratiğindeki olağan ölçüler.
 */
export const DOOR_HEIGHT_CM = 210
export const WINDOW_SILL_HEIGHT_CM = 90
export const WINDOW_HEIGHT_CM = 140

/** Cam paneli duvar kalınlığının bu oranı kadar: delikte yüzen ince bir levha. */
const GLAZING_THICKNESS_RATIO = 0.25

/**
 * Katı modelin temel yapı taşı: plan düzleminde merkez + açı, düşeyde taban +
 * yükseklik. Three dönüşümü BURADA yapılmaz (kural 3) — sahne `planToThree`
 * ile çevirir.
 */
export type SolidBox = {
  key: string
  center: PlanPoint
  /** Eksen boyunca uzunluk (cm). */
  lengthCm: number
  /** Eksene dik kalınlık (cm). */
  widthCm: number
  heightCm: number
  /** Kutunun TABAN kotu (cm); sıfır = zemin katın tabanı (core/floorElevation.ts). */
  baseCm: number
  /** 0-360, x ekseninden saat yönünün tersine (AreaObject ile aynı sözleşme). */
  angleDeg: number
}

/** Duvarın katı karşılığı: gövde parçaları + pencere camları. */
export type WallSolids = { body: SolidBox[]; glazing: SolidBox[] }

type Slice = { fromCm: number; toCm: number; baseCm: number; heightCm: number; key: string }

/**
 * Açıklığın duvarda açtığı düşey boşluk: kapı zeminden başlar, pencere
 * denizliğin üstünde. Üst kot duvarı aşamaz — alçak duvarda delik duvarı ikiye
 * bölmek yerine tepesine kadar açılır.
 */
function getOpeningGapCm(opening: Opening, wallHeightCm: number): { sillCm: number; headCm: number } {
  const sillCm = opening.type === 'window' ? Math.min(WINDOW_SILL_HEIGHT_CM, wallHeightCm) : 0
  const rawHeadCm = opening.type === 'window' ? sillCm + WINDOW_HEIGHT_CM : DOOR_HEIGHT_CM
  return { sillCm, headCm: Math.min(rawHeadCm, wallHeightCm) }
}

/**
 * Duvarı açıklıklarıyla birlikte katı kutulara böler.
 *
 * Gövde 2B'deki KAPSÜLLE aynı ayak izini kaplar (K23): kutu her iki uçta yarım
 * kalınlık kadar UZATILIR. Uzatılmasaydı köşelerde duvar kalınlığı kadar boşluk
 * kalırdı — kapsülün yuvarlak ucu tam da o boşluğu dolduruyor. Kutu yuvarlak
 * değil ama kavşakta üst üste binen parçalar aynı opak renkte olduğu için fark
 * okunmuyor, planla birebir aynı gerekçe.
 */
export function getWallSolids(
  wall: Wall,
  capsule: WallCapsule,
  openings: readonly Opening[],
  floorBaseCm: number,
): WallSolids {
  const { p1, p2, radiusCm } = capsule
  const axisLengthCm = getSegmentLength(p1, p2)
  if (axisLengthCm === 0 || wall.height <= 0) return { body: [], glazing: [] }

  const angleDeg = getSegmentAngleDeg(p1, p2)
  const dirX = (p2.x - p1.x) / axisLengthCm
  const dirY = (p2.y - p1.y) / axisLengthCm
  const pointAtCm = (offsetCm: number): PlanPoint => ({
    x: p1.x + dirX * offsetCm,
    y: p1.y + dirY * offsetCm,
  })

  const toBox = (slice: Slice, widthCm: number): SolidBox | null => {
    const lengthCm = slice.toCm - slice.fromCm
    if (lengthCm <= 0 || slice.heightCm <= 0) return null
    return {
      key: slice.key,
      center: pointAtCm((slice.fromCm + slice.toCm) / 2),
      lengthCm,
      widthCm,
      heightCm: slice.heightCm,
      baseCm: floorBaseCm + slice.baseCm,
      angleDeg,
    }
  }

  const startCm = -radiusCm
  const endCm = axisLengthCm + radiusCm
  const thicknessCm = radiusCm * 2

  // Açıklıklar duvar boyunca SIRALI işleniyor: imleç soldan sağa ilerliyor ve
  // her deliğin solunda kalan tam boy parçayı arkasında bırakıyor.
  const gaps = openings
    .map((opening) => ({ opening, span: getOpeningSpan(opening) }))
    .filter(({ span }) => span[1] > startCm && span[0] < endCm)
    .sort((left, right) => left.span[0] - right.span[0])

  const body: SolidBox[] = []
  const glazing: SolidBox[] = []
  const push = (box: SolidBox | null) => {
    if (box) body.push(box)
  }

  let cursorCm = startCm
  gaps.forEach(({ opening, span }) => {
    const gapFromCm = Math.max(startCm, span[0])
    const gapToCm = Math.min(endCm, span[1])
    const { sillCm, headCm } = getOpeningGapCm(opening, wall.height)

    push(
      toBox(
        { fromCm: cursorCm, toCm: gapFromCm, baseCm: 0, heightCm: wall.height, key: `${wall.id}-full-${cursorCm}` },
        thicknessCm,
      ),
    )
    // Denizlik altı ve lento üstü: deliğin kalan duvarı.
    push(
      toBox(
        { fromCm: gapFromCm, toCm: gapToCm, baseCm: 0, heightCm: sillCm, key: `${wall.id}-sill-${opening.id}` },
        thicknessCm,
      ),
    )
    push(
      toBox(
        {
          fromCm: gapFromCm,
          toCm: gapToCm,
          baseCm: headCm,
          heightCm: wall.height - headCm,
          key: `${wall.id}-lintel-${opening.id}`,
        },
        thicknessCm,
      ),
    )

    if (opening.type === 'window') {
      const glass = toBox(
        {
          fromCm: gapFromCm,
          toCm: gapToCm,
          baseCm: sillCm,
          heightCm: headCm - sillCm,
          key: `${wall.id}-glass-${opening.id}`,
        },
        thicknessCm * GLAZING_THICKNESS_RATIO,
      )
      if (glass) glazing.push(glass)
    }

    cursorCm = Math.max(cursorCm, gapToCm)
  })

  push(
    toBox(
      { fromCm: cursorCm, toCm: endCm, baseCm: 0, heightCm: wall.height, key: `${wall.id}-full-tail` },
      thicknessCm,
    ),
  )

  return { body, glazing }
}
