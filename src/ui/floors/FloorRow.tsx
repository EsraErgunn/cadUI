import { GripVertical } from 'lucide-react'
import type { MouseEvent } from 'react'

import { FloorActiveDot } from './FloorActiveDot'
import { FloorContentDot } from './FloorContentDot'
import { FloorInlineField } from './FloorInlineField'
import { FloorRowActions } from './FloorRowActions'
import { FLOOR_FOCUS_RING, floorRowVariants } from './floorVariants'
import { isFloorContentEmpty, type FloorContent } from '../../core/floorContent'
import { formatElevationM } from '../../core/floorElevation'
import type { DraftFloor } from '../../core/floorPlan'
import type { FloorType } from '../../core/floors'
import type { Floor } from '../../core/model'

export type FloorRowMode = 'manage' | 'copy'

type FloorRowProps = {
  floor: DraftFloor
  /** Tip kuralı konuma bakıyor, yani tüm listeye. */
  floors: readonly Floor[]
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
  onSelect: (event: MouseEvent) => void
  onSetHeight: (heightCm: number) => boolean
  onMakeActive: () => void
  onSetType: (type: FloorType | null) => void
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
  floors,
  elevationCm,
  content,
  mode,
  isActive,
  isSelected,
  isRemovable,
  isDragging,
  isCopySource,
  isCopyTarget,
  onSelect,
  onSetHeight,
  onMakeActive,
  onSetType,
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

      {/* Aktif kat düğmesi adın hemen SOLUNDA (K168): "hangi kattayım" sorusu
          adla birlikte okunuyor. Kopyalama kipinde yok — orada aktif kat
          değiştirilmiyor, hedef seçiliyor. */}
      {!isCopyMode && (
        <span onClick={(event) => event.stopPropagation()}>
          <FloorActiveDot
            floorName={floor.name}
            isActive={isActive}
            onMakeActive={onMakeActive}
          />
        </span>
      )}

      {/* Ad DÜZENLENMEZ (K167): konumun ya da kat TİPİNİN karşılığı (K168),
          kullanıcının yazdığı bir şey değil. */}
      <span className={`min-w-0 flex-1 ${isCopySource ? 'text-ink-disabled' : 'text-ink'}`}>
        {floor.name}
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
          floors={floors}
          isRemovable={isRemovable}
          hasContent={!isFloorContentEmpty(content)}
          onCopyFrom={onCopyFrom}
          onClearCopy={onClearCopy}
          onSetType={onSetType}
          onRemove={onRemove}
        />
      )}
    </li>
  )
}
