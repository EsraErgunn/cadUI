import { useEffect, useRef, useState, type ReactNode } from 'react'

import { FLOOR_FOCUS_RING } from './floorVariants'
import { menuItemVariants } from '../controls/buttonVariants'

type FloorMenuProps = {
  label: string
  /** Tetikleyicinin görünen içeriği; erişilebilir ad `label`den gelir. */
  trigger: ReactNode
  triggerClassName: string
  isDisabled?: boolean
  align?: 'left' | 'right'
  /** Yukarı açılır: pencerenin ALT kenarındaki tetikleyiciler için. */
  direction?: 'up' | 'down'
  widthClass?: string
  children: (close: () => void) => ReactNode
}

/**
 * Kat penceresindeki açılır menülerin ortak kabuğu. Üç yerde (satır menüsü,
 * kaynak seçici, kopyalama hedefi) aynı dışarı-tıkla-kapan mantığı vardı;
 * bileşen sayısını değil, TEKRARI azaltmak için ortaklaştırıldı.
 */
export function FloorMenu({
  label,
  trigger,
  triggerClassName,
  isDisabled = false,
  align = 'left',
  direction = 'down',
  widthClass = 'w-56',
  children,
}: FloorMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    // Escape menüyü kapatır ama pencereyi KAPATMAZ: olay burada durduruluyor.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={isDisabled}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={label}
        className={`${triggerClassName} ${FLOOR_FOCUS_RING}`}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={label}
          className={`absolute z-20 ${widthClass} overflow-hidden rounded-lg border border-edge bg-surface py-1 shadow-lg ${
            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children(() => setIsOpen(false))}
        </div>
      )}
    </div>
  )
}

type FloorMenuItemProps = {
  onSelect: () => void
  isDisabled?: boolean
  tone?: 'plain' | 'danger'
  children: ReactNode
}

export function FloorMenuItem({
  onSelect,
  isDisabled = false,
  tone = 'plain',
  children,
}: FloorMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      disabled={isDisabled}
      className={`${menuItemVariants()} ${tone === 'danger' ? 'enabled:text-danger' : ''} ${FLOOR_FOCUS_RING}`}
    >
      {children}
    </button>
  )
}
