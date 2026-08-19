import { DialogShell } from '../controls/DialogShell'
import { chromeButtonVariants } from '../controls/buttonVariants'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

type VersionLoadConfirmDialogProps = {
  versionTitle: string
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Sürüm yüklemek `loadProject`ten geçiyor; o da geri al geçmişini SIFIRLIYOR
 * (cadStore: "yükleme bir düzenleme değil, yeni bir başlangıç"). Yani
 * kaydedilmemiş çizim Ctrl+Z ile geri getirilemez — soru bu yüzden yalnız
 * kirliyken soruluyor, temizken sorulacak bir şey yok.
 */
export function VersionLoadConfirmDialog({
  versionTitle,
  onCancel,
  onConfirm,
}: VersionLoadConfirmDialogProps) {
  return (
    <DialogShell title="Sürümü Yükle" onClose={onCancel}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <p role="alert" className="text-sm text-ink">
          Kaydedilmemiş değişiklikleriniz var. <b>{versionTitle}</b> yüklenirse bu değişiklikler
          kaybolur.
        </p>
        <p className="text-xs text-ink-muted">
          Yükleme geri al geçmişini de sıfırlar; işlem Ctrl+Z ile geri alınamaz. Sunucudaki
          kayıtlar silinmez.
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button type="button" onClick={onCancel} className={`${chromeButtonVariants()} ${FOCUS_RING}`}>
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`${chromeButtonVariants()} bg-danger text-surface ${FOCUS_RING}`}
        >
          Yine de Yükle
        </button>
      </div>
    </DialogShell>
  )
}
