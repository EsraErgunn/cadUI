import { getTargetElementId, type InstallationConnection, type InstallationLine } from './installationModel'
import { getFloorLinkAnchoredPointIds, getLineEndPointId } from './lineCornerLink'
import type { FloorPipeLink, Id } from '../../core/model'

export type ResizeShiftTargets = {
  /** Kaymayla ÖTELENECEK hat noktaları — taşınan ucun KENDİSİ dahil DEĞİL. */
  pointIds: Set<Id>
  /** Aynı kaymayla ötelenecek elemanlar (dirsek üstündeki vana, sayaç, cihaz…). */
  elementIds: Set<Id>
  /** Bütünüyle ötelenen hatlar — kot farkı da bunlara uygulanır. */
  lineIds: Set<Id>
}

type Frontier = { pointIds: Set<Id>; elementIds: Set<Id>; lineIds: Set<Id> }

/**
 * "Boy" alanıyla bir borunun ucu kaydırıldığında AYNI KAYMAYLA ötelenecek olan
 * alt ağ (kullanıcı isteği, 2026-08). Köşe sürüklemesinden (`moveTargets.ts`)
 * FARKLI bir kural: orada seçim rijit gider ve aradaki borular ESNER; burada
 * boyu değişen boru dışında hiçbir şey esnemez — ucuna bağlı dirsek, vana ve
 * DEVAM BORULARI bütünüyle ötelenir, boru ağının o dalı olduğu gibi kayar.
 *
 * Yayılım kuralları (kararlı hâle gelene kadar tekrarlanır):
 * 1. Hat-hat kaynağı iki yönlü okunur (`lineCornerLink.ts` ile aynı gerekçe).
 * 2. Bir elemanın portuna oturan uç kayıyorsa ELEMAN da kayar, tersi de doğru —
 *    port çapası burada yayılımı DURDURMAZ (`moveTargets.ts`'in aksine): boru
 *    esnemediği için elemanın yerinde kalması ağı koparırdı.
 * 3. Bir düğümün üstündeki armatür düğümüyle gelir.
 * 4. Boyu değişen hat DIŞINDAKİ bir hattın herhangi bir noktası kayıyorsa o hat
 *    BÜTÜNÜYLE kayar (rijit öteleme) ve kot farkını da alır.
 *
 * İki durak var:
 * - Boyu değişen hattın öteki noktaları SABİT (başlangıç ucu yerinde kalır);
 *   yayılım onların üstünden geçmez, yoksa bir çevrim borunun kendi başını da
 *   kaydırırdı.
 * - `FloorPipeLink` ucu taşıyan hat HİÇ ötelenmez: linkin sakladığı `position`
 *   ve karşı kattaki eşi burada kayamaz (K104), o boru esner. Bilinen sınır.
 */
export function resolvePipeResizeShift(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  floorPipeLinks: readonly FloorPipeLink[],
  resizedLineId: Id,
  movedPointId: Id,
): ResizeShiftTargets {
  const resizedLine = lines.find((candidate) => candidate.id === resizedLineId)
  if (!resizedLine) return { pointIds: new Set(), elementIds: new Set(), lineIds: new Set() }

  const fixedPointIds = new Set(
    resizedLine.points.filter((point) => point.id !== movedPointId).map((point) => point.id),
  )
  const floorLinkAnchored = getFloorLinkAnchoredPointIds(floorPipeLinks)
  const rigidLines = lines.filter(
    (line) =>
      line.id !== resizedLineId && !line.points.some((point) => floorLinkAnchored.has(point.id)),
  )

  const frontier: Frontier = {
    pointIds: new Set([movedPointId]),
    elementIds: new Set(),
    lineIds: new Set(),
  }

  const addPoint = (pointId: Id | undefined): boolean => {
    if (pointId === undefined) return false
    if (fixedPointIds.has(pointId) || floorLinkAnchored.has(pointId)) return false
    if (frontier.pointIds.has(pointId)) return false

    frontier.pointIds.add(pointId)
    return true
  }

  const addElement = (elementId: Id): boolean => {
    if (frontier.elementIds.has(elementId)) return false

    frontier.elementIds.add(elementId)
    return true
  }

  let isChanged = true
  while (isChanged) {
    isChanged = false

    for (const connection of connections) {
      const ownPointId = getLineEndPointId(lines, connection.lineId, connection.end)
      if (ownPointId === undefined) continue

      if (connection.target.kind === 'line') {
        const hostPointId = connection.target.pointId
        if (frontier.pointIds.has(ownPointId)) isChanged = addPoint(hostPointId) || isChanged
        if (frontier.pointIds.has(hostPointId)) isChanged = addPoint(ownPointId) || isChanged
        continue
      }

      const targetElementId = getTargetElementId(connection.target)
      if (targetElementId === null) continue
      if (frontier.pointIds.has(ownPointId)) isChanged = addElement(targetElementId) || isChanged
      if (frontier.elementIds.has(targetElementId)) isChanged = addPoint(ownPointId) || isChanged
    }

    for (const line of lines) {
      for (const point of line.points) {
        if (point.inlineElementId === undefined) continue
        if (frontier.pointIds.has(point.id)) isChanged = addElement(point.inlineElementId) || isChanged
        if (frontier.elementIds.has(point.inlineElementId)) isChanged = addPoint(point.id) || isChanged
      }
    }

    for (const line of rigidLines) {
      if (!line.points.some((point) => frontier.pointIds.has(point.id))) continue

      if (!frontier.lineIds.has(line.id)) {
        frontier.lineIds.add(line.id)
        isChanged = true
      }
      for (const point of line.points) isChanged = addPoint(point.id) || isChanged
    }
  }

  // Taşınan ucun kendisi çağıranda TAM hedefe oturuyor; kaymayla ikinci kez
  // ötelenmesin diye kümeden düşer.
  frontier.pointIds.delete(movedPointId)
  return frontier
}
