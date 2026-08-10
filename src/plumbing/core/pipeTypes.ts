/**
 * Çap kataloğu TEK yer: çap ne araç kimliğine ne renk seçimine gömülür (K-W1).
 * Dış çaplar EN 10255 / ISO 65; renkler WebCAD sınıflandırmasından (K-W2) —
 * referans projede görülmeyen beş çapın rengi BİLİNMİYOR, varsayılmaz.
 */
export const PIPE_TYPE_NAMES = [
  'DN15',
  'DN20',
  'DN25',
  'DN32',
  'DN40',
  'DN50',
  'DN65',
  'DN80',
  'DN100',
] as const

export type PipeTypeName = (typeof PIPE_TYPE_NAMES)[number]

export type PipeType = {
  /** Çizgi kalınlığı = gerçek dış çap; plan fiziksel olarak doğru okunur. */
  outerDiameterCm: number
  colorHex: string
}

/**
 * Dört çapın rengi WebCAD'den birebir alındı (K-W2). Kalan beşini ekip belirledi:
 * WebCAD'in Material A400/A700 ailesinden, mevcut dördüyle ve tuvalde ayrılmış
 * renklerle çakışmayacak tonlar — marka sarısı #FFC107 (çizim alanına giremez),
 * seçim mavisi #2d7ff9, snap yeşili #0aa06e, duvar grisi #6b7280.
 * Çap büyüdükçe ton koyulaşır: ana hat plandan ağır okunsun.
 */
export const PIPE_TYPES: Record<PipeTypeName, PipeType> = {
  DN15: { outerDiameterCm: 2.13, colorHex: '#00B8D4' },
  DN20: { outerDiameterCm: 2.69, colorHex: '#FF6D00' },
  DN25: { outerDiameterCm: 3.37, colorHex: '#FF1744' },
  DN32: { outerDiameterCm: 4.24, colorHex: '#B388FF' },
  DN40: { outerDiameterCm: 4.83, colorHex: '#304FFE' },
  DN50: { outerDiameterCm: 6.03, colorHex: '#6200EA' },
  DN65: { outerDiameterCm: 7.61, colorHex: '#C51162' },
  DN80: { outerDiameterCm: 8.89, colorHex: '#795548' },
  DN100: { outerDiameterCm: 11.43, colorHex: '#263238' },
}

/** Çizilen her yeni boru bu çapla eklenir (K-W1). */
export const DEFAULT_PIPE_TYPE_NAME: PipeTypeName = 'DN25'

export function isPipeTypeName(name: string): name is PipeTypeName {
  return name in PIPE_TYPES
}
