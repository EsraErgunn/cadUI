import { cva } from 'class-variance-authority'

/** Tüm admin odak halkası aksan rengindedir; cva ile sarılmayan bağlantılar da bunu kullanır. */
export const ADMIN_FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** Tablo hücresi ve konum izi içindeki bağlantılar. Seçim mavisi + hover'da altı çizili. */
export const ADMIN_CELL_LINK = `rounded text-selection hover:underline ${ADMIN_FOCUS_RING}`

/** Yeni oluşturulan kaydın satırı. Renk başarı şeridiyle aynı aileden: kullanıcı
    şeritteki proje numarasıyla satırı gözüyle eşleştirsin. Yalnızca zemin tonu —
    kenarlık eklenseydi vurgu sönerken satır 4px kayardı. Bilgi bu tona BAĞLI
    değil: proje numarası zaten şeritte yazıyor (renk tek kanal olmasın). */
export const ADMIN_ROW_HIGHLIGHT = 'bg-success/10'

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
  `inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold
   transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${ADMIN_FOCUS_RING}`,
  {
    variants: {
      tone: {
        primary: 'bg-admin-primary text-admin-primary-ink hover:brightness-110',
        secondary: 'border border-edge bg-surface text-ink-muted hover:bg-surface-sunken',
        // Yıkıcı eylem bilerek dolgusuz: satırdaki en dikkat çeken düğme "Gönder"
        // olmalı, yanlışlıkla tıklanması pahalı olan "Sil" değil.
        danger: 'border border-danger bg-surface text-danger-ink hover:bg-danger/10',
        success: 'bg-success text-success-ink hover:brightness-110',
      },
      size: {
        md: 'h-10 px-4 text-sm',
        /** Tablo satırı içindeki eylemler; satır yüksekliğini büyütmemeli. */
        sm: 'h-8 px-3 text-xs',
      },
    },
    defaultVariants: { tone: 'secondary', size: 'md' },
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

/**
 * Sayı rozeti (durum sekmelerinin yanındaki adet). `filterChipVariants` buna
 * uymaz: o chip'in sağında kapatma düğmesi olduğu için boşlukları asimetrik.
 */
export const adminBadgeVariants = cva(
  'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
  {
    variants: {
      tone: {
        plain: 'bg-surface-sunken text-ink-muted',
        active: 'bg-admin-primary text-admin-primary-ink',
      },
    },
    defaultVariants: { tone: 'plain' },
  },
)

/**
 * Durum sekmesi. Aktif sekmenin METNİ birincil renge boyanmaz: #3E5CE0 koyu
 * temada yüzeye göre ~2.9:1 kalıyor. Birincil renk alt çizgi ve rozetle verilir,
 * metin iki temada da okunur `ink` tonunda durur.
 */
export const adminTabVariants = cva(
  `-mb-px inline-flex items-center gap-2 whitespace-nowrap rounded-t border-b-2 px-4 py-2.5
   text-sm transition-colors ${ADMIN_FOCUS_RING}`,
  {
    variants: {
      tone: {
        plain: 'border-transparent text-ink-muted hover:text-ink',
        active: 'border-admin-primary font-semibold text-ink',
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

/**
 * Metin/seçim girdileri. `tone: 'invalid'` hatayı kenarlıkla da gösterir —
 * yalnız kırmızı yazı, rengi ayırt edemeyen kullanıcıya sinyal vermez.
 */
export const adminFieldVariants = cva(
  `h-10 rounded-lg border bg-surface px-3 text-sm text-ink
   placeholder:text-ink-disabled focus:outline-none
   disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-disabled`,
  {
    variants: {
      tone: {
        plain: 'border-edge focus:border-accent',
        invalid: 'border-danger focus:border-danger',
      },
    },
    defaultVariants: { tone: 'plain' },
  },
)

/** Çok satırlı girdi: sabit yükseklik yerine alt sınır, dikey iç boşluk. */
export const adminTextAreaVariants = cva(
  `min-h-24 rounded-lg border bg-surface px-3 py-2 text-sm text-ink
   placeholder:text-ink-disabled focus:outline-none
   disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-disabled`,
  {
    variants: {
      tone: {
        plain: 'border-edge focus:border-accent',
        invalid: 'border-danger focus:border-danger',
      },
    },
    defaultVariants: { tone: 'plain' },
  },
)

/** Sayısal alanın sağındaki alt alta duran yukarı/aşağı okları. */
export const stepperButtonVariants = cva(
  `flex h-1/2 w-7 items-center justify-center text-ink-muted transition-colors
   hover:bg-surface-sunken hover:text-ink
   disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:bg-transparent
   ${ADMIN_FOCUS_RING}`,
)

/** Form kartı (Proje / Yapı / Tesisat Bilgileri). */
export const formCardVariants = cva(
  'flex min-w-0 flex-col gap-4 rounded-xl border border-edge bg-surface p-5',
)

/** Alan etiketi; filtre çubuğundakinden büyük çünkü burada asıl içerik form. */
export const fieldLabelVariants = cva('text-sm font-medium text-ink')
