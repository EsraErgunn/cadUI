import { APPLIANCE_TYPE_LABELS, type ApplianceType } from './elementProperties'
import { getTargetElementId } from './installationModel'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from './installationModel'
import { getLineEndPointId, getLinkedLinePoints } from './lineCornerLink'
import type { PipeTypeName } from './pipeTypes'
import { isBurnerAppliance } from './symbolMetadata'
import type { InstallationElementType } from './symbolMetadata'
import type { Id } from '../../core/model'

/**
 * Sayaç bazlı "Birim / Cihaz Bilgileri" çıktısı — backend'in tükettiği JSON bu
 * tipin karşılığı. Sayaç → boru/armatür/cihaz izlenebilirliği gerçek hat
 * grafiğinden (installationConnections) türer, ikinci bir "hangi eleman hangi
 * sayaca ait" alanı AYRICA tutulmaz (bkz. port-connections.md: doluluk hep
 * bağlantı kaydından türer, ikinci kaynak eklenmez).
 */
export type MeterReportDevice = {
  elementId: Id
  type: InstallationElementType
  brand: string
  model: string
  capacity: string
  flowCubicMeterPerHour: number
  /** "Baca" sütunu — Hermetik/Bacalı. Ocak'ta (Stove) bu ayrım YOK, boş kalır. */
  flueLabel: string
}

export type MeterReportRow = {
  meterElementId: Id
  meterOrder: number
  unitNumber: string
  subscriberName: string
  subscriberNo: string
  classLabel: string
  flowCubicMeterPerHour: number
  pressureMbar: number
  areaSquareMeters: number
  /** Sayacın çıkışından okunan ilk hattın çapı; hiç hat yoksa null. */
  pipeTypeName: PipeTypeName | null
  /** İzlenebilirlik: bu sayacın alt ağacındaki armatür (vana, regülatör…) id'leri. */
  fittingElementIds: Id[]
  devices: MeterReportDevice[]
}

type MeterSubtree = {
  pipeTypeName: PipeTypeName | null
  fittingElementIds: Id[]
  devices: MeterReportDevice[]
}

/** Gaz TAŞIMAYAN hat türleri izlenmez (baca/havalandırma — CLAUDE.md K27/webcad-format). */
const NON_GAS_LINE_KINDS: ReadonlySet<InstallationLine['kind']> = new Set([
  'chimney',
  'ventilationDuct',
])

function findElement(
  elements: readonly InstallationElement[],
  elementId: Id,
): InstallationElement | undefined {
  return elements.find((element) => element.id === elementId)
}

function findLine(lines: readonly InstallationLine[], lineId: Id): InstallationLine | undefined {
  return lines.find((line) => line.id === lineId)
}

/** Ocak'ta (Stove) hermetik/bacalı ayrımı YOK — `undefined` döner, "Baca" boş kalır. */
function getApplianceType(element: InstallationElement): ApplianceType | undefined {
  switch (element.type) {
    case 'spaceHeater':
      return element.spaceHeater?.applianceType
    case 'waterHeater':
      return element.waterHeater?.applianceType
    case 'combiBoiler':
      return element.combiBoiler?.applianceType
    case 'boiler':
      return element.boiler?.applianceType
    case 'otherAppliance':
      return element.otherAppliance?.classLabel
    default:
      return undefined
  }
}

function buildDevice(element: InstallationElement): MeterReportDevice {
  const properties =
    element.stove ??
    element.spaceHeater ??
    element.waterHeater ??
    element.combiBoiler ??
    element.boiler ??
    element.otherAppliance
  const applianceType = getApplianceType(element)

  return {
    elementId: element.id,
    type: element.type,
    brand: properties?.brand ?? '',
    model: properties?.model ?? '',
    capacity: properties?.capacity ?? '',
    flowCubicMeterPerHour: properties?.flowCubicMeterPerHour ?? 0,
    flueLabel: applianceType === undefined ? '' : APPLIANCE_TYPE_LABELS[applianceType],
  }
}

/**
 * Bir sayacın `out` portundan başlayıp gaz hattı grafiğinde ileri doğru gezinir.
 * Armatürler (`inlineElementId`) yol boyunca toplanır ama dallanma yaratmaz;
 * BAŞKA bir sayaca ya da yakıcı cihaza varılınca o dal biter. Köşe/branşman
 * gezinmesi `lineCornerLink.ts`'teki (taşıma yayılımının da kullandığı) ORTAK
 * `getLinkedLinePoints` ile yapılır — ikinci bir bağlantı-grafiği yazılmaz.
 */
function traceMeterSubtree(
  meterId: Id,
  elements: readonly InstallationElement[],
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
): MeterSubtree {
  const outConnection = connections.find(
    (connection) =>
      connection.target.kind === 'port' &&
      connection.target.elementId === meterId &&
      connection.target.portId === 'out',
  )
  if (!outConnection) return { pipeTypeName: null, fittingElementIds: [], devices: [] }

  const startPointId = getLineEndPointId(lines, outConnection.lineId, outConnection.end)
  if (startPointId === undefined) return { pipeTypeName: null, fittingElementIds: [], devices: [] }

  const visitedLineIds = new Set<Id>()
  const visitedElementIds = new Set<Id>([meterId])
  const fittingElementIds: Id[] = []
  const devices: MeterReportDevice[] = []
  let pipeTypeName: PipeTypeName | null = null

  const queue: { lineId: Id; entryPointId: Id }[] = [
    { lineId: outConnection.lineId, entryPointId: startPointId },
  ]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    if (visitedLineIds.has(current.lineId)) continue

    const line = findLine(lines, current.lineId)
    if (!line || NON_GAS_LINE_KINDS.has(line.kind)) continue
    visitedLineIds.add(current.lineId)
    pipeTypeName ??= line.pipeTypeName

    for (const point of line.points) {
      if (point.inlineElementId === undefined) continue
      if (visitedElementIds.has(point.inlineElementId)) continue
      visitedElementIds.add(point.inlineElementId)
      fittingElementIds.push(point.inlineElementId)
    }

    const startId = line.points[0]?.id
    const endId = line.points.at(-1)?.id
    if (current.entryPointId !== startId && current.entryPointId !== endId) continue
    const otherEnd = current.entryPointId === startId ? 'end' : 'start'
    const otherEndPointId = otherEnd === 'end' ? endId : startId
    if (otherEndPointId === undefined) continue

    const portConnection = connections.find(
      (connection) =>
        connection.lineId === current.lineId &&
        connection.end === otherEnd &&
        connection.target.kind === 'port',
    )
    if (portConnection) {
      const targetElementId = getTargetElementId(portConnection.target)
      const targetElement = targetElementId === null ? undefined : findElement(elements, targetElementId)
      if (targetElement && !visitedElementIds.has(targetElement.id)) {
        visitedElementIds.add(targetElement.id)
        if (isBurnerAppliance(targetElement.type)) devices.push(buildDevice(targetElement))
        // gasMeter hedefi bilerek YOK SAYILIR: komşu dairenin sayacına geçilmez.
      }
      continue
    }

    const linked = getLinkedLinePoints(lines, connections, current.lineId, otherEndPointId)
    for (const link of linked) {
      if (link.lineId === current.lineId) continue
      if (visitedLineIds.has(link.lineId)) continue
      queue.push({ lineId: link.lineId, entryPointId: link.pointId })
    }
  }

  return { pipeTypeName, fittingElementIds, devices }
}

/**
 * "Birim / Cihaz Bilgileri" raporu — her sayaç için bir satır, `meterOrder`'a
 * göre sıralı. Backend bunu doğrudan tüketir: `fittingElementIds` ve
 * `devices[].elementId` gerçek çizim elemanlarına iz sürer.
 */
export function buildMeterReport(project: {
  installationElements: InstallationElement[]
  installationLines: InstallationLine[]
  installationConnections: InstallationConnection[]
}): MeterReportRow[] {
  const meters = project.installationElements.filter((element) => element.type === 'gasMeter')

  const rows = meters.map((meter): MeterReportRow => {
    const gasMeter = meter.gasMeter
    const subtree = traceMeterSubtree(
      meter.id,
      project.installationElements,
      project.installationLines,
      project.installationConnections,
    )

    return {
      meterElementId: meter.id,
      meterOrder: gasMeter?.meterOrder ?? 0,
      unitNumber: gasMeter?.unitNumber ?? '',
      subscriberName: gasMeter?.subscriberName ?? '',
      subscriberNo: gasMeter?.subscriberNo ?? '',
      classLabel: gasMeter?.classLabel ?? '',
      flowCubicMeterPerHour: gasMeter?.flowCubicMeterPerHour ?? 0,
      pressureMbar: gasMeter?.pressureMbar ?? 0,
      areaSquareMeters: gasMeter?.areaSquareMeters ?? 0,
      pipeTypeName: subtree.pipeTypeName,
      fittingElementIds: subtree.fittingElementIds,
      devices: subtree.devices,
    }
  })

  return rows.sort((a, b) => a.meterOrder - b.meterOrder)
}
