import { Funnel, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GAS_FIRM_CREATE_PATH } from '../adminNavItems'
import { ADMIN_TOOLBAR_ROW } from '../adminToolbarLayout'
import { adminButtonVariants } from '../adminVariants'
import { useIsAdmin } from '../useIsAdmin'

interface FirmTableToolbarProps {
  onOpenFilterPanel: () => void
}

/**
 * Arama kutusu YOK: "Firma Adı" araması kaldırıldı, bu adla yeni alan
 * eklenmez. "Filtrele" yalnız kriter alanını (grup firması) açar.
 */
export function FirmTableToolbar({ onOpenFilterPanel }: FirmTableToolbarProps) {
  // Sunucuda `POST /api/gasdistributionfirms` yalnız Admin'e açık; düğme o sınırı
  // GÖSTERİYOR, kendi başına bir denetim değil.
  const canCreateFirm = useIsAdmin()

  return (
    <div className={ADMIN_TOOLBAR_ROW}>
      <button
        type="button"
        onClick={onOpenFilterPanel}
        className={adminButtonVariants({ tone: 'secondary' })}
      >
        <Funnel aria-hidden className="size-4" />
        Filtrele
      </button>

      {canCreateFirm && (
        <Link
          to={GAS_FIRM_CREATE_PATH}
          aria-label="Yeni firma ekle"
          className={adminButtonVariants({ tone: 'primary' })}
        >
          <Plus aria-hidden className="size-4" />
          Yeni Firma Ekle
        </Link>
      )}
    </div>
  )
}
