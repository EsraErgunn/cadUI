import { useEffect, useRef } from 'react'

import { isTypingTarget } from '../core/domEvents'
import { redoProject, undoProject } from '../store/cadStore'

export type EditorShortcutHandlers = {
  onSave: () => void
}

/**
 * Çizim ekranının klavye kısayolları TEK yerde: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
 * (geri al / yinele) ve Ctrl+S (kaydet). Her kısayol kendi dinleyicisini
 * kursaydı ikisi de preventDefault çağırır ve sıraları belirsiz olurdu.
 *
 * Dinleyici window'da: kısayolun çalışması için odağın tuvalde olması gerekmiyor.
 */
export function useEditorShortcuts({ onSave }: EditorShortcutHandlers): void {
  // Handler ref'ten okunuyor: effect'in bağımlılığı olsaydı, çağıran her
  // render'da yeni bir fonksiyon verdiğinde dinleyici sökülüp yeniden kurulurdu.
  const onSaveRef = useRef(onSave)
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Metin kutusunda Ctrl+Z yazıyı geri almalı, çizimi değil.
      if (isTypingTarget(event.target)) return
      if (!event.ctrlKey && !event.metaKey) return

      const key = event.key.toLowerCase()
      if (key !== 'z' && key !== 'y' && key !== 's') return

      // Tarayıcının kendi geri alma / sayfayı kaydetme davranışı devreye girmesin.
      event.preventDefault()

      if (key === 's') {
        onSaveRef.current()
        return
      }

      const isRedo = key === 'y' || event.shiftKey
      if (isRedo) redoProject()
      else undoProject()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
