import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'

import { ROOM_ELEVATION_CM } from './layers'
import { planToThree, type PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import { getRoomUsageOptions, isRoomUsageType, type RoomUsageType } from '../core/roomUsage'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

const NO_USAGE_TYPE = ''

type RoomDefinitionEditorProps = {
  roomId: Id
  /** Etiketin durduğu nokta; kutu da oraya, aynı yere açılır. */
  anchor: PlanPoint
  /** Kullanıcının verdiği HAM ad — "Tanımsız" gibi türetilmiş etiket değil. */
  currentName: string
  currentUsageType: RoomUsageType | undefined
}

/**
 * Mahal tanımlama kutusu: ad + kullanım tipi. drei `<Html>` ile: kutu gerçek
 * bir DOM parçası ama konumunu R3F'in kamera izdüşümünden alıyor, zoom/pan'da
 * odayla birlikte geliyor. Alternatifi ui/ altında elle dünya→ekran izdüşümü
 * tutmaktı; kural 2 (scene = R3F, ui = DOM) burada Html lehine esnetildi çünkü
 * kutunun konumu KAMERAYA bağlı ve kamera <Canvas> dışına taşınamaz.
 *
 * Ad taslağı yerel state'te (her tuşta store'a yazsaydı her harf ayrı bir
 * Ctrl+Z adımı olurdu), TİP ise seçilir seçilmez yazılıyor: açılır listede tek
 * bir seçim zaten bitmiş bir karar, taslakta bekletmenin karşılığı yok.
 */
export function RoomDefinitionEditor({
  roomId,
  anchor,
  currentName,
  currentUsageType,
}: RoomDefinitionEditorProps) {
  const [draft, setDraft] = useState(currentName)
  // Native dinleyici kapanışta taslağın SON hâlini okumalı; state'i kapatsaydı
  // dinleyici kurulduğu andaki değeri görürdü.
  const draftRef = useRef(currentName)
  const boxRef = useRef<HTMLDivElement>(null)

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
      if (shouldCommit) useCadStore.getState().setRoomName(roomId, draftRef.current)
      useArchitectureUiStore.getState().setEditingRoom(null)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') close(true)
      // Esc taslağı ATAR: store'a hiç yazılmadığı için eski ad kendiliğinden
      // kalır. Tip bundan ETKİLENMEZ — o zaten anında yazıldı.
      if (event.key === 'Escape') close(false)
    }

    // Yakalama fazı: tuvalin kendi pointerdown'ından ÖNCE çalışsın ki kutu
    // kapanmadan taslak kaydedilsin. Kapsam KUTUNUN TAMAMI, yalnız metin
    // alanı değil — tipe tıklamak kutuyu kapatırdı.
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && boxRef.current?.contains(event.target)) return
      close(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [roomId])

  const handleUsageTypeChange = (value: string) => {
    // Liste dışı bir değer gelemez ama alanın YOKLUĞU meşru bir durum:
    // "tip belirtilmemiş" boş bir değer değil, alanın hiç olmaması.
    useCadStore
      .getState()
      .setRoomUsageType(roomId, isRoomUsageType(value) ? value : undefined)
  }

  return (
    <Html position={planToThree(anchor, ROOM_ELEVATION_CM)} center zIndexRange={[100, 0]}>
      {/* Kabuk token'ları (surface/ink) DEĞİL: tuval koyu temada da beyaz,
          kutu onunla aynı dünyada duruyor. Bkz. --color-canvas-overlay. */}
      <div
        ref={boxRef}
        className="flex w-44 flex-col gap-1 rounded-lg border border-canvas-overlay-edge bg-canvas-overlay p-1.5 shadow-sm"
      >
        <input
          // Kutu açılır açılmaz yazmaya başlanabilsin; mevcut ad seçili gelir ki
          // üzerine yazmak silmeyi gerektirmesin.
          autoFocus
          onFocus={(event) => event.target.select()}
          className="rounded-md px-2 py-1 text-center text-sm font-medium text-canvas-overlay-ink outline-none focus:bg-canvas-overlay-edge/25"
          value={draft}
          placeholder="Mahal adı"
          aria-label="Mahal adı"
          onChange={(event) => {
            draftRef.current = event.target.value
            setDraft(event.target.value)
          }}
        />

        <select
          className="rounded-md border border-canvas-overlay-edge px-2 py-1 text-center text-xs text-canvas-overlay-ink"
          value={currentUsageType ?? NO_USAGE_TYPE}
          aria-label="Kullanım tipi"
          onChange={(event) => handleUsageTypeChange(event.target.value)}
        >
          <option value={NO_USAGE_TYPE}>Tip seçilmedi</option>
          {getRoomUsageOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </Html>
  )
}
