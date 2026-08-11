import { FLOOR_FOCUS_RING } from './floorVariants'
import { withInstallationDependency, type FloorCopyMode } from '../../core/floorCopyPlan'

export type FloorCopyIncludes = {
  isArchitectureIncluded: boolean
  isInstallationIncluded: boolean
}

type FloorCopyOptionsProps = {
  includes: FloorCopyIncludes
  mode: FloorCopyMode
  onIncludesChange: (includes: FloorCopyIncludes) => void
  onModeChange: (mode: FloorCopyMode) => void
}

function ModeOption({
  value,
  current,
  label,
  note,
  onSelect,
}: {
  value: FloorCopyMode
  current: FloorCopyMode
  label: string
  note: string
  onSelect: (value: FloorCopyMode) => void
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink">
      <input
        type="radio"
        name="floor-copy-mode"
        checked={current === value}
        onChange={() => onSelect(value)}
        className={`mt-0.5 ${FLOOR_FOCUS_RING}`}
      />
      <span>
        {label}
        <span className="block text-xs text-ink-muted">{note}</span>
      </span>
    </label>
  )
}

/**
 * Kopyalanacak içerik (madde 16) ve hedefte içerik varsa ne olacağı (madde 18).
 *
 * İki onay kutusunun birbirine bağlanması BURADA yapılmaz: kural saf tarafta
 * (`withInstallationDependency`), bileşen yalnız sonucu yazar. Mantık burada
 * kalsaydı kopyalama başka bir yerden çağrıldığında sessizce atlanırdı.
 */
export function FloorCopyOptions({
  includes,
  mode,
  onIncludesChange,
  onModeChange,
}: FloorCopyOptionsProps) {
  return (
    <>
      <section className="space-y-2">
        <h3 className="border-b border-edge pb-1 text-xs uppercase tracking-wide text-ink-muted">
          Kopyalanacak içerik
        </h3>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={includes.isArchitectureIncluded}
              onChange={(event) =>
                onIncludesChange(
                  withInstallationDependency(includes, 'architecture', event.target.checked),
                )
              }
              className={FLOOR_FOCUS_RING}
            />
            Mimari Tasarım
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={includes.isInstallationIncluded}
              onChange={(event) =>
                onIncludesChange(
                  withInstallationDependency(includes, 'installation', event.target.checked),
                )
              }
              className={FLOOR_FOCUS_RING}
            />
            Tesisat Tasarımı
            <span className="text-xs text-ink-muted">· mimari olmadan kopyalanmaz</span>
          </label>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="border-b border-edge pb-1 text-xs uppercase tracking-wide text-ink-muted">
          Hedefte içerik varsa
        </h3>
        <div className="flex flex-wrap gap-6">
          <ModeOption
            value="overwrite"
            current={mode}
            label="Üzerine yaz"
            note="Hedefteki aynı türden çizim silinir"
            onSelect={onModeChange}
          />
          <ModeOption
            value="skip"
            current={mode}
            label="Bu katları atla"
            note="Yalnızca çakışmayan katlara kopyalanır"
            onSelect={onModeChange}
          />
        </div>
      </section>
    </>
  )
}
