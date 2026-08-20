import { cva } from 'class-variance-authority'

/**
 * Odak halkası cam yüzeyin ÜSTÜNDE okunmalı: `admin-primary` indigo iki temada
 * da aynı ve açık zeminde net çıkıyor. `ADMIN_FOCUS_RING` yeniden kullanılmadı —
 * o yönetici panelinin `surface` zeminine göre ayarlı, camda kayboluyor.
 */
export const ISOMETRIC_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-glass-strong'

/**
 * Tuvalin üstünde yüzen buzlu cam yüzey. `backdrop-blur` panelin arkasındaki
 * çizimi bulanıklaştırır — yarı saydamlık tek başına yazının üstüne boru
 * geçtiğinde okunmaz yapıyordu.
 */
export const isometricPanelVariants = cva(
  'rounded-2xl border border-glass-edge bg-glass shadow-lg backdrop-blur-xl',
  {
    variants: {
      padding: {
        panel: 'px-3.5 py-3',
        control: 'p-1',
      },
    },
    defaultVariants: { padding: 'panel' },
  },
)

/**
 * iOS tarzı segmented control'ün maddesi. Seçili hap AYRI bir katman olarak
 * kayıyor (bkz. IsometricModeSwitch), bu yüzden burada zemin YOK: madde yalnız
 * metin rengini değiştirir, yoksa iki zemin üst üste biner ve kayma görünmez.
 */
export const isometricSegmentVariants = cva(
  'relative z-10 flex-1 rounded-xl px-3.5 py-1.5 text-sm font-medium ' +
    'transition-colors ' +
    ISOMETRIC_FOCUS_RING,
  {
    variants: {
      isSelected: {
        true: 'text-glass-ink',
        false: 'text-glass-ink-muted hover:text-glass-ink',
      },
    },
    defaultVariants: { isSelected: false },
  },
)

/** Hazır açı düğmeleri: küçük, çerçevesiz, seçiliyken dolu. */
export const isometricPresetVariants = cva(
  'rounded-lg px-2 py-1 text-xs transition-colors ' + ISOMETRIC_FOCUS_RING,
  {
    variants: {
      isSelected: {
        true: 'bg-admin-primary text-admin-primary-ink',
        false: 'text-glass-ink-muted hover:bg-glass-strong hover:text-glass-ink',
      },
    },
    defaultVariants: { isSelected: false },
  },
)

/** Panel içindeki ikincil eylem (sıfırla). */
export const isometricActionVariants = cva(
  'inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 ' +
    'text-xs text-glass-ink-muted transition-colors ' +
    'hover:bg-glass-strong hover:text-glass-ink ' +
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ' +
    ISOMETRIC_FOCUS_RING,
)

/**
 * Kaydırıcı. `accent-*` ile tarayıcının kendi çizdiği parça renklendiriliyor;
 * `appearance-none` + elle çizim yolu seçilmedi çünkü o klavye erişimini ve
 * ekran okuyucu davranışını kendi elimizle yeniden kurmayı gerektirirdi.
 */
export const isometricSliderVariants = cva(
  'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-glass-edge ' +
    'accent-admin-primary ' +
    ISOMETRIC_FOCUS_RING,
)

/** Kaydırıcının üstündeki etiket satırı: ad solda, değer sağda. */
export const ISOMETRIC_FIELD_LABEL =
  'flex items-baseline justify-between text-xs text-glass-ink-muted'

export const ISOMETRIC_FIELD_VALUE = 'font-medium tabular-nums text-glass-ink'
