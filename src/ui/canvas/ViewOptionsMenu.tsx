import { Check, Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { canvasBarButtonVariants, canvasBarMenuItemVariants } from './canvasBarVariants'
import { useUiStore } from '../../store/uiStore'

export type ViewOption = {
  id: string
  label: string
  isChecked: boolean
  onToggle: () => void
}

/**
 * Floating bar'ın "Görünüm" açılırı: çizim yardımcılarının görünürlük
 * anahtarları. Maddeler PROPS ile geliyor, burada gömülü değil — ölçü/açı/isim
 * anahtarları kendi aşamalarında ekleniyor ve her aşamada bu bileşen aynı kalıyor.
 *
 * `MenuDropdown` yeniden kullanılmadı: o `MenuDefinition` sözleşmesine bağlı
 * (menü çubuğunun grup/kısayol yapısı) ve buradaki üç satırlık liste için o
 * yapıyı kurmak, menü tanımlarına tuvale ait maddeler sokmak demekti.
 */
export function ViewOptionsMenu() {
  const isGridVisible = useUiStore((state) => state.isGridVisible)
  const toggleGridVisible = useUiStore((state) => state.toggleGridVisible)
  const isAreaObjectNamesVisible = useUiStore((state) => state.isAreaObjectNamesVisible)
  const toggleAreaObjectNamesVisible = useUiStore((state) => state.toggleAreaObjectNamesVisible)
  const isRoomNamesVisible = useUiStore((state) => state.isRoomNamesVisible)
  const toggleRoomNamesVisible = useUiStore((state) => state.toggleRoomNamesVisible)

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Dışarı tıklayınca kapanır. Menü çubuğundaki açılırlarla aynı beklenti;
  // `pointerdown` kullanılıyor ki tuvale basıldığında çizim başlamadan kapansın.
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

  const options: ViewOption[] = [
    {
      id: 'areaObjectNames',
      label: 'Nesne adları',
      isChecked: isAreaObjectNamesVisible,
      onToggle: toggleAreaObjectNamesVisible,
    },
    {
      // Ad ve alan (m²) TEK madde: ikisi aynı çapaya yazılmış tek yazı öbeği,
      // ayrı ayrı gizlemek ortada asılı bir sayı bırakırdı.
      id: 'roomNames',
      label: 'Oda adları',
      isChecked: isRoomNamesVisible,
      onToggle: toggleRoomNamesVisible,
    },
    {
      id: 'grid',
      label: 'Izgara',
      isChecked: isGridVisible,
      onToggle: toggleGridVisible,
    },
  ]

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Görünüm"
        className={canvasBarButtonVariants({ shape: 'label', tone: isOpen ? 'active' : 'plain' })}
      >
        <Eye size={16} strokeWidth={1.8} aria-hidden />
        Görünüm
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Görünüm seçenekleri"
          // Çubuk ekranın ALTINDA olduğu için açılır YUKARI doğru açılır.
          className="absolute bottom-full right-0 z-20 mb-1 min-w-48 rounded-lg border border-edge bg-surface p-1 shadow-lg"
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemcheckbox"
              aria-checked={option.isChecked}
              onClick={option.onToggle}
              className={canvasBarMenuItemVariants()}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {option.isChecked && <Check size={14} strokeWidth={2.2} aria-hidden />}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
