import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'

import { getFirmGroups, getRegions, type FirmGroup } from '../../../api/adminFirms'
import { FilterSelect, type FilterSelectOption } from '../FilterSelect'
import { ALL_REGIONS_LABEL } from '../adminUrlParams'
import { ADMIN_FOCUS_RING } from '../adminVariants'

const OPTION_STALE_MS = 5 * 60 * 1000
const ANY_GROUP_LABEL = 'Tümü'

/** Bölge süzgeci neden pasif — kullanıcı eksik sanmasın. */
const REGION_DISABLED_HINT = 'Bölge bilgisi sunucudan gelene kadar bu filtre kullanılamıyor.'

interface FirmFilterPanelProps {
  groupId: number | null
  region: string | null
  onGroupIdChange: (value: number | null) => void
  onRegionChange: (value: string | null) => void
  onClose: () => void
}

/** Bölge adı hem değer hem etiket olarak kullanılır. */
function toNameOptions(names: string[] | undefined): FilterSelectOption[] {
  return (names ?? []).map((name) => ({ value: name, label: name }))
}

/** Grup DEĞERİ kimlik, etiketi ad: gerçek liste verisi de kimlik taşıyor. */
function toGroupOptions(groups: FirmGroup[] | undefined): FilterSelectOption[] {
  return (groups ?? []).map((group) => ({ value: String(group.id), label: group.name }))
}

export function FirmFilterPanel({
  groupId,
  region,
  onGroupIdChange,
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
      {/* Bölge süzgeci SİLİNMEDİ, devre dışı: sunucu liste satırında bölge
          taşımıyor. Backend "bugün geçerli bölge yetkileri" alanını ekleyince
          `isDisabled` kaldırılıp süzgeç geri açılacak (docs/kararlar.md K27). */}
      <FilterSelect
        id="firm-filter-region"
        label="Bölge"
        emptyLabel={ALL_REGIONS_LABEL}
        value={region}
        options={toNameOptions(regions)}
        isDisabled
        hint={REGION_DISABLED_HINT}
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
