import { useState, type MouseEvent } from 'react'

import { FloorRow, type FloorRowMode } from './FloorRow'
import { FLOOR_FOCUS_RING } from './floorVariants'
import type { FloorContent } from '../../core/floorContent'
import { getFloorRangeIds } from '../../core/floorCopyPlan'
import type { DraftFloor, FloorPlanDraft } from '../../core/floorPlan'
import { MIN_FLOOR_COUNT, type FloorType } from '../../core/floors'
import type { Id } from '../../core/model'

type FloorListProps = {
  draft: FloorPlanDraft
  elevationsCm: readonly number[]
  contentOf: (floorId: Id) => FloorContent
  mode: FloorRowMode
  copySourceFloorId: Id | null
  copyTargetIds: readonly Id[]
  onSelectionChange: (floorIds: readonly Id[]) => void
  onSetHeight: (floorId: Id, heightCm: number) => boolean
  onMakeActive: (floorId: Id) => void
  onSetType: (floorId: Id, type: FloorType | null) => void
  onCopyFrom: (floorId: Id) => void
  onClearCopy: (floorId: Id) => void
  onRemove: (floorId: Id) => void
  onReorder: (floorId: Id, targetIndex: number) => void
  onMoveByKey: (floorId: Id, direction: 'up' | 'down') => void
}

/**
 * Kat listesi. TEK uygulama: yönetim ve kopyalama hedefi aynı listeden okunuyor
 * (K166). Eskiden iki ayrı pencerede iki ayrı liste vardı ve ikisi de aynı ters
 * sırayı, aynı kot sütununu, aynı içerik rozetini kendi başına çiziyordu.
 *
 * Liste EN ÜST kat başta — kullanıcı binayı kesitten okuyor. Taslaktaki dizi ise
 * en alt kat başta; çeviri yalnız burada, `reverse()` ile. Kot dizisi TASLAK
 * sırasına göre geldiği için satır kendi indeksini arıyor.
 */
export function FloorList({
  draft,
  elevationsCm,
  contentOf,
  mode,
  copySourceFloorId,
  copyTargetIds,
  onSelectionChange,
  onSetHeight,
  onMakeActive,
  onSetType,
  onCopyFrom,
  onClearCopy,
  onRemove,
  onReorder,
  onMoveByKey,
}: FloorListProps) {
  const [draggedFloorId, setDraggedFloorId] = useState<Id | null>(null)
  /** Shift ile aralık seçiminin çıpası; son TEK tıklanan satır. */
  const [anchorFloorId, setAnchorFloorId] = useState<Id | null>(null)

  const isRemovable = draft.floors.length > MIN_FLOOR_COUNT
  const selectedIds = mode === 'copy' ? copyTargetIds : draft.selectedFloorIds

  /**
   * Tıklama BİRİKTİRİR, seçimi değiştirmez: satırda görünen şey bir onay
   * kutusu ve onay kutusunun sözleşmesi budur. Önceki davranış (tek tıklama
   * seçimi o satıra indiriyordu) bir kattan diğerine geçerken öncekini
   * düşürüyordu — kullanıcı bildirimi. Shift hâlâ aralık seçer.
   */
  const handleSelect = (floorId: Id, event: MouseEvent) => {
    if (event.shiftKey && anchorFloorId !== null) {
      const range = getFloorRangeIds(draft.floors, anchorFloorId, floorId).filter(
        (id) => id !== copySourceFloorId,
      )
      onSelectionChange([...new Set([...selectedIds, ...range])])
      return
    }

    setAnchorFloorId(floorId)
    onSelectionChange(
      selectedIds.includes(floorId)
        ? selectedIds.filter((id) => id !== floorId)
        : [...selectedIds, floorId],
    )
  }

  const handleDrop = (targetFloorId: Id) => {
    if (draggedFloorId === null || draggedFloorId === targetFloorId) return
    const targetIndex = draft.floors.findIndex((floor) => floor.id === targetFloorId)
    if (targetIndex >= 0) onReorder(draggedFloorId, targetIndex)
    setDraggedFloorId(null)
  }

  const renderRow = (floor: DraftFloor) => {
    const index = draft.floors.findIndex((candidate) => candidate.id === floor.id)

    return (
      <FloorRow
        key={floor.id}
        floor={floor}
        floors={draft.floors}
        elevationCm={elevationsCm[index]}
        content={contentOf(floor.id)}
        mode={mode}
        isActive={floor.id === draft.activeFloorId}
        isSelected={draft.selectedFloorIds.includes(floor.id)}
        isRemovable={isRemovable}
        isDragging={draggedFloorId === floor.id}
        isCopySource={floor.id === copySourceFloorId}
        isCopyTarget={copyTargetIds.includes(floor.id)}
        onSelect={(event) => handleSelect(floor.id, event)}
        onSetHeight={(heightCm) => onSetHeight(floor.id, heightCm)}
        onMakeActive={() => onMakeActive(floor.id)}
        onSetType={(type) => onSetType(floor.id, type)}
        onCopyFrom={() => onCopyFrom(floor.id)}
        onClearCopy={() => onClearCopy(floor.id)}
        onRemove={() => onRemove(floor.id)}
        onDragStart={() => setDraggedFloorId(floor.id)}
        onDragEnd={() => setDraggedFloorId(null)}
        onDropBefore={() => handleDrop(floor.id)}
        onMoveByKey={(direction) => onMoveByKey(floor.id, direction)}
      />
    )
  }

  /** Kaynak kat hedef olamaz; "tümü" onu kapsam dışı bırakır. */
  const selectableIds = draft.floors
    .filter((floor) => floor.id !== copySourceFloorId)
    .map((floor) => floor.id)
  const isAllSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id))

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-edge bg-surface-sunken/60 px-3 py-1.5">
        <input
          type="checkbox"
          checked={isAllSelected}
          // Kısmi seçim ÜÇÜNCÜ hâl: kutu ne boş ne dolu, "bir kısmı" diyor.
          ref={(node) => {
            if (node) node.indeterminate = !isAllSelected && selectedIds.length > 0
          }}
          onChange={() => onSelectionChange(isAllSelected ? [] : selectableIds)}
          aria-label="Tümünü seç"
          className={FLOOR_FOCUS_RING}
        />
        <span className="text-[11px] uppercase tracking-wide text-ink-muted">
          {selectedIds.length > 0 ? `${selectedIds.length} seçili` : 'Tümünü seç'}
        </span>
      </div>

      <ul className="divide-y divide-edge/60">{[...draft.floors].reverse().map(renderRow)}</ul>
    </div>
  )
}
