import type { PlanPoint } from './coords'
import type { SolidBox } from './solidWall'
import { getSymbolLocalBounds, type SymbolMetadataLookup } from '../plumbing/core/elementPicking'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
  InstallationLineKind,
} from '../plumbing/core/installationModel'
import { getElementElevationCm, getLinePointElevationsCm } from '../plumbing/core/lineElevation'
import { getLineOuterWidthCm } from '../plumbing/core/lineKinds'
import type { InstallationElementType } from '../plumbing/core/symbolMetadata'

/**
 * Tesisat elemanının düşey derinliği. Sembol 2B bir damga; katı modelde yer
 * kaplaması için kalınlık gerekiyor — açıklık yüksekliğiyle aynı gerekçe:
 * yalnız gösterim sabiti, modele yazılmaz. Ayak izi (en/boy) UYDURULMAZ,
 * sembolün kendi `bounds`undan gelir.
 */
export const ELEMENT_DEPTH_CM = 40

/** Borunun tek parçası: iki uç (plan + kot) ve yarıçap. Renk sahnenin işi. */
export type SolidPipeSegment = {
  key: string
  kind: InstallationLineKind
  pipeTypeName: InstallationLine['pipeTypeName']
  from: PlanPoint
  to: PlanPoint
  fromElevationCm: number
  toElevationCm: number
  radiusCm: number
}

export type SolidElementBox = SolidBox & { elementType: InstallationElementType }

/**
 * Bir hattın her noktasındaki kot. İki uçlu kot yalnız `pipe`/`branchStub`ta
 * yaşıyor (`lineElevation.ts` → hasTwoEndedPipeElevation), branşmanda tek alan
 * var; kalanların (baca, havalandırma, cihaz kolu) modelde kotu YOK ve
 * uydurulmaz — kat tabanında çizilirler (bilinen sınır,
 * bkz. knowledge/solid-model.md).
 */
function getLineElevationsCm(line: InstallationLine): number[] {
  const positions = line.points.map((point) => point.position)
  if ((line.kind === 'pipe' || line.kind === 'branchStub') && line.pipe) {
    return getLinePointElevationsCm(positions, line.pipe.startHeightCm, line.pipe.endHeightCm)
  }

  const flatCm = line.kind === 'branch' ? (line.branch?.elevationCm ?? 0) : 0
  return positions.map(() => flatCm)
}

/** Bir kattaki boruların katı parçaları; kotlar kat tabanının ÜSTÜNE binmiş. */
export function buildLevelPipes(
  lines: readonly InstallationLine[],
  floorId: number,
  floorBaseCm: number,
): SolidPipeSegment[] {
  return lines
    .filter((line) => line.floorId === floorId)
    .flatMap((line) => {
      const elevationsCm = getLineElevationsCm(line)
      const radiusCm = getLineOuterWidthCm(line) / 2

      return line.points.flatMap((point, index) => {
        if (index === 0) return []

        const previous = line.points[index - 1]
        return [
          {
            key: `pipe-${line.id}-${index}`,
            kind: line.kind,
            pipeTypeName: line.pipeTypeName,
            from: previous.position,
            to: point.position,
            fromElevationCm: floorBaseCm + elevationsCm[index - 1],
            toElevationCm: floorBaseCm + elevationsCm[index],
            radiusCm,
          },
        ]
      })
    })
}

export function buildLevelElements(
  elements: readonly InstallationElement[],
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  floorId: number,
  floorBaseCm: number,
  getSymbolMetadata: SymbolMetadataLookup,
): SolidElementBox[] {
  return elements
    .filter((element) => element.floorId === floorId)
    .map((element) => {
      const bounds = getSymbolLocalBounds(getSymbolMetadata(element.type))
      const elevationCm = getElementElevationCm(element.id, lines, connections)

      return {
        key: `element-${element.id}`,
        center: element.position,
        lengthCm: (bounds.max.x - bounds.min.x) * element.scale,
        widthCm: (bounds.max.y - bounds.min.y) * element.scale,
        heightCm: ELEMENT_DEPTH_CM,
        // Kot elemanın MERKEZİ: boru elemanın ortasına giriyor, tabanına değil.
        baseCm: floorBaseCm + elevationCm - ELEMENT_DEPTH_CM / 2,
        angleDeg: element.angleDeg,
        elementType: element.type,
      }
    })
}
