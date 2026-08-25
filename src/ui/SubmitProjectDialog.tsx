import { DialogShell } from './controls/DialogShell'
import { chromeButtonVariants } from './controls/buttonVariants'
import type { EditorSubmitKind } from '../pages/useEditorSubmit'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

const TITLES: Record<EditorSubmitKind, string> = {
  submit: 'Onaya Gönder',
  approve: 'Projeyi Onayla',
}

const CONFIRM_LABELS: Record<EditorSubmitKind, string> = {
  submit: 'Yine de Gönder',
  approve: 'Yine de Onayla',
}

const CONSEQUENCES: Record<EditorSubmitKind, string> = {
  submit: 'Proje bu hâliyle onaya gider ve hatalar onaylayan kişiye görünür.',
  approve: 'Proje bu hâliyle onaylanır; hatalar çizimde kalır.',
}

type SubmitProjectDialogProps = {
  kind: EditorSubmitKind
  /** Denetimin bulduğu hata sayısı; pencere yalnız sıfırdan büyükken açılır. */
  issueCount: number
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Hata kontrolleri temiz çıkmadığında araya giren onay.
 *
 * Sert bir kapı DEĞİL: düğme pasifleştirilmedi, kullanıcı sayıyı görüp karar
 * veriyor (K175). Denetim temizse bu pencere hiç açılmaz — istek doğrudan
 * gider, tek tıkla biten bir işe ikinci tık eklemenin karşılığı yok.
 */
export function SubmitProjectDialog({
  kind,
  issueCount,
  isPending,
  onCancel,
  onConfirm,
}: SubmitProjectDialogProps) {
  return (
    <DialogShell title={TITLES[kind]} onClose={onCancel}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <p className="text-sm text-ink">
          Hata kontrolleri <strong>{issueCount} hata</strong> buldu. Listeyi üst bardaki
          &quot;Hata Kontrolleri&quot; düğmesinden inceleyebilirsiniz.
        </p>
        <p className="text-sm text-ink-muted">{CONSEQUENCES[kind]}</p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className={`${chromeButtonVariants()} ${FOCUS_RING}`}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          aria-busy={isPending}
          className={`${chromeButtonVariants()} font-medium text-admin-primary hover:bg-admin-primary/10 ${FOCUS_RING}`}
        >
          {CONFIRM_LABELS[kind]}
        </button>
      </div>
    </DialogShell>
  )
}
