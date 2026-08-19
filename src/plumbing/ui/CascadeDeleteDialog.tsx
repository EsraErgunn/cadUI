import { useCadStore } from '../../store/cadStore'
import { DialogShell } from '../../ui/controls/DialogShell'
import { chromeButtonVariants } from '../../ui/controls/buttonVariants'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

const DIALOG_TEXT = {
  serviceBox: {
    title: 'Servis Kutusunu Sil',
    confirmLabel: 'Servis Kutusunu Sil',
    description:
      'Servis kutusu tesisatın köküdür. Silinirse bağlı {elements} ve {lines} birlikte silinir.',
  },
  gasMeter: {
    title: 'Sayacı Sil',
    confirmLabel: 'Sayacı Sil',
    description:
      'Sayaç kendi dalının tek girişidir. Silinirse çıkışındaki {elements} ve {lines} birlikte silinir.',
  },
} as const

/**
 * Servis kutusu (proje başına TEKTİR, lineSeed.ts → hasServiceBox) ve sayaç
 * (kendi dalının TEK girişi, core/meterReport.ts) silinince bağlı boru/
 * armatür/cihaz ağı da GİTMELİ, yoksa köksüz bir tesisat geride kalır — bu
 * yüzden diğer eleman silmelerinin aksine (bkz. `deletionActions.ts`)
 * doğrudan uygulanmaz, önce burada onaylanır. Kapsam (`elementIds`/`lineIds`)
 * çağıran tarafından ÖNCEDEN hesaplanmış gelir.
 */
export function CascadeDeleteDialog() {
  const request = usePlumbingUiStore((state) => state.pendingCascadeDeletion)
  const cancel = usePlumbingUiStore((state) => state.cancelCascadeDeletion)
  const clearSelection = usePlumbingUiStore((state) => state.clearSelection)

  if (!request) return null

  const text = DIALOG_TEXT[request.kind]
  const attachedElementCount = request.elementIds.length - 1
  const lineCount = request.lineIds.length

  const handleConfirm = () => {
    useCadStore.getState().removeSelection(request.elementIds, request.lineIds)
    clearSelection()
    cancel()
  }

  return (
    <DialogShell title={text.title} onClose={cancel}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <p role="alert" className="text-sm text-ink">
          {text.description
            .replace('{elements}', `${attachedElementCount} eleman`)
            .replace('{lines}', `${lineCount} boru/hat`)}
        </p>
        <p className="text-xs text-ink-muted">
          İşlem &quot;Geri Al&quot; ile tek adımda geri alınabilir.
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button
          type="button"
          onClick={cancel}
          className={`${chromeButtonVariants()} ${FOCUS_RING}`}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={`${chromeButtonVariants()} bg-danger text-surface ${FOCUS_RING}`}
        >
          {text.confirmLabel}
        </button>
      </div>
    </DialogShell>
  )
}
