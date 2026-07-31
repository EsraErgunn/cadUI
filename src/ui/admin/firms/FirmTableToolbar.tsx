import { Funnel, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GAS_FIRM_CREATE_PATH } from '../adminNavItems'
import { adminButtonVariants, adminFieldVariants } from '../adminVariants'
import { usePermission } from '../usePermission'

const NAME_QUERY_FIELD = 'firmName'

interface FirmTableToolbarProps {
  nameQuery: string
  onApplyNameQuery: (value: string) => void
  onOpenFilterPanel: () => void
}

export function FirmTableToolbar({
  nameQuery,
  onApplyNameQuery,
  onOpenFilterPanel,
}: FirmTableToolbarProps) {
  const canCreateFirm = usePermission('firm.create')

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {/* Enter ile "Filtrele" aynı işi yapsın diye ikisi de formun submit'i.
          key={nameQuery}: URL dışarıdan değişince (geri tuşu, etiket kaldırma)
          kutu yeni değerle yeniden kurulur — kopya state tutmaya gerek kalmaz. */}
      <form
        key={nameQuery}
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get(NAME_QUERY_FIELD)
          onApplyNameQuery(typeof value === 'string' ? value.trim() : '')
          onOpenFilterPanel()
        }}
      >
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
          />
          <input
            type="search"
            name={NAME_QUERY_FIELD}
            defaultValue={nameQuery}
            aria-label="Firma adında ara"
            placeholder="Firma Adı"
            className={adminFieldVariants({ className: 'w-56 pl-9' })}
          />
        </div>

        <button
          type="submit"
          aria-label="Filtrele"
          className={adminButtonVariants({ tone: 'secondary' })}
        >
          <Funnel aria-hidden className="size-4" />
          Filtrele
        </button>
      </form>

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
