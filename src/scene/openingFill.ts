import { planToThree, type PlanPoint } from '../core/coords'

/**
 * Açıklık dolgusunun üçgenleri: 4 köşeden (0,1,2) ve (0,2,3). Hem mimari görünüm
 * (Opening.tsx) hem tesisat hayaleti (plumbing/scene/Ghosts.tsx) aynı dolguyu
 * çiziyor; bileşen dosyasından export edilemiyor (react-refresh).
 */
export function toOpeningFillPositions(
  corners: readonly PlanPoint[],
  elevationCm: number,
): Float32Array {
  const order = [0, 1, 2, 0, 2, 3]
  const positions = new Float32Array(order.length * 3)

  order.forEach((cornerIndex, slot) => {
    const [x, y, z] = planToThree(corners[cornerIndex], elevationCm)
    positions.set([x, y, z], slot * 3)
  })

  return positions
}
