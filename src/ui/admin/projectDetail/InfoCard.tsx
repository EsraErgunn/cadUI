import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface InfoCardProps {
  title: string
  icon: LucideIcon
  /**
   * Onay kartı amber SOL KENARLIKLA ayrışır (belge + KK-4). Yalnız kenarlık:
   * `warning` token'ı zemin ya da metin rengi olarak sınanmadı
   * (knowledge/theming.md).
   */
  isAccented?: boolean
  children: ReactNode
}

const CARD_BASE = 'flex min-w-0 flex-col rounded-xl border border-edge bg-surface'

export function InfoCard({ title, icon, isAccented = false, children }: InfoCardProps) {
  // Bileşen olarak kullanılacağı için büyük harfle başlayan bir yerele alınıyor;
  // JSX küçük harfli adı HTML etiketi sanardı.
  const Icon = icon

  return (
    <section
      aria-label={title}
      className={isAccented ? `${CARD_BASE} border-l-4 border-l-warning` : CARD_BASE}
    >
      <h2 className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-ink">
        <Icon aria-hidden className="size-4 text-ink-muted" />
        {title}
      </h2>

      {/* Satırlar arası ayraç listenin kendisinden geliyor; kart başlığı ile ilk
          satır arasında çift çizgi olmasın diye başlık kenarlıksız. */}
      <dl className="flex flex-col">{children}</dl>
    </section>
  )
}
