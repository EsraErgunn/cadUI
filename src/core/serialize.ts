import { z } from 'zod'

import { DEFAULT_FLOOR_HEIGHT_CM } from './model'
import type {
  AreaObject,
  Beam,
  Floor,
  FloorPipeLink,
  Opening,
  Point,
  PointSymbol,
  ProjectData,
  Room,
  TextLabel,
  Wall,
} from './model'
import { ROOM_USAGE_TYPES } from './roomUsage'
import type { IsometricAngles } from '../isometric/core/isometricProjection'
import {
  installationConnectionSchema,
  installationElementSchema,
  installationLineSchema,
  toInstallationConnectionJson,
  toInstallationElementJson,
  toInstallationLineJson,
} from '../plumbing/core/plumbingSerialize'


/**
 * Dış kaynaktan gelen JSON şemadan geçmeden state'e girmez (CLAUDE.md güvenlik).
 * Şema yalnız ŞEKLİ doğrular; "p1Id diye bir Point var mı" gibi bütünlük
 * soruları core/validate.ts'in işi — burada tekrarlanmaz.
 */
const idSchema = z.number().int()

/**
 * `heightCm`/`isBasement` modele SONRADAN geldi; depodaki çizimlerde yok. Zorunlu
 * tutulursa o dosyalar HİÇ AÇILMAZ — varsayılan, tek katlı bir binanın makul
 * hâli (300 cm, bodrum değil). Bkz. projectDataSchema'daki aynı gerekçe.
 */
const floorSchema = z.object({
  id: idSchema,
  name: z.string(),
  heightCm: z.number().default(DEFAULT_FLOOR_HEIGHT_CM),
  isBasement: z.boolean().default(false),
})

const pointSchema = z.object({
  id: idSchema,
  floorId: idSchema,
  x: z.number(),
  y: z.number(),
})

const wallSchema = z.object({
  id: idSchema,
  floorId: idSchema,
  p1Id: idSchema,
  p2Id: idSchema,
  thickness: z.number(),
  height: z.number(),
})

const openingSchema = z.object({
  id: idSchema,
  wallId: idSchema,
  offsetCm: z.number(),
  widthCm: z.number(),
  type: z.enum(['door', 'window']),
})

const roomSchema = z.object({
  id: idSchema,
  wallIds: z.array(idSchema),
  // `name` K117'de KALKTI. Eski kayıtlarda alan hâlâ olabilir; zod tanımadığı
  // anahtarı sessizce düşürür, yani dosyalar açılmaya devam eder.
  usageType: z.enum(ROOM_USAGE_TYPES).optional(),
})

const symbolTypeSchema = z.enum([
  'mainCutoffSwitch',
  'panel',
  'lighting',
  'fireExtinguisher',
  'alarmDevice',
  'earthquakeSensor',
  'vent',
])

/**
 * Ayrık birleşim: duvara bağlı sembol `x/y/floorId/rotationDeg` TAŞIMAZ, serbest
 * sembol `wallId/offsetCm` taşımaz. Tek nesnede opsiyonel alanlarla toplanırsa
 * "duvara bağlı ama x'i de var" gibi geçersiz kayıtlar şemadan geçerdi.
 */
const symbolAttachmentSchema = z.discriminatedUnion('attachment', [
  z.object({
    id: idSchema,
    type: symbolTypeSchema,
    label: z.string(),
    note: z.string(),
    attachment: z.literal('wall'),
    wallId: idSchema,
    offsetCm: z.number(),
    isMountedOnFarFace: z.boolean(),
  }),
  z.object({
    id: idSchema,
    type: symbolTypeSchema,
    label: z.string(),
    note: z.string(),
    attachment: z.literal('free'),
    floorId: idSchema,
    x: z.number(),
    y: z.number(),
    rotationDeg: z.number(),
  }),
])

/**
 * `attachment` alanı OLMAYAN sembol, o alan modele girmeden önce kaydedilmiş
 * demektir; o hâliyle her sembol serbestti (floorId + x/y + rotationDeg). Eksik
 * ayırt edici zorunlu tutulursa dosya HİÇ AÇILMAZ ve kullanıcının çizimi
 * elimizde olduğu hâlde erişilemez kalır — depodaki projeler bir kez bu yüzden
 * açılamadı.
 *
 * Şema alan EKLEMENİN ötesinde bir değişiklik (alanların yeri, ayırt edicinin
 * gelmesi) yaparken göç yolu buraya yazılır. Sonraki kayıtta alan dosyaya
 * yazılır ve preprocess bir daha devreye girmez.
 */
const pointSymbolSchema = z.preprocess((value) => {
  if (typeof value !== 'object' || value === null || 'attachment' in value) return value
  return { ...value, attachment: 'free' }
}, symbolAttachmentSchema)

const areaObjectTypeSchema = z.enum(['stairs', 'structuralColumn', 'flueShaft', 'columnVentilation'])

const areaObjectSchema = z.object({
  id: idSchema,
  type: areaObjectTypeSchema,
  floorId: idSchema,
  x: z.number(),
  y: z.number(),
  widthCm: z.number(),
  lengthCm: z.number(),
  angleDeg: z.number(),
  label: z.string(),
  // Etiket kayması SONRADAN eklendi ve yalnız kullanıcı etiketi taşıyınca yazılır:
  // opsiyonel, çünkü eski dosyalarda da hiç taşınmamış nesnelerde de YOK.
  labelOffsetCm: z.object({ x: z.number(), y: z.number() }).optional(),
  // Düşey eksen kimliği (K63). Etiket kaymasıyla aynı gerekçeyle opsiyonel:
  // yalnız baca şaftı/kolon havalandırması taşır ve K63 ÖNCESİ dosyalarda hiç
  // yok. Varsayılan ATANMAZ — `.default(0)` gibi bir değer, kimliği olmayan
  // nesneleri "hepsi aynı eksen" diye birbirine bağlardı.
  axisId: idSchema.optional(),
})

const beamSchema = z.object({
  id: idSchema,
  floorId: idSchema,
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  thicknessCm: z.number(),
  label: z.string(),
})

const floorPipeLinkSchema = z.object({
  id: idSchema,
  belowFloorId: idSchema,
  aboveFloorId: idSchema,
  belowPointId: idSchema,
  abovePointId: idSchema,
  position: z.object({ x: z.number(), y: z.number() }),
})

const textLabelSchema = z.object({
  id: idSchema,
  floorId: idSchema,
  x: z.number(),
  y: z.number(),
  text: z.string(),
  heightCm: z.number(),
  angleDeg: z.number(),
})

/**
 * Modele SONRADAN eklenen diziler `.default([])` taşır: depodaki çizimler o
 * alanlar yokken kaydedildi ve zorunlu tutulursa "expected array, received
 * undefined" ile HİÇ AÇILMAZ — kullanıcının verisi elimizde ama erişilemez olur.
 *
 * Bit-bit turu bozulmaz: `serializeProjectData` bu alanları her zaman yazıyor,
 * yani bu sürümün kaydettiği dosya tam alan kümesiyle geri okunur. Varsayılan
 * yalnız ESKİ dosyaların ilk açılışında devreye girer, sonraki kayıtta alan
 * dosyaya yazılır. Yeni alan eklerken aynı şey yapılmalı.
 */
const isometricAnglesSchema = z.object({
  alphaDeg: z.number(),
  betaDeg: z.number(),
})

export const projectDataSchema = z.object({
  nextUniqueId: idSchema,
  activeFloorId: idSchema,
  floors: z.array(floorSchema),
  points: z.array(pointSchema),
  walls: z.array(wallSchema),
  openings: z.array(openingSchema),
  rooms: z.array(roomSchema).default([]),
  symbols: z.array(pointSymbolSchema).default([]),
  areaObjects: z.array(areaObjectSchema).default([]),
  beams: z.array(beamSchema).default([]),
  texts: z.array(textLabelSchema).default([]),
  // Tesisat üçlüsü de SONRADAN eklendi (aynı gerekçe): depodaki hiçbir çizimde
  // henüz yok, zorunlu tutulursa hiçbiri açılmaz.
  installationElements: z.array(installationElementSchema).default([]),
  installationLines: z.array(installationLineSchema).default([]),
  installationConnections: z.array(installationConnectionSchema).default([]),
  // Kat bağlantı işaretleri de SONRADAN eklendi, aynı gerekçe.
  floorPipeLinks: z.array(floorPipeLinkSchema).default([]),
  // `.optional()` — `.default()` DEĞİL: varsayılan yazsaydı alanı hiç
  // taşımayan eski kayıtlar açılıp kaydedilince yeni bir anahtar kazanır ve
  // bit-bit kabul testi kırılırdı (bkz. model.ts'teki gerekçe).
  isometricAngles: isometricAnglesSchema.optional(),
})

export class ProjectDataParseError extends Error {
  // Parametre özelliği (`constructor(readonly issues)`) kullanılmıyor:
  // tsconfig'te erasableSyntaxOnly açık, o söz dizimi emit gerektirir.
  readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    super(`Çizim dosyası okunamadı: ${issues.join('; ')}`)
    this.name = 'ProjectDataParseError'
    this.issues = issues
  }
}

/** JSON metni → model. Bozuk/eksik veri ProjectDataParseError ile REDDEDİLİR. */
export function parseProjectJson(rawJson: string): ProjectData {
  let raw: unknown
  try {
    raw = JSON.parse(rawJson)
  } catch {
    throw new ProjectDataParseError(['geçerli bir JSON değil'])
  }

  return parseProjectData(raw)
}

export function parseProjectData(raw: unknown): ProjectData {
  const result = projectDataSchema.safeParse(raw)
  if (!result.success) {
    throw new ProjectDataParseError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    )
  }

  return result.data
}

/**
 * Model → JSON metni. Alan sırası ELLE sabitlenmiştir: JSON.stringify ekleme
 * sırasını izler, bu yüzden sıra kabul testinin ("bit bit aynı") dayanağıdır.
 * Alanlar tek tek yazılıyor, spread kullanılmıyor — store'a bir gün eklenen
 * geçici bir alan kaydedilen JSON'a sızmasın.
 *
 * Sayılar YUVARLANMAZ: JSON.stringify zaten round-trip'i garanti eden en kısa
 * gösterimi üretiyor; toFixed eklemek 0.1+0.2 gibi değerleri kalıcı bozardı.
 */
export function serializeProjectData(data: ProjectData): string {
  return JSON.stringify({
    nextUniqueId: data.nextUniqueId,
    activeFloorId: data.activeFloorId,
    floors: data.floors.map(toFloorJson),
    points: data.points.map(toPointJson),
    walls: data.walls.map(toWallJson),
    openings: data.openings.map(toOpeningJson),
    rooms: data.rooms.map(toRoomJson),
    symbols: data.symbols.map(toPointSymbolJson),
    areaObjects: data.areaObjects.map(toAreaObjectJson),
    beams: data.beams.map(toBeamJson),
    texts: data.texts.map(toTextLabelJson),
    installationElements: data.installationElements.map(toInstallationElementJson),
    installationLines: data.installationLines.map(toInstallationLineJson),
    installationConnections: data.installationConnections.map(toInstallationConnectionJson),
    floorPipeLinks: data.floorPipeLinks.map(toFloorPipeLinkJson),
    // Varsayılan açı YAZILMAZ: "yokluk = varsayılan" olduğu için yazmak eski
    // kayıtlara anahtar eklerdi. Kullanıcı açıyı değiştirdiyse yazılır.
    isometricAngles: data.isometricAngles && toIsometricAnglesJson(data.isometricAngles),
  })
}

function toIsometricAnglesJson(angles: IsometricAngles) {
  return { alphaDeg: angles.alphaDeg, betaDeg: angles.betaDeg }
}

function toFloorPipeLinkJson(link: FloorPipeLink) {
  return {
    id: link.id,
    belowFloorId: link.belowFloorId,
    aboveFloorId: link.aboveFloorId,
    belowPointId: link.belowPointId,
    abovePointId: link.abovePointId,
    position: { x: link.position.x, y: link.position.y },
  }
}

function toFloorJson(floor: Floor) {
  return {
    id: floor.id,
    name: floor.name,
    heightCm: floor.heightCm,
    isBasement: floor.isBasement,
  }
}

function toPointJson(point: Point) {
  return { id: point.id, floorId: point.floorId, x: point.x, y: point.y }
}

function toWallJson(wall: Wall) {
  return {
    id: wall.id,
    floorId: wall.floorId,
    p1Id: wall.p1Id,
    p2Id: wall.p2Id,
    thickness: wall.thickness,
    height: wall.height,
  }
}

function toRoomJson(room: Room) {
  // wallIds kopyalanır: store'daki diziyi paylaşmak, JSON üretimini state'e bağlar.
  return {
    id: room.id,
    wallIds: [...room.wallIds],
    // undefined alanı JSON.stringify atlıyor: tipi belirtilmemiş mahalde alan
    // dosyaya HİÇ yazılmaz (axisId ile aynı gerekçe, bit-bit tur).
    usageType: room.usageType,
  }
}

function toOpeningJson(opening: Opening) {
  return {
    id: opening.id,
    wallId: opening.wallId,
    offsetCm: opening.offsetCm,
    widthCm: opening.widthCm,
    type: opening.type,
  }
}

function toPointSymbolJson(symbol: PointSymbol) {
  const head = {
    id: symbol.id,
    type: symbol.type,
    label: symbol.label,
    note: symbol.note,
    attachment: symbol.attachment,
  }

  // Alan sırası ELLE sabit (kabul testinin dayanağı); iki dal ayrı yazılıyor
  // çünkü spread ile birleştirmek sırayı çalışma zamanına bırakır.
  if (symbol.attachment === 'wall') {
    return {
      ...head,
      wallId: symbol.wallId,
      offsetCm: symbol.offsetCm,
      isMountedOnFarFace: symbol.isMountedOnFarFace,
    }
  }

  return {
    ...head,
    floorId: symbol.floorId,
    x: symbol.x,
    y: symbol.y,
    rotationDeg: symbol.rotationDeg,
  }
}

function toBeamJson(beam: Beam) {
  return {
    id: beam.id,
    floorId: beam.floorId,
    x1: beam.x1,
    y1: beam.y1,
    x2: beam.x2,
    y2: beam.y2,
    thicknessCm: beam.thicknessCm,
    label: beam.label,
  }
}

function toTextLabelJson(text: TextLabel) {
  return {
    id: text.id,
    floorId: text.floorId,
    x: text.x,
    y: text.y,
    text: text.text,
    heightCm: text.heightCm,
    angleDeg: text.angleDeg,
  }
}

function toAreaObjectJson(areaObject: AreaObject) {
  return {
    id: areaObject.id,
    type: areaObject.type,
    floorId: areaObject.floorId,
    x: areaObject.x,
    y: areaObject.y,
    widthCm: areaObject.widthCm,
    lengthCm: areaObject.lengthCm,
    angleDeg: areaObject.angleDeg,
    label: areaObject.label,
    // undefined alanı JSON.stringify atlıyor: etiketi taşınmamış nesnede alan
    // dosyaya HİÇ yazılmaz, yani bit-bit tur eski çizimlerde de aynı kalır.
    labelOffsetCm: areaObject.labelOffsetCm,
    // Aynı gerekçe: ekseni olmayan nesnede alan dosyaya hiç yazılmaz.
    axisId: areaObject.axisId,
  }
}
