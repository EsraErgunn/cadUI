import { useRef, type KeyboardEvent } from 'react'

import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from '../../../api/projects'
import { adminBadgeVariants, adminTabVariants } from '../adminVariants'

const TABLIST_LABEL = 'Proje durumu'

/** Ok/Home/End tuşunun hedeflediği sekme; başka tuşta null (olay serbest kalır). */
function resolveTargetIndex(key: string, activeIndex: number): number | null {
  const lastIndex = PROJECT_STATUSES.length - 1

  // İki uçta başa/sona sarar — WAI-ARIA tab deseninin beklediği davranış.
  if (key === 'ArrowRight') return activeIndex === lastIndex ? 0 : activeIndex + 1
  if (key === 'ArrowLeft') return activeIndex === 0 ? lastIndex : activeIndex - 1
  if (key === 'Home') return 0
  if (key === 'End') return lastIndex
  return null
}

interface StatusTabsProps {
  value: ProjectStatus
  /** `undefined` = adetler henüz gelmedi; rozet yerine iskelet gösterilir. */
  counts?: Record<ProjectStatus, number>
  onChange: (status: ProjectStatus) => void
  /** Sekmelerin yönettiği bölgenin id'si (liste tablosu). */
  panelId?: string
}

/**
 * Durum sekmeleri. Sekmeler arasında yalnız aktif olan Tab sırasında durur
 * (roving tabindex), diğerlerine ok tuşlarıyla gidilir; odak sekmeye varınca
 * seçim de değişir (automatic activation) — liste zaten tek istekle tazeleniyor.
 */
export function StatusTabs({ value, counts, onChange, panelId }: StatusTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const activeIndex = PROJECT_STATUSES.indexOf(value)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const targetIndex = resolveTargetIndex(event.key, activeIndex)
    if (targetIndex === null) return

    // Ok tuşu sekme şeridini yatay kaydırmasın, odağı biz taşıyoruz.
    event.preventDefault()
    onChange(PROJECT_STATUSES[targetIndex])
    tabRefs.current[targetIndex]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={TABLIST_LABEL}
      onKeyDown={handleKeyDown}
      className="flex gap-1 overflow-x-auto border-b border-edge"
    >
      {PROJECT_STATUSES.map((status, index) => {
        const isActive = status === value
        const count = counts?.[status]

        return (
          <button
            key={status}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(status)}
            className={adminTabVariants({ tone: isActive ? 'active' : 'plain' })}
          >
            {PROJECT_STATUS_LABELS[status]}

            {count === undefined ? (
              <span
                aria-hidden
                className="inline-block h-4 w-6 rounded-full bg-surface-sunken motion-safe:animate-pulse"
              />
            ) : (
              <span className={adminBadgeVariants({ tone: isActive ? 'active' : 'plain' })}>
                {count}
                <span className="sr-only"> kayıt</span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
