import { useCadStore } from '../store/cadStore'
import { selectActiveFloor } from '../store/floorSlice'

/** Çizim alanının sol üst köşesindeki aktif kat etiketi (issue 2.1, KK-3). */
export function FloorLabel() {
  const activeFloor = useCadStore(selectActiveFloor)
  if (activeFloor === undefined) return null

  return (
    <span className="pointer-events-none absolute left-3 top-3 rounded-md border border-edge bg-surface/90 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
      {activeFloor.name}
    </span>
  )
}
