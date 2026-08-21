import type { PlanPoint } from '../../core/coords'

/** Ok tuşunun plan düzlemindeki karşılığı. */
export type DraftAxisDirection = 'left' | 'right' | 'up' | 'down'

/**
 * Ekranda "yukarı" plan **+Y**'dir: kamera X ekseninde −90° döndürülmüş
 * ortografik tepe kamera (bkz. `scene/Cameras.tsx`), yani three −Z ↔ plan +Y.
 * Tuş ↔ eksen eşlemesi SADECE burada; sahne ve store bu tablodan okur.
 */
const ARROW_KEY_DIRECTIONS: Readonly<Record<string, DraftAxisDirection>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

const AXIS_UNIT_VECTORS: Readonly<Record<DraftAxisDirection, PlanPoint>> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
}

const AXIS_LABELS: Readonly<Record<DraftAxisDirection, string>> = {
  left: 'Sola',
  right: 'Sağa',
  up: 'Yukarı',
  down: 'Aşağı',
}

export function getDraftAxisDirection(key: string): DraftAxisDirection | null {
  return ARROW_KEY_DIRECTIONS[key] ?? null
}

/**
 * `+`/`-` kot yönü. Aynı fiziksel tuş klavye düzenine göre farklı `key`
 * üretiyor: Shift'liyken `'+'`, Shift'sizken `'='` (Türkçe Q'da da böyle),
 * sayısal tuş takımında doğrudan `'+'`/`'-'`. Üçü de kabul edilmezse tuş
 * kullanıcının klavyesinde sessizce "çalışmıyor" görünür.
 */
export function getDraftElevationSign(key: string): 1 | -1 | null {
  if (key === '+' || key === '=') return 1
  if (key === '-' || key === '_') return -1
  return null
}

/** Klavyeyle çizilecek adımın bitiş köşesi: yön birim vektörü × uzunluk. */
export function getAxisStepPoint(
  anchor: PlanPoint,
  direction: DraftAxisDirection,
  lengthCm: number,
): PlanPoint {
  const unit = AXIS_UNIT_VECTORS[direction]
  return { x: anchor.x + unit.x * lengthCm, y: anchor.y + unit.y * lengthCm }
}

/** Girdi kutusunun başlığında okunan yön adı ("Sağa — Uzunluk (cm)"). */
export function getAxisDirectionLabel(direction: DraftAxisDirection): string {
  return AXIS_LABELS[direction]
}
