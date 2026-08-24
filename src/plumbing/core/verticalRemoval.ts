import {
  getTargetElementId,
  type InstallationConnection,
  type InstallationElement,
  type InstallationLine,
} from './installationModel'
import { getLinkedLinePoints, type LinkedLinePoint } from './lineCornerLink'
import { getLinePointElevationCm } from './lineElevation'
import { isSamePoint } from './lineGeometry'
import type { FloorPipeLink, Id } from '../../core/model'

export type ElevationShift = { lineId: Id; shiftCm: number }

/** Kat bağlantısının silinen ucunun yerine geçecek nokta. */
export type FloorLinkRepoint = { linkId: Id; side: 'below' | 'above'; pointId: Id }

/** Kat bağlantısı kopunca ÜST kattaki ağın olduğu gibi alt kata inmesi. */
export type FloorMove = {
  toFloorId: Id
  /** Kotlara eklenecek fark; kolon tabandan tavana gidiyorduysa sıfırdır. */
  shiftCm: number
  lineIds: readonly Id[]
  elementIds: readonly Id[]
  /** Taşınan uçları olan DİĞER kat bağlantılarının yeni kat kimliği. */
  linkFloorUpdates: readonly { linkId: Id; side: 'below' | 'above'; floorId: Id }[]
}

export type VerticalRemovalPlan = {
  shifts: readonly ElevationShift[]
  welds: readonly InstallationConnection[]
  linkRepoints: readonly FloorLinkRepoint[]
  floorMoves: readonly FloorMove[]
}

/** Plan boyu SIFIR boru = saf dikey bağlantı (K102). */
function isVerticalPipe(line: InstallationLine): boolean {
  const [first, last] = line.points
  return (
    line.kind === 'pipe' &&
    line.points.length === 2 &&
    first !== undefined &&
    last !== undefined &&
    isSamePoint(first.position, last.position)
  )
}

/** Hattın verilen noktasının KARŞI ucu — adımlar iki noktalı (K-W). */
function getOppositePointId(line: InstallationLine, pointId: Id): Id | undefined {
  return line.points.find((point) => point.id !== pointId)?.id
}

function getPointEnd(line: InstallationLine, pointId: Id): InstallationConnection['end'] | null {
  if (line.points[0]?.id === pointId) return 'start'
  if (line.points.at(-1)?.id === pointId) return 'end'
  return null
}

/** Bir köşeden yürüyerek ulaşılan hatlar; silinenlerin üstünden geçilmez. */
function collectReachableLineIds(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  from: LinkedLinePoint,
  blockedLineIds: ReadonlySet<Id>,
): Id[] {
  const visited = new Set<Id>(blockedLineIds)
  const queue: LinkedLinePoint[] = [from]
  const reached: Id[] = []

  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) break

    for (const link of getLinkedLinePoints(lines, connections, current.lineId, current.pointId)) {
      if (visited.has(link.lineId)) continue
      visited.add(link.lineId)
      reached.push(link.lineId)

      const line = lines.find((candidate) => candidate.id === link.lineId)
      if (!line) continue
      const oppositeId = getOppositePointId(line, link.pointId)
      if (oppositeId !== undefined) queue.push({ lineId: link.lineId, pointId: oppositeId })
    }
  }

  return reached
}

/** Silinen hatlara ait olmayan komşu köşeler. */
function getSurvivingNeighbors(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  point: LinkedLinePoint,
  removedLineIds: ReadonlySet<Id>,
): LinkedLinePoint[] {
  return getLinkedLinePoints(lines, connections, point.lineId, point.pointId).filter(
    (link) => link.lineId !== point.lineId && !removedLineIds.has(link.lineId),
  )
}

/** Taşınan hatların üstündeki armatürler ve uçlarına bağlı elemanlar. */
function collectElementIdsOnLines(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elements: readonly InstallationElement[],
  lineIds: ReadonlySet<Id>,
): Id[] {
  const collected = new Set<Id>()

  for (const line of lines) {
    if (!lineIds.has(line.id)) continue
    for (const point of line.points) {
      if (point.inlineElementId !== undefined) collected.add(point.inlineElementId)
    }
  }

  for (const connection of connections) {
    if (!lineIds.has(connection.lineId)) continue
    const elementId = getTargetElementId(connection.target)
    if (elementId !== null && elementId !== undefined) collected.add(elementId)
  }

  return elements.filter((element) => collected.has(element.id)).map((element) => element.id)
}

/** Taşınan elemanların EKLENTİ hatları: cihaz kolu, baca, havalandırma kanalı. */
function collectAttachmentLineIds(
  connections: readonly InstallationConnection[],
  elementIds: ReadonlySet<Id>,
  lineIds: ReadonlySet<Id>,
): Id[] {
  const collected = new Set<Id>()

  for (const connection of connections) {
    if (lineIds.has(connection.lineId)) continue
    const elementId = getTargetElementId(connection.target)
    if (elementId !== null && elementId !== undefined && elementIds.has(elementId)) {
      collected.add(connection.lineId)
    }
  }

  return [...collected]
}

/**
 * DİKEY bir boru silinince ağın kopmaması için gereken düzeltmeler (kullanıcı
 * kararı, 2026-08: "katlar arasında yükselti silinirse ona göre bir kayma olsun
 * ama kopukluk yaşanmasın").
 *
 * Silinen kolonun iki ucu AYNI plan konumundadır; aradan çıkınca geriye kalan
 * iki taraf zaten üst üste gelir. Dört düzeltme:
 *
 * 1. **Kot kayması** (`shifts`): kolonun ÜST ucundan AYNI KATTA ulaşılan
 *    hatların kotu silinen yükselti kadar aşağı çekilir — ağ sürekli kalır,
 *    yalnız altındaki yükselti gider.
 * 2. **Kaynak** (`welds`): iki tarafın çakışan uçları arasına bağlantı kaydı
 *    yazılır; yoksa noktalar üst üste durur ama ağ kopuk sayılırdı.
 * 3. **Kat inişi** (`floorMoves`): kolon bir `FloorPipeLink` ile ÜST kata
 *    geçiyorduysa oradaki ağ — borular, üstündeki armatürler, bağlı cihazlar ve
 *    onların kol/baca hatları — olduğu gibi ALT kata iner (kullanıcı isteği,
 *    2026-08: "alt kattan yükselti silinince yeni kattaki araçlar ve borular
 *    havada kalıyor, aşağıya kaydıralım"). Kot farkı üst uçtaki noktayı kolonun
 *    BAŞLANGIÇ kotuna taşır: kolon tabandan tavana gidiyorduysa (olağan hâl)
 *    kotlar hiç değişmez, yalnız kat değişir.
 * 4. **Kat bağlantısı** (`linkRepoints`): kat inişiyle çözülmeyen bir
 *    `FloorPipeLink` silinen uca bakıyorsa SİLİNMEZ, sağ kalan komşu uca taşınır.
 *
 * SINIR: inen ağın kendisi bir üst kata daha bağlanıyorsa o kat OLDUĞU YERDE
 * kalır, yalnız bağlantının ucu yeni kata güncellenir — çok katlı bir kolonun
 * ortasından parça silmek üst katları yeniden DİZMEZ.
 */
export function planVerticalRemoval(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elements: readonly InstallationElement[],
  floorPipeLinks: readonly FloorPipeLink[],
  removedLineIds: readonly Id[],
): VerticalRemovalPlan {
  const removed = new Set(removedLineIds)
  const shifts: ElevationShift[] = []
  const welds: InstallationConnection[] = []
  const linkRepoints: FloorLinkRepoint[] = []
  const floorMoves: FloorMove[] = []
  const consumedLinkIds = new Set<Id>()

  for (const line of lines) {
    if (!removed.has(line.id) || !isVerticalPipe(line)) continue

    const [startPoint, endPoint] = line.points
    const startHeightCm = line.pipe?.startHeightCm ?? 0
    const shiftCm = -((line.pipe?.endHeightCm ?? 0) - startHeightCm)

    const upperNeighbors = getSurvivingNeighbors(
      lines,
      connections,
      { lineId: line.id, pointId: endPoint.id },
      removed,
    )
    const lowerNeighbors = getSurvivingNeighbors(
      lines,
      connections,
      { lineId: line.id, pointId: startPoint.id },
      removed,
    )

    if (shiftCm !== 0) {
      for (const neighbor of upperNeighbors) {
        for (const lineId of collectReachableLineIds(lines, connections, neighbor, removed)) {
          if (shifts.some((shift) => shift.lineId === lineId)) continue
          shifts.push({ lineId, shiftCm })
        }
      }
    }

    const upper = upperNeighbors[0]
    const lower = lowerNeighbors[0]
    if (upper && lower) {
      const upperLine = lines.find((candidate) => candidate.id === upper.lineId)
      const end = upperLine ? getPointEnd(upperLine, upper.pointId) : null
      if (end !== null) {
        welds.push({
          lineId: upper.lineId,
          end,
          target: { kind: 'line', lineId: lower.lineId, pointId: lower.pointId },
        })
      }
    }

    // Kolonun tepesi bir üst kata geçiyorduysa oradaki ağ aşağı iner.
    const crossing = floorPipeLinks.find(
      (link) => link.belowPointId === endPoint.id && !consumedLinkIds.has(link.id),
    )
    const move = crossing
      ? planFloorMove(
          lines,
          connections,
          elements,
          floorPipeLinks,
          removed,
          crossing,
          line.floorId,
          startHeightCm,
        )
      : null
    if (crossing && move) {
      consumedLinkIds.add(crossing.id)
      floorMoves.push(move.floorMove)
      if (lower && move.weld) {
        welds.push({
          ...move.weld,
          target: { kind: 'line', lineId: lower.lineId, pointId: lower.pointId },
        })
      }
    }

    // Kat inişiyle çözülmeyen bağlantılar sağ kalan komşuya taşınır; komşu
    // yoksa çağıran taraftaki temizlik link'i zaten götürür.
    for (const link of floorPipeLinks) {
      if (consumedLinkIds.has(link.id)) continue

      if (link.belowPointId === endPoint.id || link.belowPointId === startPoint.id) {
        const replacement = link.belowPointId === endPoint.id ? upper : lower
        if (replacement) {
          linkRepoints.push({ linkId: link.id, side: 'below', pointId: replacement.pointId })
        }
      }
      if (link.abovePointId === endPoint.id || link.abovePointId === startPoint.id) {
        const replacement = link.abovePointId === endPoint.id ? upper : lower
        if (replacement) {
          linkRepoints.push({ linkId: link.id, side: 'above', pointId: replacement.pointId })
        }
      }
    }
  }

  return { shifts, welds, linkRepoints, floorMoves }
}

/** Bir kat bağlantısının ÜST ucundaki ağın alt kata inişi. */
function planFloorMove(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elements: readonly InstallationElement[],
  floorPipeLinks: readonly FloorPipeLink[],
  removedLineIds: ReadonlySet<Id>,
  crossing: FloorPipeLink,
  toFloorId: Id,
  targetElevationCm: number,
): { floorMove: FloorMove; weld: Omit<InstallationConnection, 'target'> | null } | null {
  const aboveLine = lines.find(
    (candidate) =>
      !removedLineIds.has(candidate.id) &&
      candidate.points.some((point) => point.id === crossing.abovePointId),
  )
  if (!aboveLine) return null

  const movedLineIds = new Set<Id>([
    aboveLine.id,
    ...collectReachableLineIds(
      lines,
      connections,
      { lineId: aboveLine.id, pointId: crossing.abovePointId },
      removedLineIds,
    ),
  ])

  const elementIds = collectElementIdsOnLines(lines, connections, elements, movedLineIds)
  for (const lineId of collectAttachmentLineIds(connections, new Set(elementIds), movedLineIds)) {
    movedLineIds.add(lineId)
  }

  // Üst uç kolonun BAŞLANGIÇ kotuna taşınır: fark, o noktanın şu anki kotuyla
  // hedef kot arasındaki mesafedir (olağan hâlde ikisi de sıfır, kayma yok).
  const shiftCm = targetElevationCm - getLinePointElevationCm(aboveLine, crossing.abovePointId)

  const movedPointIds = new Set(
    lines
      .filter((line) => movedLineIds.has(line.id))
      .flatMap((line) => line.points.map((point) => point.id)),
  )
  const linkFloorUpdates = floorPipeLinks.flatMap((link) => {
    if (link.id === crossing.id) return []
    const updates: { linkId: Id; side: 'below' | 'above'; floorId: Id }[] = []
    if (movedPointIds.has(link.belowPointId)) {
      updates.push({ linkId: link.id, side: 'below', floorId: toFloorId })
    }
    if (movedPointIds.has(link.abovePointId)) {
      updates.push({ linkId: link.id, side: 'above', floorId: toFloorId })
    }
    return updates
  })

  const end = getPointEnd(aboveLine, crossing.abovePointId)

  return {
    floorMove: { toFloorId, shiftCm, lineIds: [...movedLineIds], elementIds, linkFloorUpdates },
    weld: end === null ? null : { lineId: aboveLine.id, end },
  }
}
