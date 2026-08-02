import { usePointDragTool } from './usePointDragTool'

/**
 * Köşe sürükleme aracı. Görsel tutamak ÇİZMEZ: seçim modunda her köşede işaret
 * belirmesi çizimi kalabalıklaştırıyordu. Tutma matematikle yapılıyor
 * (usePointDragTool → resolveSnap), ışın tutacak bir mesh gerekmiyor.
 *
 * Hook'lar <Canvas> içinde çalışmak zorunda; bu sarmalayıcı onun için var
 * (SceneRoot'taki ViewportControls ile aynı desen).
 */
export function PointHandles() {
  usePointDragTool()
  return null
}
