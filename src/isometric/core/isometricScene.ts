import { getIsometricLineElevationsCm } from './isometricElevation'
import type { IsometricElevationContext } from './isometricElevation'
import type {
  IsometricBounds,
  IsometricElementPlacement,
  IsometricFloorLinkGeometry,
  IsometricLineGeometry,
  IsometricSceneData,
} from './isometricModel'
import { getPointIsometricOffsetCm } from './isometricOffset'
import { isometricOffsetToWorld, projectIsometric } from './isometricProjection'
import type { IsometricAngles } from './isometricProjection'
import { planToThree } from '../../core/coords'
import type { PlanPoint, ThreePosition } from '../../core/coords'
import { getFloorElevationsCm, getGroundFloorIndex } from '../../core/floorElevation'
import type { Floor, FloorPipeLink, Id, ProjectData } from '../../core/model'
import type { InstallationLine } from '../../plumbing/core/installationModel'
import { getElementElevationCm } from '../../plumbing/core/lineElevation'
import { getLineOuterWidthCm } from '../../plumbing/core/lineKinds'

export type IsometricSceneInput = Pick<
  ProjectData,
  | 'floors'
  | 'installationElements'
  | 'installationLines'
  | 'installationConnections'
  | 'floorPipeLinks'
>

export type IsometricSceneOptions = {
  angles: IsometricAngles
  /**
   * Katları birbirinden düşey olarak ayırma miktarı (cm). Yalnız GÖRSEL —
   * modele yazılmaz, metraja girmez. Kot okunurluğu için var: gerçek binada
   * katlar bitişik olduğu için izometrikte hatlar birbirine yapışır.
   */
  explodedGapCm: number
}

/** Kat kimliği → (taban kotu, aralıklandırma için kat sırası). */
type FloorPlacement = { baseElevationCm: number; explodedIndex: number }

function buildFloorPlacements(floors: readonly Floor[]): Map<Id, FloorPlacement> {
  const elevations = getFloorElevationsCm(floors)
  const groundIndex = getGroundFloorIndex(floors)

  const placements = new Map<Id, FloorPlacement>()
  floors.forEach((floor, index) => {
    // Zemin kat referans (0) alınır ki aralık açılınca bodrumlar AŞAĞI, üst
    // katlar YUKARI gitsin; ham dizi indeksi kullanılsaydı bina yukarı kayardı.
    placements.set(floor.id, {
      baseElevationCm: elevations[index],
      explodedIndex: index - groundIndex,
    })
  })
  return placements
}

function toWorld(
  planPoint: PlanPoint,
  elevationCm: number,
  offsetCm: PlanPoint,
  angles: IsometricAngles,
): ThreePosition {
  const [x, y, z] = planToThree(planPoint, elevationCm)
  const [dx, dy, dz] = isometricOffsetToWorld(offsetCm, angles)
  return [x + dx, y + dy, z + dz]
}

function buildLineGeometry(
  line: InstallationLine,
  placements: Map<Id, FloorPlacement>,
  options: IsometricSceneOptions,
  context: IsometricElevationContext,
): IsometricLineGeometry | null {
  const placement = placements.get(line.floorId)
  if (!placement) return null

  const localElevations = getIsometricLineElevationsCm(line, context)
  const floorOffsetCm =
    placement.baseElevationCm + placement.explodedIndex * options.explodedGapCm

  return {
    lineId: line.id,
    kind: line.kind,
    pipeTypeName: line.pipeTypeName,
    outerWidthCm: getLineOuterWidthCm(line),
    pointIds: line.points.map((point) => point.id),
    positions: line.points.map((point, index) =>
      toWorld(
        point.position,
        floorOffsetCm + localElevations[index],
        getPointIsometricOffsetCm(point),
        options.angles,
      ),
    ),
  }
}

/**
 * Bir boru ucunun 3B konumu — kat geçişi bağlantısı iki ucunu da nokta
 * kimliğinden bulmak zorunda, o yüzden hat geometrisi ÜRETİLDİKTEN sonra
 * indeksten okunur; ikinci kez hesaplanırsa aralıklandırma iki yerde ayrı
 * uygulanır ve bağlantı hattan kopar.
 */
function indexPositionsByPointId(lines: readonly IsometricLineGeometry[]): Map<Id, ThreePosition> {
  const index = new Map<Id, ThreePosition>()
  for (const line of lines) {
    line.pointIds.forEach((pointId, position) => {
      index.set(pointId, line.positions[position])
    })
  }
  return index
}

function buildFloorLinkGeometry(
  link: FloorPipeLink,
  positionsByPointId: Map<Id, ThreePosition>,
): IsometricFloorLinkGeometry | null {
  const from = positionsByPointId.get(link.belowPointId)
  const to = positionsByPointId.get(link.abovePointId)
  if (!from || !to) return null
  return { linkId: link.id, from, to }
}

function computeBounds(
  lines: readonly IsometricLineGeometry[],
  elements: readonly IsometricElementPlacement[],
): IsometricBounds | null {
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  let hasAny = false

  const visit = (position: ThreePosition) => {
    hasAny = true
    for (let axis = 0; axis < 3; axis += 1) {
      if (position[axis] < min[axis]) min[axis] = position[axis]
      if (position[axis] > max[axis]) max[axis] = position[axis]
    }
  }

  for (const line of lines) line.positions.forEach(visit)
  for (const element of elements) visit(element.position)

  if (!hasAny) return null

  return {
    min: [min[0], min[1], min[2]],
    max: [max[0], max[1], max[2]],
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    sizeCm: Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]),
  }
}

/**
 * Projenin TÜM katlarını tek parça hâlinde izometrik sahne verisine çevirir
 * (ürün kuralı: "izometrik tüm binayı tek parça gösterir"). Aktif kat kavramı
 * YOKTUR — plan görünümlerinden ayrıldığı en temel nokta bu.
 *
 * Kot çözümü BURADA TEKRARLANMAZ: hem eleman hem hat kotu
 * `plumbing/core/lineElevation.ts`'ten okunur. İki kaynak olsaydı cihaz
 * sembolü ile bağlı olduğu kolun ucu farklı yükseklikte çizilirdi.
 */
export function buildIsometricScene(
  input: IsometricSceneInput,
  options: IsometricSceneOptions,
): IsometricSceneData {
  const placements = buildFloorPlacements(input.floors)
  const context: IsometricElevationContext = {
    lines: input.installationLines,
    connections: input.installationConnections,
  }

  const lines = input.installationLines
    .map((line) => buildLineGeometry(line, placements, options, context))
    .filter((geometry): geometry is IsometricLineGeometry => geometry !== null)

  const elements = input.installationElements
    .map((element): IsometricElementPlacement | null => {
      const placement = placements.get(element.floorId)
      if (!placement) return null

      const floorOffsetCm =
        placement.baseElevationCm + placement.explodedIndex * options.explodedGapCm
      return {
        elementId: element.id,
        position: toWorld(
          element.position,
          floorOffsetCm +
            getElementElevationCm(element.id, input.installationLines, input.installationConnections),
          // Elemanın KENDİ izometrik kaydırması bu turda yok (bkz.
          // izometrik-adimlari.md, sonraki turlar); bağlı olduğu hattın
          // kaymasını da devralmıyor — eleman plan konumunda kalır.
          { x: 0, y: 0 },
          options.angles,
        ),
      }
    })
    .filter((placement): placement is IsometricElementPlacement => placement !== null)

  const positionsByPointId = indexPositionsByPointId(lines)
  const floorLinks = input.floorPipeLinks
    .map((link) => buildFloorLinkGeometry(link, positionsByPointId))
    .filter((geometry): geometry is IsometricFloorLinkGeometry => geometry !== null)

  return { lines, elements, floorLinks, bounds: computeBounds(lines, elements) }
}

/**
 * Sahnenin İZDÜŞÜMDEKİ genişlik/yüksekliği (cm). Kamerayı çerçeveye sığdırmak
 * için gerekli: 3B kutunun en uzun kenarı kullanılsaydı izometride kutu eğik
 * durduğu için çerçeve ya çok geniş ya çok dar kalırdı.
 *
 * Sekiz köşe tek tek izdüşürülüyor — kutunun izdüşümü genel olarak altıgen bir
 * çokgen, sınırları ancak köşelerinden okunur.
 */
export function getIsometricScreenExtentCm(
  bounds: IsometricBounds,
  angles: IsometricAngles,
): { widthCm: number; heightCm: number } {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (let corner = 0; corner < 8; corner += 1) {
    const position: ThreePosition = [
      corner & 1 ? bounds.max[0] : bounds.min[0],
      corner & 2 ? bounds.max[1] : bounds.min[1],
      corner & 4 ? bounds.max[2] : bounds.min[2],
    ]
    const screen = projectIsometric(position, angles)
    if (screen.x < minX) minX = screen.x
    if (screen.x > maxX) maxX = screen.x
    if (screen.y < minY) minY = screen.y
    if (screen.y > maxY) maxY = screen.y
  }

  return { widthCm: maxX - minX, heightCm: maxY - minY }
}
