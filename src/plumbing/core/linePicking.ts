import type { InstallationLine } from './installationModel'
import { PIPE_TYPES } from './pipeTypes'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
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
    const bandCm = PIPE_TYPES[line.pipeTypeName].outerDiameterCm / 2 + toleranceCm

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
