import type { AppliedFilter } from '../FilterChips'
import { ADMIN_PARAM_KEYS } from '../adminUrlParams'

interface ProjectFirmFilterChipsOptions {
  nameQuery: string
  onRemoveNameQuery: () => void
}

/**
 * Bugün tek çip var: arama. G.D. firması / bölge / yeterlilik süzgeçleri pasif
 * olduğu için uygulanmış bir kriteri de olamıyor; süzgeçler açılınca çipleri de
 * buraya eklenecek.
 */
export function buildProjectFirmFilterChips({
  nameQuery,
  onRemoveNameQuery,
}: ProjectFirmFilterChipsOptions): AppliedFilter[] {
  if (nameQuery === '') return []

  return [
    {
      key: ADMIN_PARAM_KEYS.nameQuery,
      label: 'Firma Adı',
      value: nameQuery,
      onRemove: onRemoveNameQuery,
    },
  ]
}
