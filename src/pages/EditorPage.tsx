import { useState } from 'react'

import { useCloseEditor } from './useCloseEditor'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useProjectExport } from './useProjectExport'
import { useProjectImport } from './useProjectImport'
import { useProjectPersistence } from './useProjectPersistence'
import { getFloorIdInDirection, type FloorDirection } from '../core/floors'
import { PipeElevationInput } from '../plumbing/ui/PipeElevationInput'
import { PlumbingPropertyPanel } from '../plumbing/ui/PlumbingPropertyPanel'
import { ServiceBoxDeleteDialog } from '../plumbing/ui/ServiceBoxDeleteDialog'
import { SceneRoot } from '../scene/SceneRoot'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'
import { EditorSidebar } from '../ui/EditorSidebar'
import { FloorCopyDialog } from '../ui/FloorCopyDialog'
import { FloorManagementDialog } from '../ui/FloorManagementDialog'
import { MenuBar } from '../ui/MenuBar'
import { OpeningToolOptions } from '../ui/OpeningToolOptions'
import { PropertyPanel } from '../ui/PropertyPanel'
import { FloatingToolbar } from '../ui/canvas/FloatingToolbar'
import { SaveVersionDialog } from '../ui/versions/SaveVersionDialog'

export function EditorPage() {
  const closeEditor = useCloseEditor()
  const activeViewId = useUiStore((state) => state.activeViewId)
  const { projectId, isSaving, currentVersionId, error, save, loadVersion } =
    useProjectPersistence()
  const exportProject = useProjectExport()
  const { inputRef: importInputRef, error: importError, triggerImport, handleFileSelected } =
    useProjectImport()
  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false)
  const [isFloorCopyOpen, setIsFloorCopyOpen] = useState(false)
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false)
  const handleSave = () => void save()

  /**
   * Etiketli kayıt: pencere ancak sunucu kabul edince kapanıyor. Hemen
   * kapatılsaydı hata mesajı üst barda çıkar ama kullanıcının yazdığı etiket
   * gitmiş olurdu — aynı etiketi yeniden yazmak gerekirdi.
   */
  const handleSaveAs = async (label: string) => {
    if (await save(label)) setIsSaveAsOpen(false)
  }

  /**
   * Klavyeden yapılan geçiş ANINDA uygulanır (madde 20); yalnız "Katlar"
   * penceresi içindeki aktif kat değişikliği "Uygula"yı bekler.
   */
  const goToFloor = (direction: FloorDirection) => {
    const { floors, activeFloorId, setActiveFloor } = useCadStore.getState()
    const nextFloorId = getFloorIdInDirection(floors, activeFloorId, direction)
    // Uçta hiçbir şey olmaz: geçiş döngüsel değil.
    if (nextFloorId !== undefined) setActiveFloor(nextFloorId)
  }

  useEditorShortcuts({
    onSave: handleSave,
    onSaveAs: () => setIsSaveAsOpen(true),
    onOpenFloorManagement: () => setIsFloorDialogOpen(true),
    onOpenFloorCopy: () => setIsFloorCopyOpen(true),
    onGoToFloor: goToFloor,
  })

  return (
    // Sağdaki her şey TEK yüzey: üst bar ayrı bir şerit değil, aynı yüzeyin üst
    // kenarında duran düğmeler. Bu yüzden kavis sayfanın en üstünden en altına
    // kadar iniyor (`rounded-l-2xl`) — bara ait bir kesinti yok.
    //
    // Yüzey `canvas-overlay`, yani KOYU TEMADA DA BEYAZ: bu yüzeyin büyük kısmı
    // zaten tuval ve tuval iki temada da beyaz (sceneTheme.background). Kabuk
    // token'ı kullanılsaydı üst bar beyaz tuvalin üstünde lacivert bir şerit
    // olurdu. Tema DEĞİŞEN parçalar solda: sol bar ve yüzen çubuk.
    <div className="flex h-screen overflow-hidden bg-surface-sunken">
      <EditorSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-l-2xl bg-canvas-overlay">
        <MenuBar
          onCloseEditor={closeEditor}
          onSave={handleSave}
          onSaveAs={() => setIsSaveAsOpen(true)}
          onImport={triggerImport}
          onExport={exportProject}
          isSaving={isSaving}
          versionHistory={{ projectId, currentVersionId, onLoadVersion: loadVersion }}
        />

        {/* Menüden tetiklenir (Dosya > İçe Aktar); görünür bir seçici yerine
            gizli input kullanmak tarayıcının kendi dosya diyaloğunu verir. */}
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileSelected}
        />

        {error && (
          <p
            role="alert"
            className="shrink-0 border-y border-canvas-overlay-edge px-4 py-1.5 text-sm text-canvas-overlay-danger"
          >
            {error}
          </p>
        )}

        {importError && (
          <p
            role="alert"
            className="shrink-0 border-y border-canvas-overlay-edge px-4 py-1.5 text-sm text-canvas-overlay-danger"
          >
            {importError}
          </p>
        )}

        {/* min-h-0 / min-w-0 şart: flex çocukları varsayılan olarak içeriğinden
            küçülmeyi reddeder; olmazsa canvas taşar. relative: PropertyPanel'in
            absolute konumlanması buna göre. */}
        {/* Tuval soldan boşlukla içeri alınıyor: ızgara orada KESİLİYOR, cetvel
            sayısı olmadan da çizim alanının nerede başladığı okunuyor. Üstte
            ayrıca boşluk YOK — üst bar zaten o kesintiyi yapıyor. */}
        <div className="relative flex min-h-0 flex-1 pl-3">
          <main className="relative min-w-0 flex-1 overflow-hidden">
            <SceneRoot />
            <OpeningToolOptions />
            {/* İki şerit aynı yerde ama asla birlikte görünmez: biri mimari
                açıklık aracına, öteki tesisat boru aracına (K102) bağlı. */}
            <PipeElevationInput />
            {/* Tuvalin çalışma kipi ve çizim yardımcıları (K54). İki ÇİZİM
                görünümünde de var (K57); izometrikte çizilecek bir şey yok,
                orada tuval etkileşimi de yok. */}
            {activeViewId !== 'isometric' && (
              <FloatingToolbar
                onGoToFloor={goToFloor}
                onOpenFloorManagement={() => setIsFloorDialogOpen(true)}
                onOpenFloorCopy={() => setIsFloorCopyOpen(true)}
              />
            )}
          </main>

          {/* Çizim alanının ÜSTÜNE biner, genişliğini daraltmaz (K37) — sağdan
              kayarak açılır/kapanır. İki panel ayrı seçim store'una abone
              (mimari/tesisat), bu yüzden görünüme göre İKİSİNDEN BİRİ render
              edilir, tek panelde birleştirilmez. */}
          {activeViewId === 'installation' ? <PlumbingPropertyPanel /> : <PropertyPanel />}
        </div>
      </div>

      {isFloorDialogOpen && <FloorManagementDialog onClose={() => setIsFloorDialogOpen(false)} />}

      {isFloorCopyOpen && <FloorCopyDialog onClose={() => setIsFloorCopyOpen(false)} />}

      {isSaveAsOpen && (
        <SaveVersionDialog
          isSaving={isSaving}
          onCancel={() => setIsSaveAsOpen(false)}
          onSave={(label) => void handleSaveAs(label)}
        />
      )}

      <ServiceBoxDeleteDialog />
    </div>
  )
}
