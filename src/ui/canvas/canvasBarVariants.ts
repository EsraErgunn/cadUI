import { cva } from 'class-variance-authority'

/**
 * Tuvalin üstünde yüzen çubuğun düğmeleri. `chromeButtonVariants` (menü çubuğu)
 * yeniden kullanılmadı: o kabuk yüzeyinin üstünde duruyor ve marka sarısıyla
 * vurgulanıyor, bu ise ÇİZİM ALANININ üstünde — vurgu seçim rengiyle olmalı,
 * marka sarısı çizim alanına giremez (CLAUDE.md ürün kuralı).
 */
export const canvasBarButtonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md text-sm transition-colors ' +
    'disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:bg-transparent',
  {
    variants: {
      tone: {
        plain: 'text-ink-muted hover:bg-surface-sunken',
        active: 'bg-selection/15 text-selection ring-1 ring-selection/50',
      },
      shape: {
        icon: 'size-8',
        label: 'h-8 px-2.5',
      },
    },
    defaultVariants: { tone: 'plain', shape: 'icon' },
  },
)

/** Çubuktaki mantıksal grupları ayıran ince dikey çizgi. */
export const CANVAS_BAR_DIVIDER = 'mx-0.5 h-5 w-px shrink-0 bg-edge'

/** Görünüm açılırındaki onay kutusu maddeleri. */
export const canvasBarMenuItemVariants = cva(
  'flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm ' +
    'text-ink-muted hover:bg-surface-sunken',
)

/**
 * Mahal tanımlama kartındaki rozetler ve gezinme düğmeleri. Yüzen çubuğun
 * düğmelerinden ayrı: bunlar metin taşıyor ve sarılıyor (25 tip tek satıra
 * sığmaz), ama aynı yüzeyin üstünde durdukları için vurgu yine seçim rengi.
 */
export const roomDefinitionChipVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-edge text-sm ' +
    'text-ink transition-colors hover:border-selection hover:bg-selection/10 ' +
    'disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:border-edge ' +
    'disabled:hover:bg-transparent',
  {
    variants: {
      shape: {
        chip: 'px-2.5 py-1',
        icon: 'size-7 border-transparent hover:border-transparent',
      },
    },
    defaultVariants: { shape: 'chip' },
  },
)
