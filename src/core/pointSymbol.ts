import type { Id, PointSymbol, PointSymbolType } from './model'

/**
 * Etiket öneki. Record olduğu için yeni tip eklenip önek unutulursa DERLEME
 * kırılır — sessizce boş etiketli sembol üretilmez (TOOL_ICONS ile aynı gerekçe).
 */
export const SYMBOL_LABEL_PREFIXES: Record<PointSymbolType, string> = {
  mainCutoffSwitch: 'AKS',
  panel: 'P',
  lighting: 'AY',
  fireExtinguisher: 'YS',
  alarmDevice: 'AL',
  earthquakeSensor: 'DS',
  vent: 'MN',
}

/** Kullanıcıya görünen Türkçe ad; panel başlığı ve durum metinleri bunu okur. */
export const SYMBOL_TYPE_LABELS: Record<PointSymbolType, string> = {
  mainCutoffSwitch: 'Ana Kesme Şalteri',
  panel: 'Pano',
  lighting: 'Aydınlatma',
  fireExtinguisher: 'Yangın Söndürücü',
  alarmDevice: 'Alarm Cihazı',
  earthquakeSensor: 'Deprem Sensörü',
  vent: 'Menfez',
}

/** "P-01" — iki basamak, sıra 99'u geçerse doğal olarak büyür. */
const LABEL_NUMBER_PAD = 2

export function formatSymbolLabel(type: PointSymbolType, sequence: number): string {
  return `${SYMBOL_LABEL_PREFIXES[type]}-${String(sequence).padStart(LABEL_NUMBER_PAD, '0')}`
}

/**
 * Sıradaki etiket: aynı KAT ve aynı TİPTEKİ en yüksek numaranın bir fazlası.
 *
 * Sayıya (kaç sembol var) bakılmaz: silinen bir sembolün numarası geri
 * kullanılırsa kullanıcı iki farklı zamanda aynı adı taşıyan iki nesne görür.
 * Kat başına ayrı sayılır çünkü etiket çakışması da kat içinde tanımlı (KK-10).
 */
export function getNextSymbolLabel(
  symbols: readonly PointSymbol[],
  type: PointSymbolType,
  floorId: Id,
): string {
  const pattern = new RegExp(`^${SYMBOL_LABEL_PREFIXES[type]}-(\\d+)$`)

  let highest = 0
  for (const symbol of symbols) {
    if (symbol.floorId !== floorId || symbol.type !== type) continue
    const match = pattern.exec(symbol.label.trim())
    if (match) highest = Math.max(highest, Number(match[1]))
  }

  return formatSymbolLabel(type, highest + 1)
}

/**
 * Etiket çakışması KAT içinde tanımlıdır (KK-10) ve TİPTEN bağımsızdır: kullanıcı
 * panoya "MN-01" adını verebilir, o ad menfezle çakışır.
 *
 * Karşılaştırma yalnız boşluk kırpar, `toLowerCase()` UYGULAMAZ —
 * bkz. knowledge/turkish-collation.md.
 */
export function isSymbolLabelTaken(
  symbols: readonly PointSymbol[],
  label: string,
  floorId: Id,
  exceptSymbolId?: Id,
): boolean {
  const trimmed = label.trim()
  return symbols.some(
    (symbol) =>
      symbol.floorId === floorId &&
      symbol.id !== exceptSymbolId &&
      symbol.label.trim() === trimmed,
  )
}

export function isSymbolLabelValid(label: string): boolean {
  return label.trim().length > 0
}

/**
 * Araç → sembol tipi eşlemesinin TEK yeri; hem sahne hook'u hem panel okur.
 * Parametre string: core, ToolId birleşimindeki tesisat araçlarını bilmek zorunda
 * değil (getOpeningTypeForTool ile aynı gerekçe).
 */
export function getPointSymbolTypeForTool(toolId: string): PointSymbolType | undefined {
  return toolId in SYMBOL_LABEL_PREFIXES ? (toolId as PointSymbolType) : undefined
}

export function getSymbolsOnFloor(
  symbols: readonly PointSymbol[],
  floorId: Id,
): PointSymbol[] {
  return symbols.filter((symbol) => symbol.floorId === floorId)
}
