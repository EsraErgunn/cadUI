import { z } from 'zod'

export const INSTALLATION_ELEMENT_TYPES = [
  'serviceBox',
  'regulator',
  'gasMeter',
  'strainerMeter',
  'manometer',
  'filterKit',
  'valve',
  'solenoidValve',
  'stove',
  'chimney',
  'ventilationDuct',
] as const

export type InstallationElementType = (typeof INSTALLATION_ELEMENT_TYPES)[number]

/** Sahneye yerleşmeyen, yalnız toolbar'da temsil edilen araçların asset kimlikleri. */
export const TOOLBAR_ONLY_SYMBOL_IDS = [
  'selection',
  'pipe',
  'branch',
  'insulation',
  'measurement',
] as const

export type ToolbarOnlySymbolId = (typeof TOOLBAR_ONLY_SYMBOL_IDS)[number]

export const SYMBOL_IDS = [...INSTALLATION_ELEMENT_TYPES, ...TOOLBAR_ONLY_SYMBOL_IDS] as const

export type SymbolId = (typeof SYMBOL_IDS)[number]

export type SymbolUsage = 'placement' | 'toolbar-only'

/** Kullanım türü id'den türetilir — metadata JSON'unda ikinci bir alan tutulmaz. */
export function getSymbolUsage(id: SymbolId): SymbolUsage {
  return (TOOLBAR_ONLY_SYMBOL_IDS as readonly string[]).includes(id)
    ? 'toolbar-only'
    : 'placement'
}

export type SymbolPortDefinition = {
  id: string
  type: 'input' | 'output'
  /** SVG yerel koordinatı. Plan cm'e çeviren TEK yer: plumbing/core/ports.ts. */
  position: readonly [number, number]
  /** Akış yönü birim vektörü (SVG yerel). */
  direction: readonly [number, number]
}

export type SymbolMetadata = {
  id: SymbolId
  /** Kullanıcıya görünen Türkçe ad (id/dosya adı teknik sözleşme olarak İngilizce kalır). */
  label: string
  asset: string
  viewBox: readonly [number, number, number, number]
  origin: readonly [number, number]
  flowDirection?: 'left-to-right'
  ports: readonly SymbolPortDefinition[]
  bounds: { min: readonly [number, number]; max: readonly [number, number] }
}

/** Plan Bölüm 10 port tablosu — şema port sayılarını buradan doğrular.
 *  Toolbar-only araçlar sahneye portla yerleşmediği için 0/0'dır. */
export const SYMBOL_PORT_COUNTS: Record<SymbolId, { input: number; output: number }> = {
  serviceBox: { input: 0, output: 1 },
  regulator: { input: 1, output: 1 },
  gasMeter: { input: 1, output: 1 },
  strainerMeter: { input: 1, output: 1 },
  manometer: { input: 1, output: 1 },
  filterKit: { input: 1, output: 1 },
  valve: { input: 1, output: 1 },
  solenoidValve: { input: 1, output: 1 },
  stove: { input: 1, output: 0 },
  chimney: { input: 0, output: 0 },
  ventilationDuct: { input: 0, output: 0 },
  selection: { input: 0, output: 0 },
  pipe: { input: 0, output: 0 },
  branch: { input: 0, output: 0 },
  insulation: { input: 0, output: 0 },
  measurement: { input: 0, output: 0 },
}

const UNIT_LENGTH_TOLERANCE = 1e-6

const vec2Schema = z.tuple([z.number(), z.number()])

const portSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['input', 'output']),
  position: vec2Schema,
  direction: vec2Schema,
})

const baseSchema = z.object({
  id: z.enum(SYMBOL_IDS),
  label: z.string().min(1),
  asset: z.string().endsWith('.svg'),
  viewBox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  origin: vec2Schema,
  flowDirection: z.literal('left-to-right').optional(),
  ports: z.array(portSchema),
  bounds: z.object({ min: vec2Schema, max: vec2Schema }),
})

type ParsedSymbolMetadata = z.infer<typeof baseSchema>

function isInsideBounds(
  position: readonly [number, number],
  bounds: ParsedSymbolMetadata['bounds'],
): boolean {
  const [x, y] = position
  return x >= bounds.min[0] && x <= bounds.max[0] && y >= bounds.min[1] && y <= bounds.max[1]
}

function validatePorts(meta: ParsedSymbolMetadata, ctx: z.RefinementCtx): void {
  const expected = SYMBOL_PORT_COUNTS[meta.id]
  const inputCount = meta.ports.filter((port) => port.type === 'input').length
  const outputCount = meta.ports.length - inputCount
  if (inputCount !== expected.input || outputCount !== expected.output) {
    ctx.addIssue({
      code: 'custom',
      path: ['ports'],
      message: `${meta.id} için ${expected.input} giriş / ${expected.output} çıkış portu bekleniyor, ${inputCount}/${outputCount} bulundu`,
    })
  }

  const seenIds = new Set<string>()
  meta.ports.forEach((port, index) => {
    if (seenIds.has(port.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ports', index, 'id'],
        message: `port id sembol içinde tekil olmalı: ${port.id}`,
      })
    }
    seenIds.add(port.id)

    if (!isInsideBounds(port.position, meta.bounds)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ports', index, 'position'],
        message: `port ${port.id} bounds dışında`,
      })
    }

    const directionLength = Math.hypot(port.direction[0], port.direction[1])
    if (Math.abs(directionLength - 1) > UNIT_LENGTH_TOLERANCE) {
      ctx.addIssue({
        code: 'custom',
        path: ['ports', index, 'direction'],
        message: `port ${port.id} direction birim vektör olmalı`,
      })
    }
  })
}

function validateFlowDirection(meta: ParsedSymbolMetadata, ctx: z.RefinementCtx): void {
  if (meta.flowDirection !== 'left-to-right') return
  const inputs = meta.ports.filter((port) => port.type === 'input')
  const outputs = meta.ports.filter((port) => port.type === 'output')
  for (const input of inputs) {
    for (const output of outputs) {
      if (input.position[0] >= output.position[0]) {
        ctx.addIssue({
          code: 'custom',
          path: ['ports'],
          message: 'flowDirection left-to-right iken giriş portu çıkışın solunda olmalı',
        })
      }
    }
  }
}

export const symbolMetadataSchema: z.ZodType<SymbolMetadata> = baseSchema.superRefine(
  (meta, ctx) => {
    if (meta.bounds.min[0] >= meta.bounds.max[0] || meta.bounds.min[1] >= meta.bounds.max[1]) {
      ctx.addIssue({
        code: 'custom',
        path: ['bounds'],
        message: 'bounds.min her eksende bounds.max değerinden küçük olmalı',
      })
      return
    }
    validatePorts(meta, ctx)
    validateFlowDirection(meta, ctx)
  },
)

export function parseSymbolMetadata(data: unknown): SymbolMetadata {
  return symbolMetadataSchema.parse(data)
}
