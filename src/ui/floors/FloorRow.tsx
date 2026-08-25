import { GripVertical } from 'lucide-react'
import type { MouseEvent } from 'react'

import { FloorContentDot } from './FloorContentDot'
import { FloorInlineField } from './FloorInlineField'
import { FloorRowActions } from './FloorRowActions'
import { FLOOR_FOCUS_RING, floorRowVariants } from './floorVariants'
import type { FloorContent } from '../../core/floorContent'
import { formatElevationM } from '../../core/floorElevation'
import type { DraftFloor } from '../../core/floorPlan'

export type FloorRowMode = 'manage' | 'copy'

type FloorRowProps = {
  floor: DraftFloor
  elevationCm: number
  content: FloorContent
  mode: FloorRowMode
  isActive: boolean
  isSelected: boolean
  isRemovable: boolean
  isDragging: boolean
  /** Kopyalama kipinde kaynak satır: işaretlenir ama seçilemez. */
  isCopySource: boolean
  isCopyTarget: boolean
  nameError?: string
  onSelect: (event: MouseEvent) => void
  onRename: (name: string) => boolean
  onSetHeight: (heightCm: number) => boolean
  onMakeActive: () => void
  onCopyFrom: () => void
  onClearCopy: () => void
  onRemove: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDropBefore: () => void
  onMoveByKey: (direction: 'up' | 'down') => void
}

export function FloorRow({
  floor,
  elevationCm,
  content,
  mode,
  isActive,
  isSelected,
  isRemovable,
  isDragging,
  isCopySource,
  isCopyTarget,
  nameError,
  onSelect,
  onRename,
  onSetHeight,
  onMakeActive,
  onCopyFrom,
  onClearCopy,
  onRemove,
  onDragStart,
  onDragEnd,
  onDropBefore,
  onMoveByKey,
}: FloorRowProps) {
  const isCopyMode = mode === 'copy'

  return (
    <li
      // Bırakma hedefi SATIRIN kendisi: yalnız tutamak hedef olsaydı kullanıcı
      // 20 piksellik bir alana nişan almak zorunda kalırdı.
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDropBefore}
      onClick={isCopySource ? undefined : onSelect}
      className={floorRowVariants({
        tone: floor.isBasement ? 'basement' : 'plain',
        isActive: isActive && !isCopyMode,
        isSelected: isCopyMode ? isCopyTarget : isSelected,
        isDragging,
      })}
    >
      {/* Onay kutusu HER İKİ kipte de duruyor: kullanıcı neyi seçtiğini
          satırdan okuyabilmeli, yalnız satır zeminine bakarak değil. */}
      <input
        type="checkbox"
        checked={isCopyMode ? isCopyTarget : isSelected}
        disabled={isCopySource}
        onChange={() => undefined}
        onClick={onSelect}
        aria-label={isCopyMode ? `${floor.name} hedef` : `${floor.name} seç`}
        className={FLOOR_FOCUS_RING}
      />

      {!isCopyMode && (
        /*
          Sürükleme tutamağı ayrıca KLAVYEYLE de çalışır: sürükle-bırak tek
          başına klavye kullanıcısına sırayı değiştirme yolu bırakmaz.
        */
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
            event.preventDefault()
            onMoveByKey(event.key === 'ArrowUp' ? 'up' : 'down')
          }}
          aria-label={`${floor.name} sırasını değiştir`}
          className={`cursor-grab text-ink-disabled hover:text-ink-muted ${FLOOR_FOCUS_RING}`}
        >
          <GripVertical size={15} strokeWidth={1.8} aria-hidden />
        </button>
      )}

      {/* Olay yalnız DÜZENLEME kipinde durdurulur: alana tıklamak satırı
          seçmemeli. Kopyalama kipinde ad düz yazı, tıklama satıra geçmeli. */}
      <span
        className="min-w-0 flex-1"
        onClick={isCopyMode ? undefined : (event) => event.stopPropagation()}
      >
        {isCopyMode ? (
          <span className={isCopySource ? 'text-ink-disabled' : 'text-ink'}>{floor.name}</span>
        ) : (
          <FloorInlineField
            value={floor.name}
            label={`${floor.name} adı`}
            widthClass="w-44"
            error={nameError}
            onCommit={onRename}
          />
        )}
      </span>

      {!isCopyMode && (
        <span onClick={(event) => event.stopPropagation()}>
          <FloorInlineField
            value={String(floor.heightCm)}
            label={`${floor.name} yüksekliği`}
            align="right"
            widthClass="w-14"
            suffix="cm"
            onCommit={(text) => {
              const parsed = Number.parseInt(text, 10)
              return Number.isFinite(parsed) && onSetHeight(parsed)
            }}
          />
        </span>
      )}

      {/* Kot salt okunur: kat yüksekliklerinden türer, düzenlenmez (madde 6). */}
      <span className="w-16 shrink-0 text-right tabular-nums text-xs text-ink-muted">
        {formatElevationM(elevationCm)}
      </span>

      <span className="flex w-8 shrink-0 justify-center">
        <FloorContentDot content={content} />
      </span>

      {isCopyMode ? (
        <span className="w-8 shrink-0 text-right text-[11px] text-ink-disabled">
          {isCopySource ? 'kaynak' : ''}
        </span>
      ) : (
        <FloorRowActions
          floor={floor}
          isActive={isActive}
          isRemovable={isRemovable}
          onMakeActive={onMakeActive}
          onCopyFrom={onCopyFrom}
          onClearCopy={onClearCopy}
          onRemove={onRemove}
        />
      )}
    </li>
  )
}
