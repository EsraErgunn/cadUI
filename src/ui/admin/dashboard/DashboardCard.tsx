import type { LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { formCardVariants } from '../adminVariants'

interface DashboardCardProps {
  title: string
  icon?: LucideIcon
  /** Başlığın SAĞINDA duran ek: "Bugün gelen projeler", "Tümünü Gör" gibi. */
  headerSlot?: ReactNode
  children: ReactNode
}

/**
 * Gösterge panelinin kart kabuğu. `FormCard` ile aynı işi yapmıyor: o form
 * bölümü için `<section>` + zorunlu ikon kuruyor, burada başlığın sağında ek
 * bir yuva var ve ikon opsiyonel.
 *
 * `aria-labelledby`: ekran okuyucu kullanıcısı kartlar arasında gezerken hangi
 * kartta olduğunu duyar; dar ekranda kartlar alt alta inince de bölümleme kalır.
 */
export function DashboardCard({ title, icon, headerSlot, children }: DashboardCardProps) {
  const titleId = useId()
  // JSX'te bileşen olarak kullanmak için büyük harfle başlayan yerel değişken şart.
  const Icon = icon

  return (
    <section aria-labelledby={titleId} className={formCardVariants()}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold text-ink">
          {Icon !== undefined && <Icon aria-hidden className="size-4 text-accent-ink" />}
          {title}
        </h2>
        {headerSlot}
      </div>

      {children}
    </section>
  )
}
