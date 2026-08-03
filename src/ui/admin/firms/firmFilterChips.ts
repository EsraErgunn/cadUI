import type { AppliedFilter } from '../FilterChips'

interface FirmFilterChipsOptions {
  nameQuery: string
  groupName: string | null
  region: string | null
  onRemoveNameQuery: () => void
  onRemoveGroupName: () => void
  onRemoveRegion: () => void
}

export function buildFirmFilterChips({
  nameQuery,
  groupName,
  region,
  onRemoveNameQuery,
  onRemoveGroupName,
  onRemoveRegion,
}: FirmFilterChipsOptions): AppliedFilter[] {
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

  return applied
}
