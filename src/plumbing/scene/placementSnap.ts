import type { PlanPoint } from '../../core/coords'
import { getPlacementPosition } from '../../core/placement'
import { useUiStore } from '../../store/uiStore'

/**
 * `getPlacementPosition`in Görünüm ▸ Izgarayı Göster KAPALIYKEN devre dışı
 * kalan hâli — yalnız tesisat araçları için (kullanıcı isteği, 2026-08:
 * "duvara değil gride yapışıyorsa gridi kapatmak için görünüme grid kapa
 * ekleyelim"). Mimari tarafın ızgara yakalaması bu kapsamın DIŞINDA — kendi
 * araçları `getPlacementPosition`i doğrudan çağırmaya devam eder, ikisini
 * ayırmak B'nin dosyalarına dokunmadan tek bu dosyada kalır.
 *
 * Ctrl ile geçici kapatmadan (`event.ctrlKey ? planPoint : ...`) FARKLI: o
 * jest anlık, bu ise Görünüm menüsünden kalıcı bir tercih — ikisi de aynı
 * "ham nokta" sonucuna varır, çağıran taraf ikisini ayrı ayrı denetler.
 */
export function resolvePlacementPosition(planPoint: PlanPoint, zoom: number): PlanPoint {
  if (!useUiStore.getState().isGridVisible) return planPoint
  return getPlacementPosition(planPoint, zoom)
}
