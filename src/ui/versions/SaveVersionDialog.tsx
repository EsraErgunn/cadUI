import { useId, useState, type FormEvent } from 'react'

import { VERSION_LABEL_MAX_LENGTH } from './versionFormat'
import { DialogShell } from '../controls/DialogShell'
import { dialogActionVariants } from '../controls/buttonVariants'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

type SaveVersionDialogProps = {
  isSaving: boolean
  onCancel: () => void
  onSave: (label: string) => void
}

/**
 * "Farklı Kaydet" — etiketli sürüm. Uçtaki her yazma zaten yeni ve DEĞİŞMEZ bir
 * kayıt doğuruyor; etiket, kullanıcının o kaydı geçmiş listesinde tarihten
 * başka bir şeyle tanıyabilmesinin tek yolu.
 *
 * Etiket ZORUNLU: boş bırakılabilseydi düğme "Kaydet"in ikizi olurdu.
 */
export function SaveVersionDialog({ isSaving, onCancel, onSave }: SaveVersionDialogProps) {
  const [label, setLabel] = useState('')
  const inputId = useId()
  const trimmedLabel = label.trim()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (trimmedLabel === '' || isSaving) return
    onSave(trimmedLabel)
  }

  return (
    <DialogShell title="Farklı Kaydet" onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-2 px-5 py-4">
          <label htmlFor={inputId} className="block text-sm text-ink">
            Sürüm etiketi
          </label>
          <input
            id={inputId}
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={VERSION_LABEL_MAX_LENGTH}
            className={`w-full rounded-md border border-edge bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-disabled ${FOCUS_RING}`}
            placeholder="Örn. Kolon hattı eklendi"
          />
          <p className="text-xs text-ink-muted">
            Çizimin o anki hâli yeni bir kayıt olarak eklenir; önceki kayıtlar silinmez.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-edge px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className={`${dialogActionVariants({ tone: 'cancel' })} ${FOCUS_RING}`}
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={trimmedLabel === '' || isSaving}
            className={`${dialogActionVariants({ tone: 'primary' })} ${FOCUS_RING}`}
          >
            {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}
