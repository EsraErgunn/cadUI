import { cva } from 'class-variance-authority'

/** Kabuk (pencere, kat listesi) içindeki başlık/ikon butonları. */
export const chromeButtonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md text-sm transition-colors ' +
    'disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:bg-transparent',
  {
    variants: {
      tone: {
        plain: 'text-ink-muted hover:bg-surface-sunken',
        // Marka sarısı yalnız kabukta; çizim alanına girmiyor.
        active: 'bg-brand/20 text-ink ring-1 ring-brand/60',
      },
      shape: {
        label: 'h-8 px-3',
        icon: 'size-8',
      },
    },
    defaultVariants: { tone: 'plain', shape: 'label' },
  },
)

/** Sol paletteki araç butonları. */
export const toolButtonVariants = cva(
  'inline-flex size-9 items-center justify-center rounded-md transition-colors ' +
    'disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:bg-transparent',
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

/** Açılır menü maddeleri. */
export const menuItemVariants = cva(
  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-ink-muted ' +
    'enabled:hover:bg-surface-sunken disabled:cursor-not-allowed disabled:text-ink-disabled',
)
