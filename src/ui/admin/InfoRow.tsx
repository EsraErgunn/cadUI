import type { ReactNode } from 'react'

import { EmptyValue } from './EmptyValue'
import { MockValue } from './MockValue'

interface InfoRowProps {
  label: string
  /** `null` → soluk "—" (KK-5). Boş dize de değer sayılmaz. */
  value: ReactNode
  /** Değer sunucudan değil mock'tan geliyor; ayırt edilebilir işaretle çizilir. */
  isMock?: boolean
}

function hasValue(value: ReactNode): boolean {
  return value !== null && value !== undefined && value !== ''
}

/**
 * Etiket / değer satırı. Etiket sola dayalı ve KÜÇÜK BÜYÜK harfli (mockup'taki
 * ritim), değer sağ sütunda. `dl` içinde `div` sarmalayıcı: `dt`/`dd` çiftini
 * grid hücresi olarak hizalamanın tarayıcılar arası tutarlı tek yolu.
 *
 * `projectDetail/` altından buraya TAŞINDI: poliçe özeti aynı satırı istedi ve
 * klasör sözleşmesi ikinci ekranda gereken parçayı ortaklaştırmayı söylüyor —
 * kopyası çıkarılsaydı iki kartın ritmi zamanla ayrışırdı.
 */
export function InfoRow({ label, value, isMock = false }: InfoRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-baseline gap-3 border-t border-edge px-5 py-2.5 text-sm">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">
        {!hasValue(value) ? (
          <EmptyValue />
        ) : isMock ? (
          <MockValue>{value}</MockValue>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
