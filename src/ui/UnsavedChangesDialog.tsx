import { DialogShell } from './controls/DialogShell'
import { chromeButtonVariants } from './controls/buttonVariants'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

type UnsavedChangesDialogProps = {
  isSaving: boolean
  /** Kaydetme denemesi başarısızsa gösterilir: üst bardaki şerit pencerenin ARKASINDA kalıyor. */
  error: string | undefined
  onCancel: () => void
  onDiscard: () => void
  onSaveAndClose: () => void
}

/**
 * Editörden çıkarken kaydedilmemiş değişiklik uyarısı.
 *
 * Üç seçenek var, iki değil: "kaydet ve çık" olmasaydı kullanıcı pencereyi
 * kapatıp Kaydet'e basmak ve çıkışı tekrarlamak zorunda kalırdı — uyarının
 * amacı işi kurtarmak, kullanıcıyı geri yollamak değil.
 */
export function UnsavedChangesDialog({
  isSaving,
  error,
  onCancel,
  onDiscard,
  onSaveAndClose,
}: UnsavedChangesDialogProps) {
  return (
    <DialogShell title="Kaydedilmemiş Değişiklikler" onClose={onCancel}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <p className="text-sm text-ink">
          Bu projede kaydedilmemiş değişiklikler var. Kaydetmeden çıkarsanız bu değişiklikler
          kaybolur.
        </p>
        {error !== undefined && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className={`${chromeButtonVariants()} ${FOCUS_RING}`}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={isSaving}
          className={`${chromeButtonVariants()} text-danger hover:bg-danger/10 ${FOCUS_RING}`}
        >
          Kaydetmeden Çık
        </button>
        <button
          type="button"
          onClick={onSaveAndClose}
          disabled={isSaving}
          className={`${chromeButtonVariants({ tone: 'active' })} ${FOCUS_RING}`}
        >
          {isSaving ? 'Kaydediliyor…' : 'Kaydet ve Çık'}
        </button>
      </div>
    </DialogShell>
  )
}
