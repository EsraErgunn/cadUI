import { ArrowLeft, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useCadStore } from '../store/cadStore'
import { chromeButtonVariants } from './controls/buttonVariants'
import { MenuDropdown } from './menu/MenuDropdown'
import { ShortcutButtons } from './menu/ShortcutButtons'
import { ViewSwitcher } from './menu/ViewSwitcher'
import {
  CLOSE_EDITOR_ITEM_ID,
  EDITOR_MENUS,
  FLOOR_MENU_ID,
  SAVE_ITEM_ID,
} from './menu/menuDefinitions'

type MenuBarProps = {
  onCloseEditor: () => void
  onSave: () => void
  isSaving: boolean
}

export function MenuBar({ onCloseEditor, onSave, isSaving }: MenuBarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const floorCount = useCadStore((state) => state.floors.length)
  const barRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (openMenuId === null) return undefined

    // pointerdown kullanılıyor: click ile dinlersek başlık butonunun kendi click'i
    // menüyü kapattıktan hemen sonra yeniden açar.
    const handlePointerDown = (event: PointerEvent) => {
      if (barRef.current?.contains(event.target as Node)) return
      setOpenMenuId(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenuId])

  const handleSelectItem = (itemId: string) => {
    setOpenMenuId(null)
    // Yalnız aktif maddeler buraya gelir; kalanı disabled.
    if (itemId === CLOSE_EDITOR_ITEM_ID) onCloseEditor()
    if (itemId === SAVE_ITEM_ID) onSave()
  }

  return (
    <header
      ref={barRef}
      className="flex shrink-0 items-center gap-1 border-b border-edge bg-surface px-2 py-1.5"
    >
      <button
        type="button"
        onClick={onCloseEditor}
        className={chromeButtonVariants()}
      >
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden />
        Projeler
      </button>

      <span className="mx-1 h-5 w-px bg-edge" />

      <nav className="flex items-center gap-0.5" aria-label="Ana menü">
        {EDITOR_MENUS.map((menu) => (
          <div key={menu.id} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenuId === menu.id}
              onClick={() => setOpenMenuId((current) => (current === menu.id ? null : menu.id))}
              className={chromeButtonVariants({
                tone: openMenuId === menu.id ? 'active' : 'plain',
              })}
            >
              {menu.label}
              {menu.id === FLOOR_MENU_ID && (
                <span className="rounded-full bg-surface-sunken px-1.5 text-xs font-semibold text-ink-muted">
                  {floorCount}
                </span>
              )}
            </button>
            {openMenuId === menu.id && (
              <MenuDropdown menu={menu} onSelectItem={handleSelectItem} />
            )}
          </div>
        ))}
      </nav>

      <div className="flex-1" />
      <ShortcutButtons />
      <div className="flex-1" />

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className={chromeButtonVariants()}
      >
        <Save size={16} strokeWidth={1.8} aria-hidden />
        {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
      </button>

      <span className="mx-1 h-5 w-px bg-edge" />
      <ViewSwitcher />
    </header>
  )
}
