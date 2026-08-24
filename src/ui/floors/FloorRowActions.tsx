import { Circle, CircleDot, Copy, CornerUpLeft, Trash2 } from 'lucide-react'

import { FLOOR_FOCUS_RING } from './floorVariants'
import type { DraftFloor } from '../../core/floorPlan'
import { chromeButtonVariants } from '../controls/buttonVariants'

type FloorRowActionsProps = {
  floor: DraftFloor
  isActive: boolean
  isRemovable: boolean
  onMakeActive: () => void
  onCopyFrom: () => void
  onClearCopy: () => void
  onRemove: () => void
}

/**
 * Satır işlemleri (K166). Hepsi İKON, açılır menü YOK — üç işlem için menü
 * açtırmak her birini iki tıklama uzağa koyuyordu.
 */
export function FloorRowActions({
  floor,
  isActive,
  isRemovable,
  onMakeActive,
  onCopyFrom,
  onClearCopy,
  onRemove,
}: FloorRowActionsProps) {
  return (
    <span className="flex shrink-0 items-center" onClick={(event) => event.stopPropagation()}>
      {/* Aktif kat DOLU halka, diğerleri boş: radyo düğmesinin okunuşu. Sol
          kenardaki şerit tek başına yeterince belirgin değildi. */}
      <button
        type="button"
        onClick={onMakeActive}
        disabled={isActive}
        aria-label={`${floor.name} aktif yap`}
        aria-pressed={isActive}
        title={isActive ? 'Aktif kat' : 'Aktif yap'}
        className={`${chromeButtonVariants({ shape: 'icon' })} ${
          isActive ? 'text-brand disabled:text-brand' : ''
        } ${FLOOR_FOCUS_RING}`}
      >
        {isActive ? (
          <CircleDot size={15} strokeWidth={2.4} aria-hidden />
        ) : (
          <Circle size={15} strokeWidth={1.8} aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={onCopyFrom}
        aria-label={`${floor.name} kattan kopyala`}
        title="Bu kattan kopyala"
        className={`${chromeButtonVariants({ shape: 'icon' })} ${FLOOR_FOCUS_RING}`}
      >
        <Copy size={15} strokeWidth={1.8} aria-hidden />
      </button>

      {floor.pendingCopy !== null && (
        <button
          type="button"
          onClick={onClearCopy}
          aria-label={`${floor.name} bekleyen kopyayı kaldır`}
          title="Bekleyen kopyayı kaldır"
          className={`${chromeButtonVariants({ shape: 'icon' })} text-brand ${FLOOR_FOCUS_RING}`}
        >
          <CornerUpLeft size={15} strokeWidth={1.8} aria-hidden />
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        disabled={!isRemovable}
        title={isRemovable ? undefined : 'Projede en az bir kat kalmalı'}
        aria-label={`${floor.name} sil`}
        className={`${chromeButtonVariants({ shape: 'icon' })} enabled:hover:text-danger ${FLOOR_FOCUS_RING}`}
      >
        <Trash2 size={15} strokeWidth={1.8} aria-hidden />
      </button>
    </span>
  )
}
