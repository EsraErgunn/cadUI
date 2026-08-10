import type { InstallationElement } from './installationModel'
import type { Id } from '../../core/model'

/**
 * Panoya id KOPYALANMAZ: yapıştırma her seferinde yeni id üretir (kural 6).
 * floorId de yok — yapıştırma AKTİF kata düşer, kopyalandığı kata değil.
 */
export type ClipboardEntry = Pick<InstallationElement, 'type' | 'position' | 'angleDeg' | 'scale'>

/** Kopya kaynağın üstüne düşmez: kullanıcı ikisini ayırt edebilmeli (Ctrl+D ile aynı pay). */
export const PASTE_OFFSET_CM = 50

export function toClipboardEntries(
  elements: readonly InstallationElement[],
  elementIds: readonly Id[],
): ClipboardEntry[] {
  return elements
    .filter((element) => elementIds.includes(element.id))
    .map((element) => ({
      type: element.type,
      position: element.position,
      angleDeg: element.angleDeg,
      scale: element.scale,
    }))
}

/**
 * Kaç kez yapıştırıldığına göre kayan pay. Sabit pay olsaydı arka arkaya iki
 * Ctrl+V ikinci kopyayı birincinin TAM üstüne koyar, kullanıcı tek eleman
 * gördüğü için yapıştırmanın çalışmadığını sanardı.
 */
export function offsetClipboardEntries(
  entries: readonly ClipboardEntry[],
  pasteStepCount: number,
): ClipboardEntry[] {
  const offsetCm = pasteStepCount * PASTE_OFFSET_CM
  return entries.map((entry) => ({
    ...entry,
    position: { x: entry.position.x + offsetCm, y: entry.position.y + offsetCm },
  }))
}
