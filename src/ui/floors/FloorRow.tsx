import { Copy, GripVertical, Trash2 } from 'lucide-react'

import { FloorHeightField } from './FloorHeightField'
import { FLOOR_FOCUS_RING, floorBadgeVariants, floorRowVariants } from './floorVariants'
import type { FloorContent } from '../../core/floorContent'
import { isFloorContentEmpty } from '../../core/floorContent'
import { formatElevationM } from '../../core/floorElevation'
import type { DraftFloor } from '../../core/floorPlan'
import { chromeButtonVariants } from '../controls/buttonVariants'

type FloorRowProps = {
  floor: DraftFloor
  elevationCm: number
  content: FloorContent
  isActive: boolean
  isSelected: boolean
  isRemovable: boolean
  isDragging: boolean
  nameText: string
  nameError?: string
  onNameChange: (name: string) => void
  onNameCommit: () => void
  onHeightCommit: (heightCm: number) => boolean
  onToggleSelected: () => void
  onMakeActive: () => void
  onCopy: () => void
  onRemove: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDropBefore: () => void
  onMoveByKey: (direction: 'up' | 'down') => void
}

function ContentBadges({ content }: { content: FloorContent }) {
  if (isFloorContentEmpty(content)) {
    return <span className={floorBadgeVariants({ tone: 'empty' })}>Boş</span>
  }

  return (
    <span className="inline-flex gap-1">
      {content.hasArchitecture && <span className={floorBadgeVariants()}>Mimari</span>}
      {content.hasInstallation && <span className={floorBadgeVariants()}>Tesisat</span>}
    </span>
  )
}

export function FloorRow({
  floor,
  elevationCm,
  content,
  isActive,
  isSelected,
  isRemovable,
  isDragging,
  nameText,
  nameError,
  onNameChange,
  onNameCommit,
  onHeightCommit,
  onToggleSelected,
  onMakeActive,
  onCopy,
  onRemove,
  onDragStart,
  onDragEnd,
  onDropBefore,
  onMoveByKey,
}: FloorRowProps) {
  return (
    <tr
      // Bırakma hedefi SATIRIN kendisi: yalnız tutamak hedef olsaydı kullanıcı
      // 20 piksellik bir alana nişan almak zorunda kalırdı.
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDropBefore}
      className={floorRowVariants({
        tone: floor.isBasement ? 'basement' : 'plain',
        isActive,
        isDragging,
      })}
    >
      <td className="px-1 py-1.5">
        {/*
          Sürükleme tutamağı ayrıca KLAVYEYLE de çalışır: sürükle-bırak tek
          başına klavye kullanıcısına sırayı değiştirme yolu bırakmaz.
        */}
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
            event.preventDefault()
            onMoveByKey(event.key === 'ArrowUp' ? 'up' : 'down')
          }}
          aria-label={`${floor.name} sırasını değiştir`}
          className={`cursor-grab text-ink-disabled hover:text-ink-muted ${FLOOR_FOCUS_RING}`}
        >
          <GripVertical size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </td>

      <td className="px-2 py-1.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelected}
          aria-label={`${floor.name} seç`}
          className={FLOOR_FOCUS_RING}
        />
      </td>

      <td className="px-2 py-1.5">
        <input
          value={nameText}
          onChange={(event) => onNameChange(event.target.value)}
          onBlur={onNameCommit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          aria-label={`${floor.name} adı`}
          aria-invalid={nameError !== undefined}
          className={`w-36 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-ink hover:border-edge aria-[invalid=true]:border-danger ${FLOOR_FOCUS_RING}`}
        />
        {nameError && (
          <p role="alert" className="text-xs text-danger">
            {nameError}
          </p>
        )}
      </td>

      <td className="px-2 py-1.5">
        <FloorHeightField
          label={floor.name}
          heightCm={floor.heightCm}
          onCommit={onHeightCommit}
        />
      </td>

      {/* Kot salt okunur: kat yüksekliklerinden türer, düzenlenmez (madde 6). */}
      <td className="px-2 py-1.5 tabular-nums text-ink-muted">{formatElevationM(elevationCm)}</td>

      <td className="px-2 py-1.5">
        <ContentBadges content={content} />
      </td>

      <td className="px-2 py-1.5">
        {isActive ? (
          <span className={floorBadgeVariants({ tone: 'active' })}>AKTİF</span>
        ) : (
          <button type="button" onClick={onMakeActive} className={chromeButtonVariants()}>
            Aktif Yap
          </button>
        )}
      </td>

      <td className="px-1 py-1.5 text-right">
        <button
          type="button"
          onClick={onCopy}
          aria-label={`${floor.name} kopyala`}
          className={chromeButtonVariants({ shape: 'icon' })}
        >
          <Copy size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={!isRemovable}
          title={isRemovable ? undefined : 'Projede en az bir kat kalmalı'}
          aria-label={`${floor.name} sil`}
          className={chromeButtonVariants({ shape: 'icon' })}
        >
          <Trash2 size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </td>
    </tr>
  )
}
