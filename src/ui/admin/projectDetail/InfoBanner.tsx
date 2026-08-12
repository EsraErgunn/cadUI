import { Info } from 'lucide-react'

/**
 * "Bilgilendirme; …" kutusu (KK-9). Evrak ve poliçe sekmelerinin boş durumu bu
 * biçimde gösteriliyor; `EmptyState` kullanılmadı çünkü gereksinim metni
 * "Bilgilendirme;" ön ekini ve kutu görünümünü açıkça istiyor.
 */
export function InfoBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-edge bg-surface-sunken px-4 py-3 text-sm text-ink">
      <Info aria-hidden className="size-5 shrink-0 text-ink-muted" />
      <p>
        <b>Bilgilendirme;</b> {message}
      </p>
    </div>
  )
}
