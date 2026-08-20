import type {
  InstallationConnection,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import {
  getAttachedLineElevationCm,
  getLinePointElevationsCm,
} from '../../plumbing/core/lineElevation'
import { getSegmentLengthCm } from '../../plumbing/core/lineGeometry'

/**
 * Kot çözümü tek bir hatta bakarak bitmiyor: yakıcı cihaz kolu kendi kotunu
 * taşımaz, tutunduğu borudan okur. Bağlantıları her fonksiyona ayrı ayrı
 * geçirmek yerine bu bağlam tipi dolaşıyor.
 */
export type IsometricElevationContext = {
  lines: readonly InstallationLine[]
  connections: readonly InstallationConnection[]
}

/**
 * Hattın her köşesindeki YEREL kot (katın tabanına göre, cm). Kot alanı tür
 * başına farklı yerde duruyor (`lineProperties.ts`); izometrik hepsini çizmek
 * zorunda olduğu için ayrım tek bir yerde toplanıyor — hem geometri hem etiket
 * buradan okur, iki kopya olsaydı boy ile çizim ayrışırdı.
 */
export function getIsometricLineElevationsCm(
  line: InstallationLine,
  context: IsometricElevationContext,
): number[] {
  const positions = line.points.map((point) => point.position)

  if ((line.kind === 'pipe' || line.kind === 'branchStub') && line.pipe) {
    return getLinePointElevationsCm(positions, line.pipe.startHeightCm, line.pipe.endHeightCm)
  }
  if (line.kind === 'chimney' && line.chimney) {
    return getLinePointElevationsCm(positions, line.chimney.startHeightCm, line.chimney.endHeightCm)
  }
  if (line.kind === 'branch' && line.branch) {
    const { elevationCm } = line.branch
    return positions.map(() => elevationCm)
  }
  if (line.kind === 'applianceStub') {
    // Kol DÜZ gider: tutunduğu borunun hizasında çıkar, cihaza o kotta girer.
    // Cihazın kotu da aynı yerden okunuyor (`getElementElevationCm`), yani
    // sembol kolun ucundan kopmaz.
    const elevationCm = getAttachedLineElevationCm(line, context.lines, context.connections)
    return positions.map(() => elevationCm)
  }
  return positions.map(() => 0)
}

/**
 * Gerçek 3B boy: plan uzunluğu ile kot farkının bileşkesi, segment segment.
 * `getLine3dLengthCm` yalnız iki uçlu `pipe` kotunu bildiği için burada tüm
 * türleri kapsayan hâli yazıldı — izometrikte baca da ölçülendiriliyor.
 *
 * İzometrik KAYDIRMA bu hesaba GİRMEZ: kaydırma çizimi ayıklamak içindir,
 * borunun boyunu değiştirmez.
 */
export function getIsometricLine3dLengthCm(
  line: InstallationLine,
  context: IsometricElevationContext,
): number {
  if (line.points.length < 2) return 0

  const elevations = getIsometricLineElevationsCm(line, context)
  let totalCm = 0
  for (let index = 1; index < line.points.length; index += 1) {
    const planCm = getSegmentLengthCm(line.points[index - 1].position, line.points[index].position)
    totalCm += Math.hypot(planCm, elevations[index] - elevations[index - 1])
  }
  return totalCm
}
