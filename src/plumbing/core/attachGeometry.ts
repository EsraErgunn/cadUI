import type { InstallationConnection, InstallationLine } from './installationModel'
import { hasLinkedLinePoint } from './lineCornerLink'
import { getSegmentLengthCm } from './lineGeometry'
import { isLineEndConnected } from './portSnap'
import { rotatePlanOffset, svgLocalToPlanOffset } from './ports'
import type {
  InstallationElementType,
  SymbolMetadata,
  SymbolPortDefinition,
} from './symbolMetadata'
import { normalizeZero, type PlanPoint } from '../../core/coords'
import { projectOntoSegment } from '../../core/wall'

const RAD_TO_DEG = 180 / Math.PI

export const STRAIGHT_ANGLE_DEG = 180
export const ORIGIN: PlanPoint = { x: 0, y: 0 }

export type ElementPlacement = {
  type: InstallationElementType
  position: PlanPoint
  angleDeg: number
}

export function getDirectionAngleDeg(from: PlanPoint, to: PlanPoint): number {
  return normalizeZero(Math.atan2(to.y - from.y, to.x - from.x) * RAD_TO_DEG)
}

/** Hattın bağlanacağı giriş portu; giriş yoksa ilk port (gaz yönü: kaynak → tüketim). */
export function getInputPort(metadata: SymbolMetadata): SymbolPortDefinition | null {
  return metadata.ports.find((port) => port.type === 'input') ?? metadata.ports[0] ?? null
}

export function getPortOffset(metadata: SymbolMetadata, port: SymbolPortDefinition): PlanPoint {
  return svgLocalToPlanOffset(port.position, metadata.origin, 1)
}

/**
 * Boruya OTURAN elemanın çapası: akış geçişli armatür (giriş + çıkış) boruyu
 * kesip merkezinden oturur, tek bağlantılı eleman (manometre) boruya yalnız
 * portuyla değer ve gövdesi yanda kalır.
 */
export function getOnLineAnchorOffset(metadata: SymbolMetadata): PlanPoint {
  const [onlyPort] = metadata.ports
  return metadata.ports.length === 1 && onlyPort ? getPortOffset(metadata, onlyPort) : ORIGIN
}

/**
 * Elemanın giriş → çıkış ekseninin plan açısı; akış geçişli değilse null.
 * Sembol boruya bu eksenden hizalanır: sayacın portları gövdesinin ÜSTÜNDE
 * olduğu için boru açısı doğrudan kullanılsaydı sayaç boruya ters otururdu.
 */
export function getFlowAxisAngleDeg(metadata: SymbolMetadata): number | null {
  const input = metadata.ports.find((port) => port.type === 'input')
  const output = metadata.ports.find((port) => port.type === 'output')
  if (!input || !output) return null
  return getDirectionAngleDeg(getPortOffset(metadata, input), getPortOffset(metadata, output))
}

/** Boruya oturan elemanın açısı: akış ekseni boruyla çakışır. */
export function getOnLineAngleDeg(metadata: SymbolMetadata, segmentAngleDeg: number): number {
  return normalizeZero(segmentAngleDeg - (getFlowAxisAngleDeg(metadata) ?? 0))
}

/** Çapası `anchor`'a oturacak şekilde elemanın origin konumu. */
export function getPositionForAnchor(
  anchorOffset: PlanPoint,
  angleDeg: number,
  anchor: PlanPoint,
): PlanPoint {
  const rotated = rotatePlanOffset(anchorOffset, angleDeg)
  return {
    x: normalizeZero(anchor.x - rotated.x),
    y: normalizeZero(anchor.y - rotated.y),
  }
}

/** Sembolün boru yönündeki yarı uzunluğu — komşu armatürün payı bundan türer. */
export function getHalfLengthCm(metadata: SymbolMetadata): number {
  return (metadata.bounds.max[0] - metadata.bounds.min[0]) / 2
}

export function getUnitDirection(from: PlanPoint, to: PlanPoint, lengthCm: number): PlanPoint {
  return { x: (to.x - from.x) / lengthCm, y: (to.y - from.y) / lengthCm }
}

export type SegmentHit = {
  line: InstallationLine
  segmentIndex: number
  from: PlanPoint
  to: PlanPoint
  lengthCm: number
  /** İzdüşümün parça başından uzaklığı. */
  offsetCm: number
  distanceCm: number
  point: PlanPoint
}

/**
 * İmlece en yakın boru parçası. `findNearestPointOnLines`'tan ayrı: eleman
 * yerleştirmesi yalnız noktayı değil parçanın YÖNÜNÜ ve BOYUNU da ister (sembol
 * boruya hizalanır, refakatçiler aynı parçaya sığmak zorundadır). İzdüşüm yine
 * `core/wall.ts`'teki tek fonksiyondan alınır.
 */
export function findNearestSegment(
  lines: readonly InstallationLine[],
  cursor: PlanPoint,
  maxDistanceCm: number,
): SegmentHit | null {
  let nearest: SegmentHit | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const line of lines) {
    for (let index = 0; index + 1 < line.points.length; index += 1) {
      const from = line.points[index].position
      const to = line.points[index + 1].position
      const projection = projectOntoSegment(from, to, cursor)
      if (projection.distanceCm > maxDistanceCm || projection.distanceCm >= nearestDistanceCm) {
        continue
      }

      nearest = {
        line,
        segmentIndex: index,
        from,
        to,
        lengthCm: getSegmentLengthCm(from, to),
        offsetCm: projection.offsetCm,
        distanceCm: projection.distanceCm,
        point: projection.point,
      }
      nearestDistanceCm = projection.distanceCm
    }
  }

  return nearest
}

export type FreeEndHit = {
  line: InstallationLine
  end: 'start' | 'end'
  point: InstallationLine['points'][number]
  /** Uçtan bir önceki köşe — elemanın bakacağı YÖN buradan türer. */
  neighbor: InstallationLine['points'][number]
}

const LINE_ENDS = ['start', 'end'] as const

/** İmlece en yakın BAĞLANTISIZ hat ucu; sayaç buraya takılır. */
export function findNearestFreeLineEnd(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  cursor: PlanPoint,
  radiusCm: number,
): FreeEndHit | null {
  let nearest: FreeEndHit | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const line of lines) {
    for (const end of LINE_ENDS) {
      // Dolu uç aday değil: bir uca ikinci eleman takılamaz (port kuralıyla aynı).
      if (isLineEndConnected(connections, line.id, end)) continue

      const point = end === 'start' ? line.points[0] : line.points.at(-1)
      const neighbor = end === 'start' ? line.points[1] : line.points.at(-2)
      if (!point || !neighbor || point.inlineElementId !== undefined) continue
      // Zincirin ORTASINDAKİ köşe serbest uç değildir: her sol tık kendi
      // borusunu yazdığı için (K-W) bir sonraki adım bu noktaya tutunuyor —
      // yalnız `isLineEndConnected`'e bakılsaydı kayıt komşu hatta durduğu
      // için burası boş uç sanılır ve sayaç zincirin ortasına takılırdı.
      if (hasLinkedLinePoint(connections, line.id, point.id)) continue

      const distanceCm = getSegmentLengthCm(point.position, cursor)
      if (distanceCm > radiusCm || distanceCm >= nearestDistanceCm) continue

      nearest = { line, end, point, neighbor }
      nearestDistanceCm = distanceCm
    }
  }

  return nearest
}
