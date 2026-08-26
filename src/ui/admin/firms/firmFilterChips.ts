import type { AppliedFilter } from '../FilterChips'

interface FirmFilterChipsOptions {
  /**
   * Seçili grubun ADI. Süzgeç kimlikle çalışıyor ama etikette kimlik
   * gösterilemez; ad henüz yüklenmediyse `null` gelir ve çip basılmaz.
   */
  groupLabel: string | null
  onRemoveGroupId: () => void
}

/**
 * Bölge çipi YOK: süzgeç bu turda devre dışı (sunucu bölge taşımıyor), uygulanan
 * bir bölge kriteri de olamıyor. Süzgeç geri açılınca çipi de geri gelecek.
 */
export function buildFirmFilterChips({
  groupLabel,
  onRemoveGroupId,
}: FirmFilterChipsOptions): AppliedFilter[] {
  const applied: AppliedFilter[] = []

  if (groupLabel !== null) {
    applied.push({ key: 'group', label: 'Grup', value: groupLabel, onRemove: onRemoveGroupId })
  }

  return applied
}
