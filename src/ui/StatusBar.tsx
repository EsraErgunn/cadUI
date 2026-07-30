import { getToolLabel, type ToolId } from '../core/tools'
import { getViewLabel, type ViewId } from '../core/views'
import {
  getInstallationToolLabel,
  isInstallationToolId,
  type InstallationToolId,
} from '../plumbing/core/installationTools'
import { useCadStore } from '../store/cadStore'
import { selectActiveFloor } from '../store/floorSlice'
import { useUiStore } from '../store/uiStore'

function resolveToolLabel(viewId: ViewId, toolId: ToolId | InstallationToolId): string {
  if (viewId === 'installation' && isInstallationToolId(toolId)) {
    return getInstallationToolLabel(toolId)
  }
  // core/tools.ts sözleşme gereği union kabul edemez; görünüm mimariyken araç
  // daima ToolId'dir (uiStore.setActiveView garanti eder), daraltma bu yüzden güvenli.
  return getToolLabel(toolId as ToolId)
}

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
      <StatusField label="Aktif araç" value={resolveToolLabel(activeViewId, activeToolId)} />
      <StatusField label="Kat" value={activeFloor?.name ?? '—'} />
      <StatusField label="Görünüm" value={getViewLabel(activeViewId)} />
      <span className="ml-auto">{PRODUCT_NAME}</span>
    </footer>
  )
}
