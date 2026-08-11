import {
  AUTHORITY_TYPE_LABELS,
  type ProjectFirmUserQuery,
} from '../../../api/projectFirmUserDto'
import type { AppliedFilter } from '../FilterChips'
import { ADMIN_PARAM_KEYS } from '../adminUrlParams'

interface ProjectFirmUserFilterChipsOptions {
  query: ProjectFirmUserQuery
  /** Çip kaldırılınca kriter adresten düşer; taslak kutular da onunla senkronlanır. */
  onRemove: (patch: Partial<ProjectFirmUserQuery>) => void
}

/**
 * Uygulanan kriterlerin görünür listesi. Kriterler "Filtrele" ile uygulandığı
 * için çipler ne yazıldığını değil NEYİN YÜRÜRLÜKTE olduğunu gösterir —
 * kullanıcı kutuları doldurup uygulamayı unuttuğunda fark ikisi arasında görünür.
 */
export function buildProjectFirmUserFilterChips({
  query,
  onRemove,
}: ProjectFirmUserFilterChipsOptions): AppliedFilter[] {
  const chips: AppliedFilter[] = []

  if (query.authorityType !== null) {
    chips.push({
      key: ADMIN_PARAM_KEYS.authorityType,
      label: 'Yetki',
      value: AUTHORITY_TYPE_LABELS[query.authorityType],
      onRemove: () => onRemove({ authorityType: null }),
    })
  }

  if (query.onlyActive) {
    chips.push({
      key: ADMIN_PARAM_KEYS.onlyActive,
      label: 'Durum',
      value: 'Yalnız aktif',
      onRemove: () => onRemove({ onlyActive: false }),
    })
  }

  if (query.nameQuery !== '') {
    chips.push({
      key: ADMIN_PARAM_KEYS.nameQuery,
      label: 'Kullanıcı Adı',
      value: query.nameQuery,
      onRemove: () => onRemove({ nameQuery: '' }),
    })
  }

  return chips
}
