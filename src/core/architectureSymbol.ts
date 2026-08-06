import type { PlanPoint } from './coords'
import type { PointSymbolType } from './model'
import type { SymbolPose } from './symbolPlacement'
import {
  circlePoints,
  hatchStrokes,
  rectangleCorners,
  starStrokes,
  type SymbolGeometry,
  type SymbolStroke,
} from './symbolShapes'
import { applyTransform } from './transform'

/**
 * Cihazın PLANDA nasıl çizildiği — referans uygulamada (tplnr.webcad.com.tr)
 * yedi cihaz da yerleştirilip gözlendi.
 *
 * İki aile var:
 * - `embedded`: duvar bandının İÇİNE, gerçek ayak izi ölçüsünde çizilir.
 * - `leader`: duvarın DIŞINDA küçük bir işaret durur, duvara bir çekme
 *   çizgisiyle bağlanır. İşaret şematik olduğu için cihazın ayak izi kadar
 *   değil, sabit boydadır.
 * - `free`: duvara bağlı değil (aydınlatma tavana takılıyor).
 *
 * Cihazı ayırt eden şey RENK DEĞİL şekildir; hepsi aynı nötr konturla çizilir.
 */
export type SymbolDrawStyle = 'embedded' | 'leader' | 'free'

export type SymbolShapeKind =
  | 'filledRect'
  | 'hatchedRect'
  | 'circle'
  | 'doubleCircle'
  | 'square'
  | 'star'

type SymbolDisplay = {
  style: SymbolDrawStyle
  shape: SymbolShapeKind
  /** `embedded` için gerçek ayak izi; `leader`/`free` için işaretin boyu. */
  widthCm: number
  depthCm: number
  /**
   * Duvarı baştan sona geçen cihaz — menfez bir DELİK, duvarın bir yüzüne
   * monte edilen bir kutu değil. `depthCm` yerine duvarın kalınlığı kullanılır.
   */
  spansWallThickness?: boolean
  /**
   * `leader` ailesinde işaretin duvar yüzünden uzaklığı. 0 ise araya çizgi
   * ÇEKİLMEZ, işaret yüzeye yaslanır — yangın söndürücü referansta böyle duruyor.
   */
  leaderLengthCm?: number
}

/**
 * `embedded` ölçüleri `docs/webcad-reference.json`'daki cihaz kayıtlarından
 * (`width` × `depth`). Sabit kare kullanıldığında pano ile alarm planda aynı
 * boyda görünüyordu; pano 50 cm geniş, alarm 20.
 *
 * ⚠️ `lighting` referansta ölçülemedi (serbest duruyor, kaydı ölçü taşımıyor);
 * 28 cm şematik bir seçim.
 */
export const SYMBOL_DISPLAY: Record<PointSymbolType, SymbolDisplay> = {
  panel: { style: 'embedded', shape: 'filledRect', widthCm: 50, depthCm: 10 },
  vent: { style: 'embedded', shape: 'hatchedRect', widthCm: 15, depthCm: 10, spansWallThickness: true },
  // İki yan yana daire, duvarın dışında ve yüzeye yaslı (referansta gözlendi).
  fireExtinguisher: {
    style: 'leader',
    shape: 'doubleCircle',
    widthCm: 30,
    depthCm: 15,
    leaderLengthCm: 0,
  },
  mainCutoffSwitch: { style: 'leader', shape: 'circle', widthCm: 24, depthCm: 24 },
  alarmDevice: { style: 'leader', shape: 'square', widthCm: 24, depthCm: 24 },
  earthquakeSensor: { style: 'leader', shape: 'square', widthCm: 24, depthCm: 24 },
  lighting: { style: 'free', shape: 'star', widthCm: 28, depthCm: 28 },
}

/** Çekme çizgili cihazların varsayılan uzaklığı; tip başına ezilebilir. */
const DEFAULT_LEADER_LENGTH_CM = 45

/**
 * Sembolün YEREL cm geometrisi: orijin duvar yüzünde, +x duvar boyunca,
 * +y duvardan DIŞA (pose.outwardSign uygulanmış hâliyle).
 *
 * `embedded` cihaz orijinin üstünde durur. `leader` cihazın işareti
 * `LEADER_LENGTH_CM` kadar dışarıda, arada çekme çizgisi vardır.
 */
export function getPointSymbolGeometry(
  type: PointSymbolType,
  wallThicknessCm?: number,
): SymbolGeometry {
  const display = SYMBOL_DISPLAY[type]
  const halfWidth = display.widthCm / 2

  /*
   * Gömülü cihaz duvarın İÇİNE çizilir: yüzeye ortalanırsa yarısı içeride yarısı
   * dışarıda kalır ve duvarın iki tarafına birden taşar. Bu yüzden yüzeyden
   * (yerel y = 0) içeri doğru, yani -y yönünde uzatılır.
   *
   * Menfez duvarı baştan sona geçer (delik); kalınlık bilinmiyorsa kendi
   * derinliğine düşülür. Diğer gömülü cihazlar monte edildiği yüzden kendi
   * derinliği kadar içeri girer, duvardan kalınsa duvara sığdırılır.
   */
  const embeddedDepth = display.spansWallThickness
    ? (wallThicknessCm ?? display.depthCm)
    : Math.min(display.depthCm, wallThicknessCm ?? display.depthCm)

  const halfDepth = display.style === 'embedded' ? embeddedDepth / 2 : display.depthCm / 2

  // Gömülü cihaz yüzeyden içeri; çekme çizgili olan duvarın dışında, uzakta.
  const centerY = display.style === 'embedded' ? -halfDepth : 0
  const leaderLength = display.leaderLengthCm ?? DEFAULT_LEADER_LENGTH_CM
  const markerCenterY = display.style === 'leader' ? leaderLength + halfDepth : centerY

  // Uzaklık sıfırsa çizgi çizilmez: işaret zaten yüzeye yaslı.
  const leader: SymbolStroke[] =
    display.style === 'leader' && leaderLength > 0
      ? [
          {
            name: 'leader',
            role: 'detail',
            points: [
              { x: 0, y: 0 },
              { x: 0, y: markerCenterY - halfDepth },
            ],
          },
        ]
      : []

  if (display.shape === 'circle') {
    return {
      strokes: [
        ...leader,
        { name: 'outline', role: 'body', points: circlePoints(halfWidth, markerCenterY) },
      ],
      fills: [],
    }
  }

  if (display.shape === 'doubleCircle') {
    // İki daire yan yana; toplam genişlik widthCm, her biri onun yarısı kadar.
    const radius = display.widthCm / 4
    return {
      strokes: [
        ...leader,
        { name: 'left', role: 'body', points: circlePoints(radius, markerCenterY, -radius) },
        { name: 'right', role: 'body', points: circlePoints(radius, markerCenterY, radius) },
      ],
      fills: [],
    }
  }

  if (display.shape === 'star') {
    return { strokes: [...leader, ...starStrokes(halfWidth, markerCenterY)], fills: [] }
  }

  const corners = rectangleCorners(halfWidth, halfDepth, markerCenterY)
  const outline: SymbolStroke = {
    name: 'outline',
    role: 'body',
    points: [...corners, corners[0]],
  }

  if (display.shape === 'hatchedRect') {
    return {
      strokes: [...leader, outline, ...hatchStrokes(halfWidth, halfDepth, markerCenterY)],
      fills: [],
    }
  }

  if (display.shape === 'square') {
    return { strokes: [...leader, outline], fills: [] }
  }

  return { strokes: [...leader, outline], fills: [corners] }
}

/**
 * Yerel cm → plan uzayı. ÖLÇEKLEME YOK, geometri zaten santimetrede.
 * `outwardSign` yerel +y'yi duvarın dışına çevirir: sembol hangi yüze monte
 * edilmişse işareti o tarafta durur, ters yüzde duvarın içine çizilirdi.
 */
export function toPlanPoints(pose: SymbolPose, localPoints: readonly PlanPoint[]): PlanPoint[] {
  return localPoints.map((local) => {
    const oriented = { x: local.x, y: local.y * pose.outwardSign }
    const rotated = applyTransform(oriented, {
      kind: 'rotate',
      pivot: { x: 0, y: 0 },
      angleDeg: pose.rotationDeg,
    })
    return { x: rotated.x + pose.position.x, y: rotated.y + pose.position.y }
  })
}

/**
 * Sembolün plandaki tam geometrisi — sahne bunu doğrudan çizer. Konum ve açı
 * `core/symbolPlacement.ts` → `getSymbolPose`'dan gelir.
 */
export function getPointSymbolPlanGeometry(
  type: PointSymbolType,
  pose: SymbolPose,
): SymbolGeometry {
  const geometry = getPointSymbolGeometry(type, pose.wallThicknessCm)

  return {
    strokes: geometry.strokes.map((stroke) => ({
      ...stroke,
      points: toPlanPoints(pose, stroke.points),
    })),
    fills: geometry.fills.map((fill) => toPlanPoints(pose, fill)),
  }
}

/**
 * İmleç sembolün üstünde mi?
 *
 * Çekme çizgili cihazda tutulabilir alan İŞARETİN etrafıdır, duvar yüzü değil:
 * kullanıcı ekranda gördüğü kutuya basar. Bu yüzden erişim mesafesi çizgi boyunu
 * da kapsar — duvar yüzünden işaretin dış kenarına kadar.
 */
export function isPointInSymbol(
  target: PlanPoint,
  position: PlanPoint,
  toleranceCm: number,
  type: PointSymbolType,
): boolean {
  const display = SYMBOL_DISPLAY[type]
  const outerReach =
    display.style === 'leader'
      ? (display.leaderLengthCm ?? DEFAULT_LEADER_LENGTH_CM) + display.depthCm
      : Math.max(display.widthCm, display.depthCm) / 2

  const reach = outerReach + toleranceCm
  return Math.abs(target.x - position.x) <= reach && Math.abs(target.y - position.y) <= reach
}

export type { SymbolGeometry, SymbolStroke, SymbolStrokeRole } from './symbolShapes'
