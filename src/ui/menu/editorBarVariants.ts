import { cva } from 'class-variance-authority'

/**
 * Üst barın düğmeleri. `chromeButtonVariants` yeniden kullanılmadı: o kabuk
 * token'larına (`surface`/`ink`) bağlı ve koyu temada koyulaşıyor — pencerelerde
 * doğrusu bu. Üst bar ise TUVALLE aynı yüzeyin üstünde duruyor ve tuval iki
 * temada da beyaz (`sceneTheme.background`), bu yüzden `canvas-overlay`
 * ailesini kullanıyor: koyu temada da beyaz kalır.
 */
export const editorBarButtonVariants = cva(
  // Pasif METİN rengi tonun içinde: cva sınıfları çakıştırmaz, taban ile ton
  // aynı `disabled:` rengini verirse hangisinin kazandığı stil sırasına kalırdı.
  // whitespace-nowrap: dar ekranda "Hata Kontrolleri" iki satıra kırılıp
  // düğmenin yüksekliğini bozuyordu; bar sıkışırsa metin kırpılsın, sarmasın.
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg ' +
    'text-sm transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent',
  {
    variants: {
      tone: {
        plain:
          'text-canvas-overlay-ink hover:bg-canvas-overlay-edge/25 ' +
          'disabled:text-canvas-overlay-ink-muted',
        // Çerçeveli kart: zemin yüzeyle aynı, düğmeyi ayıran şey kenarlığı.
        card:
          'border border-canvas-overlay-edge text-canvas-overlay-ink-strong ' +
          'hover:bg-canvas-overlay-edge/25 disabled:text-canvas-overlay-ink-muted',
        // Marka sarısı kabukta serbest; iki temada da aynı değer.
        active:
          'bg-brand/20 text-canvas-overlay-ink-strong ring-1 ring-brand/60 ' +
          'disabled:text-canvas-overlay-ink-muted',
        // Test sonucunu gösteren "Hata Kontrolleri": eylem değil DURUM, bu yüzden
        // yumuşak yeşil zemin. Pasifken de zemini kalır ki yerinden okunsun.
        success:
          'bg-canvas-overlay-success/10 font-medium text-canvas-overlay-success ' +
          'disabled:text-canvas-overlay-success/60',
      },
      shape: {
        label: 'h-9 px-3',
        icon: 'size-9',
      },
    },
    defaultVariants: { tone: 'plain', shape: 'label' },
  },
)

/**
 * BİRİNCİL eylem (Kaydet). `admin-primary` iki temada da aynı indigo, beyaz
 * zeminde de doğru duruyor.
 */
export const editorBarPrimaryVariants = cva(
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-admin-primary px-4 ' +
    'text-sm font-medium text-admin-primary-ink transition-opacity ' +
    'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60',
)

/**
 * Üst bardan açılan kutular (menü açılırı, sahne pili) — aynı beyaz yüzey.
 * Köşe yarıçapı BURADA yok: çağıran kendi yarıçapını verir, yoksa iki
 * `rounded-*` sınıfı çakışır ve hangisinin kazandığı stil sırasına kalır.
 */
export const EDITOR_BAR_PANEL = 'border border-canvas-overlay-edge bg-canvas-overlay'

/** Açılır menü maddeleri. */
export const editorBarMenuItemVariants = cva(
  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-canvas-overlay-ink ' +
    'enabled:hover:bg-canvas-overlay-edge/25 disabled:cursor-not-allowed ' +
    'disabled:text-canvas-overlay-ink-muted',
)
