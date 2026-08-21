import { useEffect, useRef } from 'react'

import { isTypingTarget } from '../core/domEvents'
import { redoActiveView, undoActiveView } from '../store/activeViewHistory'

export type EditorShortcutHandlers = {
  onSave: () => void
  onSaveAs: () => void
  onOpenFloorManagement: () => void
  onOpenFloorCopy: () => void
}

/**
 * Çizim ekranının klavye kısayolları TEK yerde: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
 * (geri al / yinele), Ctrl+S (kaydet), Ctrl+Shift+S (farklı kaydet) ve
 * Ctrl+K / Ctrl+Shift+K (kat pencereleri). Her
 * kısayol kendi dinleyicisini kursaydı ikisi de preventDefault çağırır ve
 * sıraları belirsiz olurdu.
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

      // KLAVYEDEN KAT DEĞİŞTİRME YOK (kullanıcı kararı, 2026-08): PageUp/PageDown
      // ve ok tuşları eskiden komşu kata geçiriyordu; ok tuşları artık boru
      // çiziminin (`plumbing/scene/useLineTool.ts`), kat ise yalnız kat
      // sekmelerinden / yüzen çubuktan değişir. Tuşun iki işe binmesi tam da
      // kaldırılan karışıklıktı.
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
        // Shift'li hâli ayrı bir eylem: etiket sorup YENİ bir sürüm kaydeder.
        if (event.shiftKey) handlersRef.current.onSaveAs()
        else handlersRef.current.onSave()
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
