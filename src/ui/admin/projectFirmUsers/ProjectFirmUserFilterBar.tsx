import { Search, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { ProjectFirmUserFilters } from './useProjectFirmUserListParams'
import {
  AUTHORITY_TYPES,
  AUTHORITY_TYPE_LABELS,
  parseAuthorityType,
} from '../../../api/projectFirmUserDto'
import { PROJECT_FIRM_USER_CREATE_PATH } from '../adminNavItems'
import {
  ADMIN_TOOLBAR_FORM,
  ADMIN_TOOLBAR_ROW,
  ADMIN_TOOLBAR_SEARCH_FIELD,
  ADMIN_TOOLBAR_SEARCH_WRAPPER,
} from '../adminToolbarLayout'
import { adminButtonVariants, adminFieldVariants } from '../adminVariants'
import { useIsAdmin } from '../useIsAdmin'

const AUTHORITY_FIELD_ID = 'project-firm-user-authority'
const SEARCH_FIELD_ID = 'project-firm-user-search'

/** Seçim yapılmamış hâl: "Tümü" (KK-2). Boş dize `<option>` değeri, null'ın DOM karşılığı yok. */
const ALL_AUTHORITIES_VALUE = ''

interface ProjectFirmUserFilterBarProps {
  /** Adrese YAZILMIŞ kriterler; taslağın başlangıcı ve senkron kaynağı. */
  filters: ProjectFirmUserFilters
  onApply: (filters: ProjectFirmUserFilters) => void
}

function areFiltersEqual(left: ProjectFirmUserFilters, right: ProjectFirmUserFilters): boolean {
  return left.nameQuery === right.nameQuery && left.authorityType === right.authorityType
}

/**
 * Kriterler burada TASLAK olarak durur; "Filtrele" ya da arama alanında Enter
 * hepsini birlikte uygular (KK-3/5/6). Sarmalayıcı `form`: Enter'ın gönderimi
 * tarayıcının kendi davranışı, ayrı bir tuş dinleyicisi yazmaya gerek yok.
 */
export function ProjectFirmUserFilterBar({ filters, onApply }: ProjectFirmUserFilterBarProps) {
  const isAdmin = useIsAdmin()
  const [draft, setDraft] = useState(filters)
  const [appliedFilters, setAppliedFilters] = useState(filters)

  // Adres dışarıdan değişince (geri/ileri, paylaşılan bağlantı, çip kaldırma)
  // taslak yeniden kurulur; yoksa kutularda uygulanmamış eski değerler kalırdı.
  // Efekt DEĞİL, render sırasında düzeltme: fazladan bir boyama turu olmuyor.
  if (!areFiltersEqual(filters, appliedFilters)) {
    setAppliedFilters(filters)
    setDraft(filters)
  }

  /**
   * Seçim yapılır yapılmaz uygulanır ("Filtrele" düğmesi KALKTI). Arama kutusu
   * KONTROLLÜ olduğu için her harfte istek atmamak adına Enter'da uygulanıyor;
   * debounce EKLENMEDİ.
   */
  const applyNow = (changed: Partial<ProjectFirmUserFilters>) => {
    const next = { ...draft, ...changed }
    setDraft(next)
    onApply(next)
  }

  return (
    <div className={ADMIN_TOOLBAR_ROW}>
      <div className={ADMIN_TOOLBAR_FORM}>
        <select
          id={AUTHORITY_FIELD_ID}
          value={draft.authorityType ?? ALL_AUTHORITIES_VALUE}
          onChange={(event) => applyNow({ authorityType: parseAuthorityType(event.target.value) })}
          aria-label="Yetki"
          className={adminFieldVariants({ className: 'w-full min-w-0 pr-8 sm:w-44' })}
        >
          <option value={ALL_AUTHORITIES_VALUE}>Tümü</option>
          {AUTHORITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {AUTHORITY_TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        <div className={ADMIN_TOOLBAR_SEARCH_WRAPPER}>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
          />
          <input
            id={SEARCH_FIELD_ID}
            type="search"
            value={draft.nameQuery}
            onChange={(event) =>
              setDraft((current) => ({ ...current, nameQuery: event.target.value }))
            }
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              onApply(draft)
            }}
            aria-label="Kullanıcı adı, ad soyad veya e-postada ara"
            placeholder="Kullanıcı Adı"
            className={adminFieldVariants({ className: ADMIN_TOOLBAR_SEARCH_FIELD })}
          />
        </div>
      </div>

      {isAdmin && (
        <Link
          to={PROJECT_FIRM_USER_CREATE_PATH}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          <UserPlus aria-hidden className="size-4" />
          Yeni Kullanıcı
        </Link>
      )}
    </div>
  )
}
