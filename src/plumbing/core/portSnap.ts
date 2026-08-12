import { getElementWorldCorners, type SymbolMetadataLookup } from './elementPicking'
import { getTargetElementId } from './installationModel'
import type { InstallationConnection, InstallationElement } from './installationModel'
import { getPortWorldPosition } from './ports'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'

export type PortCandidate = {
  elementId: Id
  portId: string
  /** Portun plan koordinatı — hat ucu tam buraya oturur. */
  position: PlanPoint
}

/**
 * Doluluk `installationConnections`'tan TÜRETİLİR; eleman üzerinde ikinci bir
 * alan tutulmaz (Risk R10 — iki kaynak undo/yükleme sonrası ayrışırdı).
 */
export function isPortOccupied(
  connections: readonly InstallationConnection[],
  elementId: Id,
  portId: string,
): boolean {
  return connections.some(
    (connection) =>
      connection.target.kind === 'port' &&
      connection.target.elementId === elementId &&
      connection.target.portId === portId,
  )
}

/** Elemanın dönmüş kutusunun eksen hizalı sınırı — kaba eleme için. */
function isWithinElementReach(
  element: InstallationElement,
  getMetadata: SymbolMetadataLookup,
  point: PlanPoint,
  radiusCm: number,
): boolean {
  const corners = getElementWorldCorners(element, getMetadata(element.type))
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  return (
    point.x >= Math.min(...xs) - radiusCm &&
    point.x <= Math.max(...xs) + radiusCm &&
    point.y >= Math.min(...ys) - radiusCm &&
    point.y <= Math.max(...ys) + radiusCm
  )
}

/**
 * İmlece en yakın BOŞ port. Dolu portlar aday değildir: aynı porta ikinci hat
 * bağlanamaz. Yarıçap piksel tabanlı gelir (çağıran zoom'a böler), böylece
 * yakalama uzaklığı ekranda sabit hissedilir.
 *
 * Önce eleman kutusuyla kaba eleme, sonra port mesafesi; karşılaştırma mesafe
 * KARELERİ üzerinden yapılır, kare kök hesaplanmaz (Bölüm 15).
 */
export function findNearestFreePort(
  elements: readonly InstallationElement[],
  connections: readonly InstallationConnection[],
  getMetadata: SymbolMetadataLookup,
  cursor: PlanPoint,
  radiusCm: number,
): PortCandidate | null {
  if (radiusCm <= 0) return null

  const maxDistanceSquared = radiusCm * radiusCm
  let nearest: PortCandidate | null = null
  let nearestDistanceSquared = Number.POSITIVE_INFINITY

  for (const element of elements) {
    if (!isWithinElementReach(element, getMetadata, cursor, radiusCm)) continue

    const metadata = getMetadata(element.type)
    for (const port of metadata.ports) {
      if (isPortOccupied(connections, element.id, port.id)) continue

      const position = getPortWorldPosition(element, port, metadata)
      const dx = position.x - cursor.x
      const dy = position.y - cursor.y
      const distanceSquared = dx * dx + dy * dy
      if (distanceSquared > maxDistanceSquared || distanceSquared >= nearestDistanceSquared) continue

      nearest = { elementId: element.id, portId: port.id, position }
      nearestDistanceSquared = distanceSquared
    }
  }

  return nearest
}

/** Hattın ucu bağlı mı — serbest uç görsel olarak farklı çizilir (KK-7). */
export function isLineEndConnected(
  connections: readonly InstallationConnection[],
  lineId: Id,
  end: InstallationConnection['end'],
): boolean {
  return connections.some(
    (connection) => connection.lineId === lineId && connection.end === end,
  )
}

/**
 * Uç bir ELEMAN portuna mı bağlı. Hat-hat bağı (zincirin bir sonraki adımı,
 * branşman, cihaz kolu) sayılmaz: o uç hâlâ elle sürüklenebilir bir köşedir,
 * porta bağlı olan ise yalnız elemanı taşıyarak hareket eder.
 */
export function isLineEndOnPort(
  connections: readonly InstallationConnection[],
  lineId: Id,
  end: InstallationConnection['end'],
): boolean {
  return connections.some(
    (connection) =>
      connection.lineId === lineId &&
      connection.end === end &&
      getTargetElementId(connection.target) !== null,
  )
}
