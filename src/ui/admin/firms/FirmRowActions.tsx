import type { GasDistributionFirm } from '../../../api/adminFirms'
import { adminButtonVariants } from '../adminVariants'

interface FirmRowActionsProps {
  firm: GasDistributionFirm
  /** İstek sürerken düğme kilitlenir: aynı satıra ikinci istek gitmesin. */
  isPending: boolean
  onDeactivate: (firm: GasDistributionFirm) => void
}

/**
 * Yalnız eylemi yayınlar; API'yi çağıran taraf `useGasFirmActions`
 * (`ProjectRowActions` deseni).
 *
 * "Düzenle" düğmesi YOK: aynı kaydın güncelleme ekranına firma adı sütunundaki
 * bağlantı zaten gidiyor (KK-11), ikinci bir yol açmak aynı hedefi iki kez
 * göstermek olurdu.
 *
 * Metin "Sil": sunucudaki işlem soft-delete olsa da kullanıcıya gösterilen dil
 * ekipçe "Sil" olarak seçildi; kaydın korunduğu bilgisi onay diyaloğunda
 * duruyor. API tarafındaki ad (`deactivateGasDistributionFirm`) teknik gerçeği
 * söylemeye devam ediyor.
 *
 * Düğme metni firma ADINI da okur (`aria-label`): tabloda otuz satır varken
 * ekran okuyucu kullanıcısı üst üste otuz "Sil" duyar, hangisi olduğunu ayırt
 * edemezdi.
 */
export function FirmRowActions({ firm, isPending, onDeactivate }: FirmRowActionsProps) {
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={() => onDeactivate(firm)}
        disabled={isPending}
        aria-busy={isPending}
        aria-label={`${firm.name} firmasını sil`}
        className={adminButtonVariants({ tone: 'danger', size: 'sm' })}
      >
        Sil
      </button>
    </div>
  )
}
