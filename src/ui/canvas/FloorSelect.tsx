import { useEffect, useRef, useState } from 'react'

import { canvasBarButtonVariants, canvasBarMenuItemVariants } from './canvasBarVariants'
import { getFloorContent, isFloorContentEmpty } from '../../core/floorContent'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { useFloorContentSource } from '../floors/useFloorContentSource'

/**
 * Çizimi olmayan katın işareti: içi BOŞ halka. "Boş" yazmak yerine işaret
 * kullanılıyor — kaldırılan kat şeridinden devralındı, gerekçesi aynı
 * (satırda birkaç piksel var, halka `currentColor` ile her zeminde okunur).
 */
function EmptyRing() {
  return (
    <span
      aria-hidden
      className="ml-auto inline-block size-2 shrink-0 rounded-full border border-current opacity-70"
    />
  )
}

/**
 * Çubuktaki aktif kat düğmesi ve tüm katları listeleyen açılırı (K55).
 *
 * Sol üstteki kat şeridi KALDIRILDI (kullanıcı isteği) ve taşıdığı iki bilgi
 * buraya taşındı: katların tam listesi ve hangi katın boş olduğu. Yalnız ↓/↑
 * bırakılsaydı uzak bir kata gitmek için aradaki her kattan geçmek gerekirdi.
 *
 * Sıra ALTTAN ÜSTE, yani store dizisinin kendi sırası — şeritte de öyleydi.
 * ("Katlar" penceresi listeyi ters çevirir: orada bina kesitten okunuyor.)
 */
export function FloorSelect() {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const setActiveFloor = useCadStore((state) => state.setActiveFloor)
  const contentSource = useFloorContentSource()

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const isEmpty = (floorId: Id) => isFloorContentEmpty(getFloorContent(contentSource, floorId))
  const activeFloorName = floors.find((floor) => floor.id === activeFloorId)?.name ?? ''

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Kat seç"
        className={`${canvasBarButtonVariants({ shape: 'label', tone: isOpen ? 'active' : 'plain' })} min-w-24 justify-center text-xs font-medium`}
      >
        <span aria-live="polite">{activeFloorName}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Katlar"
          // Çubuk altta olduğu için açılır YUKARI doğru açılır; çok katlı
          // binada liste ekranı taşmasın diye kendi içinde kaydırılır.
          className="absolute bottom-full left-1/2 z-20 mb-1 max-h-64 min-w-40 -translate-x-1/2 overflow-y-auto rounded-lg border border-edge bg-surface p-1 shadow-lg"
        >
          {floors.map((floor) => {
            const isActive = floor.id === activeFloorId

            return (
              <button
                key={floor.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setActiveFloor(floor.id)
                  setIsOpen(false)
                }}
                className={`${canvasBarMenuItemVariants()} ${isActive ? 'text-selection' : ''}`}
              >
                {floor.name}
                {isEmpty(floor.id) && <EmptyRing />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
