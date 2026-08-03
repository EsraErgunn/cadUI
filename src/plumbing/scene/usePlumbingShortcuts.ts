import { useEffect } from 'react'

import { useCadStore } from '../../store/cadStore'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Ctrl+Z geri alır, Ctrl+Shift+Z / Ctrl+Y yineler. Dinleyici yalnız tesisat
 * katmanı mount'luyken kurulur — mimari görünümde tuş yakalanmaz.
 */
export function usePlumbingShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      if (isTypingTarget(event.target)) return

      const key = event.key.toLowerCase()
      const isUndo = key === 'z' && !event.shiftKey
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey)
      if (!isUndo && !isRedo) return

      // Tarayıcının kendi geri alması devreye girmesin.
      event.preventDefault()
      const store = useCadStore.getState()
      if (isUndo) {
        store.undoPlumbing()
        return
      }
      store.redoPlumbing()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
