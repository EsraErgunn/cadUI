import { Check } from 'lucide-react'

import { EDITOR_BAR_PANEL, editorBarMenuItemVariants } from './editorBarVariants'
import type { MenuDefinition } from './menuDefinitions'


type MenuDropdownProps = {
  menu: MenuDefinition
  onSelectItem: (itemId: string) => void
  /**
   * Çalışma zamanında pasifleşen maddeler (ör. geçmiş boşken "Geri Al").
   * Tanımdaki isEnabled "bu komut var mı" der, bu küme "şu an yapılabilir mi".
   */
  unavailableItemIds?: ReadonlySet<string>
  /** İşaretli checkbox maddeleri. Tanım "bu madde işaretlenebilir" der, bu küme
   *  "şu an işaretli mi" — durum uiStore'da, menü tanımında değil. */
  checkedItemIds?: ReadonlySet<string>
}

export function MenuDropdown({
  menu,
  onSelectItem,
  unavailableItemIds,
  checkedItemIds,
}: MenuDropdownProps) {
  return (
    <div
      role="menu"
      aria-label={menu.label}
      className={`${EDITOR_BAR_PANEL} absolute left-0 top-full z-20 mt-1 min-w-64 rounded-lg py-1 shadow-lg`}
    >
      {menu.groups.map((group, groupIndex) => (
        <div key={group.title ?? groupIndex}>
          {groupIndex > 0 && <div className="my-1 h-px bg-canvas-overlay-edge" />}
          {group.title !== undefined && (
            <div className="px-3 py-1 text-xs font-semibold tracking-wide text-canvas-overlay-ink-muted">
              {group.title}
            </div>
          )}
          {group.items.map((item) => (
            <button
              key={item.id}
              type="button"
              role={item.kind === 'checkbox' ? 'menuitemcheckbox' : 'menuitem'}
              aria-checked={
                item.kind === 'checkbox' ? checkedItemIds?.has(item.id) === true : undefined
              }
              disabled={!item.isEnabled || unavailableItemIds?.has(item.id) === true}
              onClick={() => onSelectItem(item.id)}
              className={editorBarMenuItemVariants()}
            >
              {/* Tik salt görsel (durum makineye aria-checked ile gidiyor).
                  İşaretsizken görünmez ama YER TUTAR: etiketler hizalı kalsın. */}
              {item.kind === 'checkbox' && (
                <Check
                  size={14}
                  strokeWidth={2.2}
                  aria-hidden
                  className={
                    checkedItemIds?.has(item.id) === true ? 'shrink-0' : 'invisible shrink-0'
                  }
                />
              )}
              {item.label}
              {item.shortcut && (
                <span className="ml-auto pl-6 text-xs text-canvas-overlay-ink-muted">{item.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
