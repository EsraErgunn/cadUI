import { Funnel, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GAS_FIRM_CREATE_PATH } from '../adminNavItems'
import {
  ADMIN_TOOLBAR_FORM,
  ADMIN_TOOLBAR_ROW,
  ADMIN_TOOLBAR_SEARCH_FIELD,
  ADMIN_TOOLBAR_SEARCH_WRAPPER,
} from '../adminToolbarLayout'
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
    <div className={ADMIN_TOOLBAR_ROW}>
      {/* Manuel "uygula" adımı KALKTI: arama Enter'da uygulanıyor, "Filtrele"
          artık yalnız kriter alanını açıyor (proje firmaları çubuğuyla aynı
          davranış). key={nameQuery}: URL dışarıdan değişince (geri tuşu, etiket
          kaldırma) kutu yeni değerle yeniden kurulur — kopya state gerekmez. */}
      <div key={nameQuery} className={ADMIN_TOOLBAR_FORM}>
        <div className={ADMIN_TOOLBAR_SEARCH_WRAPPER}>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
          />
          <input
            type="search"
            name={NAME_QUERY_FIELD}
            defaultValue={nameQuery}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              onApplyNameQuery(event.currentTarget.value.trim())
            }}
            aria-label="Firma adında ara"
            placeholder="Firma Adı"
            className={adminFieldVariants({ className: ADMIN_TOOLBAR_SEARCH_FIELD })}
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
      </div>

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
