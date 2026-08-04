import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'

import { ROOM_ELEVATION_CM } from './layers'
import { planToThree, type PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

type RoomNameEditorProps = {
  roomId: Id
  /** Etiketin durduğu nokta; kutu da oraya, aynı yere açılır. */
  anchor: PlanPoint
  currentName: string
}

/**
 * Oda adı düzenleme kutusu. drei `<Html>` ile: kutu gerçek bir DOM input'u ama
 * konumunu R3F'in kamera izdüşümünden alıyor, zoom/pan'da odayla birlikte
 * geliyor. Alternatifi ui/ altında elle dünya→ekran izdüşümü tutmaktı; kural 2
 * (scene = R3F, ui = DOM) burada Html lehine esnetildi çünkü kutunun konumu
 * KAMERAYA bağlı ve kamera <Canvas> dışına taşınamaz.
 *
 * Taslak metin yerel state'te: her tuşta store'a yazsaydı her harf ayrı bir
 * Ctrl+Z adımı olurdu.
 */
export function RoomNameEditor({ roomId, anchor, currentName }: RoomNameEditorProps) {
  const [draft, setDraft] = useState(currentName)
  // Native dinleyici kapanışta taslağın SON hâlini okumalı; state'i kapatsaydı
  // dinleyici kurulduğu andaki değeri görürdü.
  const draftRef = useRef(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    /*
     * Kaydetme ve kapanma NATIVE dinleyicide, React'in onKeyDown/onBlur'ünde
     * DEĞİL. Sebep: drei Html içeriğini ayrı bir react-dom köküyle
     * (ReactDOM.createRoot) çiziyor; o kökün olay işleyicisinden yapılan store
     * yazımı R3F ağacını yeniden çizdirmiyordu. Store null'a düşüyor ama kutu
     * ekranda asılı kalıyordu. Native dinleyici o toplu güncelleme bağlamının
     * dışında çalıştığı için abonelik normal işliyor.
     */
    const close = (shouldCommit: boolean) => {
      // Boş ad store tarafında reddedilir; kutu yine de kapanır, eski ad kalır.
      if (shouldCommit) useCadStore.getState().setRoomName(roomId, draftRef.current)
      useArchitectureUiStore.getState().setEditingRoom(null)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') close(true)
      // Esc taslağı ATAR: store'a hiç yazılmadığı için eski ad kendiliğinden kalır.
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
  }, [roomId])

  return (
    <Html position={planToThree(anchor, ROOM_ELEVATION_CM)} center zIndexRange={[100, 0]}>
      <input
        ref={inputRef}
        // Kutu açılır açılmaz yazmaya başlanabilsin; mevcut ad seçili gelir ki
        // üzerine yazmak silmeyi gerektirmesin.
        autoFocus
        onFocus={(event) => event.target.select()}
        // Kabuk token'ları (surface/ink) DEĞİL: tuval koyu temada da beyaz,
        // kutu onunla aynı dünyada duruyor. Bkz. --color-canvas-overlay.
        className="w-36 rounded-lg border border-canvas-overlay-edge bg-canvas-overlay px-3 py-1.5 text-center text-sm font-medium text-canvas-overlay-ink shadow-sm outline-none focus:border-selection"
        value={draft}
        aria-label="Oda adı"
        onChange={(event) => {
          draftRef.current = event.target.value
          setDraft(event.target.value)
        }}
      />
    </Html>
  )
}
