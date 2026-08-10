import type { SymbolMetadataLookup } from '../elementPicking'
import type { InstallationLine } from '../installationModel'
import type { InstallationElementType, SymbolMetadata } from '../symbolMetadata'

/**
 * Testler gerçek `assets/symbols/*.meta.json` değerlerini kullanır: ofsetler
 * sembolün gerçek geometrisinden geliyor, uydurma bir sembolle yazılan test
 * asset değişince sessizce yalan söylerdi.
 */
const FIXTURE_METADATA: Partial<Record<InstallationElementType, SymbolMetadata>> = {
  valve: {
    id: 'valve',
    label: 'Vana',
    asset: 'valve.svg',
    viewBox: [0, 0, 32, 22],
    origin: [16, 11],
    flowDirection: 'left-to-right',
    ports: [
      { id: 'in', type: 'input', position: [0, 11], direction: [1, 0] },
      { id: 'out', type: 'output', position: [32, 11], direction: [1, 0] },
    ],
    bounds: { min: [0, 0], max: [32, 22] },
  },
  regulator: {
    id: 'regulator',
    label: 'Regülatör',
    asset: 'regulator.svg',
    viewBox: [0, 0, 24, 24],
    origin: [12, 12],
    flowDirection: 'left-to-right',
    ports: [
      { id: 'in', type: 'input', position: [0, 12], direction: [1, 0] },
      { id: 'out', type: 'output', position: [24, 12], direction: [1, 0] },
    ],
    bounds: { min: [0, 0], max: [24, 24] },
  },
  manometer: {
    id: 'manometer',
    label: 'Manometre',
    asset: 'manometer.svg',
    viewBox: [0, 0, 22, 52],
    origin: [11, 34],
    ports: [{ id: 'in', type: 'input', position: [11, 48], direction: [0, 1] }],
    bounds: { min: [0, 0], max: [22, 52] },
  },
  gasMeter: {
    id: 'gasMeter',
    label: 'Sayaç',
    asset: 'gas-meter.svg',
    viewBox: [0, 0, 60, 40],
    origin: [30, 13],
    flowDirection: 'left-to-right',
    ports: [
      { id: 'in', type: 'input', position: [20, -20], direction: [0, -1] },
      { id: 'out', type: 'output', position: [40, -20], direction: [0, -1] },
    ],
    bounds: { min: [0, -20], max: [60, 40] },
  },
  stove: {
    id: 'stove',
    label: 'Ocak',
    asset: 'stove.svg',
    viewBox: [0, 0, 60, 60],
    origin: [30, 30],
    ports: [{ id: 'in', type: 'input', position: [0, 30], direction: [1, 0] }],
    bounds: { min: [0, 0], max: [60, 60] },
  },
  insulation: {
    id: 'insulation',
    label: 'İzolasyon',
    asset: 'insulation.svg',
    viewBox: [0, 0, 40, 16],
    origin: [20, 8],
    ports: [],
    bounds: { min: [0, 0], max: [40, 16] },
  },
}

export const getFixtureMetadata: SymbolMetadataLookup = (type) => {
  const metadata = FIXTURE_METADATA[type]
  if (!metadata) throw new Error(`fixture'da "${type}" sembolü yok`)
  return metadata
}

const FLOOR_ID = 1

/** Y = 0 üzerinde, x ∈ [0, 1000] uzanan tek parçalı yatay boru. */
export function createHorizontalLine(lineId = 10): InstallationLine {
  return {
    id: lineId,
    floorId: FLOOR_ID,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: 1, position: { x: 0, y: 0 } },
      { id: 2, position: { x: 1000, y: 0 } },
    ],
    segments: [{ id: 3, fromPointId: 1, toPointId: 2 }],
  }
}
