import { APPLIANCE_TYPE_LABELS, type ApplianceType } from './elementProperties'
import { getTargetElementId } from './installationModel'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from './installationModel'
import { getLinkedLinePoints } from './lineCornerLink'
import type { PipeTypeName } from './pipeTypes'
import { isBurnerAppliance } from './symbolMetadata'
import type { InstallationElementType } from './symbolMetadata'
import type { FloorPipeLink, Id } from '../../core/model'

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
  /** Sayacın ÇIKIŞINDAN erişilen borular — kaskad silmede kullanılır (bkz. `collectMeterDownstreamInstallation`). */
  lineIds: Id[]
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

/**
 * Bir elemanın `out` portuna bağlı hat ucu — sayacın kendi başlangıcı İÇİN de,
 * araya giren GEÇİŞ elemanları (regülatör, süzme sayaç, filtre kiti, solenoid
 * vana…) İÇİN de aynı arama. Bunlar `onLine` modunda genelde `inlineElementId`
 * ile boruya oturur, ama model bunu ZORUNLU kılmaz — port zinciriyle ayrı
 * elemanlar olarak da bağlanabilirler (bkz. docs/sample-project.json), bu
 * yüzden yalnız inline armatürleri değil, port zincirindeki ARA elemanları da
 * atlamadan geçmek gerekir.
 */
function findOutConnection(
  connections: readonly InstallationConnection[],
  elementId: Id,
): InstallationConnection | undefined {
  return connections.find(
    (connection) =>
      connection.target.kind === 'port' &&
      connection.target.elementId === elementId &&
      connection.target.portId === 'out',
  )
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

function findLineIdByPointId(lines: readonly InstallationLine[], pointId: Id): Id | undefined {
  return lines.find((line) => line.points.some((point) => point.id === pointId))?.id
}

/**
 * Bir sayacın `out` portundan başlayıp gaz hattı grafiğinde ileri doğru gezinir.
 * Armatürler (`inlineElementId`) yol boyunca toplanır ama dallanma yaratmaz;
 * BAŞKA bir sayaca ya da yakıcı cihaza varılınca o dal biter. Köşe/branşman
 * gezinmesi `lineCornerLink.ts`'teki (taşıma yayılımının da kullandığı) ORTAK
 * `getLinkedLinePoints` ile yapılır — ikinci bir bağlantı-grafiği yazılmaz.
 *
 * `floorPipeLinks` VARSAYILAN BOŞ: `buildMeterReport` bunu HİÇ vermez —
 * malzeme dökümü kat bağlantısının İKİ AYRI UCUNU birbirine karıştırmamalı
 * (model.ts notu, "hidrolik olarak birleştirmez"). Yalnız
 * `collectMeterDownstreamInstallation` (silme kaskadı) doldurur: kaynağı
 * silinince karşı kattaki devam borusu köksüz kalmasın diye.
 */
function traceMeterSubtree(
  meterId: Id,
  elements: readonly InstallationElement[],
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  floorPipeLinks: readonly FloorPipeLink[] = [],
): MeterSubtree {
  const outConnection = findOutConnection(connections, meterId)
  if (!outConnection) return { pipeTypeName: null, fittingElementIds: [], devices: [], lineIds: [] }

  const visitedLineIds = new Set<Id>()
  const visitedElementIds = new Set<Id>([meterId])
  const fittingElementIds: Id[] = []
  const devices: MeterReportDevice[] = []
  let pipeTypeName: PipeTypeName | null = null
  const queue: Id[] = [outConnection.lineId]

  const enqueueElementOutput = (elementId: Id) => {
    const nextOut = findOutConnection(connections, elementId)
    if (nextOut) queue.push(nextOut.lineId)
  }

  /**
   * Bir hattın TEK ucu. İKİ şey AYNI köşede birden olabilir, biri diğerini
   * ELEMEZ: uç bir elemanın portuna bağlı OLABİLİR ("port") VE aynı köşeye
   * başka hatlar da branşmanla tutunmuş OLABİLİR ("line") — bkz.
   * sample-project.json: solenoid vananın ÇIKIŞ portu tam da altı cihaza
   * dallanan ortak köşenin kendisi. Bu yüzden ikisi de her uçta ayrı ayrı
   * kontrol edilir, biri bulununca diğeri atlanmaz.
   */
  const handleEnd = (lineId: Id, end: InstallationConnection['end'], pointId: Id) => {
    const ownConnection = connections.find((c) => c.lineId === lineId && c.end === end)
    if (ownConnection?.target.kind === 'port') {
      const targetElementId = getTargetElementId(ownConnection.target)
      const targetElement =
        targetElementId === null ? undefined : findElement(elements, targetElementId)
      if (targetElement && !visitedElementIds.has(targetElement.id)) {
        visitedElementIds.add(targetElement.id)
        if (isBurnerAppliance(targetElement.type)) {
          devices.push(buildDevice(targetElement))
        } else if (targetElement.type !== 'gasMeter') {
          // Geçiş elemanı (regülatör, süzme sayaç, filtre kiti, solenoid vana,
          // manometre…): armatür olarak kaydedilir ve KENDİ çıkış portundan
          // devam edilir — burada durursak ardındaki hiçbir cihaza ulaşılmaz.
          fittingElementIds.push(targetElement.id)
          enqueueElementOutput(targetElement.id)
        }
        // gasMeter hedefi bilerek YOK SAYILIR: komşu dairenin sayacına geçilmez.
      }
    }

    const linked = getLinkedLinePoints(lines, connections, lineId, pointId)
    for (const link of linked) {
      if (link.lineId === lineId) continue
      if (visitedLineIds.has(link.lineId)) continue
      queue.push(link.lineId)
    }

    for (const floorLink of floorPipeLinks) {
      const pairedPointId =
        floorLink.belowPointId === pointId
          ? floorLink.abovePointId
          : floorLink.abovePointId === pointId
            ? floorLink.belowPointId
            : undefined
      if (pairedPointId === undefined) continue

      const pairedLineId = findLineIdByPointId(lines, pairedPointId)
      if (pairedLineId !== undefined && !visitedLineIds.has(pairedLineId)) queue.push(pairedLineId)
    }
  }

  while (queue.length > 0) {
    const lineId = queue.shift()
    if (lineId === undefined) break
    if (visitedLineIds.has(lineId)) continue

    const line = findLine(lines, lineId)
    if (!line || NON_GAS_LINE_KINDS.has(line.kind)) continue
    visitedLineIds.add(lineId)
    pipeTypeName ??= line.pipeTypeName

    for (const point of line.points) {
      if (point.inlineElementId === undefined) continue
      if (visitedElementIds.has(point.inlineElementId)) continue
      visitedElementIds.add(point.inlineElementId)
      fittingElementIds.push(point.inlineElementId)
    }

    const startId = line.points[0]?.id
    const endId = line.points.at(-1)?.id
    if (startId !== undefined) handleEnd(lineId, 'start', startId)
    if (endId !== undefined) handleEnd(lineId, 'end', endId)
  }

  return { pipeTypeName, fittingElementIds, devices, lineIds: [...visitedLineIds] }
}

/** Sayaç silme kaskadı: ÇIKIŞINDAN erişilen ağ (armatür/cihaz/boru) da gider —
 * sayaç dalın tek girişi, komşu sayaca geçilmez (`traceMeterSubtree` kuralı).
 * `floorPipeLinks` verilirse (kullanıcı isteği, 2026-08) kat bağlantısıyla
 * devam eden borular da kapsama girer, `floorIds` hangi katların etkilendiğini
 * söyler. */
export function collectMeterDownstreamInstallation(
  meterId: Id,
  elements: readonly InstallationElement[],
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  floorPipeLinks: readonly FloorPipeLink[] = [],
): { elementIds: Id[]; lineIds: Id[]; floorIds: Id[] } {
  const subtree = traceMeterSubtree(meterId, elements, lines, connections, floorPipeLinks)
  const floorIds = [
    ...new Set(
      subtree.lineIds
        .map((lineId) => lines.find((line) => line.id === lineId)?.floorId)
        .filter((floorId): floorId is Id => floorId !== undefined),
    ),
  ]
  return {
    elementIds: [meterId, ...subtree.fittingElementIds, ...subtree.devices.map((d) => d.elementId)],
    lineIds: subtree.lineIds,
    floorIds,
  }
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
