import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

import { adminButtonVariants } from './adminVariants'

/** Odak tuzağının döneceği öğeler. Diyalogda yalnız düğme/bağlantı bulunuyor. */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ConfirmDialogProps {
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  confirmTone?: 'primary' | 'danger'
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Genel amaçlı onay diyaloğu. Açılınca odak onay düğmesine gider, Tab diyalogun
 * içinde döner, Esc kapatır ve kapanınca odak tetikleyen düğmeye geri döner —
 * aksi hâlde odak sayfanın başına düşer ve klavye kullanıcısı satırı kaybeder.
 *
 * Açık olup olmadığını ÇAĞIRAN tutar (koşullu render): kapalıyken hiç DOM
 * üretmemek, açılış/kapanış odak mantığını mount ömrüne bağlamayı sağlıyor.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Vazgeç',
  confirmTone = 'primary',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const previouslyFocused = document.activeElement
    confirmRef.current?.focus()

    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onCancel()
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
      // Zemine tıklamak vazgeçmek sayılır; klavye karşılığı Esc.
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-xl border border-edge bg-surface p-5 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <div id={descriptionId} className="mt-2 text-sm text-ink-muted">
          {description}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={adminButtonVariants({ tone: 'secondary' })}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            aria-busy={isPending}
            className={adminButtonVariants({ tone: confirmTone })}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
