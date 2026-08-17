import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'

import { HANDLE_ELEVATION_CM } from './layers'
import { planToThree } from '../core/coords'
import type { TextLabel } from '../core/model'
import { isBlankText } from '../core/textLabel'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/**
 * Metin düzenleme kutusu. `RoomNameEditor` ile AYNI desen ve aynı tuzaklar —
 * gerekçelerin tamamı orada yazılı, burada tekrarlanmıyor:
 *
 * - drei `<Html>`: kutu gerçek bir DOM input'u ama konumunu kameradan alıyor.
 * - Kaydetme/kapanma NATIVE dinleyicide: drei `<Html>` ayrı bir react-dom
 *   kökünde çiziyor, o kökten yapılan store yazımı R3F ağacını yeniden
 *   çizdirmiyor ve kutu ekranda asılı kalıyordu.
 * - Taslak yerel state'te: her tuşta store'a yazsaydı her harf ayrı bir
 *   Ctrl+Z adımı olurdu.
 */
export function TextLabelEditor({ text }: { text: TextLabel }) {
  const [draft, setDraft] = useState(text.text)
  // Native dinleyici kapanışta taslağın SON hâlini okumalı.
  const draftRef = useRef(text.text)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const close = (shouldCommit: boolean) => {
      if (shouldCommit) {
        // Kutuyu boşaltıp onaylamak SİLMEK demektir (K81 eki): yazısı olmayan
        // bir not, kullanıcının orada bir şey istemediğinin en açık ifadesi —
        // eski yazıyı geri getirmek onu şaşırtırdı. Yanlışlıkla konan metnin
        // çıkış kapısı da bu; silme `deleteSelection`dan geçiyor ki jest tek
        // Ctrl+Z adımı olsun.
        if (isBlankText(draftRef.current)) {
          useCadStore.getState().deleteSelection([{ kind: 'text', id: text.id }])
          useArchitectureUiStore.getState().clearSelection()
        } else {
          useCadStore.getState().setTextLabelText(text.id, draftRef.current)
        }
      }
      useArchitectureUiStore.getState().setEditingText(null)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') close(true)
      // Esc taslağı ATAR: store'a hiç yazılmadığı için eski yazı kendiliğinden kalır.
      if (event.key === 'Escape') close(false)
    }

    // Yakalama fazı: tuvalin kendi pointerdown'ından ÖNCE çalışsın ki kutu
    // kapanmadan taslak kaydedilsin.
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && inputRef.current?.contains(event.target)) return
      close(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [text.id])

  return (
    <Html position={planToThree(text, HANDLE_ELEVATION_CM)} center zIndexRange={[100, 0]}>
      <input
        ref={inputRef}
        autoFocus
        onFocus={(event) => event.target.select()}
        className="w-48 rounded-lg border border-canvas-overlay-edge bg-canvas-overlay px-3 py-1.5 text-center text-sm text-canvas-overlay-ink shadow-sm outline-none focus:border-selection"
        value={draft}
        aria-label="Metin"
        onChange={(event) => {
          draftRef.current = event.target.value
          setDraft(event.target.value)
        }}
      />
    </Html>
  )
}
