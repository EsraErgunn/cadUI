import { formatLengthMeters } from '../../core/lengthFormat'
import { useCadStore } from '../../store/cadStore'
import { DialogShell } from '../../ui/controls/DialogShell'
import { dialogActionVariants } from '../../ui/controls/buttonVariants'
import { usePlumbingUiStore, type PendingCascadeDeletion } from '../store/plumbingUiStore'

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
  riserNetwork: {
    title: 'Kolon Hattını Sil',
    confirmLabel: 'Kolon Hattını Sil',
    description: 'Kolon hattı ve ona bağlı branşmanlar silinecek: {elements}, {lines}.',
  },
  unitInstallations: {
    title: 'Daire İçi Tesisatları Sil',
    confirmLabel: 'Tesisatı Sil',
    description: 'Sayaçlardan sonraki tesisat silinecek: {elements}, {lines}.',
  },
} as const

/**
 * Tek eleman silmede kapsam listesi silinen elemanın KENDİSİNİ de taşır
 * (kullanıcı onu seçmişti), toplu silmede taşımaz — sayı bu yüzden türe göre
 * hesaplanıyor. Yanlış tarafa düşerse kullanıcıya bir eksik/fazla öge yazılır.
 */
const KINDS_INCLUDING_TARGET: readonly PendingCascadeDeletion['kind'][] = ['serviceBox', 'gasMeter']

/**
 * Servis kutusu (proje başına TEKTİR, lineSeed.ts → hasServiceBox) ve sayaç
 * (kendi dalının TEK girişi, core/meterReport.ts) silinince bağlı boru/
 * armatür/cihaz ağı da GİTMELİ, yoksa köksüz bir tesisat geride kalır — bu
 * yüzden diğer eleman silmelerinin aksine (bkz. `deletionActions.ts`)
 * doğrudan uygulanmaz, önce burada onaylanır. Kapsam (`elementIds`/`lineIds`)
 * çağıran tarafından ÖNCEDEN hesaplanmış gelir.
 *
 * Aynı pencere TOPLU işlemleri de onaylıyor (Kolon Hattını Sil, Daire İçi
 * Tesisatları Sil): ikinci bir onay penceresi açılsaydı "geri alınabilir" notu
 * ve kat yayılma uyarısı iki yerde tutulurdu.
 */
export function CascadeDeleteDialog() {
  const request = usePlumbingUiStore((state) => state.pendingCascadeDeletion)
  const cancel = usePlumbingUiStore((state) => state.cancelCascadeDeletion)
  const clearSelection = usePlumbingUiStore((state) => state.clearSelection)
  const floors = useCadStore((state) => state.floors)

  if (!request) return null

  const text = DIALOG_TEXT[request.kind]
  const attachedElementCount = KINDS_INCLUDING_TARGET.includes(request.kind)
    ? request.elementIds.length - 1
    : request.elementIds.length
  const lineCount = request.lineIds.length
  const totalLengthCm = request.summary?.totalLengthCm
  const unitBreakdown = request.summary?.unitBreakdown ?? []
  // Kat bağlantısı (kolon devamı) kapsamı BAŞKA kata taşırsa (kullanıcı
  // isteği, 2026-08) kullanıcı hangi katların etkilendiğini görmeli — yoksa
  // "bir servis kutusu sildim, üst kattaki boru da gitti" sürpriz olur.
  const otherFloorNames =
    request.floorIds.length > 1
      ? floors
          .filter((floor) => request.floorIds.includes(floor.id))
          .map((floor) => floor.name)
      : []

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
        {totalLengthCm !== undefined && (
          <p className="text-sm text-ink">
            Silinecek hat uzunluğu: {formatLengthMeters(totalLengthCm)}
          </p>
        )}

        {/* Şartname şartı: daire içi silmede döküm BAĞIMSIZ BÖLÜM BAZINDA.
            Toplam sayı "hangi daireye dokunuyorum?" sorusunu yanıtlamıyor. */}
        {unitBreakdown.length > 0 && (
          <dl className="space-y-1 rounded-md border border-edge bg-surface-sunken px-3 py-2">
            {unitBreakdown.map((unit) => (
              <div key={unit.label} className="flex items-baseline justify-between gap-3 text-xs">
                <dt className="text-ink">{unit.label}</dt>
                <dd className="text-ink-muted">
                  {unit.elementCount} eleman · {unit.lineCount} boru/hat
                </dd>
              </div>
            ))}
          </dl>
        )}

        {otherFloorNames.length > 0 && (
          <p role="alert" className="text-sm font-medium text-danger">
            Bu kapsam başka katlara da yayılıyor: {otherFloorNames.join(', ')}.
          </p>
        )}
        <p className="text-xs text-ink-muted">
          İşlem &quot;Geri Al&quot; ile tek adımda geri alınabilir.
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button
          type="button"
          onClick={cancel}
          className={`${dialogActionVariants({ tone: 'cancel' })} ${FOCUS_RING}`}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={`${dialogActionVariants({ tone: 'keep' })} bg-danger text-surface ${FOCUS_RING}`}
        >
          {text.confirmLabel}
        </button>
      </div>
    </DialogShell>
  )
}
