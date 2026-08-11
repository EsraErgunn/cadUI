import { FloorRow } from './FloorRow'
import type { FloorContent } from '../../core/floorContent'
import type { DraftFloor, FloorPlanDraft } from '../../core/floorPlan'
import { MIN_FLOOR_COUNT } from '../../core/floors'
import type { Id } from '../../core/model'

/** Sıralama tutamağı ve satır aksiyonları sütunları BAŞLIKSIZ (madde 4). */
const COLUMN_HEADERS = ['', 'SEÇ', 'KAT ADI', 'YÜKSEKLİK', 'KOT', 'İÇERİK', 'AKTİF KAT', '']

export type FloorTableHandlers = {
  nameTextOf: (floorId: Id) => string
  nameErrorOf: (floorId: Id) => string | undefined
  onNameChange: (floorId: Id, name: string) => void
  onNameCommit: (floorId: Id) => void
  onHeightCommit: (floorId: Id, heightCm: number) => boolean
  onToggleSelected: (floorId: Id) => void
  onMakeActive: (floorId: Id) => void
  onCopy: (floorId: Id) => void
  onRemove: (floorId: Id) => void
  onMoveByKey: (floorId: Id, direction: 'up' | 'down') => void
}

type FloorTableProps = FloorTableHandlers & {
  draft: FloorPlanDraft
  elevationsCm: readonly number[]
  contentOf: (floorId: Id) => FloorContent
  draggedFloorId: Id | null
  onDragStart: (floorId: Id) => void
  onDragEnd: () => void
  onDrop: (targetFloorId: Id) => void
}

/**
 * Liste EN ÜST kat başta çizilir — kullanıcı binayı kesitten görüyor. Taslaktaki
 * dizi ise en alt kat başta; çeviri yalnız burada, `reverse()` ile yapılır.
 * Kot dizisi TASLAK sırasına göre geldiği için satır kendi indeksini arıyor.
 */
export function FloorTable({
  draft,
  elevationsCm,
  contentOf,
  draggedFloorId,
  onDragStart,
  onDragEnd,
  onDrop,
  ...handlers
}: FloorTableProps) {
  const isRemovable = draft.floors.length > MIN_FLOOR_COUNT

  const renderRow = (floor: DraftFloor) => {
    const index = draft.floors.findIndex((candidate) => candidate.id === floor.id)

    return (
      <FloorRow
        key={floor.id}
        floor={floor}
        elevationCm={elevationsCm[index]}
        content={contentOf(floor.id)}
        isActive={floor.id === draft.activeFloorId}
        isSelected={draft.selectedFloorIds.includes(floor.id)}
        isRemovable={isRemovable}
        isDragging={draggedFloorId === floor.id}
        nameText={handlers.nameTextOf(floor.id)}
        nameError={handlers.nameErrorOf(floor.id)}
        onNameChange={(name) => handlers.onNameChange(floor.id, name)}
        onNameCommit={() => handlers.onNameCommit(floor.id)}
        onHeightCommit={(heightCm) => handlers.onHeightCommit(floor.id, heightCm)}
        onToggleSelected={() => handlers.onToggleSelected(floor.id)}
        onMakeActive={() => handlers.onMakeActive(floor.id)}
        onCopy={() => handlers.onCopy(floor.id)}
        onRemove={() => handlers.onRemove(floor.id)}
        onDragStart={() => onDragStart(floor.id)}
        onDragEnd={onDragEnd}
        onDropBefore={() => onDrop(floor.id)}
        onMoveByKey={(direction) => handlers.onMoveByKey(floor.id, direction)}
      />
    )
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wide text-ink-muted">
          {COLUMN_HEADERS.map((header, index) => (
            <th key={header || `spacer-${index}`} scope="col" className="px-2 py-1.5">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{[...draft.floors].reverse().map(renderRow)}</tbody>
    </table>
  )
}
