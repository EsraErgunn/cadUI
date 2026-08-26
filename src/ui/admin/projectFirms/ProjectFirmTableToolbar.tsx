import { Funnel, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PROJECT_FIRM_CREATE_PATH } from '../adminNavItems'
import { ADMIN_TOOLBAR_ROW } from '../adminToolbarLayout'
import { adminButtonVariants } from '../adminVariants'
import { useIsAdmin } from '../useIsAdmin'

interface ProjectFirmTableToolbarProps {
  onOpenFilterPanel: () => void
}

/**
 * Arama kutusu YOK: "Firma Ara" kaldırıldı, bu adla yeni alan eklenmez.
 * "Filtrele" yalnız kriter alanını açar (4.3).
 */
export function ProjectFirmTableToolbar({
  onOpenFilterPanel,
}: ProjectFirmTableToolbarProps) {
  const isAdmin = useIsAdmin()

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

      {isAdmin && (
        <Link
          to={PROJECT_FIRM_CREATE_PATH}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          <Plus aria-hidden className="size-4" />
          Yeni Proje Firması
        </Link>
      )}
    </div>
  )
}
