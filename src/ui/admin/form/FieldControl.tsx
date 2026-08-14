import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { fieldLeadingIconVariants, fieldTrailingTextVariants } from '../adminVariants'

interface FieldControlProps {
  /** Girdinin içinde solda duran alan ikonu; verilmezse sarmalayıcı hiç kurulmaz. */
  leftIcon?: LucideIcon
  /** Girdinin içinde sağda duran birim ("₺"); değerin parçası DEĞİL, göstergesi. */
  suffix?: string
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
export function FieldControl({ leftIcon, suffix, children }: FieldControlProps) {
  const Icon = leftIcon
  if (Icon === undefined && suffix === undefined) return <>{children}</>

  return (
    <div className="relative flex min-w-0 flex-col">
      {Icon !== undefined && <Icon aria-hidden className={fieldLeadingIconVariants()} />}
      {children}
      {/* `aria-hidden`: birim etiketin/yardım metninin işi, ekran okuyucu
          değeri "1.234,56 ₺" diye iki kez duymasın. */}
      {suffix !== undefined && (
        <span aria-hidden className={fieldTrailingTextVariants()}>
          {suffix}
        </span>
      )}
    </div>
  )
}
