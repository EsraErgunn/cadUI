import { FLOOR_FOCUS_RING } from './floorVariants'
import {
  withInstallationDependency,
  type FloorCopyMode,
  type FloorCopyPlan,
} from '../../core/floorCopyPlan'
import { chromeButtonVariants, dialogActionVariants } from '../controls/buttonVariants'

export type FloorCopyIncludes = {
  isArchitectureIncluded: boolean
  isInstallationIncluded: boolean
}

type FloorCopyBarProps = {
  includes: FloorCopyIncludes
  mode: FloorCopyMode
  plan: FloorCopyPlan
  onIncludesChange: (includes: FloorCopyIncludes) => void
  onModeChange: (mode: FloorCopyMode) => void
  onCancel: () => void
  onConfirm: () => void
}

function Toggle({
  label,
  isChecked,
  onChange,
}: {
  label: string
  isChecked: boolean
  onChange: (isChecked: boolean) => void
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-ink">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(event) => onChange(event.target.checked)}
        className={FLOOR_FOCUS_RING}
      />
      {label}
    </label>
  )
}

/**
 * Kopyalama kipinin alt şeridi (K166). Eskiden bunlar ayrı bir pencerede üç
 * başlıklı bölümdü ("Kopyalanacak içerik", "Hedefte içerik varsa", "Hedef
 * katlar") ve her seçeneğin altında bir açıklama satırı vardı. Seçenekler
 * kendini anlatacak kadar az; anlatılması gereken tek şey SONUÇ, o da düğmenin
 * üstünde sayıyla duruyor.
 *
 * İki onay kutusunun birbirine bağlanması burada YAPILMAZ: kural saf tarafta
 * (`withInstallationDependency`), bileşen yalnız sonucu yazar.
 */
export function FloorCopyBar({
  includes,
  mode,
  plan,
  onIncludesChange,
  onModeChange,
  onCancel,
  onConfirm,
}: FloorCopyBarProps) {
  const overwriteCount = plan.overwrittenFloors.length
  const skipCount = plan.skippedFloors.length

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-edge px-3 py-2">
      <Toggle
        label="Mimari"
        isChecked={includes.isArchitectureIncluded}
        onChange={(isChecked) =>
          onIncludesChange(withInstallationDependency(includes, 'architecture', isChecked))
        }
      />
      <Toggle
        label="Tesisat"
        isChecked={includes.isInstallationIncluded}
        onChange={(isChecked) =>
          onIncludesChange(withInstallationDependency(includes, 'installation', isChecked))
        }
      />

      <span className="h-5 w-px bg-edge" aria-hidden />

      {/* Kip yalnız ÇAKIŞMA varken sorulur: hiçbir hedefte aynı türden çizim
          yoksa "üzerine yaz / atla" kararsız bir seçim olur. */}
      {overwriteCount + skipCount > 0 && (
        <>
          <label className="inline-flex items-center gap-1.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={mode === 'skip'}
              onChange={(event) => onModeChange(event.target.checked ? 'skip' : 'overwrite')}
              className={FLOOR_FOCUS_RING}
            />
            Dolu katları atla
          </label>
          <span className="text-xs text-danger">
            {mode === 'skip'
              ? `${skipCount} kat atlanacak`
              : `${overwriteCount} katın çizimi değişecek`}
          </span>
        </>
      )}

      <span className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={`${dialogActionVariants({ tone: 'cancel' })} ${FLOOR_FOCUS_RING}`}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!plan.isRunnable}
          // Rengi kullanıcı kararıyla AYNI kaldı; değişen yalnız kalın yazı.
          className={`${chromeButtonVariants({ tone: 'active' })} font-semibold ${FLOOR_FOCUS_RING}`}
        >
          {plan.targetFloorIds.length} kata kopyala
        </button>
      </span>
    </div>
  )
}
