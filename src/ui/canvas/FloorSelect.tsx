import { Copy, Layers, Settings2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  CANVAS_BAR_DIVIDER,
  canvasBarButtonVariants,
  canvasBarMenuItemVariants,
} from './canvasBarVariants'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'

type FloorSelectProps = {
  onOpenFloorManagement: () => void
  onOpenFloorCopy: () => void
}

/**
 * Çubuktaki kat düğmesi. Açılırında YALNIZ iki pencere maddesi var (K166):
 * kat GEÇİŞİ artık sol kenardaki şeritten (`FloorRail`) yapılıyor, katların
 * listesi buradan kalktı. Aynı listenin iki yerde durması gereksizdi ve
 * geçiş için önce bir menü açtırmak her kat değişimine bir tıklama ekliyordu.
 *
 * Düğmenin kendisi kalıyor: aktif kat adı ve kat sayısı her an görünür — şerit
 * yalnız kısa etiket (B/Z/1) gösteriyor, tam ad burada okunuyor.
 */
export function FloorSelect({ onOpenFloorManagement, onOpenFloorCopy }: FloorSelectProps) {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const isReadOnly = useUiStore((state) => state.isEditorReadOnly)

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
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

  const activeFloorName = floors.find((floor) => floor.id === activeFloorId)?.name ?? ''

  const openDialog = (open: () => void) => {
    setIsOpen(false)
    open()
  }

  // Salt görüntülemede açılırın İÇİ boş kalırdı: kat ekleme/silme/kopyalama
  // çizimi değiştirir, ikisi de orada çizilmiyor. Düğme o zaman yalnız etiket.
  if (isReadOnly) {
    return (
      <span
        title={`Aktif kat: ${activeFloorName}`}
        className={canvasBarButtonVariants({ shape: 'label' })}
      >
        <Layers size={16} strokeWidth={1.8} aria-hidden />
        {activeFloorName || 'Katlar'}
      </span>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={`Katlar — aktif: ${activeFloorName}`}
        aria-label={`Katlar, aktif kat ${activeFloorName}`}
        className={canvasBarButtonVariants({ shape: 'label', tone: isOpen ? 'active' : 'plain' })}
      >
        <Layers size={16} strokeWidth={1.8} aria-hidden />
        {activeFloorName || 'Katlar'}
        {/* Aktif kat ADI ile toplam kat SAYISI iki ayrı bilgi; ince çizgi
            ikisini ayırıyor. Açılır ok kalktı (kullanıcı kararı): düğme zaten
            menü açıyor ve ok üç bilgiyi tek düğmeye sıkıştırıyordu. */}
        <span className={CANVAS_BAR_DIVIDER} aria-hidden />
        <span className="text-xs font-semibold text-ink-disabled">{floors.length}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Katlar"
          // Çubuk altta olduğu için açılır YUKARI doğru açılır.
          className="absolute bottom-full left-1/2 z-20 mb-1 min-w-52 -translate-x-1/2 rounded-lg border border-edge bg-surface p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => openDialog(onOpenFloorManagement)}
            className={canvasBarMenuItemVariants()}
          >
            <Settings2 size={14} strokeWidth={1.8} aria-hidden />
            Kat Yönetimi
            <span className="ml-auto pl-4 text-xs text-ink-disabled">Ctrl+K</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openDialog(onOpenFloorCopy)}
            className={canvasBarMenuItemVariants()}
          >
            <Copy size={14} strokeWidth={1.8} aria-hidden />
            Kat Kopyalama
            <span className="ml-auto pl-4 text-xs text-ink-disabled">Ctrl+Shift+K</span>
          </button>
        </div>
      )}
    </div>
  )
}
