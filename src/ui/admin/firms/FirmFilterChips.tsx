import { X } from 'lucide-react'

import { filterChipVariants } from '../adminVariants'

interface AppliedFilter {
  key: string
  label: string
  value: string
  onRemove: () => void
}

interface FirmFilterChipsProps {
  nameQuery: string
  groupName: string | null
  region: string | null
  onRemoveNameQuery: () => void
  onRemoveGroupName: () => void
  onRemoveRegion: () => void
}

export function FirmFilterChips({
  nameQuery,
  groupName,
  region,
  onRemoveNameQuery,
  onRemoveGroupName,
  onRemoveRegion,
}: FirmFilterChipsProps) {
  const applied: AppliedFilter[] = []
  if (nameQuery !== '') {
    applied.push({ key: 'q', label: 'Firma Adı', value: nameQuery, onRemove: onRemoveNameQuery })
  }
  if (groupName !== null) {
    applied.push({ key: 'group', label: 'Grup', value: groupName, onRemove: onRemoveGroupName })
  }
  if (region !== null) {
    applied.push({ key: 'region', label: 'Bölge', value: region, onRemove: onRemoveRegion })
  }

  if (applied.length === 0) return null

  return (
    <ul aria-label="Uygulanan filtreler" className="flex flex-wrap items-center gap-2">
      {applied.map((filter) => (
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
