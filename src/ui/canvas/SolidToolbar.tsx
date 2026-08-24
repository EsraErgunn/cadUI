import { Blend, Building2, Focus, Layers, Square, Wrench } from 'lucide-react'

import { CANVAS_BAR_DIVIDER, canvasBarButtonVariants } from './canvasBarVariants'
import { formatLengthM, getBuildingHeightCm } from '../../core/floorElevation'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'

/**
 * Katı modelin yüzen çubuğu. `FloatingToolbar` yeniden KULLANILMADI: oradaki
 * her düğme (seçim, el, geri al, kat geçişi, snap) çizmeye ait ve katı modelde
 * çizim yok — ortak olan tek şey çubuğun kabuğu, o da `canvasBarVariants`
 * üzerinden zaten paylaşılıyor.
 *
 * Kat geçişi burada da YOK: katı model bütün binayı gösteriyor, "aktif kat"
 * yalnız kapsamı daraltan bir seçenek.
 */
export function SolidToolbar() {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const isSolidAllFloorsVisible = useUiStore((state) => state.isSolidAllFloorsVisible)
  const toggleSolidAllFloorsVisible = useUiStore((state) => state.toggleSolidAllFloorsVisible)
  const isSolidSlabsVisible = useUiStore((state) => state.isSolidSlabsVisible)
  const toggleSolidSlabsVisible = useUiStore((state) => state.toggleSolidSlabsVisible)
  const isSolidInstallationVisible = useUiStore((state) => state.isSolidInstallationVisible)
  const toggleSolidInstallationVisible = useUiStore(
    (state) => state.toggleSolidInstallationVisible,
  )
  const isSolidWallsTransparent = useUiStore((state) => state.isSolidWallsTransparent)
  const toggleSolidWallsTransparent = useUiStore((state) => state.toggleSolidWallsTransparent)
  const requestSolidCameraReset = useUiStore((state) => state.requestSolidCameraReset)

  const activeFloor = floors.find((floor) => floor.id === activeFloorId)

  const scopeLabel = isSolidAllFloorsVisible
    ? // Bina yüksekliği bodrumları saymaz (floorElevation.ts) — çubukta yazan da bu.
      `${floors.length} kat · ${formatLengthM(getBuildingHeightCm(floors))} m`
    : (activeFloor?.name ?? 'Aktif kat')

  return (
    // `FloatingToolbar` ile aynı yer ve aynı tuzak: sarmalayıcı tıklama almaz,
    // yoksa çubuğun iki yanındaki boşluk yörünge sürüklemesini yutardı.
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
      <div
        role="toolbar"
        aria-label="Katı model araçları"
        className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-edge bg-surface/95 px-1.5 py-1 shadow-lg backdrop-blur"
      >
        <button
          type="button"
          onClick={toggleSolidAllFloorsVisible}
          aria-pressed={isSolidAllFloorsVisible}
          title={
            isSolidAllFloorsVisible
              ? 'Tüm katlar — yalnız aktif kata inmek için tıklayın'
              : 'Yalnız aktif kat — tüm binayı görmek için tıklayın'
          }
          className={canvasBarButtonVariants({
            tone: isSolidAllFloorsVisible ? 'active' : 'plain',
            shape: 'label',
          })}
        >
          {isSolidAllFloorsVisible ? (
            <Layers size={16} strokeWidth={1.8} aria-hidden />
          ) : (
            <Building2 size={16} strokeWidth={1.8} aria-hidden />
          )}
          {scopeLabel}
        </button>

        <span className={CANVAS_BAR_DIVIDER} aria-hidden />

        <button
          type="button"
          onClick={toggleSolidWallsTransparent}
          aria-pressed={isSolidWallsTransparent}
          title="Duvarları saydam göster"
          aria-label="Duvarları saydam göster"
          className={canvasBarButtonVariants({
            tone: isSolidWallsTransparent ? 'active' : 'plain',
          })}
        >
          <Blend size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <button
          type="button"
          onClick={toggleSolidSlabsVisible}
          aria-pressed={isSolidSlabsVisible}
          title="Döşemeleri göster"
          aria-label="Döşemeleri göster"
          className={canvasBarButtonVariants({ tone: isSolidSlabsVisible ? 'active' : 'plain' })}
        >
          <Square size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <button
          type="button"
          onClick={toggleSolidInstallationVisible}
          aria-pressed={isSolidInstallationVisible}
          title="Tesisatı göster"
          aria-label="Tesisatı göster"
          className={canvasBarButtonVariants({
            tone: isSolidInstallationVisible ? 'active' : 'plain',
          })}
        >
          <Wrench size={16} strokeWidth={1.8} aria-hidden />
        </button>

        <span className={CANVAS_BAR_DIVIDER} aria-hidden />

        <button
          type="button"
          onClick={requestSolidCameraReset}
          title="Görünümü sıfırla — kamerayı binaya oturt"
          aria-label="Görünümü sıfırla"
          className={canvasBarButtonVariants()}
        >
          <Focus size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </div>
    </div>
  )
}
