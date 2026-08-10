import { Funnel, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useDebouncedSearchDraft } from './useDebouncedSearchDraft'
import { PROJECT_FIRM_CREATE_PATH } from '../adminNavItems'
import { adminButtonVariants, adminFieldVariants } from '../adminVariants'
import { useIsAdmin } from '../useIsAdmin'

interface ProjectFirmTableToolbarProps {
  nameQuery: string
  onApplyNameQuery: (value: string, shouldReplace?: boolean) => void
  onOpenFilterPanel: () => void
}

export function ProjectFirmTableToolbar({
  nameQuery,
  onApplyNameQuery,
  onOpenFilterPanel,
}: ProjectFirmTableToolbarProps) {
  const isAdmin = useIsAdmin()
  const { draft, setDraft } = useDebouncedSearchDraft(nameQuery, onApplyNameQuery)

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {/* Form YOK: arama yazarken uygulanıyor, gönderilecek bir şey kalmıyor.
          "Filtrele" de artık aramayı değil yalnız kriter alanını açıyor (4.3). */}
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
        />
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Firma adında ara"
          placeholder="Firma Adı"
          className={adminFieldVariants({ className: 'w-56 pl-9' })}
        />
      </div>

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
