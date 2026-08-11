import { AddFloorMenu } from './AddFloorMenu'
import type { FloorContent } from '../../core/floorContent'
import type { DraftFloor } from '../../core/floorPlan'
import type { Id } from '../../core/model'
import { chromeButtonVariants } from '../controls/buttonVariants'

type FloorPlanActionBarProps = {
  floors: readonly DraftFloor[]
  selectedFloorIds: readonly Id[]
  emptyFloors: readonly DraftFloor[]
  contentOf: (floorId: Id) => FloorContent
  canAddFloor: boolean
  canAddBasement: boolean
  onAddEmpty: () => void
  onAddCopy: (sourceFloorId: Id) => void
  onAddBasement: () => void
  onCopySelected: () => void
  onRemoveSelected: () => void
}

/** Ekleme düğmeleri, toplu işlemler ve boş kat bildirimi (madde 10, 8, 12). */
export function FloorPlanActionBar({
  floors,
  selectedFloorIds,
  emptyFloors,
  contentOf,
  canAddFloor,
  canAddBasement,
  onAddEmpty,
  onAddCopy,
  onAddBasement,
  onCopySelected,
  onRemoveSelected,
}: FloorPlanActionBarProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <AddFloorMenu
          floors={floors}
          contentOf={contentOf}
          isDisabled={!canAddFloor}
          onAddEmpty={onAddEmpty}
          onAddCopy={onAddCopy}
        />
        <button
          type="button"
          onClick={onAddBasement}
          disabled={!canAddBasement}
          className={chromeButtonVariants()}
        >
          + Bodrum Ekle
        </button>

        {/* Toplu işlem düğmeleri yalnız seçim varken görünür: hiçbir şey seçili
            değilken duran bir "Sil" düğmesi neyi sileceğini söylemiyor. */}
        {selectedFloorIds.length > 0 && (
          <>
            <span className="ml-2 text-xs text-ink-muted">
              Seçili {selectedFloorIds.length} kat:
            </span>
            <button type="button" onClick={onCopySelected} className={chromeButtonVariants()}>
              Kopyala
            </button>
            <button type="button" onClick={onRemoveSelected} className={chromeButtonVariants()}>
              Sil
            </button>
          </>
        )}
      </div>

      {emptyFloors.length > 0 && (
        <p className="rounded-md border-l-4 border-edge bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
          <b className="text-ink">{emptyFloors.map((floor) => floor.name).join(', ')}</b> boş. Boş
          katlar kaydedilir; gönderim öncesi hata kontrollerinde listelenir.
        </p>
      )}
    </>
  )
}
