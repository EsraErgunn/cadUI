import { useEffect } from 'react'

import { isTypingTarget } from '../core/domEvents'
import { redoProject, undoProject } from '../store/cadStore'

/**
 * Geri Al / Yinele klavye kısayolları (şartname: "klavye kısayollarıyla da
 * kullanılabilecektir").
 *
 * Ctrl+Z / Ctrl+Shift+Z, Ctrl+Y — macOS'ta Cmd ile. Dinleyici window'da:
 * kısayolun çalışması için odağın tuvalde olması gerekmiyor.
 */
export function useHistoryShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Metin kutusunda Ctrl+Z yazıyı geri almalı, çizimi değil.
      if (isTypingTarget(event.target)) return
      if (!event.ctrlKey && !event.metaKey) return

      const key = event.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return

      // Tarayıcının kendi geri alma davranışı devreye girmesin.
      event.preventDefault()

      const isRedo = key === 'y' || event.shiftKey
      if (isRedo) redoProject()
      else undoProject()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
