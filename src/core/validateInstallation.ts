import type { Floor, Id } from './model'
import { getBoundsAround } from './planBounds'
import { findFloorRoomAt, type FloorRoomTopology } from './roomTopology'
import { getRoomName, hasArchitecturePlan } from './validateArchitecture'
import { validateDischarge } from './validateDischarge'
import { validateGasNetwork } from './validateGasNetwork'
import {
  VALIDATION_MESSAGES,
  type ValidationFocus,
  type ValidationIssue,
  type ValidationSource,
} from './validationModel'
import { INSTALLATION_ELEMENT_TYPE_LABELS } from '../plumbing/core/elementLabels'
import type { InstallationElement } from '../plumbing/core/installationModel'
import { isBurnerAppliance } from '../plumbing/core/symbolMetadata'

/** Yakıcı cihazın marka/model alanları TÜRÜNE göre ayrı torbalarda (elementProperties.ts). */
function getApplianceIdentity(
  element: InstallationElement,
): { brand: string; model: string } | undefined {
  if (element.type === 'stove') return element.stove
  if (element.type === 'spaceHeater') return element.spaceHeater
  if (element.type === 'waterHeater') return element.waterHeater
  if (element.type === 'combiBoiler') return element.combiBoiler
  if (element.type === 'boiler') return element.boiler
  if (element.type === 'otherAppliance') return element.otherAppliance
  return undefined
}

export function getElementFocus(elements: readonly InstallationElement[]): ValidationFocus | undefined {
  const bounds = getBoundsAround(elements.map((element) => element.position))
  if (!bounds) return undefined

  return {
    view: 'installation',
    elementIds: elements.map((element) => element.id),
    lineIds: [],
    bounds,
  }
}

export function getElementLabel(element: InstallationElement): string {
  return INSTALLATION_ELEMENT_TYPE_LABELS[element.type]
}

/**
 * Elemanın hangi mahalde durduğu; mahal dışındaysa `undefined`. Künyedeki
 * "Mahal: X" satırı ve menfez kuralının gruplaması aynı hesabı kullanıyor.
 */
export function findElementRoomName(
  topology: FloorRoomTopology,
  element: InstallationElement,
): string | undefined {
  const entry = findFloorRoomAt(topology, element.position)
  return entry ? getRoomName(entry) : undefined
}

/**
 * Katta çizilmiş bir tesisat var mı (doküman Hata1, ikinci yarısı)? Eleman VEYA
 * hat yeterli: servis kutusu konup borusu henüz çekilmemiş bir kat da
 * "başlanmış" sayılır, kullanıcı boş bir katmış gibi uyarılmamalı.
 */
function hasInstallationPlan(source: ValidationSource, floorId: Id): boolean {
  return (
    source.installationElements.some((element) => element.floorId === floorId) ||
    source.installationLines.some((line) => line.floorId === floorId)
  )
}

function validateAppliances(
  appliances: readonly InstallationElement[],
  topology: FloorRoomTopology,
  floor: Floor,
  hasPlan: boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const appliance of appliances) {
    const roomName = findElementRoomName(topology, appliance)
    const identity = getApplianceIdentity(appliance)

    if (!identity || identity.brand.trim() === '' || identity.model.trim() === '') {
      issues.push({
        key: `applianceBrandModel:${appliance.id}`,
        ruleId: 'applianceBrandModel',
        message: VALIDATION_MESSAGES.applianceBrandModel,
        location: { floorId: floor.id, roomName, elementLabel: getElementLabel(appliance) },
        focus: getElementFocus([appliance]),
      })
    }

    // Mimari plan yokken HER cihaz mahal dışında kalır: tek eksikten onlarca
    // satır doğurmak yerine "mimari kat planı çizilmelidir" satırı konuşsun.
    if (hasPlan && roomName === undefined) {
      issues.push({
        key: `applianceInsideRoom:${appliance.id}`,
        ruleId: 'applianceInsideRoom',
        message: VALIDATION_MESSAGES.applianceInsideRoom,
        location: { floorId: floor.id, elementLabel: getElementLabel(appliance) },
        focus: getElementFocus([appliance]),
      })
    }
  }

  return issues
}

/** Doküman Hata7: sayacın birim ve abone no alanları dolu olmalı. */
function validateMeters(
  source: ValidationSource,
  topology: FloorRoomTopology,
  floor: Floor,
): ValidationIssue[] {
  return source.installationElements
    .filter((element) => element.floorId === floor.id && element.type === 'gasMeter')
    .filter((meter) => {
      // Alanlar OPSİYONEL (eski kayıtlarda hiç yok) — yokluğu da boşluk sayılır.
      const properties = meter.gasMeter
      return (
        (properties?.unitNumber ?? '').trim() === '' ||
        (properties?.subscriberNo ?? '').trim() === ''
      )
    })
    .map((meter) => ({
      key: `meterSubscriberInfo:${meter.id}`,
      ruleId: 'meterSubscriberInfo' as const,
      message: VALIDATION_MESSAGES.meterSubscriberInfo,
      location: {
        floorId: floor.id,
        roomName: findElementRoomName(topology, meter),
        elementLabel: getElementLabel(meter),
      },
      focus: getElementFocus([meter]),
    }))
}

export function validateFloorInstallation(
  source: ValidationSource,
  floor: Floor,
  topology: FloorRoomTopology,
): ValidationIssue[] {
  if (!hasInstallationPlan(source, floor.id)) {
    return [
      {
        key: `installationPlan:${floor.id}`,
        ruleId: 'installationPlan',
        message: VALIDATION_MESSAGES.installationPlan,
        location: { floorId: floor.id },
      },
    ]
  }

  const hasPlan = hasArchitecturePlan(source, floor.id)
  const appliances = source.installationElements.filter(
    (element) => element.floorId === floor.id && isBurnerAppliance(element.type),
  )

  return [
    ...validateAppliances(appliances, topology, floor, hasPlan),
    ...validateMeters(source, topology, floor),
    ...validateGasNetwork(source, floor),
    ...(hasPlan ? validateDischarge(source, topology, floor, appliances) : []),
  ]
}
