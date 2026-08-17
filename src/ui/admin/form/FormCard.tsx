import type { LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { formCardVariants } from '../adminVariants'

interface FormCardProps {
  title: string
  icon: LucideIcon
  children: ReactNode
}

/**
 * Formun üç bölümünden biri. `<section>` + `aria-labelledby`: ekran okuyucu
 * kullanıcısı alanlar arasında gezerken hangi kartta olduğunu duyar, kartlar
 * dar ekranda alt alta indiğinde de bölümleme korunur.
 *
 * `@container`: içerideki alan çiftleri (İl/İlçe, Daire/İşyeri) EKRAN değil KART
 * genişliğine bakar. Ekran kırılımıyla (`sm:grid-cols-2`) çalışırken 1024–1280
 * px arasında dış ızgara üç sütuna geçiyor, kart ~220–300 px'e düşüyor ve iki
 * alan yan yana ~120 px'lik kullanılamaz kutulara bölünüyordu.
 */
export function FormCard({ title, icon, children }: FormCardProps) {
  const titleId = useId()
  // JSX'te bileşen olarak kullanmak için büyük harfle başlayan yerel değişken şart.
  const Icon = icon

  return (
    <section aria-labelledby={titleId} className={formCardVariants({ className: '@container' })}>
      <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon aria-hidden className="size-4 text-accent-ink" />
        {title}
      </h2>

      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}
