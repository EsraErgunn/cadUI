import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from './installationModel'
import type { PlanPoint } from '../../core/coords'
import { snapPointToGrid } from '../../core/grid'
import type { Id } from '../../core/model'

/**
 * Panoya id KOPYALANMAZ: yapıştırma her seferinde yeni id üretir (kural 6).
 * floorId de yok — yapıştırma AKTİF kata düşer, kopyalandığı kata değil.
 */
export type ClipboardEntry = Pick<InstallationElement, 'type' | 'position' | 'angleDeg' | 'scale'>

/** Hattın geometrisi; bağlar ayrı listede (`ClipboardConnection`) taşınır. */
export type LineClipboardEntry = Pick<InstallationLine, 'kind' | 'pipeTypeName'> & {
  points: PlanPoint[]
}

/**
 * Kopyalanan bağ. id TAŞIMAZ (kural 6: id yeniden üretilmez) — panodaki
 * DİZİNLERE bakar, yapıştırma bunları yeni id'lere çevirir. Yalnız iki ucu da
 * seçimin İÇİNDE kalan bağlar kopyalanır: dışarıdaki bir sayaca bağlanmak
 * kopyayı kaynağın portuna takardı (bir port = bir bağlantı).
 */
export type ClipboardConnection =
  | { kind: 'port'; lineIndex: number; end: 'start' | 'end'; elementIndex: number; portId: string }
  | {
      kind: 'line'
      lineIndex: number
      end: 'start' | 'end'
      targetLineIndex: number
      targetPointIndex: number
    }
  /** Boruya OTURAN armatür (vana, regülatör…): düğüm ile eleman aynı şey (K-W3). */
  | { kind: 'inline'; lineIndex: number; pointIndex: number; elementIndex: number }

/** Panonun tamamı; üç liste de aynı dizinlerle konuşur, birlikte üretilir. */
export type ClipboardPayload = {
  elements: ClipboardEntry[]
  lines: LineClipboardEntry[]
  connections: ClipboardConnection[]
}

/** Kopya kaynağının üstüne düşmez: kullanıcı ikisini ayırt edebilmeli (Ctrl+D ile aynı pay). */
export const PASTE_OFFSET_CM = 50

/**
 * Seçimi panoya çevirir. Üç liste TEK yerde üretilir çünkü bağlar dizinlere
 * bakıyor: eleman/hat listeleri başka bir yerde ayrıca süzülseydi sıralamalar
 * ayrışır ve bağlar YANLIŞ nesneye bağlanırdı.
 *
 * Kopya kaynağın davranışını taşır: boruyla sayacı birlikte kopyalayan
 * kullanıcı, yapıştırdığında da bağlı bir çift bekler (eskiden ikisi de serbest
 * geliyordu — taşıyınca birbirinden ayrılıyorlardı).
 */
export function toClipboardPayload(
  elements: readonly InstallationElement[],
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elementIds: readonly Id[],
  lineIds: readonly Id[],
): ClipboardPayload {
  const copiedElements = elements.filter((element) => elementIds.includes(element.id))
  const copiedLines = lines.filter((line) => lineIds.includes(line.id))

  const elementIndexById = new Map(copiedElements.map((element, index) => [element.id, index]))
  const lineIndexById = new Map(copiedLines.map((line, index) => [line.id, index]))

  const copiedConnections: ClipboardConnection[] = []

  for (const connection of connections) {
    const lineIndex = lineIndexById.get(connection.lineId)
    if (lineIndex === undefined) continue

    // Ayrı değişken: `target` bir ayrık birleşim, daraltma bir sonraki
    // satırdaki `findIndex` geri çağrımına taşınmıyor.
    const { target } = connection
    if (target.kind === 'port') {
      const elementIndex = elementIndexById.get(target.elementId)
      if (elementIndex === undefined) continue

      copiedConnections.push({
        kind: 'port',
        lineIndex,
        end: connection.end,
        elementIndex,
        portId: target.portId,
      })
      continue
    }

    const targetLineIndex = lineIndexById.get(target.lineId)
    if (targetLineIndex === undefined) continue

    const targetPointIndex = copiedLines[targetLineIndex].points.findIndex(
      (point) => point.id === target.pointId,
    )
    if (targetPointIndex < 0) continue

    copiedConnections.push({
      kind: 'line',
      lineIndex,
      end: connection.end,
      targetLineIndex,
      targetPointIndex,
    })
  }

  copiedLines.forEach((line, lineIndex) => {
    line.points.forEach((point, pointIndex) => {
      if (point.inlineElementId === undefined) return

      const elementIndex = elementIndexById.get(point.inlineElementId)
      if (elementIndex === undefined) return

      copiedConnections.push({ kind: 'inline', lineIndex, pointIndex, elementIndex })
    })
  })

  return {
    elements: copiedElements.map((element) => ({
      type: element.type,
      position: element.position,
      angleDeg: element.angleDeg,
      scale: element.scale,
    })),
    lines: copiedLines.map((line) => ({
      kind: line.kind,
      pipeTypeName: line.pipeTypeName,
      points: line.points.map((point) => point.position),
    })),
    connections: copiedConnections,
  }
}

export function shiftClipboardEntries(
  entries: readonly ClipboardEntry[],
  deltaCm: PlanPoint,
): ClipboardEntry[] {
  return entries.map((entry) => ({
    ...entry,
    position: { x: entry.position.x + deltaCm.x, y: entry.position.y + deltaCm.y },
  }))
}

export function shiftLineClipboardEntries(
  entries: readonly LineClipboardEntry[],
  deltaCm: PlanPoint,
): LineClipboardEntry[] {
  return entries.map((entry) => ({
    ...entry,
    points: entry.points.map((point) => ({ x: point.x + deltaCm.x, y: point.y + deltaCm.y })),
  }))
}

/**
 * Panodaki her şeyin sınır kutusunun merkezi; pano boşsa null. Eleman
 * SEMBOLÜNÜN sınırı değil origin'i sayılır (metadata bu katmana girmez):
 * tek eleman yapıştırırken origin imlecin tam altına düşer, bu da en okunur
 * davranış.
 */
export function getClipboardCenter(
  elementEntries: readonly ClipboardEntry[],
  lineEntries: readonly LineClipboardEntry[],
): PlanPoint | null {
  const points = [
    ...elementEntries.map((entry) => entry.position),
    ...lineEntries.flatMap((entry) => entry.points),
  ]
  if (points.length === 0) return null

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

/**
 * Yapıştırmanın kayması. İmleç biliniyorsa panonun MERKEZİ oraya oturur —
 * kullanıcı kopyayı nereye koyacağını fareyle söylüyor.
 *
 * İmleç yoksa (imleç tuvale hiç girmeden Ctrl+V) kaçıncı yapıştırma olduğuna
 * göre artan sabit paya düşülür: sabit pay olsaydı arka arkaya iki Ctrl+V
 * ikinci kopyayı birincinin TAM üstüne koyar, kullanıcı tek eleman gördüğü için
 * yapıştırmanın çalışmadığını sanırdı.
 */
export function getPasteDeltaCm(
  elementEntries: readonly ClipboardEntry[],
  lineEntries: readonly LineClipboardEntry[],
  cursor: PlanPoint | null,
  pasteStepCount: number,
  gridStepCm = 0,
): PlanPoint {
  const center = cursor && getClipboardCenter(elementEntries, lineEntries)
  if (!center || !cursor) {
    const offsetCm = pasteStepCount * PASTE_OFFSET_CM
    return { x: offsetCm, y: offsetCm }
  }

  const deltaCm = { x: cursor.x - center.x, y: cursor.y - center.y }
  // Yuvarlanan KONUM değil KAYMA: kaynak ızgaradaysa kopya da ızgarada kalır.
  // İmleç merkezlense (konum yuvarlansa) merkezi yarım adım kaçık bir seçim
  // tüm köşeleri ızgara dışına taşırdı. İmleç en fazla yarım adım ıskalanır.
  return gridStepCm > 0 ? snapPointToGrid(deltaCm, gridStepCm) : deltaCm
}
