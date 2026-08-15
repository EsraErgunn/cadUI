import { useEffect, useRef } from 'react'

import { isTypingTarget } from '../core/domEvents'
import type { FloorDirection } from '../core/floors'
import { redoActiveView, undoActiveView } from '../store/activeViewHistory'

export type EditorShortcutHandlers = {
  onSave: () => void
  onOpenFloorManagement: () => void
  onOpenFloorCopy: () => void
  onGoToFloor: (direction: FloorDirection) => void
}

/**
 * Çizim ekranının klavye kısayolları TEK yerde: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
 * (geri al / yinele) ve Ctrl+S (kaydet). Her kısayol kendi dinleyicisini
 * kursaydı ikisi de preventDefault çağırır ve sıraları belirsiz olurdu.
 *
 * Dinleyici window'da: kısayolun çalışması için odağın tuvalde olması gerekmiyor.
 */
export function useEditorShortcuts(handlers: EditorShortcutHandlers): void {
  // Handler'lar ref'ten okunuyor: effect'in bağımlılığı olsaydı, çağıran her
  // render'da yeni fonksiyon verdiğinde dinleyici sökülüp yeniden kurulurdu.
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Metin kutusunda Ctrl+Z yazıyı geri almalı, çizimi değil.
      if (isTypingTarget(event.target)) return

      // Kat geçişi değiştirici tuş İSTEMEZ; bu yüzden Ctrl kontrolünden önce.
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault()
        handlersRef.current.onGoToFloor(event.key === 'PageUp' ? 'up' : 'down')
        return
      }

      if (!event.ctrlKey && !event.metaKey) return

      const key = event.key.toLowerCase()

      if (key === 'k') {
        // Ctrl+K tarayıcıda adres çubuğuna odaklanıyor; alınmazsa pencere açılmaz.
        event.preventDefault()
        if (event.shiftKey) handlersRef.current.onOpenFloorCopy()
        else handlersRef.current.onOpenFloorManagement()
        return
      }

      if (key !== 'z' && key !== 'y' && key !== 's') return

      // Tarayıcının kendi geri alma / sayfayı kaydetme davranışı devreye girmesin.
      event.preventDefault()

      if (key === 's') {
        handlersRef.current.onSave()
        return
      }

      // Aktif görünüm her tuşta yeniden okunuyor: abone olunsaydı görünüm
      // değişimi bu effect'i (ve dinleyiciyi) gereksizce yeniden kurardı.
      const isRedo = key === 'y' || event.shiftKey
      if (isRedo) redoActiveView()
      else undoActiveView()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
