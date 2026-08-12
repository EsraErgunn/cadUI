import { useRef, useState, type KeyboardEvent } from 'react'

import {
  PROJECT_DETAIL_TABS,
  type ProjectDetailTabKey,
  type TabStripKey,
} from './tabItems'
import { ComingSoonBadge } from '../ComingSoonBadge'
import { adminTabVariants } from '../adminVariants'

const TABLIST_LABEL = 'Proje detayı bölümleri'

const LAST_INDEX = PROJECT_DETAIL_TABS.length - 1

/** Ok/Home/End tuşunun hedeflediği sekme; başka tuşta null (olay serbest kalır). */
function resolveTargetIndex(key: string, currentIndex: number): number | null {
  // İki uçta başa/sona sarar — WAI-ARIA sekme deseninin beklediği davranış.
  if (key === 'ArrowRight') return currentIndex === LAST_INDEX ? 0 : currentIndex + 1
  if (key === 'ArrowLeft') return currentIndex === 0 ? LAST_INDEX : currentIndex - 1
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
 * Sekme şeridi. Aktif sekme birincil renkte ALT ÇİZGİ ile vurgulanır — belgedeki
 * "yeşil alt çizgi" kuralının mavi paletteki karşılığı (K50).
 *
 * "Katı Model" ve "Gaz Açma" `aria-disabled` ile pasif: `disabled` verilseydi
 * odaklanamaz ve klavye/ekran okuyucu kullanıcısına hiç görünmezlerdi — sol
 * menüde aynı sebeple pasif düğme kullanılmıyor. Ok tuşu onlara da uğrar,
 * yalnız seçim değişmez.
 */
export function ProjectDetailTabs({ value, onChange, panelId }: ProjectDetailTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [focusedKey, setFocusedKey] = useState<TabStripKey>(value)

  // Odak pasif bir sekmede kalabildiği için "hangi sekme Tab sırasında" sorusu
  // seçili sekmeden AYRI izleniyor; ikisi eşitlenseydi ok tuşu pasif sekmeye
  // uğradıktan sonra Tab sırası seçili sekmeye geri sıçrardı.
  const focusedIndex = PROJECT_DETAIL_TABS.findIndex((tab) => tab.key === focusedKey)
  const rovingIndex = focusedIndex === -1 ? PROJECT_DETAIL_TABS.findIndex((tab) => tab.key === value) : focusedIndex

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const targetIndex = resolveTargetIndex(event.key, rovingIndex)
    if (targetIndex === null) return

    // Ok tuşu şeridi yatay kaydırmasın; odağı biz taşıyoruz.
    event.preventDefault()

    const target = PROJECT_DETAIL_TABS[targetIndex]
    setFocusedKey(target.key)
    tabRefs.current[targetIndex]?.focus()

    if (target.isComingSoon !== true) onChange(target.key as ProjectDetailTabKey)
  }

  return (
    <div
      role="tablist"
      aria-label={TABLIST_LABEL}
      onKeyDown={handleKeyDown}
      className="flex gap-1 overflow-x-auto border-b border-edge"
    >
      {PROJECT_DETAIL_TABS.map((tab, index) => {
        const isComingSoon = tab.isComingSoon === true
        const isActive = !isComingSoon && tab.key === value
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
            aria-disabled={isComingSoon || undefined}
            aria-controls={isActive ? panelId : undefined}
            tabIndex={index === rovingIndex ? 0 : -1}
            onFocus={() => setFocusedKey(tab.key)}
            onClick={() => {
              if (isComingSoon) return
              onChange(tab.key as ProjectDetailTabKey)
            }}
            className={`${adminTabVariants({ tone: isActive ? 'active' : 'plain' })}${
              isComingSoon ? ' cursor-not-allowed text-ink-disabled' : ''
            }`}
          >
            <Icon aria-hidden className="size-4" />
            {tab.label}
            {isComingSoon && <ComingSoonBadge />}
          </button>
        )
      })}
    </div>
  )
}
