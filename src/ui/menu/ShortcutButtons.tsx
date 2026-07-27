import { Info, ListChecks, Send, type LucideIcon } from 'lucide-react'

import { chromeButtonVariants } from '../controls/buttonVariants'

type Shortcut = {
  id: string
  label: string
  icon: LucideIcon
}

/** Issue 2.5: menü çubuğunun ortasındaki üç buton. Tamamı bu issue'da pasif. */
const CENTER_SHORTCUTS: readonly Shortcut[] = [
  { id: 'projectInfo', label: 'Proje Bilgileri', icon: Info },
  { id: 'runValidation', label: 'Hata Kontrollerini Çalıştır', icon: ListChecks },
  { id: 'send', label: 'Gönder', icon: Send },
]

export function ShortcutButtons() {
  return (
    <div className="flex items-center gap-1">
      {CENTER_SHORTCUTS.map((shortcut) => (
        <button
          key={shortcut.id}
          type="button"
          title={shortcut.label}
          aria-label={shortcut.label}
          disabled
          className={chromeButtonVariants({ shape: 'icon' })}
        >
          <shortcut.icon size={17} strokeWidth={1.7} aria-hidden />
        </button>
      ))}
    </div>
  )
}
