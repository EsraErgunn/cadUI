import { floorSummaryValueVariants } from './floorVariants'
import { formatLengthM, getBuildingHeightCm } from '../../core/floorElevation'
import type { DraftFloor } from '../../core/floorPlan'
import { getBasementCount } from '../../core/floors'

type FloorSummaryProps = {
  floors: readonly DraftFloor[]
  activeFloorName: string
  emptyFloorCount: number
}

function SummaryCell({
  label,
  value,
  note,
  isWarning = false,
}: {
  label: string
  value: string
  note?: string
  isWarning?: boolean
}) {
  return (
    <div className="flex-1 border-r border-dashed border-edge px-4 py-2 last:border-r-0">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p>
        <span className={floorSummaryValueVariants({ tone: isWarning ? 'warning' : 'plain' })}>
          {value}
        </span>
        {note && <span className="ml-1 text-xs text-ink-muted">{note}</span>}
      </p>
    </div>
  )
}

/**
 * Pencerenin üstündeki dört değer (madde 2). Taslaktan besleniyor, store'dan
 * değil: kullanıcı listede bir yüksekliği değiştirdiğinde değerler ANINDA
 * güncellenmeli, "Uygula"yı beklememeli.
 *
 * `aria-live`: dört değer de kullanıcının başka bir yerde yaptığı düzenleme
 * yüzünden sessizce değişiyor.
 */
export function FloorSummary({ floors, activeFloorName, emptyFloorCount }: FloorSummaryProps) {
  const basementCount = getBasementCount(floors)

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap rounded-lg border border-dashed border-edge bg-surface"
    >
      <SummaryCell
        label="Bina yüksekliği"
        value={formatLengthM(getBuildingHeightCm(floors))}
        note="m"
      />
      <SummaryCell
        label="Kat sayısı"
        value={String(floors.length)}
        note={basementCount > 0 ? `(${basementCount} bodrum)` : undefined}
      />
      <SummaryCell label="Aktif kat" value={activeFloorName} />
      <SummaryCell
        label="Boş kat"
        value={String(emptyFloorCount)}
        isWarning={emptyFloorCount > 0}
      />
    </div>
  )
}
