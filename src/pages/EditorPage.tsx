import { useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'

import { useCloseEditor } from './useCloseEditor'
import { useEditorExit } from './useEditorExit'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useProjectExport } from './useProjectExport'
import { useProjectImport } from './useProjectImport'
import { useProjectPersistence } from './useProjectPersistence'
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning'
import { getFloorIdInDirection, type FloorDirection } from '../core/floors'
import { isDrawingView } from '../core/views'
import { CascadeDeleteDialog } from '../plumbing/ui/CascadeDeleteDialog'
import { PipeElevationInput } from '../plumbing/ui/PipeElevationInput'
import { PlumbingPropertyPanel } from '../plumbing/ui/PlumbingPropertyPanel'
import { SceneRoot } from '../scene/SceneRoot'
import { selectIsProjectDirty, useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'
import { ClearProjectDialog } from '../ui/ClearProjectDialog'
import { EditorSidebar } from '../ui/EditorSidebar'
import { FloorCopyDialog } from '../ui/FloorCopyDialog'
import { FloorManagementDialog } from '../ui/FloorManagementDialog'
import { MenuBar } from '../ui/MenuBar'
import { OpeningToolOptions } from '../ui/OpeningToolOptions'
import { PropertyPanel } from '../ui/PropertyPanel'
import { UnsavedChangesDialog } from '../ui/UnsavedChangesDialog'
import { FloatingToolbar } from '../ui/canvas/FloatingToolbar'
import { SolidToolbar } from '../ui/canvas/SolidToolbar'
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
  const [isClearProjectOpen, setIsClearProjectOpen] = useState(false)
  const isDirty = useCadStore(selectIsProjectDirty)
  const handleSave = () => void save()

  // Sekme kapatma / yenileme tarayıcının kendi sorusuyla; uygulama İÇİ her
  // çıkış (düğme, menü, geri tuşu) aşağıdaki engelle.
  useUnsavedChangesWarning(isDirty)

  const blocker = useBlocker(isDirty)
  const exitBlocker = useMemo(
    () => ({
      isBlocked: blocker.state === 'blocked',
      // Kaydettikten sonra proje temiz olsa bile engel 'blocked' kalıyor
      // (getBlocker var olan durumu sıfırlamıyor), ama engel hiç kurulmamışsa
      // gidilecek yer bilinmediği için düz kapanışa düşülüyor.
      proceed: () => (blocker.state === 'blocked' ? blocker.proceed() : closeEditor()),
      reset: () => blocker.reset?.(),
    }),
    [blocker, closeEditor],
  )
  const exit = useEditorExit({ blocker: exitBlocker, save })

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
          onClearProject={() => setIsClearProjectOpen(true)}
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
            {/* İki şerit aynı yerde ama asla birlikte görünmez: biri mimari
                açıklık aracına, öteki tesisat boru aracına (K102) bağlı. İkisi
                de ÇİZİM görünümüne ait — katı modelde araç seçili kalabilir
                ama şerit orada çizilecek bir şeye işaret etmez. */}
            {isDrawingView(activeViewId) && (
              <>
                <OpeningToolOptions />
                <PipeElevationInput />
              </>
            )}
            {/* Tuvalin çalışma kipi ve çizim yardımcıları (K54). İki ÇİZİM
                görünümünde de var (K57); izometrikte çizilecek bir şey yok,
                orada tuval etkileşimi de yok. */}
            {isDrawingView(activeViewId) && (
              <FloatingToolbar
                onGoToFloor={goToFloor}
                onOpenFloorManagement={() => setIsFloorDialogOpen(true)}
                onOpenFloorCopy={() => setIsFloorCopyOpen(true)}
              />
            )}
            {/* Katı modelin kendi çubuğu: çizim yardımcıları yerine kapsam ve
                görünürlük anahtarları (bkz. SolidToolbar). */}
            {activeViewId === 'solid' && <SolidToolbar />}
          </main>

          {/* Çizim alanının ÜSTÜNE biner, genişliğini daraltmaz (K37) — sağdan
              kayarak açılır/kapanır. İki panel ayrı seçim store'una abone
              (mimari/tesisat), bu yüzden görünüme göre İKİSİNDEN BİRİ render
              edilir, tek panelde birleştirilmez. */}
          {/* Katı modelde seçim YOK (salt okuma görünümü): iki panel de mount
              edilmez, yoksa boş bir "Özellikler" kabuğu çizimin üstünde asılı kalır. */}
          {isDrawingView(activeViewId) &&
            (activeViewId === 'installation' ? <PlumbingPropertyPanel /> : <PropertyPanel />)}
        </div>
      </div>

      {isFloorDialogOpen && <FloorManagementDialog onClose={() => setIsFloorDialogOpen(false)} />}

      {isFloorCopyOpen && <FloorCopyDialog onClose={() => setIsFloorCopyOpen(false)} />}

      {isClearProjectOpen && (
        <ClearProjectDialog
          onCancel={() => setIsClearProjectOpen(false)}
          onConfirm={() => {
            useCadStore.getState().clearProjectDrawing()
            setIsClearProjectOpen(false)
          }}
        />
      )}

      {/* Hata YALNIZ bu pencereden yapılan deneme başarısızsa gösteriliyor:
          `error` daha eski bir yükleme hatasını da taşıyabiliyor ve pencere
          açılır açılmaz alakasız bir uyarı soruyu bulandırırdı. */}
      {exit.isPromptOpen && (
        <UnsavedChangesDialog
          isSaving={isSaving}
          error={exit.hasSaveFailed ? error : undefined}
          onCancel={exit.cancel}
          onDiscard={exit.discardAndClose}
          onSaveAndClose={() => void exit.saveAndClose()}
        />
      )}

      {isSaveAsOpen && (
        <SaveVersionDialog
          isSaving={isSaving}
          onCancel={() => setIsSaveAsOpen(false)}
          onSave={(label) => void handleSaveAs(label)}
        />
      )}

      <CascadeDeleteDialog />
    </div>
  )
}
