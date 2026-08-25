import { cva } from 'class-variance-authority'

/**
 * Kat şeridinin yuvarlak düğmeleri (K166). Yüzen çubuğun düğmelerinden ayrı:
 * bunlar TAM DAİRE, ikon değil kısa metin taşıyor ve tuvalin üstünde tek
 * başlarına duruyorlar — kendi zeminleri olmalı, yoksa açık çizimde kayboluyor.
 *
 * Vurgu SEÇİM rengiyle, marka sarısıyla değil: çizim alanının üstündeyiz
 * (CLAUDE.md ürün kuralı, `canvasBarButtonVariants` ile aynı gerekçe).
 */
/**
 * Şeridi açıp kapatan yuvarlak düğme. Sahnenin sol üstünde HER ZAMAN duruyor,
 * katlar onun altından uzuyor — bu yüzden kat dairelerinden ayırt edilmeli:
 * ikon taşıyor ve zemini biraz daha koyu.
 */
export const floorRailToggleVariants = cva(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full border ' +
    'shadow-sm backdrop-blur transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-selection/70',
  {
    variants: {
      isOpen: {
        true: 'border-edge bg-surface-sunken text-ink',
        false: 'border-edge bg-surface/90 text-ink-muted hover:text-ink',
      },
    },
    defaultVariants: { isOpen: false },
  },
)

export const floorRailButtonVariants = cva(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-xs ' +
    'font-semibold tabular-nums shadow-sm backdrop-blur transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-selection/70',
  {
    variants: {
      isActive: {
        true: 'border-selection bg-selection text-surface',
        false: 'border-edge bg-surface/90 text-ink-muted hover:border-selection/60 hover:text-ink',
      },
    },
    defaultVariants: { isActive: false },
  },
)
