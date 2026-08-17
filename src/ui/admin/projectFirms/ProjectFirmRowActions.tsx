import type { ProjectFirm } from '../../../api/projectFirms'
import { adminButtonVariants } from '../adminVariants'

interface ProjectFirmRowActionsProps {
  firm: ProjectFirm
  /** İstek sürerken düğme kilitlenir: aynı satıra ikinci istek gitmesin. */
  isPending: boolean
  onDelete: (firm: ProjectFirm) => void
}

/**
 * Yalnız eylemi yayınlar; API'yi çağıran taraf `useProjectFirmActions`
 * (`FirmRowActions` deseninin eşi).
 *
 * "Düzenle" düğmesi YOK: aynı kaydın güncelleme ekranına Firma Adı sütunundaki
 * bağlantı zaten gidiyor — gaz dağıtım firmaları ekranında verilen kararla aynı,
 * iki firma listesi aynı işlem sütununu göstersin diye burada da tekrarlanmıyor.
 *
 * Düğme metni firma ADINI da okur (`aria-label`): tabloda otuz satır varken
 * ekran okuyucu kullanıcısı üst üste otuz "Sil" duyar, hangisi olduğunu ayırt
 * edemezdi.
 */
export function ProjectFirmRowActions({
  firm,
  isPending,
  onDelete,
}: ProjectFirmRowActionsProps) {
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={() => onDelete(firm)}
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
