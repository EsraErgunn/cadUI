import type { InstallationLine } from './installationModel'
import { isSamePoint } from './lineGeometry'
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
  verticalToleranceCm: number,
): Id | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    const bandCm = getLineOuterWidthCm(line) / 2 + toleranceCm

    for (let segment = 0; segment + 1 < line.points.length; segment += 1) {
      const from = line.points[segment].position
      const to = line.points[segment + 1].position
      // Plan boyu SIFIR segment (saf dikey bağlantı, K102) planda gövdesiz bir
      // NOKTA: normal bant onu ancak piksel piksel isabetle buluyordu. Bandı
      // kullanıcının gördüğü halkaya (`ElevationNodeRing`) genişletiyoruz —
      // basılabilir alan çizilen alanla aynı olsun.
      const segmentBandCm = isSamePoint(from, to) ? Math.max(bandCm, verticalToleranceCm) : bandCm

      const projection = projectOntoSegment(from, to, point)
      if (projection.distanceCm <= segmentBandCm) return line.id
    }
  }

  return null
}

/**
 * Hattın TAMAMI tek plan noktasına düşüyor mu (saf dikey kolon, K102)? Böyle bir
 * hattın köşesi sürüklenemez (`useSelectionTool.tryStartCornerDrag`), bu yüzden
 * üstüne basış her zaman bir SEÇİMDİR — aynı noktada buluşan komşu hattın köşesi
 * jesti kapmasın diye seçim önceliği buradan sorulur.
 */
export function isPlanZeroLengthLine(line: InstallationLine): boolean {
  return line.points.every((candidate) => isSamePoint(candidate.position, line.points[0].position))
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
