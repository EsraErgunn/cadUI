import { usePlumbingUiStore } from './plumbingUiStore'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import {
  getPasteDeltaCm,
  shiftClipboardEntries,
  shiftLineClipboardEntries,
  toClipboardPayload,
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
  const payload = toClipboardPayload(
    cad.installationElements,
    cad.installationLines,
    cad.installationConnections,
    elementIds,
    lineIds,
  )
  if (payload.elements.length === 0 && payload.lines.length === 0) return
  usePlumbingUiStore.getState().copyToClipboard(payload)
}

export function cutSelectionToClipboard(elementIds: readonly Id[], lineIds: readonly Id[]): void {
  copySelectionToClipboard(elementIds, lineIds)
  useCadStore.getState().removeSelection(elementIds, lineIds)
  usePlumbingUiStore.getState().clearSelection()
}

/**
 * Yapıştırılan eleman/hat id'leri; ikisi de boşsa pano boştu.
 *
 * `cursor` = imlecin plan koordinatı: kopya oraya (panonun merkezi imlece
 * gelecek şekilde) düşer. İmleç tuvale hiç girmediyse null geçilir ve eski
 * paylı yerleşime dönülür — bkz. `getPasteDeltaCm`.
 */
export function pasteClipboard(
  cursor: PlanPoint | null,
  gridStepCm = 0,
): { elementIds: Id[]; lineIds: Id[] } {
  const ui = usePlumbingUiStore.getState()
  if (ui.elementClipboard.length === 0 && ui.lineClipboard.length === 0) {
    return { elementIds: [], lineIds: [] }
  }

  // Pay sayacı ÖNCE artar: ilk yapıştırma da kaynağın üstüne düşmesin.
  ui.advancePasteStep()
  const pasteStepCount = usePlumbingUiStore.getState().pasteStepCount
  const deltaCm = getPasteDeltaCm(
    ui.elementClipboard,
    ui.lineClipboard,
    cursor,
    pasteStepCount,
    gridStepCm,
  )
  const elementEntries = shiftClipboardEntries(ui.elementClipboard, deltaCm)
  const lineEntries = shiftLineClipboardEntries(ui.lineClipboard, deltaCm)

  const { elementIds, lineIds } = useCadStore
    .getState()
    .pasteEntries(elementEntries, lineEntries, ui.connectionClipboard)
  // Seçim KOPYAYA geçer: kullanıcı yapıştırdığı şeyi hemen sürükleyebilsin.
  if (elementIds.length > 0 || lineIds.length > 0) {
    ui.setSelectedElements(elementIds)
    ui.setSelectedLines(lineIds)
  }
  return { elementIds, lineIds }
}
