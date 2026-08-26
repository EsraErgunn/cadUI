import type { InsuranceCompany } from '../../../api/policies'
import type { AppliedFilter } from '../FilterChips'
import type { PolicyFilters } from './usePolicyListParams'

/** Seçim kutusu kaynağı henüz gelmediyse etiket kimliği değil bunu gösterir:
    kullanıcıya iç kimlik sızmasın, etiket yine de kaldırılabilir kalsın. */
const PENDING_LOOKUP_LABEL = '…'

interface PolicyFilterChipsOptions {
  filters: PolicyFilters
  companies: InsuranceCompany[]
  onApply: (filters: PolicyFilters) => void
}

export function buildPolicyFilterChips({
  filters,
  companies,
  onApply,
}: PolicyFilterChipsOptions): AppliedFilter[] {
  const applied: AppliedFilter[] = []

  const companyId = filters.insuranceCompanyId
  if (companyId !== null) {
    applied.push({
      key: 'company',
      label: 'Sigorta Şirketi / Poliçe Firması',
      value: companies.find((company) => company.id === companyId)?.name ?? PENDING_LOOKUP_LABEL,
      onRemove: () => onApply({ ...filters, insuranceCompanyId: null }),
    })
  }

  return applied
}
