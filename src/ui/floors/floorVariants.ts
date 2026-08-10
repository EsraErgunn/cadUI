import { cva } from 'class-variance-authority'

/** Klavye odağı her yerde görünür (CLAUDE.md erişilebilirlik). */
export const FLOOR_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

export const floorRowVariants = cva('border-b border-edge/60 text-sm last:border-b-0', {
  variants: {
    tone: {
      plain: 'bg-surface',
      /** Bodrum satırının zemini farklı: kotu negatif, listede ayrı okunmalı (madde 4). */
      basement: 'bg-surface-sunken/60',
    },
    isActive: {
      true: 'ring-1 ring-inset ring-brand/50',
      false: '',
    },
    isDragging: {
      true: 'opacity-40',
      false: '',
    },
  },
  defaultVariants: { tone: 'plain', isActive: false, isDragging: false },
})

export const floorBadgeVariants = cva(
  'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] leading-none',
  {
    variants: {
      tone: {
        content: 'border border-edge text-ink-muted',
        /** Boş rozeti kesikli: "bir şey var" değil "bir şey yok" diyor. */
        empty: 'border border-dashed border-edge text-ink-disabled',
        active: 'bg-ink text-surface',
      },
    },
    defaultVariants: { tone: 'content' },
  },
)

export const floorSummaryValueVariants = cva('text-lg font-semibold', {
  variants: {
    tone: {
      plain: 'text-ink',
      /** Boş kat adedi sıfırdan büyükse vurgulanır (madde 2). */
      warning: 'text-danger',
    },
  },
  defaultVariants: { tone: 'plain' },
})
