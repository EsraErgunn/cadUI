import { getToolLabel } from '../core/tools'
import { getViewLabel } from '../core/views'
import { useCadStore } from '../store/cadStore'
import { selectActiveFloor } from '../store/floorSlice'
import { useUiStore } from '../store/uiStore'

const PRODUCT_NAME = 'StarCad'

function StatusField({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label}: <b className="font-semibold text-ink">{value}</b>
    </span>
  )
}

export function StatusBar() {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const activeViewId = useUiStore((state) => state.activeViewId)
  const activeFloor = useCadStore(selectActiveFloor)

  return (
    <footer
      aria-label="Durum çubuğu"
      className="flex shrink-0 items-center gap-6 border-t border-edge bg-surface px-3 py-1.5 text-xs text-ink-muted"
    >
      <StatusField label="Aktif araç" value={getToolLabel(activeToolId)} />
      <StatusField label="Kat" value={activeFloor?.name ?? '—'} />
      <StatusField label="Görünüm" value={getViewLabel(activeViewId)} />
      <span className="ml-auto">{PRODUCT_NAME}</span>
    </footer>
  )
}
