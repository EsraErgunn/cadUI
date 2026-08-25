import { cva } from 'class-variance-authority'

/** Kabuk (pencere, kat listesi) içindeki başlık/ikon butonları. */
export const chromeButtonVariants = cva(
  'cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-md text-sm transition-colors ' +
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
  'cursor-pointer inline-flex size-9 items-center justify-center rounded-md transition-colors ' +
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

/**
 * Palet gruplarını ayıran ince çizgi. Her grubun ÜSTÜNDE duruyor: ilki grupları
 * değil paleti LOGODAN ayırır, iki palet de aynı çizgiyi kullansın diye burada.
 */
export const TOOL_GROUP_DIVIDER = 'mx-2 h-px bg-edge'

/**
 * Onay pencerelerinin ALT BAR düğmeleri (K177). Kaydet/Uygula/Sil gibi asıl
 * eylem ile Vazgeç/İptal aynı yerde duruyor ve ayırt edilmeleri gerekiyordu:
 * ikisi de düz metin düğmesiydi, hangisinin ne yaptığı ancak okunarak
 * anlaşılıyordu.
 *
 * Yazı hepsinde KALIN — üst bardaki "Kaydet" ile aynı ağırlık (kullanıcı
 * kararı): bunlar pencerenin sonucunu belirleyen düğmeler, gövde metniyle aynı
 * ağırlıkta durmamalılar.
 *
 * ⚠️ Dolgulu tonlarda yazı SURFACE: açık temada yüzey beyaz, koyu temada koyu —
 * dolgu da ters yönde değiştiği için (koyu temada açılıyor) kontrast iki temada
 * da kendiliğinden doğru çıkıyor. success/success-ink deseninin token
 * eklemeden çalışan hâli.
 */
export const dialogActionVariants = cva(
  'cursor-pointer inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 ' +
    'text-sm font-semibold transition-colors ' +
    'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-disabled',
  {
    variants: {
      tone: {
        /** Vazgeç / İptal — ÇERÇEVELİ, dolgusuz: eylem değil geri çekilme. */
        cancel: 'border border-edge text-ink hover:bg-surface-sunken',
        /** Kaydet / Uygula — mavi dolgu, hover AÇILIR. */
        primary: 'bg-selection text-surface hover:bg-selection-hover',
        /** Temizle gibi geri alınamaz eylem — kırmızı dolgu, hover açılır. */
        danger: 'bg-danger text-surface hover:bg-danger-hover',
        /**
         * Rengi DEĞİŞMEYEN eylemler (toplu silme onayları, "N kata kopyala").
         * Yalnız kalın yazı ve el imleci alıyorlar; renkleri kullanıcı kararıyla
         * olduğu gibi bırakıldı.
         */
        keep: 'text-ink-muted hover:bg-surface-sunken',
      },
    },
    defaultVariants: { tone: 'keep' },
  },
)

/** Açılır menü maddeleri. */
export const menuItemVariants = cva(
  'cursor-pointer flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-ink-muted ' +
    'enabled:hover:bg-surface-sunken disabled:cursor-not-allowed disabled:text-ink-disabled',
)
