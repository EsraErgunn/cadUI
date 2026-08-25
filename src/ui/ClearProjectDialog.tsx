import { DialogShell } from './controls/DialogShell'
import { dialogActionVariants } from './controls/buttonVariants'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

type ClearProjectDialogProps = {
  onCancel: () => void
  onConfirm: () => void
}

/**
 * "Projeyi Temizle" onayı.
 *
 * Onay ŞART: menüdeki tek yıkıcı madde bu ve tıklamayla anında çalışıyor.
 * Kaydedilmemiş uyarısından (UnsavedChangesDialog) farklı olarak burada
 * "kaydet ve devam et" seçeneği YOK — kullanıcı çizimi silmek istiyor,
 * kaydetmek istese temizlemezdi.
 *
 * Geri alınabilirliği metin AÇIKÇA söylüyor: eylem tek adımda geri alınabiliyor
 * (cadStore.clearProjectDrawing tek set() içinde), bunu bilmeyen kullanıcı
 * pencereyi kapatıp temizlemekten vazgeçiyordu.
 */
export function ClearProjectDialog({ onCancel, onConfirm }: ClearProjectDialogProps) {
  return (
    <DialogShell title="Projeyi Temizle" onClose={onCancel}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <p className="text-sm text-ink">
          Bu projedeki tüm çizim silinecek: duvarlar, açıklıklar, mahaller, semboller ve
          tesisat. Kat listesi korunur, katlar boşalır.
        </p>
        <p className="text-sm text-ink-muted">
          Geri almak için Ctrl+Z yeterli. Silme kaydedilmez; kaydetmezseniz proje diskte
          olduğu gibi kalır.
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button type="button" onClick={onCancel} className={`${dialogActionVariants({ tone: 'cancel' })} ${FOCUS_RING}`}>
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`${dialogActionVariants({ tone: 'danger' })} ${FOCUS_RING}`}
        >
          Temizle
        </button>
      </div>
    </DialogShell>
  )
}
