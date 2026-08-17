import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { EditorActions } from './menu/EditorActions'
import { MenuDropdown } from './menu/MenuDropdown'
import { ViewSwitcher } from './menu/ViewSwitcher'
import { editorBarButtonVariants } from './menu/editorBarVariants'
import {
  CLOSE_EDITOR_ITEM_ID,
  EDITOR_MENUS,
  EXPORT_ITEM_ID,
  IMPORT_ITEM_ID,
  SAVE_ITEM_ID,
} from './menu/menuDefinitions'
import { MENU_ICONS } from './menu/menuIcons'

type MenuBarProps = {
  onCloseEditor: () => void
  onSave: () => void
  onImport: () => void
  onExport: () => void
  isSaving: boolean
}

/**
 * Üst bar üç öbeğe indi: solda projeden çıkış + kalan iki menü (Dosya, Araçlar),
 * ortada sahne değiştirici, sağda proje eylemleri.
 *
 * Düzenle/Görünüm/Katlar menüleri KALKTI: geri al-yinele, görünüm anahtarları ve
 * kat geçişi tuvalin ALT çubuğuna taşındı (K54/K55) — çizerken el orada, üst
 * bara çıkmak için çizimi bırakmak gerekiyordu. Kayıt Geçmişi ise Düzenle'nin
 * tek kalan maddesiydi, sağdaki eylem öbeğine kendi düğmesi olarak geçti.
 *
 * Barın kendi zemini YOK: sayfa zemininin üstünde duruyor, düğmeler tek tek kart.
 */
export function MenuBar({ onCloseEditor, onSave, onImport, onExport, isSaving }: MenuBarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
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
    if (itemId === IMPORT_ITEM_ID) onImport()
    if (itemId === EXPORT_ITEM_ID) onExport()
  }

  return (
    <header ref={barRef} className="flex shrink-0 items-center gap-2 px-4 py-2.5">
      {/* Tek çerçevesiz düğme: bu bir menü değil, ekrandan ÇIKIŞ — kartların
          arasında durursa aynı öbekten sayılır. */}
      <button
        type="button"
        onClick={onCloseEditor}
        className={`${editorBarButtonVariants()} mr-2 font-medium text-canvas-overlay-ink-strong`}
      >
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden />
        Projeler
      </button>

      <nav className="flex items-center gap-2" aria-label="Ana menü">
        {EDITOR_MENUS.map((menu) => {
          const Icon = MENU_ICONS[menu.id]
          return (
            <div key={menu.id} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={openMenuId === menu.id}
                onClick={() => setOpenMenuId((current) => (current === menu.id ? null : menu.id))}
                className={editorBarButtonVariants({
                  tone: openMenuId === menu.id ? 'active' : 'card',
                })}
              >
                {Icon && <Icon size={16} strokeWidth={1.8} aria-hidden />}
                {menu.label}
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  aria-hidden
                  className="text-canvas-overlay-ink"
                />
              </button>
              {openMenuId === menu.id && (
                <MenuDropdown menu={menu} onSelectItem={handleSelectItem} />
              )}
            </div>
          )
        })}
      </nav>

      {/* İki esnek boşluk: sahne değiştirici, iki yandaki öbeklerin genişliğinden
          BAĞIMSIZ olarak barın ortasında kalsın (Kaydet "Kaydediliyor…" olunca
          öbek genişliyor, tek boşlukla ortadaki düğmeler kayardı). */}
      <div className="flex-1" />
      <ViewSwitcher />
      <div className="flex-1" />

      <EditorActions onSave={onSave} isSaving={isSaving} />
    </header>
  )
}
