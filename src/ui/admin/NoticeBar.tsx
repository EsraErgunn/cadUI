import { CircleAlert, CircleCheck, X } from 'lucide-react'

import { ADMIN_FOCUS_RING } from './adminVariants'

export type NoticeTone = 'success' | 'error'

interface NoticeBarProps {
  tone: NoticeTone
  message: string
  /** Eksik evrak gibi madde listesi; boşsa hiç render edilmez. */
  details?: string[]
  onDismiss: () => void
}

/**
 * Sayfa üstündeki tek uyarı şeridi. Hata `role="alert"` ile hemen okunur,
 * olumlu bildirim `role="status"` ile kullanıcının işini bölmeden duyurulur.
 */
export function NoticeBar({ tone, message, details, onDismiss }: NoticeBarProps) {
  const isError = tone === 'error'
  const Icon = isError ? CircleAlert : CircleCheck

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className="flex items-start gap-3 rounded-xl border border-edge bg-surface px-4 py-3 text-sm text-ink"
    >
      <Icon aria-hidden className={isError ? 'size-5 text-danger' : 'size-5 text-success'} />

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
