import { cva } from 'class-variance-authority'
import { useEffect, useRef } from 'react'

import { FLOOR_FOCUS_RING } from './floors/floorVariants'
import { useFloorContentSource } from './floors/useFloorContentSource'
import { getFloorContent, isFloorContentEmpty } from '../core/floorContent'
import type { Id } from '../core/model'
import { useCadStore } from '../store/cadStore'

const floorChipVariants = cva(
  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs uppercase tracking-wide transition-colors',
  {
    variants: {
      tone: {
        plain: 'border-edge bg-surface text-ink-muted hover:bg-surface-sunken',
        // Aktif kat DOLU biçimde vurgulanır (madde 20) — halka/dolu ayrımı
        // rengi görmeyen kullanıcıda da okunur.
        active: 'border-ink bg-ink text-surface',
      },
    },
    defaultVariants: { tone: 'plain' },
  },
)

/**
 * Çizimi olmayan katın işareti: içi BOŞ halka. "Boş" yazmak yerine işaret
 * kullanılıyor çünkü şeritte kat başına birkaç piksel var; halka aktif katta da
 * (dolu zemin üstünde) okunur kalsın diye `currentColor` alıyor.
 */
function EmptyRing() {
  return (
    <span
      aria-hidden
      className="inline-block size-2 rounded-full border border-current opacity-70"
    />
  )
}

/**
 * Çizim alanının sol üst köşesindeki kat şeridi (KK-21…KK-23). Katlar arası
 * geçişin asıl yeri burasıdır; eski aktif kat ETİKETİNİN yerini aldı.
 *
 * Sıra soldan sağa AŞAĞIDAN YUKARIYA: en solda en alttaki bodrum, en sağda en
 * üstteki kat. Bu, store dizisinin kendi sırasıdır — "Katlar" penceresi listeyi
 * ters çeviriyor (orada en üst kat başta), şerit çevirmiyor. İki yön de bilerek
 * farklı: pencerede bina kesitten okunuyor, şeritte bir eksen üzerinde.
 */
export function FloorStrip() {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const setActiveFloor = useCadStore((state) => state.setActiveFloor)
  const contentSource = useFloorContentSource()

  const activeChipRef = useRef<HTMLButtonElement>(null)

  // Kat sayısı şeride sığmadığında aktif kat görünür konuma getirilir (KK-23).
  // jsdom'da scrollIntoView tanımsız olabiliyor; testler bu yüzden düşmesin.
  useEffect(() => {
    activeChipRef.current?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [activeFloorId, floors])

  const isEmpty = (floorId: Id) => isFloorContentEmpty(getFloorContent(contentSource, floorId))

  return (
    <nav
      aria-label="Katlar"
      className="pointer-events-auto absolute left-3 top-3 flex max-w-[min(60%,32rem)] gap-1.5 overflow-x-auto rounded-lg border border-edge bg-surface/95 p-1.5"
    >
      {floors.map((floor) => {
        const isActive = floor.id === activeFloorId

        return (
          <button
            key={floor.id}
            ref={isActive ? activeChipRef : undefined}
            type="button"
            onClick={() => setActiveFloor(floor.id)}
            aria-current={isActive ? 'true' : undefined}
            className={`${floorChipVariants({ tone: isActive ? 'active' : 'plain' })} ${FLOOR_FOCUS_RING}`}
          >
            {floor.name}
            {isEmpty(floor.id) && <EmptyRing />}
          </button>
        )
      })}
    </nav>
  )
}
