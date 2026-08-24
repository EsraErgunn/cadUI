import { toAreaObjectPlanPoints } from './areaObject'
import { FLUE_SHAFT_CIRCLE_RATIO, getStairTreadCount } from './areaObjectGeometry'
import type { PlanPoint } from './coords'
import type { AreaObject, AreaObjectType, Id } from './model'
import type { SolidBox } from './solidWall'

export type SolidAreaBox = SolidBox & { areaType: AreaObjectType }

/**
 * Dönel alan nesnesi (baca şaftı / kolon havalandırması). `innerRadiusCm > 0`
 * ise içi boş bir BORU, değilse dolu silindir.
 */
export type SolidAreaCylinder = {
  key: string
  areaType: AreaObjectType
  center: PlanPoint
  outerRadiusCm: number
  innerRadiusCm: number
  heightCm: number
  baseCm: number
}

export type SolidAreaObjects = { boxes: SolidAreaBox[]; cylinders: SolidAreaCylinder[] }

/**
 * Baca şaftının iç çapı, dış çapın oranı olarak. Şaftın ET KALINLIĞI modelde
 * YOK — açıklık yüksekliğiyle aynı gerekçe: yalnız gösterim sabiti, JSON'a
 * girmez. Mutlak cm değil ORAN, çünkü şaft 30 cm de olabilir 120 cm de; sabit
 * bir kalınlık küçük şaftın deliğini tümüyle kapatırdı.
 */
const FLUE_SHAFT_INNER_RATIO = 0.78

/** Nesnenin oturduğu kattan katı modelin ihtiyacı olan iki ölçü. */
type AreaLevel = { baseCm: number; heightCm: number }

/**
 * Nesnenin YEREL ekseninde width=x, length=y (bkz. `areaObject.ts`), katı
 * kutununsa lengthCm=yerel x, widthCm=yerel y (three'de BoxGeometry(x,y,z)).
 * İkisi arasındaki takas burada tek noktada yapılıyor.
 */
function toLocalPlanPoint(areaObject: AreaObject, localY: number): PlanPoint {
  return toAreaObjectPlanPoints(areaObject, [{ x: 0, y: localY }])[0]
}

/**
 * Merdiven kutu DEĞİL: kat yüksekliğini basamak basamak çıkan bir kol. Kutu
 * olarak çizildiğinde merdiven boşluğu dolu bir blok gibi görünüyordu.
 *
 * İniş yönü planla aynı: 2B'deki ok yerel -y'ye bakıyor
 * (`areaObjectGeometry.ts` → buildStairArrowLines), yani en alçak basamak
 * -y ucunda, en yükseği +y ucunda. Basamak sayısı da o dosyadan geliyor ki
 * plandaki çizgi sayısı ile 3B'deki rıht sayısı ayrışmasın.
 */
function buildStairBoxes(areaObject: AreaObject, level: AreaLevel): SolidAreaBox[] {
  const treadCount = getStairTreadCount(areaObject.lengthCm)
  const treadDepthCm = areaObject.lengthCm / treadCount
  const riserHeightCm = level.heightCm / treadCount
  const halfLengthCm = areaObject.lengthCm / 2

  return Array.from({ length: treadCount }, (_, index) => ({
    key: `area-${areaObject.id}-tread-${index}`,
    center: toLocalPlanPoint(areaObject, -halfLengthCm + treadDepthCm * (index + 0.5)),
    lengthCm: areaObject.widthCm,
    widthCm: treadDepthCm,
    // Basamak zeminden yükselir; kolun sonuncusu üst kat döşemesine değer.
    heightCm: riserHeightCm * (index + 1),
    baseCm: level.baseCm,
    angleDeg: areaObject.angleDeg,
    areaType: areaObject.type,
  }))
}

/**
 * Baca şaftı içi boş bir boru; kolon havalandırması dolu bir silindir. İkisi de
 * planda ÇEMBER çiziliyor (`areaObjectGeometry.ts`), katı modelde kutu olarak
 * çizmek plandaki biçimle çelişirdi.
 */
function buildShaftCylinder(areaObject: AreaObject, level: AreaLevel): SolidAreaCylinder {
  const isFlueShaft = areaObject.type === 'flueShaft'
  const circleRadiusCm = Math.min(areaObject.widthCm, areaObject.lengthCm) / 2
  const outerRadiusCm = isFlueShaft ? circleRadiusCm * FLUE_SHAFT_CIRCLE_RATIO : circleRadiusCm

  return {
    key: `area-${areaObject.id}`,
    areaType: areaObject.type,
    center: { x: areaObject.x, y: areaObject.y },
    outerRadiusCm,
    innerRadiusCm: isFlueShaft ? outerRadiusCm * FLUE_SHAFT_INNER_RATIO : 0,
    heightCm: level.heightCm,
    baseCm: level.baseCm,
  }
}

function buildFullHeightBox(areaObject: AreaObject, level: AreaLevel): SolidAreaBox {
  return {
    key: `area-${areaObject.id}`,
    center: { x: areaObject.x, y: areaObject.y },
    lengthCm: areaObject.widthCm,
    widthCm: areaObject.lengthCm,
    // Kolon katı KATEDER: yüksekliği kendi katının yüksekliği.
    heightCm: level.heightCm,
    baseCm: level.baseCm,
    angleDeg: areaObject.angleDeg,
    areaType: areaObject.type,
  }
}

/** Bir kattaki alan nesnelerinin katı parçaları — tipe göre biçim değişir. */
export function buildLevelAreaObjects(
  areaObjects: readonly AreaObject[],
  floorId: Id,
  level: AreaLevel,
): SolidAreaObjects {
  const boxes: SolidAreaBox[] = []
  const cylinders: SolidAreaCylinder[] = []

  for (const areaObject of areaObjects) {
    if (areaObject.floorId !== floorId) continue

    if (areaObject.type === 'stairs') {
      boxes.push(...buildStairBoxes(areaObject, level))
    } else if (areaObject.type === 'flueShaft' || areaObject.type === 'columnVentilation') {
      cylinders.push(buildShaftCylinder(areaObject, level))
    } else {
      boxes.push(buildFullHeightBox(areaObject, level))
    }
  }

  return { boxes, cylinders }
}
