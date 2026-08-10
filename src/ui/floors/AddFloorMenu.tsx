import { ChevronDown, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { FLOOR_FOCUS_RING } from './floorVariants'
import type { FloorContent } from '../../core/floorContent'
import { isFloorContentEmpty } from '../../core/floorContent'
import type { DraftFloor } from '../../core/floorPlan'
import type { Id } from '../../core/model'
import { chromeButtonVariants } from '../controls/buttonVariants'

type AddFloorMenuProps = {
  floors: readonly DraftFloor[]
  contentOf: (floorId: Id) => FloorContent
  isDisabled: boolean
  onAddEmpty: () => void
  onAddCopy: (sourceFloorId: Id) => void
}

/** Madde 10: "kaynak katın hangi içeriği bulunduğu madde yanında belirtilir". */
function describeContent(content: FloorContent): string {
  if (isFloorContentEmpty(content)) return 'boş'
  return [content.hasArchitecture && 'mimari', content.hasInstallation && 'tesisat']
    .filter(Boolean)
    .join(' + ')
}

export function AddFloorMenu({
  floors,
  contentOf,
  isDisabled,
  onAddEmpty,
  onAddCopy,
}: AddFloorMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Dışarı tıklayınca kapanır; menü açıkken diyalog içinde başka bir alana
  // geçmek listeyi açık bırakmamalı.
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const choose = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={isDisabled}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={chromeButtonVariants({ tone: 'active' })}
      >
        <Plus size={16} strokeWidth={1.8} aria-hidden />
        Kat Ekle
        <ChevronDown size={14} strokeWidth={1.8} aria-hidden />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Kat Ekle"
          className="absolute bottom-full left-0 z-10 mb-1 w-64 overflow-hidden rounded-md border border-edge bg-surface shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onAddEmpty)}
            className={`block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken ${FLOOR_FOCUS_RING}`}
          >
            Boş kat
          </button>

          {/* Liste EN ÜST kat başta: pencerenin geri kalanıyla aynı okuma yönü. */}
          {[...floors].reverse().map((floor) => (
            <button
              key={floor.id}
              type="button"
              role="menuitem"
              onClick={() => choose(() => onAddCopy(floor.id))}
              className={`block w-full border-t border-edge/60 px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken ${FLOOR_FOCUS_RING}`}
            >
              {floor.name}&apos;tan kopyalayarak
              <span className="ml-1 text-xs text-ink-muted">
                · {describeContent(contentOf(floor.id))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
