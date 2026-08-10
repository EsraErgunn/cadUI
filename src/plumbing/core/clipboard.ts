import type { InstallationElement, InstallationLine } from './installationModel'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'

/**
 * Panoya id KOPYALANMAZ: yapıştırma her seferinde yeni id üretir (kural 6).
 * floorId de yok — yapıştırma AKTİF kata düşer, kopyalandığı kata değil.
 */
export type ClipboardEntry = Pick<InstallationElement, 'type' | 'position' | 'angleDeg' | 'scale'>

/**
 * Hattın yalnız GEOMETRİSİ kopyalanır — üstündeki armatürler ve bağlantılar
 * (kural 6: id yeniden üretilmez) DEĞİL. Yapıştırılan boru bağımsız, serbest
 * uçlu bir kopyadır; kaynağın armatürleri ayrıca seçiliyse KENDİ elemanları
 * olarak (armatür değil, serbest eleman) kopyalanır.
 */
export type LineClipboardEntry = Pick<InstallationLine, 'kind' | 'pipeTypeName'> & {
  points: PlanPoint[]
}

/** Kopya kaynağının üstüne düşmez: kullanıcı ikisini ayırt edebilmeli (Ctrl+D ile aynı pay). */
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

export function toLineClipboardEntries(
  lines: readonly InstallationLine[],
  lineIds: readonly Id[],
): LineClipboardEntry[] {
  return lines
    .filter((line) => lineIds.includes(line.id))
    .map((line) => ({
      kind: line.kind,
      pipeTypeName: line.pipeTypeName,
      points: line.points.map((point) => point.position),
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

export function offsetLineClipboardEntries(
  entries: readonly LineClipboardEntry[],
  pasteStepCount: number,
): LineClipboardEntry[] {
  const offsetCm = pasteStepCount * PASTE_OFFSET_CM
  return entries.map((entry) => ({
    ...entry,
    points: entry.points.map((point) => ({ x: point.x + offsetCm, y: point.y + offsetCm })),
  }))
}
