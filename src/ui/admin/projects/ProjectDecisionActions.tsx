import { Check, X } from 'lucide-react'

import { adminButtonVariants } from '../adminVariants'

interface ProjectDecisionActionsProps {
  projectId: number
  /** İstek sürerken iki düğme de kilitlenir: aynı satıra ikinci istek gitmesin. */
  isPending: boolean
  onApprove: (projectId: number) => void
  onReject: (projectId: number) => void
}

/**
 * Onay kuyruğu satırının eylemleri — gaz dağıtım kullanıcısının asıl işi.
 *
 * `ProjectRowActions`'ın kopyası DEĞİL: o taslak sahibinin eylemlerini (Sil,
 * Onaya Gönder) yayınlıyor, buradakiler karar eylemleri ve farklı bir uca
 * gidiyor (`approve`/`reject`). Tek bileşende dört düğme + iki kip taşımak,
 * çağıranın hangi ikilinin çizildiğini prop'lardan çıkarmasını gerektirirdi.
 *
 * Düğme sırası proje detayıyla AYNI: Reddet solda, Onayla sağda ve birincil —
 * iki ekran arasında geçen kullanıcı kas hafızasını kaybetmesin.
 */
export function ProjectDecisionActions({
  projectId,
  isPending,
  onApprove,
  onReject,
}: ProjectDecisionActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onReject(projectId)}
        disabled={isPending}
        aria-busy={isPending}
        className={adminButtonVariants({ tone: 'danger', size: 'sm' })}
      >
        <X aria-hidden className="size-4" />
        Reddet
      </button>
      <button
        type="button"
        onClick={() => onApprove(projectId)}
        disabled={isPending}
        aria-busy={isPending}
        className={adminButtonVariants({ tone: 'primary', size: 'sm' })}
      >
        <Check aria-hidden className="size-4" />
        Onayla
      </button>
    </div>
  )
}
