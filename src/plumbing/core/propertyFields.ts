import { INSTALLATION_ELEMENT_TYPE_LABELS, INSTALLATION_LINE_KIND_LABELS } from './elementLabels'
import type { InstallationElement, InstallationLine } from './installationModel'
import type { Id } from '../../core/model'

/**
 * Tesisat özellik panelinin hangi formu göstereceği (mimarideki
 * `getPropertySelectionKind`'in eşdeğeri, K37/property-panel.md). Burada TÜR
 * iki ayrı evrenden gelebiliyor (eleman türü / hat türü) — SelectionItem'daki
 * gibi düz bir string yerine ayrık birleşim, geçersiz kombinasyonlar (örn. hem
 * elementType hem lineKind taşıyan bir kind) derlemede engellenir.
 */
export type PlumbingSelectionKind =
  | { scope: 'none' }
  | { scope: 'element'; elementType: InstallationElement['type'] }
  | { scope: 'line'; lineKind: InstallationLine['kind'] }
  | { scope: 'mixed' }

export function getPlumbingSelectionKind(
  selectedElementIds: readonly Id[],
  selectedLineIds: readonly Id[],
  elements: readonly InstallationElement[],
  lines: readonly InstallationLine[],
): PlumbingSelectionKind {
  if (selectedElementIds.length === 0 && selectedLineIds.length === 0) return { scope: 'none' }
  // Eleman VE hat birlikte seçiliyse ortak alan yok — mimarideki 'mixed' ile aynı gerekçe.
  if (selectedElementIds.length > 0 && selectedLineIds.length > 0) return { scope: 'mixed' }

  if (selectedLineIds.length > 0) {
    const selectedLines = lines.filter((line) => selectedLineIds.includes(line.id))
    const [first] = selectedLines
    // Seçim id'leri sahipsiz kalmış olabilir (silinmiş nesne) — pruneElementIds
    // henüz çalışmadıysa panel çökmesin, kapalı görünsün.
    if (!first) return { scope: 'none' }
    return selectedLines.every((line) => line.kind === first.kind)
      ? { scope: 'line', lineKind: first.kind }
      : { scope: 'mixed' }
  }

  const selectedElements = elements.filter((element) => selectedElementIds.includes(element.id))
  const [first] = selectedElements
  if (!first) return { scope: 'none' }
  return selectedElements.every((element) => element.type === first.type)
    ? { scope: 'element', elementType: first.type }
    : { scope: 'mixed' }
}

/** Panel başlığı; tekil seçimde tür adı + "Özellikleri", çoklu seçimde sayı. */
export function getPlumbingPropertyPanelTitle(
  kind: PlumbingSelectionKind,
  elementCount: number,
  lineCount: number,
): string {
  if (kind.scope === 'element') {
    const label = INSTALLATION_ELEMENT_TYPE_LABELS[kind.elementType]
    return elementCount > 1 ? `${elementCount} ${label}` : `${label} Özellikleri`
  }
  if (kind.scope === 'line') {
    const label = INSTALLATION_LINE_KIND_LABELS[kind.lineKind]
    return lineCount > 1 ? `${lineCount} ${label}` : `${label} Özellikleri`
  }
  if (kind.scope === 'mixed') return `${elementCount + lineCount} Nesne`
  return ''
}

/**
 * Ortak metin değeri: hepsi aynıysa o değer, ayrışıyorsa undefined
 * (`core/propertyFields.ts` → `getCommonNumber` ile aynı gerekçe — panel
 * ayrışan alanı boş gösterir, rastgele birini yazmak yanıltır).
 */
export function getCommonString(values: readonly string[]): string | undefined {
  if (values.length === 0) return undefined

  const [first] = values
  return values.every((value) => value === first) ? first : undefined
}
