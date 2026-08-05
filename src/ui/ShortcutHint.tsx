import { HelpCircle } from 'lucide-react'
import { useId } from 'react'

import type { EditorShortcut } from '../core/shortcuts'
import { toolButtonVariants } from './controls/buttonVariants'

type ShortcutHintProps = {
  /** Panel başlığı ve butonun erişilebilir adı: "Tesisat kısayolları" gibi. */
  title: string
  shortcuts: readonly EditorShortcut[]
}

/** Palet altındaki soru işareti: üzerine gelince o görünümün kısayolları açılır. */
export function ShortcutHint({ title, shortcuts }: ShortcutHintProps) {
  // Aynı anda tek palet mount oluyor ama id sabit yazılmıyor: iki ipucu bir arada
  // görünürse aria-describedby ikisinde de aynı öğeyi işaret ederdi.
  const panelId = useId()

  return (
    <div className="group relative">
      {/* aria-describedby ile panel butonun açıklaması olur; sadece hover'da
          görünen bir listeyi klavye/ekran okuyucu kullanıcısı da duyar. */}
      <button
        type="button"
        aria-label={title}
        aria-describedby={panelId}
        className={toolButtonVariants()}
      >
        <HelpCircle size={18} strokeWidth={1.7} aria-hidden />
      </button>

      {/* group-focus-within: fareyle üzerine gelemeyen klavye kullanıcısında
          buton odaklanınca da açılır. Panel altta duruyor, yukarı doğru büyür. */}
      <div
        id={panelId}
        role="tooltip"
        className="pointer-events-none absolute bottom-0 left-full z-30 ml-2 hidden w-72 rounded-md border border-edge bg-surface p-2.5 shadow-lg group-hover:block group-focus-within:block"
      >
        <p className="pb-1.5 text-xs font-semibold text-ink">{title}</p>

        {shortcuts.length === 0 ? (
          <p className="text-xs leading-5 text-ink-muted">
            Bu görünümün kısayol listesi henüz eklenmedi.
          </p>
        ) : (
          <dl className="flex flex-col gap-1.5">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.id} className="flex items-start gap-2">
                <dt className="flex w-32 shrink-0 flex-wrap gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd
                      key={key}
                      className="rounded border border-edge bg-surface-sunken px-1.5 py-0.5 text-xs text-ink"
                    >
                      {key}
                    </kbd>
                  ))}
                </dt>
                <dd className="text-xs leading-5 text-ink-muted">{shortcut.label}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
