import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

/** Odak tuzağının döneceği öğeler. */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

type DialogShellProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Editör diyaloglarının kabuğu. Açık olup olmadığını ÇAĞIRAN tutar (koşullu
 * render): kapalıyken hiç DOM üretmemek, odak mantığını mount ömrüne bağlıyor.
 *
 * admin/ConfirmDialog ile aynı işi yapıyor ama ondan türetilmedi: o bileşen
 * adminButtonVariants'a (indigo admin teması) bağlı, editör kabuğu ise kendi
 * chrome renklerini kullanıyor. Ortaklaştırma teması da ortaklaştırmayı gerektirir.
 */
export function DialogShell({ title, onClose, children }: DialogShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const previouslyFocused = document.activeElement
    // İlk odaklanabilir öğe: liste diyaloglarında "onay" düğmesi yok, kapatma var.
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()

    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (focusable === undefined || focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
      return
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-edge bg-surface shadow-lg"
      >
        <h2 id={titleId} className="shrink-0 border-b border-edge px-5 py-3 text-base font-semibold text-ink">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
