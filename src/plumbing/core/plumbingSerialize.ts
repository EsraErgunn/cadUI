import { z } from 'zod'

import type {
  ApplianceType,
  FilterKitProperties,
  GasMeterProperties,
  InsulationProperties,
  OtherApplianceProperties,
  RegulatorProperties,
  SolenoidValveProperties,
  StoveProperties,
  StrainerMeterProperties,
  ValveProperties,
} from './elementProperties'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationEndpointTarget,
  InstallationLine,
  InstallationLinePoint,
  InstallationLineSegment,
} from './installationModel'
import type {
  BranchLineProperties,
  ChimneyLineProperties,
  PipeLineProperties,
  VentilationDuctLineProperties,
} from './lineProperties'
import { PIPE_TYPE_NAMES } from './pipeTypes'
import { INSTALLATION_ELEMENT_TYPES } from './symbolMetadata'

/**
 * Tesisatın kendi format sözleşmesi — core/serialize.ts (mimari) ile AYNI disiplin:
 * alanlar tek tek yeniden kurulur (spread yok), store'a sızmış fazladan bir alan
 * dosyaya taşınmaz. Bu, kendi iç şeklimiz — plnr.webcad.com.tr ile bit-bit uyum
 * HEDEFLENMEDİ (bkz. docs/webcad-format.md, knowledge/webcad-json-format.md'deki
 * açık sorular). `core/model.ts`'e bu dosyanın şema + toJson'ları üzerinden bağlanır.
 */
const idSchema = z.number().int()

const planPointSchema = z.object({ x: z.number(), y: z.number() })

function toPlanPointJson(point: { x: number; y: number }) {
  return { x: point.x, y: point.y }
}

const applianceTypeSchema = z.enum(['hermetic', 'flued'])
const otherApplianceKindSchema = z.enum(['hob', 'oven'])

function toRegulatorJson(properties: RegulatorProperties) {
  return {
    brand: properties.brand,
    model: properties.model,
    pressure: properties.pressure,
    description: properties.description,
  }
}

function toInsulationJson(properties: InsulationProperties) {
  return {
    isGrounded: properties.isGrounded,
    groundingType: properties.groundingType,
    description: properties.description,
  }
}

function toGasMeterJson(properties: GasMeterProperties) {
  return {
    classLabel: properties.classLabel,
    inletConsumptionPoint: properties.inletConsumptionPoint,
    outletConsumptionPoint: properties.outletConsumptionPoint,
    isIndoor: properties.isIndoor,
    isAccessible247: properties.isAccessible247,
    hasCorrector: properties.hasCorrector,
    meterOrder: properties.meterOrder,
    unitNumber: properties.unitNumber,
    subscriberName: properties.subscriberName,
    subscriberNo: properties.subscriberNo,
    flowCubicMeterPerHour: properties.flowCubicMeterPerHour,
    pressureMbar: properties.pressureMbar,
    areaSquareMeters: properties.areaSquareMeters,
  }
}

function toFilterKitJson(properties: FilterKitProperties) {
  return {
    kit: properties.kit,
    brand: properties.brand,
    model: properties.model,
    description: properties.description,
  }
}

function toValveJson(properties: ValveProperties) {
  return { type: properties.type, description: properties.description }
}

function toStrainerMeterJson(properties: StrainerMeterProperties) {
  return { classLabel: properties.classLabel, description: properties.description }
}

function toSolenoidValveJson(properties: SolenoidValveProperties) {
  return { type: properties.type, brand: properties.brand, model: properties.model }
}

function toStoveJson(properties: StoveProperties) {
  return {
    brand: properties.brand,
    model: properties.model,
    description: properties.description,
    capacity: properties.capacity,
    power: properties.power,
    flowCubicMeterPerHour: properties.flowCubicMeterPerHour,
  }
}

/** Soba/Kombi/Şofben/Kazan aynı şekli taşır (bkz. elementProperties.ts — kasıtlı küçük tekrar). */
function toBurnerApplianceJson(properties: {
  applianceType: ApplianceType
  brand: string
  model: string
  description: string
  capacity: string
  power: string
  flowCubicMeterPerHour?: number
}) {
  return {
    applianceType: properties.applianceType,
    brand: properties.brand,
    model: properties.model,
    description: properties.description,
    capacity: properties.capacity,
    power: properties.power,
    flowCubicMeterPerHour: properties.flowCubicMeterPerHour,
  }
}

function toOtherApplianceJson(properties: OtherApplianceProperties) {
  return {
    type: properties.type,
    classLabel: properties.classLabel,
    brand: properties.brand,
    model: properties.model,
    description: properties.description,
    capacity: properties.capacity,
    power: properties.power,
    flowCubicMeterPerHour: properties.flowCubicMeterPerHour,
  }
}

const regulatorPropertiesSchema = z.object({
  brand: z.string(),
  model: z.string(),
  pressure: z.string(),
  description: z.string(),
})

const insulationPropertiesSchema = z.object({
  isGrounded: z.boolean(),
  groundingType: z.string(),
  description: z.string(),
})

/**
 * meterOrder/abone-birim/ölçü alanları SONRADAN eklendi (2026-08): eski
 * kayıtlarda `gasMeter` nesnesi var ama bu alanlar yok. `.optional()` —
 * `.default()` DEĞİL: `axisId`/`labelOffsetCm` (model.ts) ile AYNI gerekçe,
 * varsayılan bir değer YAZSAYDI docs/sample-project.json gibi eski dosyalar
 * hiç dokunulmamışken bile "bit bit aynı" kabul testini kırardı (yokluk,
 * sıfır DEĞİLDİR). Alan yalnız kullanıcı gerçekten dokunup kaydedince yazılır.
 */
const gasMeterPropertiesSchema = z.object({
  classLabel: z.string(),
  inletConsumptionPoint: z.string(),
  outletConsumptionPoint: z.string(),
  isIndoor: z.boolean(),
  isAccessible247: z.boolean(),
  hasCorrector: z.boolean(),
  meterOrder: z.number().optional(),
  unitNumber: z.string().optional(),
  subscriberName: z.string().optional(),
  subscriberNo: z.string().optional(),
  flowCubicMeterPerHour: z.number().optional(),
  pressureMbar: z.number().optional(),
  areaSquareMeters: z.number().optional(),
})

const filterKitPropertiesSchema = z.object({
  kit: z.string(),
  brand: z.string(),
  model: z.string(),
  description: z.string(),
})

const valvePropertiesSchema = z.object({ type: z.string(), description: z.string() })

const strainerMeterPropertiesSchema = z.object({ classLabel: z.string(), description: z.string() })

const solenoidValvePropertiesSchema = z.object({
  type: z.string(),
  brand: z.string(),
  model: z.string(),
})

/** `flowCubicMeterPerHour` ("Debi") SONRADAN eklendi — gasMeterPropertiesSchema'daki
 * `.optional()` gerekçesiyle aynı, bit-bit tur için `.default()` KULLANILMAZ. */
const stovePropertiesSchema = z.object({
  brand: z.string(),
  model: z.string(),
  description: z.string(),
  capacity: z.string(),
  power: z.string(),
  flowCubicMeterPerHour: z.number().optional(),
})

const burnerAppliancePropertiesSchema = z.object({
  applianceType: applianceTypeSchema,
  brand: z.string(),
  model: z.string(),
  description: z.string(),
  capacity: z.string(),
  power: z.string(),
  flowCubicMeterPerHour: z.number().optional(),
})

const otherAppliancePropertiesSchema = z.object({
  type: otherApplianceKindSchema,
  classLabel: applianceTypeSchema,
  brand: z.string(),
  model: z.string(),
  description: z.string(),
  capacity: z.string(),
  power: z.string(),
  flowCubicMeterPerHour: z.number().optional(),
})

export const installationElementSchema = z.object({
  id: idSchema,
  floorId: idSchema,
  type: z.enum(INSTALLATION_ELEMENT_TYPES),
  position: planPointSchema,
  angleDeg: z.number(),
  scale: z.number(),
  labelOffsetCm: planPointSchema.optional(),
  regulator: regulatorPropertiesSchema.optional(),
  insulation: insulationPropertiesSchema.optional(),
  gasMeter: gasMeterPropertiesSchema.optional(),
  filterKit: filterKitPropertiesSchema.optional(),
  valve: valvePropertiesSchema.optional(),
  strainerMeter: strainerMeterPropertiesSchema.optional(),
  solenoidValve: solenoidValvePropertiesSchema.optional(),
  stove: stovePropertiesSchema.optional(),
  spaceHeater: burnerAppliancePropertiesSchema.optional(),
  combiBoiler: burnerAppliancePropertiesSchema.optional(),
  waterHeater: burnerAppliancePropertiesSchema.optional(),
  boiler: burnerAppliancePropertiesSchema.optional(),
  otherAppliance: otherAppliancePropertiesSchema.optional(),
})

export function toInstallationElementJson(element: InstallationElement) {
  return {
    id: element.id,
    floorId: element.floorId,
    type: element.type,
    position: toPlanPointJson(element.position),
    angleDeg: element.angleDeg,
    scale: element.scale,
    labelOffsetCm: element.labelOffsetCm && toPlanPointJson(element.labelOffsetCm),
    regulator: element.regulator && toRegulatorJson(element.regulator),
    insulation: element.insulation && toInsulationJson(element.insulation),
    gasMeter: element.gasMeter && toGasMeterJson(element.gasMeter),
    filterKit: element.filterKit && toFilterKitJson(element.filterKit),
    valve: element.valve && toValveJson(element.valve),
    strainerMeter: element.strainerMeter && toStrainerMeterJson(element.strainerMeter),
    solenoidValve: element.solenoidValve && toSolenoidValveJson(element.solenoidValve),
    stove: element.stove && toStoveJson(element.stove),
    spaceHeater: element.spaceHeater && toBurnerApplianceJson(element.spaceHeater),
    combiBoiler: element.combiBoiler && toBurnerApplianceJson(element.combiBoiler),
    waterHeater: element.waterHeater && toBurnerApplianceJson(element.waterHeater),
    boiler: element.boiler && toBurnerApplianceJson(element.boiler),
    otherAppliance: element.otherAppliance && toOtherApplianceJson(element.otherAppliance),
  }
}

const pipeLinePropertiesSchema = z.object({
  startHeightCm: z.number(),
  endHeightCm: z.number(),
  description: z.string(),
})

const chimneyLinePropertiesSchema = z.object({
  type: z.string(),
  startHeightCm: z.number(),
  endHeightCm: z.number(),
})

const branchLinePropertiesSchema = z.object({ elevationCm: z.number() })

const ventilationDuctLinePropertiesSchema = z.object({
  isSubDuct: z.boolean(),
  isForced: z.boolean(),
})

function toPipeLineJson(properties: PipeLineProperties) {
  return {
    startHeightCm: properties.startHeightCm,
    endHeightCm: properties.endHeightCm,
    description: properties.description,
  }
}

function toChimneyLineJson(properties: ChimneyLineProperties) {
  return {
    type: properties.type,
    startHeightCm: properties.startHeightCm,
    endHeightCm: properties.endHeightCm,
  }
}

function toBranchLineJson(properties: BranchLineProperties) {
  return { elevationCm: properties.elevationCm }
}

function toVentilationDuctLineJson(properties: VentilationDuctLineProperties) {
  return { isSubDuct: properties.isSubDuct, isForced: properties.isForced }
}

const installationLinePointSchema = z.object({
  id: idSchema,
  position: planPointSchema,
  inlineElementId: idSchema.optional(),
})

const installationLineSegmentSchema = z.object({
  id: idSchema,
  fromPointId: idSchema,
  toPointId: idSchema,
})

function toInstallationLinePointJson(point: InstallationLinePoint) {
  return {
    id: point.id,
    position: toPlanPointJson(point.position),
    inlineElementId: point.inlineElementId,
  }
}

function toInstallationLineSegmentJson(segment: InstallationLineSegment) {
  return { id: segment.id, fromPointId: segment.fromPointId, toPointId: segment.toPointId }
}

export const installationLineSchema = z.object({
  id: idSchema,
  floorId: idSchema,
  kind: z.enum(['pipe', 'branch', 'branchStub', 'applianceStub', 'chimney', 'ventilationDuct']),
  pipeTypeName: z.enum(PIPE_TYPE_NAMES),
  points: z.array(installationLinePointSchema),
  segments: z.array(installationLineSegmentSchema),
  pipe: pipeLinePropertiesSchema.optional(),
  chimney: chimneyLinePropertiesSchema.optional(),
  branch: branchLinePropertiesSchema.optional(),
  ventilationDuct: ventilationDuctLinePropertiesSchema.optional(),
})

export function toInstallationLineJson(line: InstallationLine) {
  return {
    id: line.id,
    floorId: line.floorId,
    kind: line.kind,
    pipeTypeName: line.pipeTypeName,
    points: line.points.map(toInstallationLinePointJson),
    segments: line.segments.map(toInstallationLineSegmentJson),
    pipe: line.pipe && toPipeLineJson(line.pipe),
    chimney: line.chimney && toChimneyLineJson(line.chimney),
    branch: line.branch && toBranchLineJson(line.branch),
    ventilationDuct: line.ventilationDuct && toVentilationDuctLineJson(line.ventilationDuct),
  }
}

const vec2Schema = z.tuple([z.number(), z.number()])

export const installationEndpointTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('port'), elementId: idSchema, portId: z.string() }),
  z.object({
    kind: z.literal('outlet'),
    elementId: idSchema,
    position: vec2Schema,
    direction: vec2Schema,
  }),
  z.object({ kind: z.literal('line'), lineId: idSchema, pointId: idSchema }),
])

function toEndpointTargetJson(target: InstallationEndpointTarget) {
  if (target.kind === 'port') {
    return { kind: 'port' as const, elementId: target.elementId, portId: target.portId }
  }
  if (target.kind === 'outlet') {
    return {
      kind: 'outlet' as const,
      elementId: target.elementId,
      position: [target.position[0], target.position[1]] as [number, number],
      direction: [target.direction[0], target.direction[1]] as [number, number],
    }
  }
  return { kind: 'line' as const, lineId: target.lineId, pointId: target.pointId }
}

export const installationConnectionSchema = z.object({
  lineId: idSchema,
  end: z.enum(['start', 'end']),
  target: installationEndpointTargetSchema,
})

export function toInstallationConnectionJson(connection: InstallationConnection) {
  return {
    lineId: connection.lineId,
    end: connection.end,
    target: toEndpointTargetJson(connection.target),
  }
}
