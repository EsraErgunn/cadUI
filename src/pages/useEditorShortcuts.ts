import { useEffect, useRef } from 'react'

import { isTypingTarget } from '../core/domEvents'
import { redoProject, undoProject, useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

export type EditorShortcutHandlers = {
  onSave: () => void
}

/**
 * Geri al/yinele AKTİF GÖRÜNÜMÜN geçmişine gider: tesisat görünümünde tesisat
 * aynası (plumbingHistory), mimaride proje geçmişi. Katmanlar kendi kısayolunu
 * ayrı bir window dinleyicisiyle bağlasaydı tesisat görünümünde tek Ctrl+Z iki
 * dinleyiciye birden düşer, iki geçmişi aynı anda geri alırdı.
 * İzometrikte düzenleme yok; proje geçmişi varsayılan olarak kalır.
 */
function undoActiveView(): void {
  if (useUiStore.getState().activeViewId === 'installation') {
    useCadStore.getState().undoPlumbing()
    return
  }
  undoProject()
}

function redoActiveView(): void {
  if (useUiStore.getState().activeViewId === 'installation') {
    useCadStore.getState().redoPlumbing()
    return
  }
  redoProject()
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
