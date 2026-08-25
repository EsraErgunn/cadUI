import { ChevronDown, Redo2, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { DialogShell } from './controls/DialogShell'
import { chromeButtonVariants, dialogActionVariants } from './controls/buttonVariants'
import { FloorAddBar } from './floors/FloorAddBar'
import { FloorCopyBar, type FloorCopyIncludes } from './floors/FloorCopyBar'
import { FloorList } from './floors/FloorList'
import { FloorMenu, FloorMenuItem } from './floors/FloorMenu'
import { FLOOR_FOCUS_RING } from './floors/floorVariants'
import { useFloorPlanDraft } from './floors/useFloorPlanDraft'
import { planFloorCopy, type FloorCopyMode } from '../core/floorCopyPlan'
import { formatLengthM, getBuildingHeightCm } from '../core/floorElevation'
import type { Id } from '../core/model'

type FloorManagementDialogProps = {
  /** Pencere doğrudan kopyalama kipinde açılır (kat seçicideki madde, Ctrl+Shift+K). */
  isCopyMode?: boolean
  onClose: () => void
}

type CopySession = {
  /** `null` = kaynak henüz seçilmedi; kullanıcı ELLE seçer, aktif kat varsayılmaz. */
  sourceFloorId: Id | null
  targetFloorIds: Id[]
  includes: FloorCopyIncludes
  mode: FloorCopyMode
}

/** Mimari varsayılan işaretli (madde 16); tesisat mimari olmadan kopyalanmaz. */
const DEFAULT_INCLUDES: FloorCopyIncludes = {
  isArchitectureIncluded: true,
  isInstallationIncluded: false,
}

const newCopySession = (sourceFloorId: Id | null): CopySession => ({
  sourceFloorId,
  targetFloorIds: [],
  includes: DEFAULT_INCLUDES,
  mode: 'overwrite',
})

/**
 * "Katlar" penceresi. Kat yönetimi ve kat KOPYALAMA aynı pencerede, kopyalama
 * bir KİP (K166) — eskiden ikinci bir modal açılıyor ve açılırken bekleyen
 * taslağı sessizce store'a yazıyordu, yani "İptal" bir noktadan sonra yalan
 * söylüyordu.
 *
 * Düzenlemelerin tamamı — kopyalama dahil — taslakta birikir ve store'a yalnız
 * "Uygula" yazar. Silme ONAY SORMAZ: dokunulan şey store değil taslak, pencere
 * içinde Ctrl+Z ile geri alınıyor ve "İptal" zaten hepsini atıyor.
 */
export function FloorManagementDialog({
  isCopyMode = false,
  onClose,
}: FloorManagementDialogProps) {
  const {
    draft,
    elevationsCm,
    emptyFloors,
    contentOf,
    addableFloorCount,
    addableBasementCount,
    actions,
    apply,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFloorPlanDraft()

  const [copy, setCopy] = useState<CopySession | null>(() =>
    isCopyMode ? newCopySession(null) : null,
  )

  /**
   * Ctrl+Z / Ctrl+Y pencere açıkken TASLAĞA gider, çizime değil. Dinleyici
   * YAKALAMA fazında: editörün kısayolu da window'da ve baloncuk fazında,
   * durdurulmasaydı aynı tuş iki geçmişi birden oynatırdı.
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      const key = event.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return

      event.preventDefault()
      event.stopPropagation()
      if (key === 'y' || event.shiftKey) redo()
      else undo()
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [undo, redo])

  const copyPlan = useMemo(
    () =>
      planFloorCopy(contentOf, draft.floors, {
        // Kaynak seçilmemişken plan boş kalmalı: -1 hiçbir kata denk gelmiyor.
        sourceFloorId: copy?.sourceFloorId ?? -1,
        targetFloorIds: copy?.targetFloorIds ?? [],
        ...(copy?.includes ?? DEFAULT_INCLUDES),
        mode: copy?.mode ?? 'overwrite',
      }),
    [contentOf, draft.floors, copy],
  )

  const confirmCopy = () => {
    if (copy === null || copy.sourceFloorId === null) return
    actions.copyTo(copyPlan.targetFloorIds, {
      sourceFloorId: copy.sourceFloorId,
      ...copy.includes,
    })
    setCopy(null)
  }

  const handleApply = () => {
    // Uygulanamayan plan pencereyi kapatmaz: kullanıcı düzeltebilsin.
    if (apply()) onClose()
  }

  const selectedIds = draft.selectedFloorIds
  const sourceName = draft.floors.find((floor) => floor.id === copy?.sourceFloorId)?.name

  return (
    // Başlık kipi söyler: kopyalama artık ayrı bir pencere değil, kullanıcının
    // nerede olduğunu gösteren tek işaret bu.
    <DialogShell
      title={copy === null ? 'Kat Yönetimi' : 'Kat Kopyalama'}
      size="lg"
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div
          className={`mb-3 flex items-center gap-3 text-sm ${
            copy === null
              ? ''
              : // Çerçeve alttaki hedef kat listesiyle AYNI: iki blok tek
                // yüzeyin parçası gibi okunuyor, vurgu rengi gürültü yapıyordu.
                'rounded-lg border border-edge px-3 py-2'
          }`}
        >
          {copy === null ? (
            <>
              <span className="font-medium text-ink">{draft.floors.length} kat</span>
              <span className="text-ink-muted">
                {formatLengthM(getBuildingHeightCm(draft.floors))} m
              </span>
              {emptyFloors.length > 0 && (
                <span className="text-ink-disabled">{emptyFloors.length} boş</span>
              )}

              <span className="ml-auto flex items-center gap-1">
                {selectedIds.length > 0 && (
                  <>
                    {/* ⚠️ Kopyalama YALNIZ tek seçimde: kaynak tek bir kat
                        olabilir. Çok seçimde `selectedIds[0]`ı almak gerisini
                        sessizce yutuyordu (kullanıcı bildirimi) — düğmeyi
                        gizlemek, yanlış katı kopyalamaktan iyi. */}
                    {selectedIds.length === 1 && (
                      <button
                        type="button"
                        onClick={() => setCopy(newCopySession(selectedIds[0]))}
                        className={`${chromeButtonVariants()} ${FLOOR_FOCUS_RING}`}
                      >
                        Kopyala
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => actions.remove(selectedIds)}
                      aria-label="Seçili katları sil"
                      className={`${chromeButtonVariants()} hover:text-danger ${FLOOR_FOCUS_RING}`}
                    >
                      <Trash2 size={15} strokeWidth={1.8} aria-hidden />
                      Sil
                    </button>
                    <span className="mx-1 h-5 w-px bg-edge" aria-hidden />
                  </>
                )}
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  aria-label="Geri al"
                  title="Geri al (Ctrl+Z)"
                  className={`${chromeButtonVariants({ shape: 'icon' })} ${FLOOR_FOCUS_RING}`}
                >
                  <Undo2 size={15} strokeWidth={1.8} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  aria-label="Yinele"
                  title="Yinele (Ctrl+Y)"
                  className={`${chromeButtonVariants({ shape: 'icon' })} ${FLOOR_FOCUS_RING}`}
                >
                  <Redo2 size={15} strokeWidth={1.8} aria-hidden />
                </button>
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Kaynak kat
              </span>
              {/* Kaynak ELLE seçilir; aktif kat varsayılan DEĞİL — kullanıcı
                  çoğu zaman baktığı katı değil başka bir katı çoğaltıyor. */}
              <FloorMenu
                label="Kaynak kat"
                widthClass="w-56"
                // Çerçeve, bunun bir SEÇİCİ olduğunu söylüyor: çerçevesiz hâli
                // düz bir etiketten ayırt edilmiyordu (kullanıcı bildirimi).
                // ⚠️ Çerçeve ve ton kaynak seçilince DEĞİŞMİYOR: eskiden seçilmemiş
                // hâl "active" tonundaydı ve seçim yapılınca halkası kayboluyordu,
                // düğme çerçevesini yitirmiş gibi görünüyordu. Kutu hep aynı;
                // değişen tek şey içindeki metin.
                // ⚠️ Zemin `surface-sunken`: pencerenin yüzeyiyle aynı renk olunca
                // düğme olduğu anlaşılmıyordu. Metin de tam kontrastta.
                triggerClassName={`${chromeButtonVariants()} min-w-40 justify-between rounded-md border border-edge bg-surface-sunken text-ink hover:bg-edge`}
                trigger={
                  <>
                    {sourceName ?? 'Kat seçin'}
                    <ChevronDown size={14} strokeWidth={1.8} aria-hidden />
                  </>
                }
              >
                {(close) =>
                  [...draft.floors].reverse().map((floor) => (
                    <FloorMenuItem
                      key={floor.id}
                      onSelect={() => {
                        // Kaynak değişince eski hedefler anlamını yitirir: yeni
                        // kaynak onların arasında olabilir.
                        setCopy({ ...copy, sourceFloorId: floor.id, targetFloorIds: [] })
                        close()
                      }}
                    >
                      {floor.name}
                    </FloorMenuItem>
                  ))
                }
              </FloorMenu>
            </>
          )}
        </div>

        {/* Başlık kaynak seçilmeden de duruyor: listenin NE olduğunu her an
            söylemeli, seçime bağlı belirip kaybolmamalı. */}
        {copy !== null && (
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Hedef katlar
          </h3>
        )}

        <div className="overflow-hidden rounded-lg border border-edge">
          <FloorList
            draft={draft}
            elevationsCm={elevationsCm}
            contentOf={contentOf}
            mode={copy === null ? 'manage' : 'copy'}
            copySourceFloorId={copy?.sourceFloorId ?? null}
            copyTargetIds={copy?.targetFloorIds ?? []}
            onSelectionChange={(floorIds) => {
              if (copy === null) actions.select(floorIds)
              else setCopy({ ...copy, targetFloorIds: [...floorIds] })
            }}
            onSetHeight={actions.setHeight}
            onMakeActive={actions.makeActive}
            onSetType={actions.setType}
            onCopyFrom={(floorId) => setCopy(newCopySession(floorId))}
            onClearCopy={actions.clearCopy}
            onRemove={(floorId) => actions.remove([floorId])}
            onReorder={actions.reorder}
            onMoveByKey={actions.moveByKey}
          />

          {copy === null ? (
            <FloorAddBar
              floors={draft.floors}
              contentOf={contentOf}
              addableFloorCount={addableFloorCount}
              addableBasementCount={addableBasementCount}
              onAdd={(count, copyFromFloorId) => actions.add({ copyFromFloorId }, count)}
              onAddBasement={() => actions.add({ isBasement: true })}
            />
          ) : (
            <FloorCopyBar
              includes={copy.includes}
              mode={copy.mode}
              plan={copyPlan}
              onIncludesChange={(includes) => setCopy({ ...copy, includes })}
              onModeChange={(mode) => setCopy({ ...copy, mode })}
              onCancel={() => setCopy(null)}
              onConfirm={confirmCopy}
            />
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className={`${dialogActionVariants({ tone: 'cancel' })} ${FLOOR_FOCUS_RING}`}
        >
          İptal
        </button>
        <button
          type="button"
          onClick={handleApply}
          className={`${dialogActionVariants({ tone: 'primary' })} ${FLOOR_FOCUS_RING}`}
        >
          Uygula
        </button>
      </div>
    </DialogShell>
  )
}
