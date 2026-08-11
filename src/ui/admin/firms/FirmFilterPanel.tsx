import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'

import { getFirmGroups, type FirmGroup } from '../../../api/adminFirms'
import { FilterSelect, type FilterSelectOption } from '../FilterSelect'
import { ADMIN_FOCUS_RING } from '../adminVariants'

const OPTION_STALE_MS = 5 * 60 * 1000
const ANY_GROUP_LABEL = 'Tümü'

interface FirmFilterPanelProps {
  groupId: number | null
  onGroupIdChange: (value: number | null) => void
  onClose: () => void
}

/** Grup DEĞERİ kimlik, etiketi ad: gerçek liste verisi de kimlik taşıyor. */
function toGroupOptions(groups: FirmGroup[] | undefined): FilterSelectOption[] {
  return (groups ?? []).map((group) => ({ value: String(group.id), label: group.name }))
}

export function FirmFilterPanel({ groupId, onGroupIdChange, onClose }: FirmFilterPanelProps) {
  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
    staleTime: OPTION_STALE_MS,
  })
  return (
    <section
      aria-label="Ek filtre kriterleri"
      className="flex flex-wrap items-start gap-4 rounded-xl border border-edge bg-surface p-4"
    >
      <FilterSelect
        id="firm-filter-group"
        label="Grup Firması"
        emptyLabel={ANY_GROUP_LABEL}
        value={groupId === null ? null : String(groupId)}
        options={toGroupOptions(groups)}
        onChange={(value) => onGroupIdChange(value === null ? null : Number(value))}
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
