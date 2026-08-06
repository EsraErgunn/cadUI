import type {
  InstallationLine,
  InstallationLinePoint,
  InstallationLineSegment,
} from './installationModel'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'

export type LineSplitResult = {
  points: InstallationLinePoint[]
  segments: InstallationLineSegment[]
  insertedPointId: Id
}

/**
 * Bir parçanın ortasına köşe ekler: boru orada AYRILIR, yeni bir hat üretilmez.
 * Mevcut nokta ve parça id'lerine DOKUNULMAZ — bölünen parça kendi id'siyle
 * kısalır, yalnız ikinci yarısı yeni id alır. Id'ler bir kez üretilir ve asla
 * yeniden üretilmez (kural 6); hepsi yeniden numaralansaydı o boruya bağlı
 * kayıtlar sahipsiz kalırdı.
 *
 * `createId` dışarıdan gelir ki fonksiyon saf kalsın ve store'un immer draft'ı
 * üzerinden `takeNextId` ile çağrılabilsin.
 */
export function splitLineAtSegment(
  line: Pick<InstallationLine, 'points' | 'segments'>,
  segmentIndex: number,
  position: PlanPoint,
  createId: () => Id,
): LineSplitResult | null {
  const splitSegment = line.segments[segmentIndex]
  if (!splitSegment) return null

  const insertedPoint: InstallationLinePoint = { id: createId(), position }
  const points = [
    ...line.points.slice(0, segmentIndex + 1),
    insertedPoint,
    ...line.points.slice(segmentIndex + 1),
  ]
  const segments = [
    ...line.segments.slice(0, segmentIndex),
    { ...splitSegment, toPointId: insertedPoint.id },
    {
      id: createId(),
      fromPointId: insertedPoint.id,
      toPointId: splitSegment.toPointId,
    },
    ...line.segments.slice(segmentIndex + 1),
  ]

  return { points, segments, insertedPointId: insertedPoint.id }
}
