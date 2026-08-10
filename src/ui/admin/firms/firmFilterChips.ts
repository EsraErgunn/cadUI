import type { AppliedFilter } from '../FilterChips'

interface FirmFilterChipsOptions {
  nameQuery: string
  /**
   * Seçili grubun ADI. Süzgeç kimlikle çalışıyor ama etikette kimlik
   * gösterilemez; ad henüz yüklenmediyse `null` gelir ve çip basılmaz.
   */
  groupLabel: string | null
  onRemoveNameQuery: () => void
  onRemoveGroupId: () => void
}

/**
 * Bölge çipi YOK: süzgeç bu turda devre dışı (sunucu bölge taşımıyor), uygulanan
 * bir bölge kriteri de olamıyor. Süzgeç geri açılınca çipi de geri gelecek.
 */
export function buildFirmFilterChips({
  nameQuery,
  groupLabel,
  onRemoveNameQuery,
  onRemoveGroupId,
}: FirmFilterChipsOptions): AppliedFilter[] {
  const applied: AppliedFilter[] = []

  if (nameQuery !== '') {
    applied.push({ key: 'q', label: 'Firma Adı', value: nameQuery, onRemove: onRemoveNameQuery })
  }
  if (groupLabel !== null) {
    applied.push({ key: 'group', label: 'Grup', value: groupLabel, onRemove: onRemoveGroupId })
  }

  return applied
}
