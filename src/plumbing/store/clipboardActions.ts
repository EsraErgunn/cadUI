import { usePlumbingUiStore } from './plumbingUiStore'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import {
  offsetClipboardEntries,
  offsetLineClipboardEntries,
  toClipboardEntries,
  toLineClipboardEntries,
} from '../core/clipboard'

/**
 * Kes/kopyala/yapıştır: cadStore (çizim) ile plumbingUiStore (pano) arasında
 * köprü. Hook DEĞİL, çünkü tuş dinleyicisi zaten useSelectionTool'da — burada
 * ikinci bir dinleyici kurulsaydı aynı basış iki yerde işlenirdi.
 *
 * Pano tarayıcının kendi kes/kopyala/yapıştırını KULLANMAZ: taşınan şey metin
 * değil eleman/hat kaydı, sistem panosuna yazmak için serileştirme sözleşmesi
 * gerekirdi (plumbingSerialize.ts henüz yok).
 */

export function copySelectionToClipboard(elementIds: readonly Id[], lineIds: readonly Id[]): void {
  const cad = useCadStore.getState()
  const elementEntries = toClipboardEntries(cad.installationElements, elementIds)
  const lineEntries = toLineClipboardEntries(cad.installationLines, lineIds)
  if (elementEntries.length === 0 && lineEntries.length === 0) return
  usePlumbingUiStore.getState().copyToClipboard(elementEntries, lineEntries)
}

export function cutSelectionToClipboard(elementIds: readonly Id[], lineIds: readonly Id[]): void {
  copySelectionToClipboard(elementIds, lineIds)
  useCadStore.getState().removeSelection(elementIds, lineIds)
  usePlumbingUiStore.getState().clearSelection()
}

/** Yapıştırılan eleman/hat id'leri; ikisi de boşsa pano boştu. */
export function pasteClipboard(): { elementIds: Id[]; lineIds: Id[] } {
  const ui = usePlumbingUiStore.getState()
  if (ui.elementClipboard.length === 0 && ui.lineClipboard.length === 0) {
    return { elementIds: [], lineIds: [] }
  }

  // Pay sayacı ÖNCE artar: ilk yapıştırma da kaynağın üstüne düşmesin.
  ui.advancePasteStep()
  const pasteStepCount = usePlumbingUiStore.getState().pasteStepCount
  const elementEntries = offsetClipboardEntries(ui.elementClipboard, pasteStepCount)
  const lineEntries = offsetLineClipboardEntries(ui.lineClipboard, pasteStepCount)

  const { elementIds, lineIds } = useCadStore.getState().pasteEntries(elementEntries, lineEntries)
  // Seçim KOPYAYA geçer: kullanıcı yapıştırdığı şeyi hemen sürükleyebilsin.
  if (elementIds.length > 0 || lineIds.length > 0) {
    ui.setSelectedElements(elementIds)
    ui.setSelectedLines(lineIds)
  }
  return { elementIds, lineIds }
}
