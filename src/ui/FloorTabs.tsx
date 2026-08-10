import { cva } from 'class-variance-authority'

import { useCadStore } from '../store/cadStore'

const floorTabVariants = cva(
  'shrink-0 rounded-md px-2.5 py-1 text-xs transition-colors',
  {
    variants: {
      tone: {
        plain: 'text-ink-muted hover:bg-surface-sunken',
        active: 'bg-brand/20 text-ink ring-1 ring-brand/60',
      },
    },
    defaultVariants: { tone: 'plain' },
  },
)

/**
 * Katlar arası hızlı geçiş (KK-13). Çizim alanı terk edilmez: yalnız
 * activeFloorId değişir, çizim verisi yerinde kalır.
 *
 * Sıra EN ÜST kat başta — Kat Yönetimi ile aynı okuma yönü. Store'daki dizi en
 * alt kat başta; çeviri görüntü katmanında kalır.
 */
export function FloorTabs() {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const setActiveFloor = useCadStore((state) => state.setActiveFloor)

  // Tek kat varken sekme şeridi bilgi taşımaz, yer kaplar.
  if (floors.length < 2) return null

  return (
    <nav
      aria-label="Katlar"
      className="pointer-events-auto absolute bottom-3 left-1/2 flex max-w-[70%] -translate-x-1/2 gap-1 overflow-x-auto rounded-lg border border-edge bg-surface/95 p-1"
    >
      {[...floors].reverse().map((floor) => (
        <button
          key={floor.id}
          type="button"
          onClick={() => setActiveFloor(floor.id)}
          aria-current={floor.id === activeFloorId ? 'true' : undefined}
          className={floorTabVariants({ tone: floor.id === activeFloorId ? 'active' : 'plain' })}
        >
          {floor.name}
        </button>
      ))}
    </nav>
  )
}
