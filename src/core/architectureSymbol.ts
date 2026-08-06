import type { PlanPoint } from './coords'
import type { PointSymbolType } from './model'
import type { SymbolPose } from './symbolPlacement'
import { applyTransform } from './transform'

/**
 * Semboller BİRİM ÇERÇEVEDE tanımlanır: orijin merkez, kenar 100 birim, +y yukarı.
 * Plan uzayına çevirmeyi `toPlanPoints` yapar. `core/openingSymbol.ts` ile aynı
 * ayrım — şekil bir yerde, yerleşim başka yerde.
 */
const UNIT_EXTENT = 100
const HALF = UNIT_EXTENT / 2

/**
 * Sembolün plandaki kenar uzunluğu. Model boyut alanı TAŞIMIYOR: yedi sembol de
 * şematik damga, ölçülü eleman değil (ölçü Desen B'nin işi). Tip başına farklı
 * boy gerekirse burası Record olur, model değişmez.
 */
export const POINT_SYMBOL_SIZE_CM = 40

/** Çizgi kalınlığını sahne bu role göre seçer; cm/px değeri core'da tutulmaz. */
export type SymbolStrokeRole = 'body' | 'detail'

export type SymbolStroke = {
  /** Benzersiz ad — React key (indeks DEĞİL, CLAUDE.md kural 6). */
  name: string
  role: SymbolStrokeRole
  points: PlanPoint[]
}

export type SymbolGeometry = {
  strokes: SymbolStroke[]
  /** Dolu alanların köşeleri; boşsa dolgu yok. */
  fills: PlanPoint[][]
}

const CIRCLE_SEGMENTS = 32

/** Daire polyline olarak örneklenir: drei <Line> eğri değil nokta dizisi ister. */
function circle(cx: number, cy: number, radius: number): PlanPoint[] {
  const points: PlanPoint[] = []
  for (let step = 0; step <= CIRCLE_SEGMENTS; step += 1) {
    const angle = (step / CIRCLE_SEGMENTS) * Math.PI * 2
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius })
  }
  return points
}

function rectangle(halfWidth: number, halfHeight: number): PlanPoint[] {
  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
    { x: -halfWidth, y: -halfHeight },
  ]
}

/**
 * Yedi sembolün birim çerçevedeki şekli.
 *
 * ⚠️ Şekiller ŞEMATİK ve teyide açık: talep metni sembollerin biçimini tarif
 * etmiyor, doğalgaz projelendirmesinde ise standart karşılıkları var. Hepsi bu tek
 * fonksiyonda durduğu için analist düzeltme verdiğinde yalnız burası değişir —
 * model, yerleştirme ve etkileşim dokunulmaz.
 */
export function getPointSymbolGeometry(type: PointSymbolType): SymbolGeometry {
  switch (type) {
    // Ana kesme şalteri: daire içinden geçen eğik kesme çizgisi.
    case 'mainCutoffSwitch':
      return {
        strokes: [
          { name: 'body', role: 'body', points: circle(0, 0, HALF * 0.8) },
          {
            name: 'cut',
            role: 'detail',
            points: [
              { x: -HALF * 0.55, y: -HALF * 0.55 },
              { x: HALF * 0.55, y: HALF * 0.55 },
            ],
          },
        ],
        fills: [],
      }

    // Pano: dikdörtgen gövde + dolu üst şerit.
    case 'panel':
      return {
        strokes: [{ name: 'body', role: 'body', points: rectangle(HALF * 0.8, HALF * 0.55) }],
        fills: [
          [
            { x: -HALF * 0.8, y: HALF * 0.2 },
            { x: HALF * 0.8, y: HALF * 0.2 },
            { x: HALF * 0.8, y: HALF * 0.55 },
            { x: -HALF * 0.8, y: HALF * 0.55 },
          ],
        ],
      }

    // Aydınlatma: daire + içinde çarpı.
    case 'lighting':
      return {
        strokes: [
          { name: 'body', role: 'body', points: circle(0, 0, HALF * 0.7) },
          {
            name: 'cross-a',
            role: 'detail',
            points: [
              { x: -HALF * 0.5, y: -HALF * 0.5 },
              { x: HALF * 0.5, y: HALF * 0.5 },
            ],
          },
          {
            name: 'cross-b',
            role: 'detail',
            points: [
              { x: -HALF * 0.5, y: HALF * 0.5 },
              { x: HALF * 0.5, y: -HALF * 0.5 },
            ],
          },
        ],
        fills: [],
      }

    // Yangın söndürücü: dar dik gövde + tepe boyun.
    case 'fireExtinguisher':
      return {
        strokes: [
          { name: 'body', role: 'body', points: rectangle(HALF * 0.35, HALF * 0.7) },
          {
            name: 'neck',
            role: 'detail',
            points: [
              { x: -HALF * 0.15, y: HALF * 0.7 },
              { x: -HALF * 0.15, y: HALF * 0.95 },
              { x: HALF * 0.15, y: HALF * 0.95 },
              { x: HALF * 0.15, y: HALF * 0.7 },
            ],
          },
        ],
        fills: [],
      }

    // Alarm cihazı: iç içe iki daire.
    case 'alarmDevice':
      return {
        strokes: [
          { name: 'body', role: 'body', points: circle(0, 0, HALF * 0.8) },
          { name: 'core', role: 'detail', points: circle(0, 0, HALF * 0.35) },
        ],
        fills: [],
      }

    // Deprem sensörü: kare gövde + içinde titreşim dalgası.
    case 'earthquakeSensor':
      return {
        strokes: [
          { name: 'body', role: 'body', points: rectangle(HALF * 0.7, HALF * 0.7) },
          {
            name: 'wave',
            role: 'detail',
            points: [
              { x: -HALF * 0.5, y: 0 },
              { x: -HALF * 0.25, y: HALF * 0.35 },
              { x: 0, y: -HALF * 0.35 },
              { x: HALF * 0.25, y: HALF * 0.35 },
              { x: HALF * 0.5, y: 0 },
            ],
          },
        ],
        fills: [],
      }

    // Menfez: dikdörtgen kasa + üç panjur dilimi.
    case 'vent':
      return {
        strokes: [
          { name: 'body', role: 'body', points: rectangle(HALF * 0.9, HALF * 0.5) },
          ...[-HALF * 0.25, 0, HALF * 0.25].map((y, index) => ({
            name: `slat-${index}`,
            role: 'detail' as const,
            points: [
              { x: -HALF * 0.9, y },
              { x: HALF * 0.9, y },
            ],
          })),
        ],
        fills: [],
      }
  }
}

/**
 * Birim çerçeve → plan uzayı: ölçekle, sembolün açısı kadar döndür, konumuna taşı.
 * Dönme `core/transform.ts` → `applyTransform` ile yapılıyor; ikinci bir rotasyon
 * uygulaması yazılmıyor (grup döndürme ile aynı matematik, -0 temizliği dahil).
 */
export function toPlanPoints(
  pose: SymbolPose,
  unitPoints: readonly PlanPoint[],
  sizeCm: number = POINT_SYMBOL_SIZE_CM,
): PlanPoint[] {
  const scale = sizeCm / UNIT_EXTENT

  return unitPoints.map((unit) => {
    const scaled = { x: unit.x * scale, y: unit.y * scale }
    const rotated = applyTransform(scaled, {
      kind: 'rotate',
      pivot: { x: 0, y: 0 },
      angleDeg: pose.rotationDeg,
    })
    return { x: rotated.x + pose.position.x, y: rotated.y + pose.position.y }
  })
}

/**
 * Sembolün plandaki tam geometrisi — sahne bunu doğrudan çizer.
 * Konum ve açı `core/symbolPlacement.ts` → `getSymbolPose`'dan gelir; duvara
 * bağlı sembolde ikisi de duvardan türer, burada o ayrım bilinmez.
 */
export function getPointSymbolPlanGeometry(
  type: PointSymbolType,
  pose: SymbolPose,
  sizeCm: number = POINT_SYMBOL_SIZE_CM,
): SymbolGeometry {
  const geometry = getPointSymbolGeometry(type)

  return {
    strokes: geometry.strokes.map((stroke) => ({
      ...stroke,
      points: toPlanPoints(pose, stroke.points, sizeCm),
    })),
    fills: geometry.fills.map((fill) => toPlanPoints(pose, fill, sizeCm)),
  }
}

/**
 * İmleç sembolün üstünde mi? Şekil karmaşık olduğu için sınır KUTUSU kullanılıyor:
 * kullanıcı sembolü tutmaya çalışırken çizginin tam üstüne basmak zorunda kalmasın.
 * Tolerans, seçim toleransıyla aynı ekran mesafesinden gelir.
 */
export function isPointInSymbol(
  target: PlanPoint,
  position: PlanPoint,
  toleranceCm: number,
  sizeCm: number = POINT_SYMBOL_SIZE_CM,
): boolean {
  const reach = sizeCm / 2 + toleranceCm
  return Math.abs(target.x - position.x) <= reach && Math.abs(target.y - position.y) <= reach
}
