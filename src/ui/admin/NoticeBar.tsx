import { CircleAlert, CircleCheck, TriangleAlert, X } from 'lucide-react'

import { ADMIN_FOCUS_RING } from './adminVariants'

/**
 * `warning`: işlem BAŞARILI ama yarım — hata değil, o yüzden `danger` tonu
 * kullanılmıyor ve `role="alert"` verilmiyor. Ton, durum rozetleriyle aynı amber
 * token'ından geliyor (bkz. knowledge/theming.md: `warning` yalnız
 * ikon/kenarlık, metin rengi olarak sınanmadı).
 */
export type NoticeTone = 'success' | 'error' | 'warning'

interface NoticeBarProps {
  tone: NoticeTone
  message: string
  /** Eksik evrak gibi madde listesi; boşsa hiç render edilmez. */
  details?: string[]
  onDismiss: () => void
}

const NOTICE_ICONS = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
} as const

const NOTICE_ICON_COLORS = {
  success: 'size-5 shrink-0 text-success',
  error: 'size-5 shrink-0 text-danger',
  warning: 'size-5 shrink-0 text-warning',
} as const

const NOTICE_BASE =
  'flex items-start gap-3 rounded-xl border border-edge bg-surface px-4 py-3 text-sm text-ink'

/** Yarım başarı yalnız SOL KENARLIKLA ayrışır: amber token'ı zemin ya da metin
    rengi olarak sınanmadı (knowledge/theming.md). `cva` ile `adminVariants`'a
    çıkarılmadı — tek bileşende, tek kullanımda. */
const NOTICE_TONE_CLASSES = {
  success: '',
  error: '',
  warning: 'border-l-4 border-l-warning',
} as const

/**
 * Sayfa üstündeki tek uyarı şeridi. Hata `role="alert"` ile hemen okunur,
 * olumlu bildirim ve yarım-başarı uyarısı `role="status"` ile kullanıcının
 * işini bölmeden duyurulur.
 */
export function NoticeBar({ tone, message, details, onDismiss }: NoticeBarProps) {
  const Icon = NOTICE_ICONS[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`${NOTICE_BASE} ${NOTICE_TONE_CLASSES[tone]}`.trim()}
    >
      <Icon aria-hidden className={NOTICE_ICON_COLORS[tone]} />

      <div className="flex-1">
        <p>{message}</p>
        {details !== undefined && details.length > 0 && (
          <ul className="mt-1 list-inside list-disc text-ink-muted">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Bildirimi kapat"
        className={`inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken ${ADMIN_FOCUS_RING}`}
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
