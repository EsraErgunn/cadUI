import { useState } from 'react'

import { FloorCopyDialog } from './FloorCopyDialog'
import { DialogShell } from './controls/DialogShell'
import { chromeButtonVariants } from './controls/buttonVariants'
import { FloorDeleteDialog } from './floors/FloorDeleteDialog'
import { FloorPlanActionBar } from './floors/FloorPlanActionBar'
import { FloorSummary } from './floors/FloorSummary'
import { FloorTable } from './floors/FloorTable'
import { NewFloorHeightField } from './floors/NewFloorHeightField'
import { FLOOR_FOCUS_RING } from './floors/floorVariants'
import { useFloorPlanDraft } from './floors/useFloorPlanDraft'
import { isFloorNameTaken, isFloorNameValid } from '../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, type Id } from '../core/model'

type FloorManagementDialogProps = {
  onClose: () => void
}

/**
 * "Katlar" penceresi (KK-1…KK-11). Liste EN ÜST kat başta gösterilir — kullanıcı
 * binayı kesitten görüyor. Store'daki dizi ise en alt kat başta; çeviri yalnız
 * burada yapılır, veri yapısı görüntü için ters çevrilmez.
 *
 * Düzenlemeler taslakta birikir ve store'a yalnız "Uygula" yazar (madde 13);
 * taslağın kuralları core/floorPlan.ts'te.
 */
export function FloorManagementDialog({ onClose }: FloorManagementDialogProps) {
  const {
    draft,
    elevationsCm,
    emptyFloors,
    contentOf,
    deletionSummaryOf,
    canAddFloor,
    canAddBasement,
    actions,
    apply,
  } = useFloorPlanDraft()

  const [newFloorHeightCm, setNewFloorHeightCm] = useState(DEFAULT_FLOOR_HEIGHT_CM)
  const [nameDrafts, setNameDrafts] = useState<Record<Id, string>>({})
  const [draggedFloorId, setDraggedFloorId] = useState<Id | null>(null)
  /** Onay bekleyen silme. Boş dizi değil null: "pencere kapalı" ile "hiçbiri seçili değil" ayrı. */
  const [pendingRemovalIds, setPendingRemovalIds] = useState<Id[] | null>(null)
  const [copySourceFloorId, setCopySourceFloorId] = useState<Id | null>(null)

  const floorNameOf = (floorId: Id): string =>
    draft.floors.find((floor) => floor.id === floorId)?.name ?? ''
  const activeFloorName = floorNameOf(draft.activeFloorId) || '—'

  const nameErrorOf = (floorId: Id): string | undefined => {
    const text = nameDrafts[floorId]
    if (text === undefined) return undefined
    if (!isFloorNameValid(text)) return 'Kat adı boş olamaz.'
    if (isFloorNameTaken(draft.floors, text, floorId)) return 'Bu ad başka bir katta kullanılıyor.'
    return undefined
  }

  const commitName = (floorId: Id) => {
    const text = nameDrafts[floorId]
    if (text !== undefined) actions.rename(floorId, text)
    setNameDrafts((current) => {
      const next = { ...current }
      delete next[floorId]
      return next
    })
  }

  const handleDrop = (targetFloorId: Id) => {
    if (draggedFloorId === null || draggedFloorId === targetFloorId) return
    const targetIndex = draft.floors.findIndex((floor) => floor.id === targetFloorId)
    if (targetIndex >= 0) actions.reorder(draggedFloorId, targetIndex)
    setDraggedFloorId(null)
  }

  const deletionSummary =
    pendingRemovalIds === null ? null : deletionSummaryOf(pendingRemovalIds)

  const confirmRemoval = () => {
    if (pendingRemovalIds !== null) actions.remove(pendingRemovalIds)
    setPendingRemovalIds(null)
  }

  const handleApply = () => {
    // Uygulanamayan plan pencereyi kapatmaz: kullanıcı düzeltebilsin.
    if (apply()) onClose()
  }

  /**
   * Kopyalama STORE üzerinde çalışıyor, taslak üzerinde değil: hedeflerin
   * "içerik var" durumu ve üzerine yazma uyarısı gerçek çizime bakmak zorunda.
   * Bu yüzden taslak ÖNCE uygulanır — kullanıcı iki farklı doğruluk hâli
   * arasında kalmasın. Uygulanamayan taslakta kopyalama açılmaz.
   */
  const openCopyDialog = (sourceFloorId: Id) => {
    if (apply()) setCopySourceFloorId(sourceFloorId)
  }

  return (
    <DialogShell title="Katlar" size="lg" onClose={onClose}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <FloorSummary
          floors={draft.floors}
          activeFloorName={activeFloorName}
          emptyFloorCount={emptyFloors.length}
        />

        <NewFloorHeightField heightCm={newFloorHeightCm} onChange={setNewFloorHeightCm} />

        <FloorTable
          draft={draft}
          elevationsCm={elevationsCm}
          contentOf={contentOf}
          draggedFloorId={draggedFloorId}
          onDragStart={setDraggedFloorId}
          onDragEnd={() => setDraggedFloorId(null)}
          onDrop={handleDrop}
          nameTextOf={(floorId) => nameDrafts[floorId] ?? floorNameOf(floorId)}
          nameErrorOf={nameErrorOf}
          onNameChange={(floorId, name) =>
            setNameDrafts((current) => ({ ...current, [floorId]: name }))
          }
          onNameCommit={commitName}
          onHeightCommit={actions.setHeight}
          onToggleSelected={actions.toggleSelected}
          onMakeActive={actions.makeActive}
          onCopy={openCopyDialog}
          onRemove={(floorId) => setPendingRemovalIds([floorId])}
          onMoveByKey={actions.moveByKey}
        />

        <p className="text-xs text-ink-muted">
          &quot;SEÇ&quot; sütunu toplu işlem içindir. &quot;AKTİF KAT&quot; sütunundaki
          &quot;Aktif Yap&quot;, o katı çizim alanına getirir; aynı anda yalnızca bir kat aktif
          olur. Sıra, soldaki tutamaktan sürüklenerek değiştirilir; kot yeniden hesaplanır.
        </p>

        <FloorPlanActionBar
          floors={draft.floors}
          selectedFloorIds={draft.selectedFloorIds}
          emptyFloors={emptyFloors}
          contentOf={contentOf}
          canAddFloor={canAddFloor}
          canAddBasement={canAddBasement}
          onAddEmpty={() => actions.add({ heightCm: newFloorHeightCm })}
          onAddCopy={(sourceFloorId) =>
            actions.add({ heightCm: newFloorHeightCm, copyFromFloorId: sourceFloorId })
          }
          onAddBasement={() => actions.add({ isBasement: true, heightCm: newFloorHeightCm })}
          onCopySelected={() => openCopyDialog(draft.selectedFloorIds[0])}
          onRemoveSelected={() => setPendingRemovalIds([...draft.selectedFloorIds])}
        />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className={`${chromeButtonVariants()} ${FLOOR_FOCUS_RING}`}
        >
          İptal
        </button>
        <button
          type="button"
          onClick={handleApply}
          className={`${chromeButtonVariants({ tone: 'active' })} ${FLOOR_FOCUS_RING}`}
        >
          Uygula
        </button>
      </div>

      {copySourceFloorId !== null && (
        <FloorCopyDialog
          initialSourceFloorId={copySourceFloorId}
          onClose={() => setCopySourceFloorId(null)}
        />
      )}

      {deletionSummary && (
        <FloorDeleteDialog
          summary={deletionSummary}
          onCancel={() => setPendingRemovalIds(null)}
          onConfirm={confirmRemoval}
        />
      )}
    </DialogShell>
  )
}
