import { useCloseEditor } from './useCloseEditor'
import { useProjectExport } from './useProjectExport'
import { useProjectPersistence } from './useProjectPersistence'
import { SceneRoot } from '../scene/SceneRoot'
import { AxisIndicator } from '../ui/AxisIndicator'
import { FloorLabel } from '../ui/FloorLabel'
import { MenuBar } from '../ui/MenuBar'
import { OpeningToolOptions } from '../ui/OpeningToolOptions'
import { StatusBar } from '../ui/StatusBar'
import { Toolbar } from '../ui/Toolbar'


export function EditorPage() {
  const closeEditor = useCloseEditor()
  const { isSaving, error, save } = useProjectPersistence()
  const exportProject = useProjectExport()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <MenuBar
        onCloseEditor={closeEditor}
        onSave={() => void save()}
        onExport={exportProject}
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
          iter. Menü/palet/durum çubuğu shrink-0, kalan alanı çizim alanı doldurur. */}
      <div className="flex min-h-0 flex-1">
        <Toolbar />

        <main className="relative min-w-0 flex-1">
          <SceneRoot />
          <FloorLabel />
          <OpeningToolOptions />
          <AxisIndicator />
        </main>

        {/* Özellik paneli yuvası. Kardeş eleman olduğu için açıldığında çizim
            alanını daraltır, üzerine binmez (issue 2.1). Bu issue'da kapalı. */}
        <aside className="w-0 shrink-0 overflow-hidden" />
      </div>

      <StatusBar />
    </div>
  )
}
