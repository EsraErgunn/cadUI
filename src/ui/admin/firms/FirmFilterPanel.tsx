import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'

import { getFirmGroups, getRegions } from '../../../api/adminFirms'
import { FilterSelect, type FilterSelectOption } from '../FilterSelect'
import { ALL_REGIONS_LABEL } from '../adminUrlParams'
import { ADMIN_FOCUS_RING } from '../adminVariants'

const OPTION_STALE_MS = 5 * 60 * 1000
const ANY_GROUP_LABEL = 'Tümü'

interface FirmFilterPanelProps {
  groupName: string | null
  region: string | null
  onGroupNameChange: (value: string | null) => void
  onRegionChange: (value: string | null) => void
  onClose: () => void
}

/** Firma listesinde grup ve bölge adı hem değer hem etiket olarak kullanılır. */
function toNameOptions(names: string[] | undefined): FilterSelectOption[] {
  return (names ?? []).map((name) => ({ value: name, label: name }))
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
        options={toNameOptions(groups)}
        onChange={onGroupNameChange}
      />
      <FilterSelect
        id="firm-filter-region"
        label="Bölge"
        emptyLabel={ALL_REGIONS_LABEL}
        value={region}
        options={toNameOptions(regions)}
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
