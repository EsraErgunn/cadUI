import { usePlumbingUiStore } from './plumbingUiStore'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { mergeElementIds } from '../core/elementSelection'
import { collectServiceBoxInstallation } from '../core/installationReachability'
import { collectMeterDownstreamInstallation } from '../core/meterReport'

/**
 * Seçim silme: klavye (Delete/Backspace, `useSelectionTool.ts`) ve panel "Sil"
 * düğmesi (`PlumbingPropertyPanel.tsx`) BURADAN geçer — tek karar noktası,
 * yoksa biri kaskad kontrolünü unuturdu.
 *
 * Seçimde servis kutusu VEYA sayaç VARSA silme hemen uygulanmaz:
 * - Servis kutusu proje başına TEKTİR ve tüm gaz tesisatının köküdür
 *   (lineSeed.ts) — silinince geride köksüz bir ağ (borular, armatürler,
 *   cihazlar) kalırdı.
 * - Sayaç kendi dalının TEK girişidir — silinince ÇIKIŞINDAN erişilen boru/
 *   armatür/cihaz ağı da köksüz kalırdı (komşu dairenin sayacına geçilmez,
 *   bkz. `core/meterReport.ts` → `collectMeterDownstreamInstallation`).
 *
 * İkisi için de onay diyaloğu (`CascadeDeleteDialog`) istenir; kullanıcı
 * onaylayınca TÜM ağ (`core/installationReachability.ts` /
 * `core/meterReport.ts`) TEK adımda gider. Ağ kat bağlantısıyla (`floorPipeLinks`,
 * kolon devamı) BAŞKA katlara uzanıyorsa oradaki devam boruları da KAPSAMA
 * girer (kullanıcı isteği, 2026-08) — kaynağı gidince o uç köksüz kalırdı.
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
      cad.floorPipeLinks,
      serviceBoxId,
    )
    usePlumbingUiStore.getState().requestCascadeDeletion({
      kind: 'serviceBox',
      elementIds: mergeElementIds(network.elementIds, elementIds),
      lineIds: mergeElementIds(network.lineIds, lineIds),
      floorIds: network.floorIds,
    })
    return
  }

  const meterId = elementIds.find(
    (id) => cad.installationElements.find((element) => element.id === id)?.type === 'gasMeter',
  )
  if (meterId !== undefined) {
    const network = collectMeterDownstreamInstallation(
      meterId,
      cad.installationElements,
      cad.installationLines,
      cad.installationConnections,
      cad.floorPipeLinks,
    )
    usePlumbingUiStore.getState().requestCascadeDeletion({
      kind: 'gasMeter',
      elementIds: mergeElementIds(network.elementIds, elementIds),
      lineIds: mergeElementIds(network.lineIds, lineIds),
      floorIds: network.floorIds,
    })
    return
  }

  cad.removeSelection(elementIds, lineIds)
  usePlumbingUiStore.getState().clearSelection()
}
