import type { ValidationIssue } from '../../core/validate'
import { usePlumbingUiStore } from '../../plumbing/store/plumbingUiStore'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'

/**
 * Hata satırındaki "göster": kata geç, hatalı nesneyi seç, kamerayı oraya
 * taşı. Üçü birlikte gerekiyor — yanlış kattaki seçim hiç çizilmez, ekran
 * dışındaki seçim de görünmez.
 *
 * Karşı görünümün seçimi TEMİZLENİR: iki panel ayrı store'a abone ve geride
 * kalan seçim, kullanıcı görünüm değiştirdiğinde alakasız bir özellik paneli
 * açardı.
 */
export function focusValidationIssue(issue: ValidationIssue): void {
  const { focus } = issue
  if (!focus) return

  useUiStore.getState().setActiveView(focus.view)
  useCadStore.getState().setActiveFloor(issue.location.floorId)

  if (focus.view === 'architecture') {
    usePlumbingUiStore.getState().clearSelection()
    useArchitectureUiStore.getState().setSelection(focus.selection)
  } else {
    useArchitectureUiStore.getState().clearSelection()
    usePlumbingUiStore.getState().setSelectedElements(focus.elementIds)
    usePlumbingUiStore.getState().setSelectedLines(focus.lineIds)
  }

  useUiStore.getState().requestFocus(focus.bounds)
}
