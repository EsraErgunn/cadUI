import { useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'

import { useCloseEditor } from './useCloseEditor'
import { useEditorExit } from './useEditorExit'
import { useEditorReadOnlyMode } from './useEditorReadOnlyMode'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useEditorSubmit } from './useEditorSubmit'
import { useProjectExport } from './useProjectExport'
import { PROJECT_FILE_ACCEPT, useProjectFileOpen } from './useProjectFileOpen'
import { useProjectImport } from './useProjectImport'
import { useProjectPersistence } from './useProjectPersistence'
import { useProjectSummary } from './useProjectSummary'
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning'
import { getFloorIdInDirection, type FloorDirection } from '../core/floors'
import { isDrawingView } from '../core/views'
import { IsometricHud } from '../isometric/ui/IsometricHud'
import { IsometricLegend } from '../isometric/ui/IsometricLegend'
import { IsometricModeSwitch } from '../isometric/ui/IsometricModeSwitch'
import { CascadeDeleteDialog } from '../plumbing/ui/CascadeDeleteDialog'
import { DraftKeyboardInput } from '../plumbing/ui/DraftKeyboardInput'
import { PlumbingPropertyPanel } from '../plumbing/ui/PlumbingPropertyPanel'
import { SceneRoot } from '../scene/SceneRoot'
import { selectIsProjectDirty, useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'
import { ClearProjectDialog } from '../ui/ClearProjectDialog'
import { EditorNoticeBar } from '../ui/EditorNoticeBar'
import { EditorSidebar } from '../ui/EditorSidebar'
import { FloorManagementDialog } from '../ui/FloorManagementDialog'
import { MenuBar } from '../ui/MenuBar'
import { OpeningToolOptions } from '../ui/OpeningToolOptions'
import { PropertyPanel } from '../ui/PropertyPanel'
import { SubmitProjectDialog } from '../ui/SubmitProjectDialog'
import { UnsavedChangesDialog } from '../ui/UnsavedChangesDialog'
import { FloatingToolbar } from '../ui/canvas/FloatingToolbar'
import { FloorRail } from '../ui/canvas/FloorRail'
import { ReadOnlyNotice } from '../ui/canvas/ReadOnlyNotice'
import { RoomDefinitionCard } from '../ui/canvas/RoomDefinitionCard'
import { SolidToolbar } from '../ui/canvas/SolidToolbar'
import { ExportPdfDialog } from '../ui/pdf/ExportPdfDialog'
import { SaveVersionDialog } from '../ui/versions/SaveVersionDialog'

export function EditorPage() {
  const closeEditor = useCloseEditor()
  const activeViewId = useUiStore((state) => state.activeViewId)
  const isReadOnly = useEditorReadOnlyMode()
  const { projectId, isSaving, currentVersionId, error, save, loadVersion } =
    useProjectPersistence()
  const submit = useEditorSubmit(projectId)
  const exportProject = useProjectExport()
  const { inputRef: importInputRef, error: importError, triggerImport, handleFileSelected } =
    useProjectImport()
  const {
    inputRef: projectFileInputRef,
    error: projectFileError,
    triggerOpen: triggerProjectFileOpen,
    handleFileSelected: handleProjectFileSelected,
  } = useProjectFileOpen()
  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false)
  const [isFloorCopyOpen, setIsFloorCopyOpen] = useState(false)
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false)
  const [isClearProjectOpen, setIsClearProjectOpen] = useState(false)
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false)
  const isDirty = useCadStore(selectIsProjectDirty)
  const projectSummary = useProjectSummary(projectId)
  // Salt görüntülemede kaydetme yolu HİÇ çağrılmaz: düğme ve kısayol zaten
  // yok, bu son kapı elle tetiklenen bir çağrıyı da durdurur. Sunucu da aynı
  // şeyi söylüyor (`newversion` → Admin, ProjectFirmUser).
  const handleSave = () => {
    if (isReadOnly) return
    void save()
  }

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
   * Yüzen çubuktaki kat oklarının geçişi ANINDA uygulanır (madde 20); yalnız
   * "Katlar" penceresi içindeki aktif kat değişikliği "Uygula"yı bekler.
   * Klavyeden kat değiştirme YOK (2026-08, bkz. useEditorShortcuts.ts).
   */
  const goToFloor = (direction: FloorDirection) => {
    const { floors, activeFloorId, setActiveFloor } = useCadStore.getState()
    const nextFloorId = getFloorIdInDirection(floors, activeFloorId, direction)
    // Uçta hiçbir şey olmaz: geçiş döngüsel değil.
    if (nextFloorId !== undefined) setActiveFloor(nextFloorId)
  }

  useEditorShortcuts({
    // Salt görüntülemede yazan kısayolların HİÇBİRİ bağlanmıyor (kaydet,
    // farklı kaydet, kat pencereleri, geri al/yinele) — hook'un kendi içinde.
    isReadOnly,
    onSave: handleSave,
    onSaveAs: () => setIsSaveAsOpen(true),
    onOpenFloorManagement: () => setIsFloorDialogOpen(true),
    onOpenFloorCopy: () => setIsFloorCopyOpen(true),
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
          onDownloadProjectFile={() => setIsPdfDialogOpen(true)}
          onOpenProjectFile={triggerProjectFileOpen}
          onSave={handleSave}
          onSaveAs={() => setIsSaveAsOpen(true)}
          onImport={triggerImport}
          onExport={exportProject}
          isSaving={isSaving}
          submit={submit}
          versionHistory={{ projectId, currentVersionId, onLoadVersion: loadVersion }}
        />

        {/* Gönderim/onay sonucu. Öteki şeritlerden ayrı: kapatılabiliyor ve
            eksik evrakları liste hâlinde taşıyor. */}
        {submit.notice !== null && (
          <EditorNoticeBar notice={submit.notice} onDismiss={submit.dismissNotice} />
        )}

        {/* Menüden tetiklenir (Dosya > İçe Aktar); görünür bir seçici yerine
            gizli input kullanmak tarayıcının kendi dosya diyaloğunu verir. */}
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileSelected}
        />

        {/* Dosya > Proje Dosyasını Aç. Ayrı input: kabul edilen tür farklı
            (PDF); tek input paylaşılsaydı seçicide yanlış filtre görünürdü. */}
        <input
          ref={projectFileInputRef}
          type="file"
          accept={PROJECT_FILE_ACCEPT}
          className="hidden"
          onChange={handleProjectFileSelected}
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

        {projectFileError && (
          <p
            role="alert"
            className="shrink-0 border-y border-canvas-overlay-edge px-4 py-1.5 text-sm text-canvas-overlay-danger"
          >
            {projectFileError}
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
            {/* Şerit tuvalin üstünde ve her görünümde: izometrikte de aynı
                kısıt geçerli. */}
            {isReadOnly && <ReadOnlyNotice />}
            {/* İki şerit aynı yerde ama asla birlikte görünmez: biri mimari
                açıklık aracına, öteki tesisatta klavyeyle çizime (ok tuşu /
                `+`-`-`) bağlı. İkisi de ÇİZİM görünümüne ait — katı modelde
                araç seçili kalabilir ama şerit orada çizilecek bir şeye işaret
                etmez. */}
            {isDrawingView(activeViewId) && (
              <>
                <OpeningToolOptions />
                <DraftKeyboardInput />
              </>
            )}
            {/* İzometriğin kendi kumanda takımı: bakış açısı, kat aralığı,
                kamera kipi ve çap renkleri. Yüzen çubuk (K54) burada YOK —
                orada çizim aracı ve kat seçimi var, izometrikte ikisi de
                anlamsız. */}
            {activeViewId === 'isometric' && (
              <>
                <IsometricHud />
                <IsometricModeSwitch />
                <IsometricLegend />
              </>
            )}
            {/* Mahal tanımlama kipi YALNIZ mimaride: kart açıkken yüzen çubuğun
                üstünde durur (z-20 ↔ z-10), ikisi de alt-ortada. Kip kapalıyken
                bileşen hiçbir şey çizmez. */}
            {activeViewId === 'architecture' && <RoomDefinitionCard />}
            {/* Tuvalin çalışma kipi ve çizim yardımcıları (K54). İki ÇİZİM
                görünümünde de var (K57); izometrikte ve katı modelde çizilecek
                bir şey yok, orada tuval etkileşimi de yok. */}
            {/* Kat şeridi sol paletin hemen yanında, tuvalin ÜSTÜNDE (K166):
                kat geçişinin ana yolu burası, yüzen çubuktaki liste kalktı. */}
            {isDrawingView(activeViewId) && <FloorRail />}
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
          {/* Katı modelde ve izometrikte seçim YOK (salt okuma): iki panel de
              mount edilmez, yoksa boş bir "Özellikler" kabuğu asılı kalır. */}
          {activeViewId === 'installation' && <PlumbingPropertyPanel />}
          {activeViewId === 'architecture' && <PropertyPanel />}
        </div>
      </div>

      {(isFloorDialogOpen || isFloorCopyOpen) && (
        <FloorManagementDialog
          isCopyMode={isFloorCopyOpen}
          onClose={() => {
            setIsFloorDialogOpen(false)
            setIsFloorCopyOpen(false)
          }}
        />
      )}

      {isPdfDialogOpen && (
        <ExportPdfDialog project={projectSummary} onClose={() => setIsPdfDialogOpen(false)} />
      )}

      {isClearProjectOpen && (
        <ClearProjectDialog
          onCancel={() => setIsClearProjectOpen(false)}
          onConfirm={() => {
            useCadStore.getState().clearProjectDrawing()
            setIsClearProjectOpen(false)
          }}
        />
      )}

      {submit.confirmIssueCount !== null && (
        <SubmitProjectDialog
          kind={submit.kind}
          issueCount={submit.confirmIssueCount}
          isPending={submit.isPending}
          onCancel={submit.cancel}
          onConfirm={submit.confirm}
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
