import { useId, useRef, type ReactNode } from 'react'

import { AdminDialog } from './AdminDialog'
import { adminButtonVariants } from './adminVariants'

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
 * Genel amaçlı onay diyaloğu. Kabuk (zemin, odak tuzağı, Esc, odağın geri
 * dönmesi) `AdminDialog`'ta; burada yalnız açıklama ve iki düğme var.
 *
 * Açılışta odak ONAY düğmesine gider — kabuğun varsayılanı ilk odaklanabilir
 * öğe olurdu, o da "Vazgeç" olurdu.
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
  const confirmRef = useRef<HTMLButtonElement>(null)
  const descriptionId = useId()

  return (
    <AdminDialog
      title={title}
      describedById={descriptionId}
      initialFocusRef={confirmRef}
      onClose={onCancel}
    >
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
    </AdminDialog>
  )
}
