import { usePlumbingUiStore } from './plumbingUiStore'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { offsetClipboardEntries, toClipboardEntries } from '../core/clipboard'

/**
 * Kes/kopyala/yapıştır: cadStore (çizim) ile plumbingUiStore (pano) arasında
 * köprü. Hook DEĞİL, çünkü tuş dinleyicisi zaten useSelectionTool'da — burada
 * ikinci bir dinleyici kurulsaydı aynı basış iki yerde işlenirdi.
 *
 * Pano tarayıcının kendi kes/kopyala/yapıştırını KULLANMAZ: taşınan şey metin
 * değil eleman kaydı, sistem panosuna yazmak için serileştirme sözleşmesi
 * gerekirdi (plumbingSerialize.ts henüz yok).
 */

export function copyElementsToClipboard(elementIds: readonly Id[]): void {
  const entries = toClipboardEntries(useCadStore.getState().installationElements, elementIds)
  if (entries.length === 0) return
  usePlumbingUiStore.getState().copyToClipboard(entries)
}

export function cutElementsToClipboard(elementIds: readonly Id[]): void {
  copyElementsToClipboard(elementIds)
  useCadStore.getState().removeElements(elementIds)
  usePlumbingUiStore.getState().clearSelection()
}

/** Yapıştırılan elemanların id'leri; boş dizi = pano boştu. */
export function pasteClipboard(): Id[] {
  const ui = usePlumbingUiStore.getState()
  if (ui.clipboard.length === 0) return []

  // Pay sayacı ÖNCE artar: ilk yapıştırma da kaynağın üstüne düşmesin.
  ui.advancePasteStep()
  const entries = offsetClipboardEntries(
    ui.clipboard,
    usePlumbingUiStore.getState().pasteStepCount,
  )
  const createdIds = useCadStore.getState().addElements(entries)
  // Seçim KOPYAYA geçer: kullanıcı yapıştırdığı şeyi hemen sürükleyebilsin.
  if (createdIds.length > 0) ui.setSelectedElements(createdIds)
  return createdIds
}
