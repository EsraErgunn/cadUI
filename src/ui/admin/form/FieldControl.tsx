import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { fieldLeadingIconVariants } from '../adminVariants'

interface FieldControlProps {
  /** Girdinin içinde solda duran alan ikonu; verilmezse sarmalayıcı hiç kurulmaz. */
  leftIcon?: LucideIcon
  children: ReactNode
}

/**
 * Girdinin içine ikon yerleştiren konumlandırma kabı.
 *
 * `TextField`, `SelectField` ve `PhoneField` aynı sarmalayıcıyı kuruyordu;
 * K25'teki kural gereği üçüncü kopyada ortak yardımcıya çıkarıldı.
 *
 * `flex flex-col`: girdi kabın genişliğini kaplasın — `relative` tek başına
 * satır içi kutu bırakıyor ve alan sütuna yayılmıyordu.
 */
export function FieldControl({ leftIcon, children }: FieldControlProps) {
  const Icon = leftIcon
  if (Icon === undefined) return <>{children}</>

  return (
    <div className="relative flex min-w-0 flex-col">
      <Icon aria-hidden className={fieldLeadingIconVariants()} />
      {children}
    </div>
  )
}
