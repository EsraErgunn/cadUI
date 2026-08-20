import { getIsometricLabelDistanceCm } from './isometricLabels'
import { projectIsometric } from './isometricProjection'
import type { IsometricAngles } from './isometricProjection'
import type { PlanPoint, ThreePosition } from '../../core/coords'

const FULL_TURN_RAD = Math.PI * 2

export type IsometricLabelRequest = {
  key: string
  anchor: ThreePosition
  /** Hat etiketi elemanınkinden daha yakın bir halkaya oturur. */
  distanceFactor: number
}

type Placed = { key: string; angleRad: number; anchor: PlanPoint }

/**
 * Bir halkadaki etiketlerin açılarını, en az `minGapRad` aralık kalacak şekilde
 * ayırır. Doğal açı (çapanın merkeze göre yönü) KORUNMAYA çalışılır: etiket
 * kendi borusuna en yakın taraftan çıksın ki kılavuz çizgisi çizimin üstünden
 * geçmesin.
 *
 * Sığmıyorsa (n · minGap ≥ tam tur) eşit dağıtıma düşülür — sıkıştırmaya
 * çalışmak yerine kabul edilebilir tek düzen bu.
 */
function separateAngles(sorted: Placed[], minGapRad: number): number[] {
  const count = sorted.length
  if (count === 0) return []
  if (count === 1) return [sorted[0].angleRad]

  if (count * minGapRad >= FULL_TURN_RAD) {
    const step = FULL_TURN_RAD / count
    return sorted.map((_unused, index) => sorted[0].angleRad + index * step)
  }

  const angles = sorted.map((item) => item.angleRad)
  for (let index = 1; index < count; index += 1) {
    const minimum = angles[index - 1] + minGapRad
    if (angles[index] < minimum) angles[index] = minimum
  }

  // Sarma denetimi: son etiket ilkinin üstüne binmiş olabilir. Geri itmek
  // zincirleme yeni çakışmalar doğurduğu için eşit dağıtıma düşülür.
  if (angles[count - 1] + minGapRad > angles[0] + FULL_TURN_RAD) {
    const step = FULL_TURN_RAD / count
    return angles.map((_unused, index) => angles[0] + index * step)
  }

  return angles
}

/**
 * Etiketlerin izdüşüm düzlemindeki yerleşimi: çizimin çevresinde bir HALKA.
 *
 * Neden halka: yalnız ışınsal kaydırmada (etiket çapasından dışarı) birbirine
 * açıca yakın iki hat neredeyse aynı noktaya düşüyor ve yazılar üst üste
 * biniyordu. Halkada hepsi aynı yarıçapta durur, aralarındaki açı en az bir
 * etiket boyu kadar açılır ve kılavuz çizgileri dışarı doğru dağılır — teknik
 * çizimlerdeki "balon" düzeni.
 *
 * Uzaklık çarpanı GRUPLARI ayrı halkalara koyar: hat etiketleri içte, eleman
 * künyeleri dışta. Aynı halkada olsalardı bir cihaz ile ona giden kısa kolun
 * etiketi aynı açıyı paylaşıp birbirini iterdi.
 *
 * Dönen değer, çapaya göre KAYMA (cm) — `isometricLabelOffsetCm` ile aynı
 * uzay, böylece kullanıcı sürükleyince aynı alana yazılabiliyor.
 */
export function layoutIsometricLabels(
  requests: readonly IsometricLabelRequest[],
  center: ThreePosition,
  angles: IsometricAngles,
  sceneExtentCm: number,
  minSeparationCm: number,
): Map<string, PlanPoint> {
  const placements = new Map<string, PlanPoint>()
  if (requests.length === 0) return placements

  const centerScreen = projectIsometric(center, angles)

  // Halka çizimi SARMALI: yarıçap en uzak çapadan başlar, yoksa etiketler
  // gövdenin içine düşerdi.
  let anchorRadiusCm = 0
  const projected = requests.map((request) => {
    const screen = projectIsometric(request.anchor, angles)
    const anchor = { x: screen.x - centerScreen.x, y: screen.y - centerScreen.y }
    anchorRadiusCm = Math.max(anchorRadiusCm, Math.hypot(anchor.x, anchor.y))
    return { request, anchor }
  })

  const groups = new Map<number, Placed[]>()
  for (const { request, anchor } of projected) {
    const group = groups.get(request.distanceFactor) ?? []
    group.push({
      key: request.key,
      // Merkezle çakışan çapada yön tanımsız; yukarı en az zararlısı.
      angleRad: anchor.x === 0 && anchor.y === 0 ? Math.PI / 2 : Math.atan2(anchor.y, anchor.x),
      anchor,
    })
    groups.set(request.distanceFactor, group)
  }

  for (const [distanceFactor, group] of groups) {
    const ringRadiusCm =
      anchorRadiusCm + getIsometricLabelDistanceCm(sceneExtentCm, distanceFactor)

    const sorted = [...group].sort((a, b) => a.angleRad - b.angleRad)
    const minGapRad = ringRadiusCm > 0 ? minSeparationCm / ringRadiusCm : FULL_TURN_RAD
    const separated = separateAngles(sorted, minGapRad)

    sorted.forEach((item, index) => {
      const angleRad = separated[index]
      placements.set(item.key, {
        x: Math.cos(angleRad) * ringRadiusCm - item.anchor.x,
        y: Math.sin(angleRad) * ringRadiusCm - item.anchor.y,
      })
    })
  }

  return placements
}
