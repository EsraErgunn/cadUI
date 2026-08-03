import { X } from 'lucide-react'

import { filterChipVariants } from './adminVariants'

export interface AppliedFilter {
  key: string
  label: string
  value: string
  onRemove: () => void
}

interface FilterChipsProps {
  filters: AppliedFilter[]
}

/**
 * Uygulanan filtrelerin görünür listesi; her etiket tek tek kaldırılabilir.
 * Hangi kriterin etiketleneceğini ÇAĞIRAN ekran bilir (`buildFirmFilterChips`,
 * `buildProjectFilterChips`) — bu bileşen yalnız çizer.
 */
export function FilterChips({ filters }: FilterChipsProps) {
  if (filters.length === 0) return null

  return (
    <ul aria-label="Uygulanan filtreler" className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <li key={filter.key} className={filterChipVariants()}>
          <span className="text-ink-muted">{filter.label}:</span>
          <span className="font-medium">{filter.value}</span>
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`${filter.label} filtresini kaldır`}
            className="inline-flex size-5 items-center justify-center rounded-full text-ink-muted hover:bg-edge focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            <X aria-hidden className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  )
}
