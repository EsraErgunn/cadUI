import { useMemo, useState } from 'react'

import { DialogShell } from './controls/DialogShell'
import { chromeButtonVariants } from './controls/buttonVariants'
import { FloorCopyOptions, type FloorCopyIncludes } from './floors/FloorCopyOptions'
import { FloorCopySourceSection } from './floors/FloorCopySourceSection'
import { FloorCopyTargetList } from './floors/FloorCopyTargetList'
import { FLOOR_FOCUS_RING } from './floors/floorVariants'
import { useFloorContentSource } from './floors/useFloorContentSource'
import { getFloorContent, getFloorContentCounts, isFloorContentEmpty } from '../core/floorContent'
import { planFloorCopy, type FloorCopyMode } from '../core/floorCopyPlan'
import { getFloorElevationsCm } from '../core/floorElevation'
import type { Id } from '../core/model'
import { useCadStore } from '../store/cadStore'

type FloorCopyDialogProps = {
  /** Satır aksiyonundan açıldığında kaynak dolu gelir (madde 11). */
  initialSourceFloorId?: Id
  onClose: () => void
}

/**
 * Kat Kopyalama (KK-15…KK-18). Kopyalama TEK store yazımıdır: bütün hedefler bir
 * arada işlenir, dolayısıyla tek Ctrl+Z ile geri alınır (madde 19).
 *
 * Pencere STORE'a bakar, "Katlar" penceresinin taslağına değil: hedeflerin
 * "içerik var" durumu ve üzerine yazma uyarısı gerçek çizime bakmak zorunda.
 * Katlar penceresinden açılırken taslak önce uygulanıyor, bkz. FloorManagementDialog.
 */
export function FloorCopyDialog({ initialSourceFloorId, onClose }: FloorCopyDialogProps) {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const copyFloorToTargets = useCadStore((state) => state.copyFloorToTargets)
  const contentSource = useFloorContentSource()

  const [sourceFloorId, setSourceFloorId] = useState<Id>(initialSourceFloorId ?? activeFloorId)
  const [targetFloorIds, setTargetFloorIds] = useState<Id[]>([])
  // Mimari varsayılan olarak işaretli (madde 16).
  const [includes, setIncludes] = useState<FloorCopyIncludes>({
    isArchitectureIncluded: true,
    isInstallationIncluded: false,
  })
  const [mode, setMode] = useState<FloorCopyMode>('overwrite')

  const elevationsCm = useMemo(() => getFloorElevationsCm(floors), [floors])
  const sourceCounts = useMemo(
    () => getFloorContentCounts(contentSource, new Set([sourceFloorId])),
    [contentSource, sourceFloorId],
  )
  const plan = useMemo(
    () => planFloorCopy(contentSource, floors, { sourceFloorId, targetFloorIds, ...includes, mode }),
    [contentSource, floors, sourceFloorId, targetFloorIds, includes, mode],
  )

  const hasContent = (floorId: Id) => !isFloorContentEmpty(getFloorContent(contentSource, floorId))

  const handleCopy = () => {
    if (copyFloorToTargets({ sourceFloorId, targetFloorIds, ...includes, mode })) onClose()
  }

  return (
    <DialogShell title="Kat Kopyalama" size="lg" onClose={onClose}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <FloorCopySourceSection
          floors={floors}
          sourceFloorId={sourceFloorId}
          counts={sourceCounts}
          onChange={(floorId) => {
            setSourceFloorId(floorId)
            // Kaynak değişince eski hedefler anlamını yitirir: yeni kaynak
            // onların arasında olabilir ve sessizce elenmesi şaşırtır.
            setTargetFloorIds([])
          }}
        />

        <FloorCopyOptions
          includes={includes}
          mode={mode}
          onIncludesChange={setIncludes}
          onModeChange={setMode}
        />

        <section className="space-y-2">
          <h3 className="border-b border-edge pb-1 text-xs uppercase tracking-wide text-ink-muted">
            Hedef katlar · işaretli olanlara kopyalanır
          </h3>
          <FloorCopyTargetList
            floors={floors}
            elevationsCm={elevationsCm}
            sourceFloorId={sourceFloorId}
            selectedIds={targetFloorIds}
            hasContent={hasContent}
            onChange={setTargetFloorIds}
          />
        </section>

        {plan.overwrittenFloors.length > 0 && (
          <p role="alert" className="rounded-md border-l-4 border-danger px-3 py-2 text-xs text-ink">
            <b className="text-danger">
              {plan.overwrittenFloors.map((floor) => floor.name).join(', ')}
            </b>{' '}
            içinde aynı türden çizim bulunuyor; bu çizimler silinip yerine kaynak katın çizimi
            yazılacak. İşlem &quot;Geri Al&quot; ile tek adımda geri alınabilir.
          </p>
        )}

        {plan.skippedFloors.length > 0 && (
          <p className="rounded-md border-l-4 border-edge px-3 py-2 text-xs text-ink-muted">
            <b className="text-ink">{plan.skippedFloors.map((floor) => floor.name).join(', ')}</b>{' '}
            içerik taşıdığı için işlem dışında kalacak.
          </p>
        )}
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
          onClick={handleCopy}
          disabled={!plan.isRunnable}
          className={`${chromeButtonVariants({ tone: 'active' })} ${FLOOR_FOCUS_RING}`}
        >
          Kopyala · {plan.targetFloorIds.length} kat
        </button>
      </div>
    </DialogShell>
  )
}
