import type { Id, ProjectData } from '../../../core/model'

/**
 * Salt okunur plan önizlemesinin geometrisi.
 *
 * `scene/` YENİDEN KULLANILMADI: oradaki bileşenler <Canvas> içi (R3F) ve global
 * `cadStore`'dan besleniyor. Detay ekranı için store'u doldurmak, editörün
 * durumunu ekran dışından yazmak olurdu (knowledge/persistence.md: proje
 * değişince store sıfırlanır). Bu yüzden burada AYNI VERİ okunup bağımsız,
 * etkileşimsiz bir SVG üretiliyor — `scene/` dosyalarına dokunulmuyor.
 *
 * SVG'nin y ekseni AŞAĞI büyür, planın y'si yukarı: değerler burada bir kez
 * ters çevriliyor ki çizim editördekiyle aynı yönde dursun. Bu, coords.ts'teki
 * plan→three dönüşümünün tekrarı DEĞİL (orada y→-z, burada y→ekran y'si).
 */

export interface PlanSegment {
  id: Id
  x1: number
  y1: number
  x2: number
  y2: number
  thickness: number
}

export interface PlanOpening {
  id: Id
  x1: number
  y1: number
  x2: number
  y2: number
  thickness: number
  isDoor: boolean
}

export interface PlanRect {
  id: Id
  /** Dönmüş dikdörtgenin köşeleri, SVG `points` biçiminde. */
  points: string
  label: string
}

export interface PlanLabel {
  id: Id
  x: number
  y: number
  text: string
}

export interface PlanBounds {
  minX: number
  minY: number
  width: number
  height: number
}

export interface FloorPlan {
  walls: PlanSegment[]
  openings: PlanOpening[]
  areaObjects: PlanRect[]
  labels: PlanLabel[]
  bounds: PlanBounds
}

/** Çizimin kenarına bırakılan pay; sıfır olsaydı duvarlar kadraja yapışırdı. */
const PADDING_CM = 60

/** İçeriği olmayan kat için kullanılan en küçük kadraj (cm). */
const FALLBACK_EXTENT_CM = 400

function toScreenY(y: number): number {
  return -y
}

interface ResolvedWall {
  id: Id
  x1: number
  y1: number
  x2: number
  y2: number
  thickness: number
  lengthCm: number
}

/** Duvarı uç noktalarıyla çözer; noktası eksik duvar çizilmez (bozuk JSON). */
function resolveWalls(data: ProjectData, floorId: Id): ResolvedWall[] {
  const pointsById = new Map(data.points.map((point) => [point.id, point]))

  return data.walls.flatMap((wall): ResolvedWall[] => {
    if (wall.floorId !== floorId) return []

    const p1 = pointsById.get(wall.p1Id)
    const p2 = pointsById.get(wall.p2Id)
    if (p1 === undefined || p2 === undefined) return []

    const x1 = p1.x
    const y1 = toScreenY(p1.y)
    const x2 = p2.x
    const y2 = toScreenY(p2.y)

    return [
      {
        id: wall.id,
        x1,
        y1,
        x2,
        y2,
        thickness: wall.thickness,
        lengthCm: Math.hypot(x2 - x1, y2 - y1),
      },
    ]
  })
}

/** Duvar ekseninde `offsetCm` uzaklıktaki nokta. */
function pointAlong(wall: ResolvedWall, offsetCm: number): { x: number; y: number } {
  if (wall.lengthCm === 0) return { x: wall.x1, y: wall.y1 }

  const ratio = offsetCm / wall.lengthCm
  return {
    x: wall.x1 + (wall.x2 - wall.x1) * ratio,
    y: wall.y1 + (wall.y2 - wall.y1) * ratio,
  }
}

/** `offsetCm` açıklığın ORTASINI ölçer (knowledge/opening-placement.md). */
function buildOpenings(data: ProjectData, walls: ResolvedWall[]): PlanOpening[] {
  const wallsById = new Map(walls.map((wall) => [wall.id, wall]))

  return data.openings.flatMap((opening): PlanOpening[] => {
    const wall = wallsById.get(opening.wallId)
    if (wall === undefined) return []

    const half = opening.widthCm / 2
    const start = pointAlong(wall, opening.offsetCm - half)
    const end = pointAlong(wall, opening.offsetCm + half)

    return [
      {
        id: opening.id,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        thickness: wall.thickness,
        isDoor: opening.type === 'door',
      },
    ]
  })
}

function buildAreaObjects(data: ProjectData, floorId: Id): PlanRect[] {
  return data.areaObjects
    .filter((object) => object.floorId === floorId)
    .map((object) => {
      const angleRad = (object.angleDeg * Math.PI) / 180
      const cos = Math.cos(angleRad)
      const sin = Math.sin(angleRad)
      const halfWidth = object.widthCm / 2
      const halfLength = object.lengthCm / 2

      const corners: [number, number][] = [
        [-halfWidth, -halfLength],
        [halfWidth, -halfLength],
        [halfWidth, halfLength],
        [-halfWidth, halfLength],
      ]

      const points = corners
        .map(([dx, dy]) => {
          const x = object.x + dx * cos - dy * sin
          const y = object.y + dx * sin + dy * cos
          return `${x},${toScreenY(y)}`
        })
        .join(' ')

      return { id: object.id, points, label: object.label }
    })
}

/** Serbest semboller etiketleriyle çizilir; duvara bağlı olan duvarından türer. */
function buildLabels(data: ProjectData, floorId: Id, walls: ResolvedWall[]): PlanLabel[] {
  const wallsById = new Map(walls.map((wall) => [wall.id, wall]))

  return data.symbols.flatMap((symbol): PlanLabel[] => {
    if (symbol.attachment === 'free') {
      if (symbol.floorId !== floorId) return []
      return [{ id: symbol.id, x: symbol.x, y: toScreenY(symbol.y), text: symbol.label }]
    }

    const wall = wallsById.get(symbol.wallId)
    if (wall === undefined) return []

    const position = pointAlong(wall, symbol.offsetCm)
    return [{ id: symbol.id, x: position.x, y: position.y, text: symbol.label }]
  })
}

function buildBounds(walls: ResolvedWall[], areaObjects: PlanRect[]): PlanBounds {
  const xs: number[] = []
  const ys: number[] = []

  for (const wall of walls) {
    xs.push(wall.x1 - wall.thickness, wall.x2 + wall.thickness)
    ys.push(wall.y1 - wall.thickness, wall.y2 + wall.thickness)
  }

  for (const object of areaObjects) {
    for (const pair of object.points.split(' ')) {
      const [x, y] = pair.split(',').map(Number)
      xs.push(x)
      ys.push(y)
    }
  }

  if (xs.length === 0 || ys.length === 0) {
    return { minX: 0, minY: 0, width: FALLBACK_EXTENT_CM, height: FALLBACK_EXTENT_CM }
  }

  const minX = Math.min(...xs) - PADDING_CM
  const minY = Math.min(...ys) - PADDING_CM

  return {
    minX,
    minY,
    // Sıfır genişlik viewBox'ı geçersiz kılar: tek duvarlı/dikey planlarda taban değer.
    width: Math.max(Math.max(...xs) + PADDING_CM - minX, FALLBACK_EXTENT_CM),
    height: Math.max(Math.max(...ys) + PADDING_CM - minY, FALLBACK_EXTENT_CM),
  }
}

export function buildFloorPlan(data: ProjectData, floorId: Id): FloorPlan {
  const walls = resolveWalls(data, floorId)
  const areaObjects = buildAreaObjects(data, floorId)

  return {
    walls: walls.map(({ id, x1, y1, x2, y2, thickness }) => ({
      id,
      x1,
      y1,
      x2,
      y2,
      thickness,
    })),
    openings: buildOpenings(data, walls),
    areaObjects,
    labels: buildLabels(data, floorId, walls),
    bounds: buildBounds(walls, areaObjects),
  }
}
