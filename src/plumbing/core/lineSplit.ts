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

export type LineExtendResult = {
  points: InstallationLinePoint[]
  segments: InstallationLineSegment[]
  addedPointId: Id
}

/**
 * Hattı UCUNDAN uzatır: yeni köşe uca eklenir, aradaki parça doğar. Sayaç boş uca
 * takılırken hat sayacın giriş portuna kadar bu şekilde büyür — yeni bir hat
 * üretilseydi eski uç ile sayaç arasında iki ayrı boru görünürdü.
 *
 * Baştan uzatmada nokta ve parça başa eklenir; mevcut id'lere DOKUNULMAZ (kural 6).
 */
export function extendLineEnd(
  line: Pick<InstallationLine, 'points' | 'segments'>,
  end: 'start' | 'end',
  position: PlanPoint,
  createId: () => Id,
): LineExtendResult | null {
  const anchor = end === 'start' ? line.points[0] : line.points.at(-1)
  if (!anchor) return null

  const addedPoint: InstallationLinePoint = { id: createId(), position }
  const segment: InstallationLineSegment =
    end === 'start'
      ? { id: createId(), fromPointId: addedPoint.id, toPointId: anchor.id }
      : { id: createId(), fromPointId: anchor.id, toPointId: addedPoint.id }

  return {
    points: end === 'start' ? [addedPoint, ...line.points] : [...line.points, addedPoint],
    segments: end === 'start' ? [segment, ...line.segments] : [...line.segments, segment],
    addedPointId: addedPoint.id,
  }
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
