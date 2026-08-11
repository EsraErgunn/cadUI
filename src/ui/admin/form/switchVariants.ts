import { cva } from 'class-variance-authority'

import { ADMIN_FOCUS_RING } from '../adminVariants'

/**
 * Anahtar (toggle) varyantları. `adminVariants.ts` 200 satır sınırına dayandığı
 * için bileşenin yanında duruyorlar — sınıflar yine de bileşenin İÇİNE gömülü
 * değil, cva tanımından geliyor (CLAUDE.md → Varyantlar).
 *
 * Onay kutusu değil anahtar: gereksinim "Aktif" için anahtar istiyor ve kapalı
 * hâli de kullanıcıya bir durum söylüyor. Açık hâl birincil renkte — `success`
 * kullanılmadı, o token ekranda "kaydedildi" anlamını taşıyor.
 */
export const switchVariants = cva(
  `relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors
   disabled:cursor-not-allowed disabled:opacity-60 ${ADMIN_FOCUS_RING}`,
  {
    variants: {
      tone: {
        on: 'border-admin-primary bg-admin-primary',
        off: 'border-edge bg-surface-sunken',
      },
    },
    defaultVariants: { tone: 'off' },
  },
)

/** Kayan topuz: kapalıyken solda, açıkken sağda. */
export const switchKnobVariants = cva(
  'pointer-events-none absolute size-4 rounded-full bg-surface shadow transition-[left]',
  {
    variants: {
      tone: {
        on: 'left-[calc(100%-1.25rem)]',
        off: 'left-1',
      },
    },
    defaultVariants: { tone: 'off' },
  },
)
