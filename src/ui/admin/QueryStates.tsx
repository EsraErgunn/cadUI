import { CircleAlert, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { adminButtonVariants } from './adminVariants'

interface QueryLoadingProps {
  message: string
}

export function QueryLoading({ message }: QueryLoadingProps) {
  return (
    <p className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-4 py-12 text-sm text-ink-muted">
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      {message}
    </p>
  )
}

interface QueryErrorProps {
  message: string
  /**
   * Yeniden deneme yolu YOKSA verilmez ve düğme hiç çizilmez — bozuk adres gibi
   * durumlarda "Tekrar dene" aynı hatayı üretir, kullanıcıyı boşuna uğraştırırdı.
   */
  onRetry?: () => void
}

export function QueryError({ message, onRetry }: QueryErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-surface px-4 py-6 text-sm text-ink"
    >
      <CircleAlert aria-hidden className="size-5 text-danger" />
      <span>{message}</span>
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className={adminButtonVariants({ tone: 'secondary' })}
        >
          Tekrar dene
        </button>
      )}
    </div>
  )
}

interface StaleContentProps {
  isStale: boolean
  children: ReactNode
}

/** Sayfa değişirken eski veri ekranda kalır (tablo boşalıp zıplamasın); tazelenme
    sürdüğü belli olsun diye içerik soluklaştırılır. */
export function StaleContent({ isStale, children }: StaleContentProps) {
  return (
    <div className={isStale ? 'flex flex-col gap-4 opacity-60' : 'flex flex-col gap-4'}>
      {children}
    </div>
  )
}
