import type { MenuDefinition } from './menuDefinitions'
import { menuItemVariants } from '../controls/buttonVariants'


type MenuDropdownProps = {
  menu: MenuDefinition
  onSelectItem: (itemId: string) => void
  /**
   * Çalışma zamanında pasifleşen maddeler (ör. geçmiş boşken "Geri Al").
   * Tanımdaki isEnabled "bu komut var mı" der, bu küme "şu an yapılabilir mi".
   */
  unavailableItemIds?: ReadonlySet<string>
}

export function MenuDropdown({
  menu,
  onSelectItem,
  unavailableItemIds,
}: MenuDropdownProps) {
  return (
    <div
      role="menu"
      aria-label={menu.label}
      className="absolute left-0 top-full z-20 mt-1 min-w-64 rounded-lg border border-edge bg-surface py-1 shadow-lg"
    >
      {menu.groups.map((group, groupIndex) => (
        <div key={group.title ?? groupIndex}>
          {groupIndex > 0 && <div className="my-1 h-px bg-edge" />}
          {group.title !== undefined && (
            <div className="px-3 py-1 text-xs font-semibold tracking-wide text-ink-disabled">
              {group.title}
            </div>
          )}
          {group.items.map((item) => (
            <button
              key={item.id}
              type="button"
              role={item.kind === 'checkbox' ? 'menuitemcheckbox' : 'menuitem'}
              aria-checked={item.kind === 'checkbox' ? false : undefined}
              disabled={!item.isEnabled || unavailableItemIds?.has(item.id) === true}
              onClick={() => onSelectItem(item.id)}
              className={menuItemVariants()}
            >
              {item.label}
              {item.shortcut && (
                <span className="ml-auto pl-6 text-xs text-ink-disabled">{item.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
