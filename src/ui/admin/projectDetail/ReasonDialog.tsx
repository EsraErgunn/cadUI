import { useId, useState } from 'react'

import { AdminDialog } from '../AdminDialog'
import { adminButtonVariants } from '../adminVariants'
import { TextAreaField } from '../form/TextAreaField'

const REQUIRED_ERROR = 'Gerekçe zorunludur.'

interface ReasonDialogProps {
  title: string
  description: string
  confirmLabel: string
  isPending: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

/**
 * "Revizyon İste" ve "Projeyi Reddet" gerekçesi (KK-10). Gerekçe boşken işlem
 * TAMAMLANMAZ: doğrulama gönderme anında yapılıyor ve düğme baştan pasif
 * değil — pasif bir düğme kullanıcıya neyin eksik olduğunu söylemez.
 */
export function ReasonDialog({
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
  onCancel,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const descriptionId = useId()
  const fieldId = useId()

  const handleConfirm = () => {
    const trimmed = reason.trim()
    if (trimmed === '') {
      setError(REQUIRED_ERROR)
      return
    }

    onConfirm(trimmed)
  }

  return (
    <AdminDialog
      title={title}
      describedById={descriptionId}
      onClose={onCancel}
    >
      <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
        {description}
      </p>

      <div className="mt-4">
        <TextAreaField
          id={fieldId}
          label="Gerekçe"
          value={reason}
          error={error}
          placeholder="İşlemin gerekçesini yazın."
          onChange={(next) => {
            setReason(next)
            // Kullanıcı yazmaya başlayınca hata kalkar; düzeltmeye çalışırken
            // kırmızı kenarlığın durması "hâlâ yanlış" izlenimi verirdi.
            if (error !== undefined) setError(undefined)
          }}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className={adminButtonVariants({ tone: 'secondary' })}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          {confirmLabel}
        </button>
      </div>
    </AdminDialog>
  )
}
