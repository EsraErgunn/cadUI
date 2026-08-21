import type { SymbolMetadata, SymbolId } from '../../../plumbing/core/symbolMetadata'

/**
 * Testler için yalın sembol tanımı: portlar orijinde durur, yani çapa ofseti
 * sıfırdır — böylece kot/konum beklentileri sembol geometrisinden etkilenmez.
 * Port ofsetinin ETKİSİ ayrıca `isometricAnchor.test.ts`'te sınanır.
 */
export function makeTestMetadata(id: SymbolId): SymbolMetadata {
  return {
    id,
    label: id,
    asset: `${id}.svg`,
    viewBox: [0, 0, 20, 20],
    origin: [10, 10],
    ports: [
      { id: 'in', type: 'input', position: [10, 10], direction: [1, 0] },
      { id: 'out', type: 'output', position: [10, 10], direction: [1, 0] },
    ],
    bounds: { min: [0, 0], max: [20, 20] },
  }
}
