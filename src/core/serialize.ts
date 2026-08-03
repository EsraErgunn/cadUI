import { z } from 'zod'

import type { Floor, Opening, Point, ProjectData, Wall } from './model'

/**
 * Dış kaynaktan gelen JSON şemadan geçmeden state'e girmez (CLAUDE.md güvenlik).
 * Şema yalnız ŞEKLİ doğrular; "p1Id diye bir Point var mı" gibi bütünlük
 * soruları core/validate.ts'in işi — burada tekrarlanmaz.
 */
const idSchema = z.number().int()

const floorSchema = z.object({
  id: idSchema,
  name: z.string(),
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

export const projectDataSchema = z.object({
  nextUniqueId: idSchema,
  activeFloorId: idSchema,
  floors: z.array(floorSchema),
  points: z.array(pointSchema),
  walls: z.array(wallSchema),
  openings: z.array(openingSchema),
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
  })
}

function toFloorJson(floor: Floor) {
  return { id: floor.id, name: floor.name }
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

function toOpeningJson(opening: Opening) {
  return {
    id: opening.id,
    wallId: opening.wallId,
    offsetCm: opening.offsetCm,
    widthCm: opening.widthCm,
    type: opening.type,
  }
}
