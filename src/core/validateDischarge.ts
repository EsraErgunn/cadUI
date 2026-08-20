import type { Floor, Id, PointSymbol } from './model'
import { getBoundsAround } from './planBounds'
import { findFloorRoomAt, isWallOpenToOutside, type FloorRoomTopology } from './roomTopology'
import { getRoomFocus, getRoomKey, getRoomName } from './validateArchitecture'
import { VALIDATION_MESSAGES, type ValidationIssue, type ValidationSource } from './validationModel'
import { INSTALLATION_ELEMENT_TYPE_LABELS } from '../plumbing/core/elementLabels'
import {
  getTargetElementId,
  type InstallationElement,
  type InstallationLine,
} from '../plumbing/core/installationModel'

type WallVent = Extract<PointSymbol, { attachment: 'wall' }>

function isWallVent(symbol: PointSymbol): symbol is WallVent {
  return symbol.type === 'vent' && symbol.attachment === 'wall'
}

/**
 * Bacanın DEŞARJ ucu: cihaza tutunmayan uç. Baca cihazın ağzından çizilmeye
 * başlıyor (`dischargeStart.ts`), yani bağlantı kaydı taşıyan uç cihaz tarafı;
 * kural öbür ucu soruyor. İki uç da bağlıysa ya da hiçbiri değilse son köşe
 * kullanılır — çizim yönü zaten cihazdan dışarı doğru.
 */
function getDischargeEndPosition(line: InstallationLine, source: ValidationSource) {
  const isStartOnElement = source.installationConnections.some(
    (connection) =>
      connection.lineId === line.id &&
      connection.end === 'start' &&
      getTargetElementId(connection.target) !== null,
  )
  const isEndOnElement = source.installationConnections.some(
    (connection) =>
      connection.lineId === line.id &&
      connection.end === 'end' &&
      getTargetElementId(connection.target) !== null,
  )

  if (isEndOnElement && !isStartOnElement) return line.points[0].position
  return line.points[line.points.length - 1].position
}

function findApplianceOnLine(
  line: InstallationLine,
  source: ValidationSource,
): InstallationElement | undefined {
  for (const connection of source.installationConnections) {
    if (connection.lineId !== line.id) continue

    const elementId = getTargetElementId(connection.target)
    if (elementId === null) continue

    const element = source.installationElements.find((candidate) => candidate.id === elementId)
    if (element) return element
  }

  return undefined
}

/** Doküman Hata9: bacanın deşarj ucu mahal içinde kalmamalı. */
function validateFlues(
  source: ValidationSource,
  topology: FloorRoomTopology,
  floor: Floor,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const line of source.installationLines) {
    if (line.floorId !== floor.id || line.kind !== 'chimney') continue

    const position = getDischargeEndPosition(line, source)
    if (!findFloorRoomAt(topology, position)) continue

    const appliance = findApplianceOnLine(line, source)
    const bounds = getBoundsAround(line.points.map((point) => point.position))
    issues.push({
      key: `flueOutsideRoom:${line.id}`,
      ruleId: 'flueOutsideRoom',
      message: VALIDATION_MESSAGES.flueOutsideRoom,
      location: {
        floorId: floor.id,
        elementLabel: appliance ? INSTALLATION_ELEMENT_TYPE_LABELS[appliance.type] : undefined,
      },
      focus: bounds
        ? { view: 'installation', elementIds: [], lineIds: [line.id], bounds }
        : undefined,
    })
  }

  return issues
}

/**
 * Doküman Hata10: yakıcı cihaz bulunan her mahalde menfez olmalı ve o menfez
 * ATMOSFERE açılmalı.
 *
 * "Atmosfere açılır" = menfezin durduğu duvarın bir yüzü dışarıya bakar. İki
 * mahali ayıran duvardaki menfez havayı yalnız yan odaya verir; dokümandaki iki
 * görselin farkı tam olarak bu.
 *
 * Serbest (duvara oturmayan) menfez SAYILMAZ: neyin içinden dışarı açıldığı
 * belli değil, "belki açılıyordur" diye hatayı gizlemek kuralı işlevsiz kılardı.
 */
function validateRoomVents(
  source: ValidationSource,
  topology: FloorRoomTopology,
  floor: Floor,
  appliances: readonly InstallationElement[],
): ValidationIssue[] {
  const wallIdsOnFloor = new Set<Id>(
    source.walls.filter((wall) => wall.floorId === floor.id).map((wall) => wall.id),
  )
  const ventWallIds = new Set<Id>(
    source.symbols
      .filter(isWallVent)
      .filter((vent) => wallIdsOnFloor.has(vent.wallId))
      .map((vent) => vent.wallId),
  )

  // Aynı mahaldeki birden çok cihaz TEK satır üretir: eksik olan menfez, cihaz değil.
  const roomsWithAppliance = new Map<string, ReturnType<typeof findFloorRoomAt>>()
  for (const appliance of appliances) {
    const entry = findFloorRoomAt(topology, appliance.position)
    if (!entry) continue

    roomsWithAppliance.set(getRoomKey(entry), entry)
  }

  const issues: ValidationIssue[] = []

  for (const [roomKey, entry] of roomsWithAppliance) {
    if (!entry) continue

    const hasAtmosphericVent = [...new Set(entry.face.wallIds)].some(
      (wallId) => ventWallIds.has(wallId) && isWallOpenToOutside(topology, wallId),
    )
    if (hasAtmosphericVent) continue

    issues.push({
      key: `roomVent:${floor.id}:${roomKey}`,
      ruleId: 'roomVent',
      message: VALIDATION_MESSAGES.roomVent,
      location: { floorId: floor.id, roomName: getRoomName(entry) },
      focus: getRoomFocus(entry),
    })
  }

  return issues
}

export function validateDischarge(
  source: ValidationSource,
  topology: FloorRoomTopology,
  floor: Floor,
  appliances: readonly InstallationElement[],
): ValidationIssue[] {
  return [
    ...validateFlues(source, topology, floor),
    ...validateRoomVents(source, topology, floor, appliances),
  ]
}
