import { describe, expect, it } from 'vitest'

import {
  SYMBOL_IDS,
  SYMBOL_PORT_COUNTS,
  TOOLBAR_ONLY_SYMBOL_IDS,
  getSymbolUsage,
  parseSymbolMetadata,
  symbolMetadataSchema,
  type SymbolMetadata,
} from '../symbolMetadata'

// tsconfig `types: ["vite/client"]` node tiplerini dışladığı için dosyalar
// node:fs yerine Vite'ın import.meta.glob'u ile okunur (vitest bunu destekler).
const RAW_METADATA_BY_PATH = import.meta.glob<string>('../../assets/symbols/*.meta.json', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const RAW_SVG_BY_PATH = import.meta.glob<string>('../../assets/symbols/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const SYMBOL_FILE_NAMES = [
  'branch',
  'chimney',
  'filter-kit',
  'gas-meter',
  'insulation',
  'manometer',
  'measurement',
  'pipe',
  'regulator',
  'selection',
  'service-box',
  'solenoid-valve',
  'stove',
  'strainer-meter',
  'valve',
  'ventilation-duct',
]

function baseName(path: string): string {
  return path.split('/').pop() ?? path
}

const SVG_FILE_NAMES = Object.keys(RAW_SVG_BY_PATH).map(baseName)

const PARSED_SYMBOLS: { fileName: string; metadata: SymbolMetadata }[] = Object.entries(
  RAW_METADATA_BY_PATH,
).map(([path, raw]) => ({
  fileName: baseName(path),
  metadata: parseSymbolMetadata(JSON.parse(raw)),
}))

function makeValidMetadata(): Record<string, unknown> {
  return {
    id: 'valve',
    label: 'Vana',
    asset: 'valve.svg',
    viewBox: [0, 0, 60, 40],
    origin: [30, 20],
    flowDirection: 'left-to-right',
    ports: [
      { id: 'in', type: 'input', position: [0, 20], direction: [1, 0] },
      { id: 'out', type: 'output', position: [60, 20], direction: [1, 0] },
    ],
    bounds: { min: [0, 0], max: [60, 40] },
  }
}

describe('sembol asset dosyaları', () => {
  it('16 sembolün .svg ve .meta.json dosyaları mevcut (32 dosya)', () => {
    expect([...SVG_FILE_NAMES].sort()).toEqual(SYMBOL_FILE_NAMES.map((name) => `${name}.svg`))
    expect(PARSED_SYMBOLS.map((symbol) => symbol.fileName).sort()).toEqual(
      SYMBOL_FILE_NAMES.map((name) => `${name}.meta.json`),
    )
  })

  it('16 metadata dosyasının hepsi şemadan geçer ve her sembol id bir kez kullanılır', () => {
    const ids = PARSED_SYMBOLS.map((symbol) => symbol.metadata.id)
    expect([...ids].sort()).toEqual([...SYMBOL_IDS].sort())
  })

  it('her asset alanı yanında gerçekten var olan bir .svg dosyasına işaret eder', () => {
    for (const { fileName, metadata } of PARSED_SYMBOLS) {
      expect(metadata.asset).toBe(fileName.replace('.meta.json', '.svg'))
      expect(SVG_FILE_NAMES).toContain(metadata.asset)
    }
  })

  it('port sayıları Bölüm 10 tablosuna uyar', () => {
    // prettier-ignore
    expect(SYMBOL_PORT_COUNTS).toEqual({
      serviceBox: { input: 0, output: 1 }, regulator: { input: 1, output: 1 },
      gasMeter: { input: 1, output: 1 }, strainerMeter: { input: 1, output: 1 },
      manometer: { input: 1, output: 1 }, filterKit: { input: 1, output: 1 },
      valve: { input: 1, output: 1 }, solenoidValve: { input: 1, output: 1 },
      stove: { input: 1, output: 0 }, chimney: { input: 0, output: 0 },
      ventilationDuct: { input: 0, output: 0 }, selection: { input: 0, output: 0 },
      pipe: { input: 0, output: 0 }, branch: { input: 0, output: 0 },
      insulation: { input: 0, output: 0 }, measurement: { input: 0, output: 0 },
    })
    for (const { metadata } of PARSED_SYMBOLS) {
      const inputCount = metadata.ports.filter((port) => port.type === 'input').length
      const outputCount = metadata.ports.length - inputCount
      expect({ id: metadata.id, input: inputCount, output: outputCount }).toEqual({
        id: metadata.id,
        ...SYMBOL_PORT_COUNTS[metadata.id],
      })
    }
  })

  it('her port bounds içindedir', () => {
    for (const { metadata } of PARSED_SYMBOLS) {
      for (const port of metadata.ports) {
        expect(port.position[0]).toBeGreaterThanOrEqual(metadata.bounds.min[0])
        expect(port.position[0]).toBeLessThanOrEqual(metadata.bounds.max[0])
        expect(port.position[1]).toBeGreaterThanOrEqual(metadata.bounds.min[1])
        expect(port.position[1]).toBeLessThanOrEqual(metadata.bounds.max[1])
      }
    }
  })

  it('her sembolün Türkçe label alanı dolu ve katalog içinde tekildir', () => {
    const labels = PARSED_SYMBOLS.map((symbol) => symbol.metadata.label)
    for (const label of labels) {
      expect(label.trim().length).toBeGreaterThan(0)
    }
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('toolbar-only araçların port listesi boştur ve kullanım türü doğru türetilir', () => {
    for (const { metadata } of PARSED_SYMBOLS) {
      const isToolbarOnly = (TOOLBAR_ONLY_SYMBOL_IDS as readonly string[]).includes(metadata.id)
      expect(getSymbolUsage(metadata.id)).toBe(isToolbarOnly ? 'toolbar-only' : 'placement')
      if (isToolbarOnly) {
        expect(metadata.ports).toEqual([])
        expect(metadata.flowDirection).toBeUndefined()
      }
    }
  })

  it('port idleri sembol içinde tekildir', () => {
    for (const { metadata } of PARSED_SYMBOLS) {
      const ids = metadata.ports.map((port) => port.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('symbolMetadataSchema (negatif örnekler)', () => {
  it('geçerli bir metadata şemadan geçer', () => {
    expect(symbolMetadataSchema.safeParse(makeValidMetadata()).success).toBe(true)
  })

  it('label alanı eksik ya da boşsa reddeder', () => {
    const withoutLabel = makeValidMetadata()
    delete withoutLabel.label
    expect(symbolMetadataSchema.safeParse(withoutLabel).success).toBe(false)
    expect(symbolMetadataSchema.safeParse({ ...makeValidMetadata(), label: '' }).success).toBe(false)
  })

  it('bilinmeyen eleman tipini reddeder', () => {
    const broken = { ...makeValidMetadata(), id: 'boiler' }
    expect(symbolMetadataSchema.safeParse(broken).success).toBe(false)
  })

  it('port sayısı tabloya uymayınca reddeder', () => {
    const broken = { ...makeValidMetadata(), ports: [] }
    expect(symbolMetadataSchema.safeParse(broken).success).toBe(false)
  })

  it('toolbar-only araca port eklenirse reddeder', () => {
    const broken = {
      id: 'pipe',
      asset: 'pipe.svg',
      viewBox: [0, 0, 60, 24],
      origin: [30, 12],
      ports: [{ id: 'out', type: 'output', position: [60, 12], direction: [1, 0] }],
      bounds: { min: [0, 0], max: [60, 24] },
    }
    expect(symbolMetadataSchema.safeParse(broken).success).toBe(false)
  })

  it('bounds dışındaki port konumunu reddeder', () => {
    const broken = makeValidMetadata()
    broken.ports = [
      { id: 'in', type: 'input', position: [-5, 20], direction: [1, 0] },
      { id: 'out', type: 'output', position: [60, 20], direction: [1, 0] },
    ]
    expect(symbolMetadataSchema.safeParse(broken).success).toBe(false)
  })

  it('tekrarlanan port idsini reddeder', () => {
    const broken = makeValidMetadata()
    broken.ports = [
      { id: 'p', type: 'input', position: [0, 20], direction: [1, 0] },
      { id: 'p', type: 'output', position: [60, 20], direction: [1, 0] },
    ]
    expect(symbolMetadataSchema.safeParse(broken).success).toBe(false)
  })

  it('min >= max olan bounds reddedilir', () => {
    const broken = { ...makeValidMetadata(), bounds: { min: [60, 0], max: [0, 40] } }
    expect(symbolMetadataSchema.safeParse(broken).success).toBe(false)
  })

  it('birim vektör olmayan direction reddedilir', () => {
    const broken = makeValidMetadata()
    broken.ports = [
      { id: 'in', type: 'input', position: [0, 20], direction: [2, 0] },
      { id: 'out', type: 'output', position: [60, 20], direction: [1, 0] },
    ]
    expect(symbolMetadataSchema.safeParse(broken).success).toBe(false)
  })

  it('flowDirection left-to-right iken sağda kalan giriş portunu reddeder', () => {
    const broken = makeValidMetadata()
    broken.ports = [
      { id: 'in', type: 'input', position: [60, 20], direction: [1, 0] },
      { id: 'out', type: 'output', position: [0, 20], direction: [1, 0] },
    ]
    expect(symbolMetadataSchema.safeParse(broken).success).toBe(false)
  })
})
