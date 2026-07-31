import { cva } from 'class-variance-authority'

/** Tüm admin odak halkası aksan rengindedir; cva ile sarılmayan bağlantılar da bunu kullanır. */
export const ADMIN_FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** Sol menü maddeleri. Sidebar zemini ana içerikle aynı olduğu için madde
    vurgusu renk farkıyla değil, bir tık yukarıdaki yüzey + aksan çizgisiyle verilir. */
export const adminNavItemVariants = cva(
  `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm
   transition-colors ${ADMIN_FOCUS_RING}`,
  {
    variants: {
      tone: {
        plain: 'text-ink-muted hover:bg-surface hover:text-ink',
        active: 'bg-surface font-semibold text-ink ring-1 ring-inset ring-accent',
        disabled: 'cursor-not-allowed text-ink-disabled',
      },
    },
    defaultVariants: { tone: 'plain' },
  },
)

/**
 * Admin butonları. Birincil eylem indigo (sidebar markası) — marka sarısı admin
 * arayüzüne girmez, o yalnız çizim editörünün kabuğunda kullanılır.
 */
export const adminButtonVariants = cva(
  `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm
   font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${ADMIN_FOCUS_RING}`,
  {
    variants: {
      tone: {
        primary: 'bg-admin-primary text-admin-primary-ink hover:brightness-110',
        secondary: 'border border-edge bg-surface text-ink-muted hover:bg-surface-sunken',
      },
    },
    defaultVariants: { tone: 'secondary' },
  },
)

/** İkon düğmeleri (üst barda bildirim, sidebar'da tema geçişi). Hover zemini
    düğmenin bulunduğu yüzeye göre değişir — aynı renk üstüne aynı renk gelmesin. */
export const adminIconButtonVariants = cva(
  `relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-muted
   transition-colors ${ADMIN_FOCUS_RING}`,
  {
    variants: {
      surface: {
        raised: 'hover:bg-surface-sunken',
        sunken: 'hover:bg-surface hover:text-ink',
      },
    },
    defaultVariants: { surface: 'raised' },
  },
)

/** Sayfalama düğmeleri (sayfa numarası + ileri/geri ok). */
export const pageButtonVariants = cva(
  `inline-flex size-9 items-center justify-center rounded-lg border text-sm transition-colors
   disabled:cursor-not-allowed disabled:border-edge disabled:bg-surface disabled:text-ink-disabled ${ADMIN_FOCUS_RING}`,
  {
    variants: {
      tone: {
        plain: 'border-edge bg-surface text-ink-muted hover:bg-surface-sunken',
        active: 'border-admin-primary bg-admin-primary font-semibold text-admin-primary-ink',
      },
    },
    defaultVariants: { tone: 'plain' },
  },
)

/** Uygulanan filtre etiketi. */
export const filterChipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-sunken py-1 pl-3 pr-1.5 text-xs text-ink',
)

/** Sıralanabilir tablo başlığı. */
export const sortHeaderVariants = cva(
  `flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs font-semibold
   uppercase tracking-wide transition-colors ${ADMIN_FOCUS_RING}`,
  {
    variants: {
      tone: {
        plain: 'text-ink-muted hover:text-ink',
        active: 'text-accent-ink',
      },
    },
    defaultVariants: { tone: 'plain' },
  },
)

/** Metin/seçim girdileri. */
export const adminFieldVariants = cva(
  `h-10 rounded-lg border border-edge bg-surface px-3 text-sm text-ink
   placeholder:text-ink-disabled focus:border-accent focus:outline-none`,
)
