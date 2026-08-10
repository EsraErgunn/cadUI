import { useState } from 'react'

import { useCloseEditor } from './useCloseEditor'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useProjectExport } from './useProjectExport'
import { useProjectPersistence } from './useProjectPersistence'
import { SceneRoot } from '../scene/SceneRoot'
import { AxisIndicator } from '../ui/AxisIndicator'
import { FloorCopyDialog } from '../ui/FloorCopyDialog'
import { FloorLabel } from '../ui/FloorLabel'
import { FloorManagementDialog } from '../ui/FloorManagementDialog'
import { FloorTabs } from '../ui/FloorTabs'
import { MenuBar } from '../ui/MenuBar'
import { OpeningToolOptions } from '../ui/OpeningToolOptions'
import { PropertyPanel } from '../ui/PropertyPanel'
import { StatusBar } from '../ui/StatusBar'
import { Toolbar } from '../ui/Toolbar'


export function EditorPage() {
  const closeEditor = useCloseEditor()
  const { isSaving, error, save } = useProjectPersistence()
  const exportProject = useProjectExport()
  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false)
  const [isFloorCopyOpen, setIsFloorCopyOpen] = useState(false)
  const handleSave = () => void save()
  useEditorShortcuts({ onSave: handleSave })

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <MenuBar
        onCloseEditor={closeEditor}
        onSave={handleSave}
        onExport={exportProject}
        onOpenFloorManagement={() => setIsFloorDialogOpen(true)}
        onOpenFloorCopy={() => setIsFloorCopyOpen(true)}
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
          <FloorLabel />
          <OpeningToolOptions />
          <AxisIndicator />
          <FloorTabs />
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
