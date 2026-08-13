import {
  getTargetElementId,
  type InstallationConnection,
  type InstallationElement,
  type InstallationEndpointTarget,
  type InstallationLine,
  type InstallationLinePoint,
  type InstallationLineSegment,
} from './installationModel'
import { createIdRemap, remapId, type IdRemap } from '../../core/idRemap'
import type { Id } from '../../core/model'

/**
 * Bir katın kopyalanabilir tesisatı. Mimarinin karşılığı `core/floorClone.ts`;
 * ikisi AYRI çünkü kullanıcı mimari ile tesisatı ayrı ayrı seçebiliyor (madde 16).
 */
export type FloorInstallation = {
  elements: InstallationElement[]
  lines: InstallationLine[]
  connections: InstallationConnection[]
}

export type FloorInstallationSource = {
  installationElements: readonly InstallationElement[]
  installationLines: readonly InstallationLine[]
  installationConnections: readonly InstallationConnection[]
}

/**
 * Hedefi kopyalanan kümeye taşır; hedef kümede DEĞİLSE null döner.
 *
 * `remapId`'nin aksine atmaz: bir uç kat dışındaki bir elemana bağlıysa o bağ
 * kopyalanamaz ama kopyalamanın tamamını da düşürmemeli — kayıt düşer, uç
 * serbest kalır (bağın YOKLUĞU zaten "serbest uç" demek).
 */
function remapTarget(
  target: InstallationEndpointTarget,
  elementRemap: IdRemap,
  lineRemap: IdRemap,
  pointRemap: IdRemap,
): InstallationEndpointTarget | null {
  if (target.kind === 'line') {
    const lineId = lineRemap.get(target.lineId)
    const pointId = pointRemap.get(target.pointId)
    if (lineId === undefined || pointId === undefined) return null
    return { kind: 'line', lineId, pointId }
  }

  // Elemana bağlı ucu `getTargetElementId` sorar: `kind === 'port'` denetimi
  // deşarj ağzını atlardı (bkz. installationModel.ts).
  const sourceElementId = getTargetElementId(target)
  if (sourceElementId === null) return null
  const elementId = elementRemap.get(sourceElementId)
  if (elementId === undefined) return null

  if (target.kind === 'port') return { kind: 'port', elementId, portId: target.portId }
  // Ağzın konumu SEMBOL YEREL uzayında; cihazla birlikte geldiği için değeri
  // aynen taşınır, ama diziler TAZE kopyalanır (aşağıdaki referans notu).
  return {
    kind: 'outlet',
    elementId,
    position: [target.position[0], target.position[1]],
    direction: [target.direction[0], target.direction[1]],
  }
}

/**
 * Bir katın tesisatını başka bir kata kopyalar (KK-15).
 *
 * Mimarideki İKİ GEÇİŞ kuralının aynısı (knowledge/floor-clone.md): önce her
 * kayda eskiId→yeniId, sonra her referans alanı haritadan geçer. Remap edilen
 * alanlar: `InstallationLineSegment.fromPointId/toPointId`,
 * `InstallationLinePoint.inlineElementId`, `InstallationConnection.lineId` ve
 * hedefin `elementId`/`lineId`/`pointId`'si.
 *
 * Nesne alanları (`position`, `labelOffsetCm`, ağzın dizileri) TAZE kopyalanır,
 * spread ile geçirilmez: paylaşılan bir `{x, y}` iki kayda birden bağlı kalır ve
 * kopyayı taşımak kaynağı da oynatırdı — hata vermeyen, mimarideki id tuzağının
 * tıpatıp aynısı.
 *
 * `takeId` id üretimini çağırana bırakır: core store'u tanımaz.
 */
export function cloneFloorInstallation(
  source: FloorInstallationSource,
  sourceFloorId: Id,
  targetFloorId: Id,
  takeId: () => Id,
): FloorInstallation {
  const sourceElements = source.installationElements.filter(
    (element) => element.floorId === sourceFloorId,
  )
  const sourceLines = source.installationLines.filter((line) => line.floorId === sourceFloorId)
  const sourceLineIds = new Set(sourceLines.map((line) => line.id))
  const sourceConnections = source.installationConnections.filter((connection) =>
    sourceLineIds.has(connection.lineId),
  )

  // Elemanlar ÖNCE: hat düğümündeki armatür (`inlineElementId`) ve bağlantı
  // hedefleri onların yeni id'lerini isteyecek.
  const elementRemap = createIdRemap(
    sourceElements.map((element) => element.id),
    takeId,
  )
  const elements = sourceElements.map((element) => ({
    id: remapId(elementRemap, element.id),
    floorId: targetFloorId,
    type: element.type,
    position: { x: element.position.x, y: element.position.y },
    angleDeg: element.angleDeg,
    scale: element.scale,
    ...(element.labelOffsetCm && {
      labelOffsetCm: { x: element.labelOffsetCm.x, y: element.labelOffsetCm.y },
    }),
  }))

  // Nokta haritası hatların TAMAMI için tek havuzda: branşmanın hedefi başka bir
  // hattın noktası olabiliyor (`kind: 'line'`), yani hat başına ayrı harita
  // tutmak o bağı çözemezdi.
  const lineRemap = createIdRemap(
    sourceLines.map((line) => line.id),
    takeId,
  )
  const pointRemap = createIdRemap(
    sourceLines.flatMap((line) => line.points.map((point) => point.id)),
    takeId,
  )

  const lines = sourceLines.map((line) => {
    const points: InstallationLinePoint[] = line.points.map((point) => ({
      id: remapId(pointRemap, point.id),
      position: { x: point.position.x, y: point.position.y },
      ...(point.inlineElementId !== undefined && {
        inlineElementId: remapId(elementRemap, point.inlineElementId),
      }),
    }))
    const segments: InstallationLineSegment[] = line.segments.map((segment) => ({
      id: takeId(),
      fromPointId: remapId(pointRemap, segment.fromPointId),
      toPointId: remapId(pointRemap, segment.toPointId),
    }))

    return {
      id: remapId(lineRemap, line.id),
      floorId: targetFloorId,
      kind: line.kind,
      pipeTypeName: line.pipeTypeName,
      points,
      segments,
    }
  })

  const connections: InstallationConnection[] = []
  for (const connection of sourceConnections) {
    const target = remapTarget(connection.target, elementRemap, lineRemap, pointRemap)
    if (!target) continue
    connections.push({
      lineId: remapId(lineRemap, connection.lineId),
      end: connection.end,
      target,
    })
  }

  return { elements, lines, connections }
}
