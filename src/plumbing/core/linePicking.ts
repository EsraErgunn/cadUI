import type { InstallationLine } from './installationModel'
import { getLineOuterWidthCm } from './lineKinds'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { isPointInRect, type PlanRect } from '../../core/selection'
import { projectOntoSegment } from '../../core/wall'

/**
 * İmlecin üstündeki hat. Tutma bandı çizilen kalınlığın YARISI + tolerans:
 * kalın boruda gövdenin her yeri, ince boruda da tıklanabilir bir şerit tutar.
 * Üst üste binenlerde SONUNCU kazanır — sahne diziyi sırayla çiziyor, yani
 * dizinin sonu en üstte görünen hat (elementPicking ile aynı kural).
 */
export function pickLineAt(
  point: PlanPoint,
  lines: readonly InstallationLine[],
  toleranceCm: number,
): Id | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    const bandCm = getLineOuterWidthCm(line) / 2 + toleranceCm

    for (let segment = 0; segment + 1 < line.points.length; segment += 1) {
      const projection = projectOntoSegment(
        line.points[segment].position,
        line.points[segment + 1].position,
        point,
      )
      if (projection.distanceCm <= bandCm) return line.id
    }
  }

  return null
}

/**
 * Çerçevenin TAMAMEN içinde kalan hatlar — kesişenler seçilmez, elemanlardaki
 * `getElementsInRect` ile aynı kural (core/elementPicking.ts).
 */
export function getLinesInRect(rect: PlanRect, lines: readonly InstallationLine[]): Id[] {
  return lines
    .filter((line) => line.points.every((point) => isPointInRect(point.position, rect)))
    .map((line) => line.id)
}
