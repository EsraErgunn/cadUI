import type { AdminScope } from '../../api/adminDashboard'
import type { GasDistributionFirm, FirmGroup } from '../../api/adminFirms'

/** Gruba bağlı olmayan firmaların toplandığı başlık; seçilebilir bir satır değil. */
export const UNGROUPED_FIRMS_LABEL = 'Grubu olmayan firmalar'

export interface ScopeOptionGroup {
  /** `<optgroup>` etiketi. */
  label: string
  /** Grubun KENDİSİNİ seçen satır; grupsuz firmalar başlığında yok. */
  groupOption: { value: string; label: string } | null
  firmOptions: { value: string; label: string }[]
}

/**
 * Seçim kutusunun değeri kapsam TÜRÜNÜ de taşımak zorunda: aynı sayı hem grup
 * hem firma kimliği olabilir, çıplak kimlik hangisinin seçildiğini söylemez.
 */
const VALUE_SEPARATOR = ':'

export function toScopeValue(scope: AdminScope): string {
  if (scope.type === 'group') return `group${VALUE_SEPARATOR}${scope.groupId}`
  if (scope.type === 'firm') return `firm${VALUE_SEPARATOR}${scope.firmId}`

  return ''
}

/** Bozuk/eski değer sistem geneline düşer; kullanıcı boş bir kutuyla kalmaz. */
export function parseScopeValue(raw: string): AdminScope {
  const [type, rawId] = raw.split(VALUE_SEPARATOR)
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) return { type: 'global' }

  if (type === 'group') return { type: 'group', groupId: id }
  if (type === 'firm') return { type: 'firm', firmId: id }

  return { type: 'global' }
}

/** Grup satırı kendi adını taşır; altındaki firmalarla karışmasın diye sonuna
    kapsamın tamamını kastettiğini söyleyen bir ek geliyor. */
function toGroupOptionLabel(name: string): string {
  return `${name} (tümü)`
}

function compareByName(left: { name: string }, right: { name: string }): number {
  return left.name.localeCompare(right.name, 'tr')
}

/**
 * Üst bardaki kapsam seçicisinin hiyerarşik seçenekleri: her grubun altında o
 * gruba bağlı gaz dağıtım firmaları.
 *
 * Sıralama İSTEMCİDE ve Türkçe — hem gruplar hem her grubun firmaları kendi
 * içinde. Sunucu 'Ç'yi 'D'den sonra veriyor (`toSortedFirmGroups` ile aynı
 * gerekçe) ve firma ucunda `sort` parametresi yok.
 *
 * Grubu olmayan firmalar KAYBOLMAZ, sona ayrı bir başlık altında toplanır:
 * elenselerdi o firmaların kapsamı arayüzden hiç seçilemezdi.
 */
export function buildScopeOptionGroups(
  groups: FirmGroup[],
  firms: GasDistributionFirm[],
): ScopeOptionGroup[] {
  const sortedFirms = [...firms].sort(compareByName)

  const grouped = [...groups].sort(compareByName).map((group) => ({
    label: group.name,
    groupOption: {
      value: toScopeValue({ type: 'group', groupId: group.id }),
      label: toGroupOptionLabel(group.name),
    },
    firmOptions: sortedFirms
      .filter((firm) => firm.groupId === group.id)
      .map((firm) => ({
        value: toScopeValue({ type: 'firm', firmId: firm.id }),
        label: firm.name,
      })),
  }))

  const ungrouped = sortedFirms.filter((firm) => firm.groupId === null)
  if (ungrouped.length === 0) return grouped

  return [
    ...grouped,
    {
      label: UNGROUPED_FIRMS_LABEL,
      groupOption: null,
      firmOptions: ungrouped.map((firm) => ({
        value: toScopeValue({ type: 'firm', firmId: firm.id }),
        label: firm.name,
      })),
    },
  ]
}

/** Seçili kapsamın ADI (başlık ve kart altı metinleri için); yoksa null. */
export function findScopeName(
  scope: AdminScope,
  groups: FirmGroup[],
  firms: GasDistributionFirm[],
): string | null {
  if (scope.type === 'group') {
    return groups.find((group) => group.id === scope.groupId)?.name ?? null
  }
  if (scope.type === 'firm') {
    return firms.find((firm) => firm.id === scope.firmId)?.name ?? null
  }

  return null
}
