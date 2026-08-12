import { cva } from 'class-variance-authority'

import { ADMIN_FOCUS_RING } from '../adminVariants'

/**
 * Yalnız proje detayı ekranında kullanılan varyantlar.
 *
 * `adminVariants.ts`'e KONULMADI: üçü de bu ekrana özel ve o dosyayı 200 satır
 * sınırının üstüne çıkarıyorlardı. Klasör sözleşmesi zaten "tek ekrana özel
 * parçalar `<ekran>/` altında" diyor; ikinci bir ekran bunlardan birini
 * isterse aynı kuralla `admin/` köküne taşınır ve adındaki ekran öneki düşer.
 */

/**
 * Durum rozeti (dosya tipi ve işlem etiketi, işlem geçmişi tablosu).
 *
 * Renk KENARLIK + soluk zeminde; METİN her tonda `ink` kalıyor. Dolgu üstüne
 * renkli yazı denenmedi çünkü iki temada birden güvenli bir mavi/amber metin
 * token'ı yok: `admin-primary` koyu temada yüzeye göre ~2.9:1 (bkz.
 * `adminTabVariants`), `warning` metin rengi olarak hiç sınanmadı
 * (knowledge/theming.md). Rozetin anlamını zaten yazının kendisi taşıyor —
 * renk ikinci kanal.
 */
export const detailBadgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold text-ink',
  {
    variants: {
      tone: {
        neutral: 'border-edge bg-surface-sunken',
        danger: 'border-danger bg-danger/10',
        info: 'border-selection bg-selection/10',
        success: 'border-success bg-success/10',
        warning: 'border-warning bg-warning/10',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

/** Proje işlemleri sekmesindeki kısayol kartı. */
export const quickActionVariants = cva(
  `flex items-center gap-3 rounded-xl border border-edge bg-surface px-4 py-3 text-left text-sm
   font-medium text-ink transition-colors hover:bg-surface-sunken
   disabled:cursor-not-allowed disabled:opacity-60 ${ADMIN_FOCUS_RING}`,
)

/** Plan görüntüleyicisinin araç çubuğundaki küçük ikon düğmeleri. */
export const viewerButtonVariants = cva(
  `inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-edge
   bg-surface text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink
   disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:bg-surface
   ${ADMIN_FOCUS_RING}`,
)
