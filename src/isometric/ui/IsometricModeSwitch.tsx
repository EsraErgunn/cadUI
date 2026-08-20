import { isometricPanelVariants, isometricSegmentVariants } from './isometricVariants'
import { useIsometricUiStore } from '../store/isometricUiStore'

const MODES = [
  {
    id: 'locked',
    label: 'İzometrik',
    description: 'Sabit açı — teknik çizim; etiketler sürüklenebilir',
  },
  {
    id: 'free',
    label: 'Serbest',
    description: 'Kamerayı sürükleyerek döndür',
  },
] as const

/**
 * iOS tarzı segmented control: seçili hap AYRI bir katman olarak kayar
 * (`translate-x`), maddelerin kendi zemini yoktur. Her maddeye ayrı zemin
 * verilseydi geçiş bir yerde sönüp ötekinde belirirdi; kayan tek hap hareketi
 * sürekli gösterir.
 *
 * `role="radiogroup"`: iki kip birbirini dışlıyor, bu bir onay kutusu çifti
 * değil. Klavyeyle seçim ve okuma bu role'e bağlı.
 */
export function IsometricModeSwitch() {
  const isCameraLocked = useIsometricUiStore((state) => state.isCameraLocked)
  const setCameraLocked = useIsometricUiStore((state) => state.setCameraLocked)

  return (
    <div
      className={`${isometricPanelVariants({ padding: 'control' })} absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-0`}
      role="radiogroup"
      aria-label="İzometrik kamera kipi"
    >
      {/* Kayan hap: maddelerin ALTINDA (z yok), genişliği yarım. */}
      <span
        aria-hidden
        className={
          'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl ' +
          'bg-glass-strong shadow-sm transition-transform duration-300 ease-spring ' +
          (isCameraLocked ? 'translate-x-0' : 'translate-x-full')
        }
      />
      {MODES.map((mode) => {
        const isSelected = (mode.id === 'locked') === isCameraLocked
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            title={mode.description}
            className={isometricSegmentVariants({ isSelected })}
            onClick={() => setCameraLocked(mode.id === 'locked')}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
