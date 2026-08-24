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
  'spaceHeater',
  'waterHeater',
  'combiBoiler',
  'boiler',
  'otherAppliance',
  // Baca ve havalandırma kanalı burada DEĞİL: damga değil GÜZERGÂH oldular
  // (`InstallationLineKind`), yakıcı cihazın deşarj portundan çizilirler.
  // İzolasyon segment boolean'ı değil, boruya oturan bir NESNEDİR (K-W4).
  'insulation',
] as const

export type InstallationElementType = (typeof INSTALLATION_ELEMENT_TYPES)[number]

/** Sahneye yerleşmeyen, yalnız toolbar'da temsil edilen araçların asset kimlikleri. */
export const TOOLBAR_ONLY_SYMBOL_IDS = ['selection', 'pipe', 'branch', 'measurement'] as const

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

export type SymbolBox = { min: readonly [number, number]; max: readonly [number, number] }

export type SymbolMetadata = {
  id: SymbolId
  /** Kullanıcıya görünen Türkçe ad (id/dosya adı teknik sözleşme olarak İngilizce kalır). */
  label: string
  asset: string
  viewBox: readonly [number, number, number, number]
  origin: readonly [number, number]
  flowDirection?: 'left-to-right'
  ports: readonly SymbolPortDefinition[]
  /**
   * Yalnız yakıcı cihazlarda: baca/havalandırma ağzının üzerinde kayabildiği
   * GÖVDE dikdörtgeni. `bounds` kullanılamaz — o, gaz giriş çıkıntısını ve diğer
   * ayrıntıları da kapsayan tutma kutusu; ağız oraya oturtulsaydı çizilmiş
   * gövdenin dışında, boşlukta dururdu.
   */
  dischargeBox?: SymbolBox
  bounds: SymbolBox
}

/**
 * Baca/havalandırma alabilen cihazlar. `ELEMENT_ATTACH_MODES`'taki `nearestLine`
 * kümesiyle AYNI olmalı — ikisinin ayrışmadığı testte kilitli (o Record buraya
 * import edilseydi import döngüsü doğardı).
 */
export const BURNER_APPLIANCE_TYPES = [
  'stove',
  'spaceHeater',
  'waterHeater',
  'combiBoiler',
  'boiler',
  'otherAppliance',
] as const satisfies readonly InstallationElementType[]

export function isBurnerAppliance(type: InstallationElementType): boolean {
  return (BURNER_APPLIANCE_TYPES as readonly string[]).includes(type)
}

/**
 * Gazı KESEBİLEN armatür. Bir hattın ucunda böyle bir armatür varsa o uç
 * kapalıdır: oradan gaz çıkmaz, dolayısıyla "bağlantısız uç" uyarısı da
 * verilmez (kullanıcı isteği, 2026-08). Sayaç/filtre/regülatör bu listede
 * DEĞİL — onlar akışı geçirir, hattın devam etmesi gerekir.
 */
const SHUTOFF_VALVE_TYPES = [
  'valve',
  'solenoidValve',
] as const satisfies readonly InstallationElementType[]

export function isShutoffValve(type: InstallationElementType): boolean {
  return (SHUTOFF_VALVE_TYPES as readonly string[]).includes(type)
}


/** Plan Bölüm 10 port tablosu — şema port sayılarını buradan doğrular.
 *  Toolbar-only araçlar sahneye portla yerleşmediği için 0/0'dır. */
export const SYMBOL_PORT_COUNTS: Record<SymbolId, { input: number; output: number }> = {
  serviceBox: { input: 0, output: 1 },
  regulator: { input: 1, output: 1 },
  gasMeter: { input: 1, output: 1 },
  strainerMeter: { input: 1, output: 1 },
  manometer: { input: 1, output: 0 },
  filterKit: { input: 1, output: 1 },
  valve: { input: 1, output: 1 },
  solenoidValve: { input: 1, output: 1 },
  stove: { input: 1, output: 0 },
  spaceHeater: { input: 1, output: 0 },
  waterHeater: { input: 1, output: 0 },
  combiBoiler: { input: 1, output: 0 },
  boiler: { input: 1, output: 0 },
  otherAppliance: { input: 1, output: 0 },
  // İzolasyon boruyu kesmez, üstüne oturur: portu yoktur, çapası merkezidir.
  insulation: { input: 0, output: 0 },
  selection: { input: 0, output: 0 },
  pipe: { input: 0, output: 0 },
  branch: { input: 0, output: 0 },
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

const boxSchema = z.object({ min: vec2Schema, max: vec2Schema })

const baseSchema = z.object({
  id: z.enum(SYMBOL_IDS),
  label: z.string().min(1),
  asset: z.string().endsWith('.svg'),
  viewBox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  origin: vec2Schema,
  flowDirection: z.literal('left-to-right').optional(),
  ports: z.array(portSchema),
  dischargeBox: boxSchema.optional(),
  bounds: boxSchema,
})

type ParsedSymbolMetadata = z.infer<typeof baseSchema>

function isInsideBounds(
  position: readonly [number, number],
  bounds: ParsedSymbolMetadata['bounds'],
): boolean {
  const [x, y] = position
  return x >= bounds.min[0] && x <= bounds.max[0] && y >= bounds.min[1] && y <= bounds.max[1]
}

type AnyPort = {
  id: string
  position: readonly [number, number]
  direction: readonly [number, number]
}

function validatePortShape(
  port: AnyPort,
  field: 'ports',
  index: number,
  meta: ParsedSymbolMetadata,
  ctx: z.RefinementCtx,
  seenIds: Set<string>,
): void {
  if (seenIds.has(port.id)) {
    ctx.addIssue({
      code: 'custom',
      path: [field, index, 'id'],
      message: `port id sembol içinde tekil olmalı: ${port.id}`,
    })
  }
  seenIds.add(port.id)

  if (!isInsideBounds(port.position, meta.bounds)) {
    ctx.addIssue({
      code: 'custom',
      path: [field, index, 'position'],
      message: `port ${port.id} bounds dışında`,
    })
  }

  const directionLength = Math.hypot(port.direction[0], port.direction[1])
  if (Math.abs(directionLength - 1) > UNIT_LENGTH_TOLERANCE) {
    ctx.addIssue({
      code: 'custom',
      path: [field, index, 'direction'],
      message: `port ${port.id} direction birim vektör olmalı`,
    })
  }
}

/**
 * Deşarj kutusu YAKICI CİHAZLA birebir: araç güzergâhı yalnız yakıcı cihazdan
 * başlatıyor, metadata bunun tersini söyleyebilseydi ikisi ayrışırdı — yakıcıda
 * kutu YOKSA o cihazdan hiç baca çıkmaz, yakıcı olmayanda VARSA hiç kullanılmaz.
 */
function validateDischargeBox(meta: ParsedSymbolMetadata, ctx: z.RefinementCtx): void {
  const isBurner = isBurnerAppliance(meta.id as InstallationElementType)

  if (!meta.dischargeBox) {
    if (isBurner) {
      ctx.addIssue({
        code: 'custom',
        path: ['dischargeBox'],
        message: `${meta.id} yakıcı cihaz, dischargeBox tanımlamalı`,
      })
    }
    return
  }

  if (!isBurner) {
    ctx.addIssue({
      code: 'custom',
      path: ['dischargeBox'],
      message: `${meta.id} yakıcı cihaz değil, dischargeBox taşıyamaz`,
    })
    return
  }

  const { min, max } = meta.dischargeBox
  if (min[0] >= max[0] || min[1] >= max[1]) {
    ctx.addIssue({
      code: 'custom',
      path: ['dischargeBox'],
      message: 'dischargeBox.min her eksende max değerinden küçük olmalı',
    })
    return
  }

  // Gövde tutma kutusunu aşamaz: aşsaydı ağız cihazın tıklama alanının dışına
  // düşer, kullanıcı kanalı başlatamadığı bir yere yerleştirmiş olurdu.
  if (!isInsideBounds(min, meta.bounds) || !isInsideBounds(max, meta.bounds)) {
    ctx.addIssue({
      code: 'custom',
      path: ['dischargeBox'],
      message: `${meta.id} dischargeBox bounds dışına taşıyor`,
    })
  }
}

function validatePorts(
  meta: ParsedSymbolMetadata,
  ctx: z.RefinementCtx,
  seenIds: Set<string>,
): void {
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

  meta.ports.forEach((port, index) => {
    validatePortShape(port, 'ports', index, meta, ctx, seenIds)
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
    validatePorts(meta, ctx, new Set<string>())
    validateDischargeBox(meta, ctx)
    validateFlowDirection(meta, ctx)
  },
)

export function parseSymbolMetadata(data: unknown): SymbolMetadata {
  return symbolMetadataSchema.parse(data)
}
