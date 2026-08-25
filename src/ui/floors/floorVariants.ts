import { cva } from 'class-variance-authority'

/** Klavye odağı her yerde görünür (CLAUDE.md erişilebilirlik). */
export const FLOOR_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

/**
 * Kat satırı. Aktif kat ROZETLE değil sol kenar şeridiyle işaretleniyor (K166):
 * rozet kendine bir sütun istiyordu, şerit satırın zaten var olan kenarını
 * kullanıyor ve gözü listenin başına götürüyor.
 */
export const floorRowVariants = cva(
  'group relative flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors',
  {
    variants: {
      tone: {
        plain: '',
        /** Bodrum satırının zemini farklı: kotu negatif, listede ayrı okunmalı. */
        basement: 'bg-surface-sunken/50',
      },
      isActive: {
        true: 'border-l-brand',
        false: 'border-l-transparent',
      },
      isSelected: {
        true: 'bg-selection/10',
        false: 'hover:bg-surface-sunken/70',
      },
      isDragging: {
        true: 'opacity-40',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'plain',
      isActive: false,
      isSelected: false,
      isDragging: false,
    },
  },
)

/**
 * İçerik göstergesi TEK glif: dolu / yarım / boş halka. Eskiden "Mimari",
 * "Tesisat" ve "Boş" diye üç ayrı rozet vardı ve satırın en gürültülü parçasıydı.
 * Boş halka sözlüğü kat seçicisinden (`FloorSelect`) geliyor — iki yüzey aynı
 * dili konuşsun.
 */
export const floorContentDotVariants = cva('inline-block size-2.5 rounded-full border', {
  variants: {
    tone: {
      full: 'border-ink-muted bg-ink-muted',
      partial: 'border-ink-muted bg-gradient-to-r from-ink-muted from-50% to-transparent to-50%',
      empty: 'border-dashed border-ink-disabled',
    },
  },
  defaultVariants: { tone: 'empty' },
})

/** Satırdaki yazıdan alana dönüşen alanlar; dinlenme hâlinde çerçevesiz. */
export const floorInlineFieldVariants = cva(
  'rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-ink ' +
    'hover:border-edge aria-[invalid=true]:border-danger',
  {
    variants: {
      align: {
        left: 'text-left',
        right: 'text-right tabular-nums',
      },
    },
    defaultVariants: { align: 'left' },
  },
)
