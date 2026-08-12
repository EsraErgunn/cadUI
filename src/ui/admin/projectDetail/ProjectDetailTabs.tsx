import { useRef, type KeyboardEvent } from 'react'

import { PROJECT_DETAIL_TABS, type ProjectDetailTabKey } from './tabItems'
import { adminTabVariants } from '../adminVariants'

const TABLIST_LABEL = 'Proje detayı bölümleri'

const LAST_INDEX = PROJECT_DETAIL_TABS.length - 1

/** Ok/Home/End tuşunun hedeflediği sekme; başka tuşta null (olay serbest kalır). */
function resolveTargetIndex(key: string, activeIndex: number): number | null {
  // İki uçta başa/sona sarar — WAI-ARIA sekme deseninin beklediği davranış.
  if (key === 'ArrowRight') return activeIndex === LAST_INDEX ? 0 : activeIndex + 1
  if (key === 'ArrowLeft') return activeIndex === 0 ? LAST_INDEX : activeIndex - 1
  if (key === 'Home') return 0
  if (key === 'End') return LAST_INDEX
  return null
}

interface ProjectDetailTabsProps {
  value: ProjectDetailTabKey
  onChange: (tab: ProjectDetailTabKey) => void
  /** Sekmelerin yönettiği bölgenin id'si. */
  panelId: string
}

/**
 * Sekme şeridi. Aktif sekme birincil renkte ALT ÇİZGİ ile vurgulanır —
 * belgedeki "yeşil alt çizgi" kuralının mavi paletteki karşılığı (K50).
 *
 * Sekmeler arasında yalnız aktif olan Tab sırasında durur (roving tabindex),
 * diğerlerine ok tuşlarıyla gidilir; odak sekmeye varınca seçim de değişir
 * (automatic activation) — liste ekranındaki `StatusTabs` ile aynı desen.
 */
export function ProjectDetailTabs({ value, onChange, panelId }: ProjectDetailTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const activeIndex = PROJECT_DETAIL_TABS.findIndex((tab) => tab.key === value)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const targetIndex = resolveTargetIndex(event.key, activeIndex)
    if (targetIndex === null) return

    // Ok tuşu şeridi yatay kaydırmasın; odağı biz taşıyoruz.
    event.preventDefault()
    onChange(PROJECT_DETAIL_TABS[targetIndex].key)
    tabRefs.current[targetIndex]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={TABLIST_LABEL}
      onKeyDown={handleKeyDown}
      className="flex gap-1 overflow-x-auto border-b border-edge"
    >
      {PROJECT_DETAIL_TABS.map((tab, index) => {
        const isActive = tab.key === value
        const Icon = tab.icon

        return (
          <button
            key={tab.key}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={isActive ? panelId : undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={adminTabVariants({ tone: isActive ? 'active' : 'plain' })}
          >
            <Icon aria-hidden className="size-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
