import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'

import { FloorMenu, FloorMenuItem } from './FloorMenu'
import { FLOOR_FOCUS_RING } from './floorVariants'
import type { FloorContent } from '../../core/floorContent'
import { isFloorContentEmpty } from '../../core/floorContent'
import type { DraftFloor } from '../../core/floorPlan'
import type { Id } from '../../core/model'
import { chromeButtonVariants } from '../controls/buttonVariants'

type FloorAddBarProps = {
  floors: readonly DraftFloor[]
  contentOf: (floorId: Id) => FloorContent
  addableFloorCount: number
  addableBasementCount: number
  onAdd: (count: number, copyFromFloorId: Id | undefined) => void
  onAddBasement: () => void
}

function describeContent(content: FloorContent): string {
  if (isFloorContentEmpty(content)) return 'boş'
  return [content.hasArchitecture && 'mimari', content.hasInstallation && 'tesisat']
    .filter(Boolean)
    .join(' + ')
}

/**
 * "3 kat, Zemin Kat'tan kopyalayarak, Ekle" (K166) — adet, kaynak ve eylem tek
 * cümlede. Eskiden adet diye bir şey yoktu, kaynak ayrı bir açılır menüdeydi ve
 * yükseklik pencerenin ta tepesinde kendi feragat cümlesiyle duran ayrı bir
 * alandı. Yükseklik artık altındaki kattan devralınıyor (`addDraftFloor`).
 *
 * Adet KAPASİTEYE kırpılır: 10 yazıp 4 eklenmesi, kullanıcının saymadığı bir
 * sonuç doğururdu. Sınıra yaklaşınca kaç kat kaldığı yanında yazar.
 */
export function FloorAddBar({
  floors,
  contentOf,
  addableFloorCount,
  addableBasementCount,
  onAdd,
  onAddBasement,
}: FloorAddBarProps) {
  const [countText, setCountText] = useState('1')
  const [sourceFloorId, setSourceFloorId] = useState<Id | null>(null)

  const parsedCount = Number.parseInt(countText, 10)
  const count = Number.isFinite(parsedCount)
    ? Math.min(Math.max(parsedCount, 1), Math.max(addableFloorCount, 1))
    : 1
  const sourceFloor = floors.find((floor) => floor.id === sourceFloorId)
  const isFull = addableFloorCount === 0

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-edge px-3 py-2">
      <Plus size={15} strokeWidth={2} aria-hidden className="text-ink-disabled" />

      <input
        value={countText}
        inputMode="numeric"
        aria-label="Eklenecek kat sayısı"
        disabled={isFull}
        onChange={(event) => setCountText(event.target.value)}
        onBlur={() => setCountText(String(count))}
        className={`w-12 rounded-md border border-edge bg-surface px-2 py-1 text-center text-sm tabular-nums text-ink ${FLOOR_FOCUS_RING}`}
      />
      <span className="text-sm text-ink-muted">kat</span>

      <FloorMenu
        label="Yeni katın içeriği"
        direction="up"
        widthClass="w-64"
        isDisabled={isFull}
        triggerClassName={chromeButtonVariants()}
        trigger={
          <>
            {sourceFloor ? `${sourceFloor.name}'tan kopyalayarak` : 'boş'}
            <ChevronDown size={14} strokeWidth={1.8} aria-hidden />
          </>
        }
      >
        {(close) => (
          <>
            <FloorMenuItem
              onSelect={() => {
                setSourceFloorId(null)
                close()
              }}
            >
              boş
            </FloorMenuItem>
            {[...floors].reverse().map((floor) => (
              <FloorMenuItem
                key={floor.id}
                onSelect={() => {
                  setSourceFloorId(floor.id)
                  close()
                }}
              >
                {floor.name}&apos;tan kopyalayarak
                <span className="ml-auto pl-3 text-xs text-ink-disabled">
                  {describeContent(contentOf(floor.id))}
                </span>
              </FloorMenuItem>
            ))}
          </>
        )}
      </FloorMenu>

      <button
        type="button"
        disabled={isFull}
        onClick={() => onAdd(count, sourceFloor ? sourceFloor.id : undefined)}
        className={`${chromeButtonVariants({ tone: 'active' })} ${FLOOR_FOCUS_RING}`}
      >
        Ekle
      </button>

      <span className="ml-auto flex items-center gap-2">
        {addableFloorCount <= 5 && (
          <span className="text-xs text-ink-disabled">
            {isFull ? 'kat sınırı doldu' : `en fazla ${addableFloorCount} kat daha`}
          </span>
        )}
        <button
          type="button"
          disabled={addableBasementCount === 0}
          onClick={onAddBasement}
          className={`${chromeButtonVariants()} ${FLOOR_FOCUS_RING}`}
        >
          + Bodrum
        </button>
      </span>
    </div>
  )
}
