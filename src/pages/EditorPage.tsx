import { useState } from 'react'

import { useCloseEditor } from './useCloseEditor'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useProjectExport } from './useProjectExport'
import { useProjectPersistence } from './useProjectPersistence'
import { getFloorIdInDirection, type FloorDirection } from '../core/floors'
import { SceneRoot } from '../scene/SceneRoot'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'
import { AxisIndicator } from '../ui/AxisIndicator'
import { FloorCopyDialog } from '../ui/FloorCopyDialog'
import { FloorManagementDialog } from '../ui/FloorManagementDialog'
import { MenuBar } from '../ui/MenuBar'
import { OpeningToolOptions } from '../ui/OpeningToolOptions'
import { PropertyPanel } from '../ui/PropertyPanel'
import { StatusBar } from '../ui/StatusBar'
import { Toolbar } from '../ui/Toolbar'
import { FloatingToolbar } from '../ui/canvas/FloatingToolbar'


export function EditorPage() {
  const closeEditor = useCloseEditor()
  const activeViewId = useUiStore((state) => state.activeViewId)
  const { isSaving, error, save } = useProjectPersistence()
  const exportProject = useProjectExport()
  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false)
  const [isFloorCopyOpen, setIsFloorCopyOpen] = useState(false)
  const handleSave = () => void save()

  /**
   * Şeritten, menüden ve klavyeden yapılan geçiş ANINDA uygulanır (madde 20);
   * yalnız "Katlar" penceresi içindeki aktif kat değişikliği "Uygula"yı bekler.
   */
  const goToFloor = (direction: FloorDirection) => {
    const { floors, activeFloorId, setActiveFloor } = useCadStore.getState()
    const nextFloorId = getFloorIdInDirection(floors, activeFloorId, direction)
    // Uçta hiçbir şey olmaz: geçiş döngüsel değil.
    if (nextFloorId !== undefined) setActiveFloor(nextFloorId)
  }

  useEditorShortcuts({
    onSave: handleSave,
    onOpenFloorManagement: () => setIsFloorDialogOpen(true),
    onOpenFloorCopy: () => setIsFloorCopyOpen(true),
    onGoToFloor: goToFloor,
  })

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <MenuBar
        onCloseEditor={closeEditor}
        onSave={handleSave}
        onExport={exportProject}
        onOpenFloorManagement={() => setIsFloorDialogOpen(true)}
        onOpenFloorCopy={() => setIsFloorCopyOpen(true)}
        onGoToFloor={goToFloor}
        isSaving={isSaving}
      />

      {error && (
        <p
          role="alert"
          className="shrink-0 border-b border-edge bg-surface-sunken px-3 py-1.5 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {/* min-h-0 / min-w-0 şart: flex çocukları varsayılan olarak içeriğinden
          küçülmeyi reddeder; olmazsa canvas taşar ve durum çubuğunu ekran dışına
          iter. Menü/palet/durum çubuğu shrink-0, kalan alanı çizim alanı doldurur.
          relative: PropertyPanel'in absolute konumlanması buna göre. */}
      <div className="relative flex min-h-0 flex-1">
        <Toolbar />

        <main className="relative min-w-0 flex-1">
          <SceneRoot />
          <OpeningToolOptions />
          <AxisIndicator />
          {/* Tuvalin çalışma kipi ve çizim yardımcıları (K54). İki ÇİZİM
              görünümünde de var (K57); izometrikte çizilecek bir şey yok,
              orada tuval etkileşimi de yok. */}
          {activeViewId !== 'isometric' && <FloatingToolbar onGoToFloor={goToFloor} />}
        </main>

        {/* Çizim alanının ÜSTÜNE biner, genişliğini daraltmaz (K37) — sağdan
            kayarak açılır/kapanır, satırın altında konumlanır. */}
        <PropertyPanel />
      </div>

      <StatusBar />

      {isFloorDialogOpen && (
        <FloorManagementDialog onClose={() => setIsFloorDialogOpen(false)} />
      )}

      {isFloorCopyOpen && <FloorCopyDialog onClose={() => setIsFloorCopyOpen(false)} />}
    </div>
  )
}
