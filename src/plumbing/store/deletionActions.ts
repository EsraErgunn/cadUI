import { usePlumbingUiStore } from './plumbingUiStore'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { mergeElementIds } from '../core/elementSelection'
import { collectServiceBoxInstallation } from '../core/installationReachability'

/**
 * Seçim silme: klavye (Delete/Backspace, `useSelectionTool.ts`) ve panel "Sil"
 * düğmesi (`PlumbingPropertyPanel.tsx`) BURADAN geçer — tek karar noktası,
 * yoksa biri servis kutusu kontrolünü unuturdu.
 *
 * Seçimde servis kutusu VARSA silme hemen uygulanmaz: kutu proje başına
 * TEKTİR ve tüm gaz tesisatının köküdür (lineSeed.ts) — silinince geride
 * köksüz bir ağ (borular, armatürler, cihazlar) kalırdı. Onay diyaloğu
 * (`ServiceBoxDeleteDialog`) istenir; kullanıcı onaylayınca kutuya bağlı TÜM
 * ağ (`core/installationReachability.ts`) TEK adımda gider.
 */
export function requestSelectionDeletion(elementIds: readonly Id[], lineIds: readonly Id[]): void {
  if (elementIds.length === 0 && lineIds.length === 0) return

  const cad = useCadStore.getState()
  const serviceBoxId = elementIds.find(
    (id) => cad.installationElements.find((element) => element.id === id)?.type === 'serviceBox',
  )

  if (serviceBoxId !== undefined) {
    const network = collectServiceBoxInstallation(
      cad.installationElements,
      cad.installationLines,
      cad.installationConnections,
      serviceBoxId,
    )
    usePlumbingUiStore.getState().requestServiceBoxDeletion({
      elementIds: mergeElementIds(network.elementIds, elementIds),
      lineIds: mergeElementIds(network.lineIds, lineIds),
    })
    return
  }

  cad.removeSelection(elementIds, lineIds)
  usePlumbingUiStore.getState().clearSelection()
}
