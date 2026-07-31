import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'

import { getFirmGroups, getRegions } from '../../../api/adminFirms'
import { ALL_REGIONS_LABEL } from '../adminUrlParams'
import { ADMIN_FOCUS_RING, adminFieldVariants } from '../adminVariants'

const OPTION_STALE_MS = 5 * 60 * 1000
const ANY_GROUP_LABEL = 'Tümü'

interface FirmFilterPanelProps {
  groupName: string | null
  region: string | null
  onGroupNameChange: (value: string | null) => void
  onRegionChange: (value: string | null) => void
  onClose: () => void
}

interface FilterSelectProps {
  id: string
  label: string
  emptyLabel: string
  value: string | null
  options: string[]
  onChange: (value: string | null) => void
}

function FilterSelect({ id, label, emptyLabel, value, options, onChange }: FilterSelectProps) {
  return (
    <div className="flex min-w-56 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        className={adminFieldVariants({ className: 'pr-8' })}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

export function FirmFilterPanel({
  groupName,
  region,
  onGroupNameChange,
  onRegionChange,
  onClose,
}: FirmFilterPanelProps) {
  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
    staleTime: OPTION_STALE_MS,
  })
  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: ({ signal }) => getRegions(signal),
    staleTime: OPTION_STALE_MS,
  })

  return (
    <section
      aria-label="Ek filtre kriterleri"
      className="flex flex-wrap items-end gap-4 rounded-xl border border-edge bg-surface p-4"
    >
      <FilterSelect
        id="firm-filter-group"
        label="Grup Firması"
        emptyLabel={ANY_GROUP_LABEL}
        value={groupName}
        options={groups ?? []}
        onChange={onGroupNameChange}
      />
      <FilterSelect
        id="firm-filter-region"
        label="Bölge"
        emptyLabel={ALL_REGIONS_LABEL}
        value={region}
        options={regions ?? []}
        onChange={onRegionChange}
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Filtre alanını kapat"
        className={`ml-auto inline-flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken ${ADMIN_FOCUS_RING}`}
      >
        <X aria-hidden className="size-4" />
      </button>
    </section>
  )
}
