import { CircleAlert } from 'lucide-react'

interface FieldErrorProps {
  id: string
  children: string
}

/**
 * Alan altındaki hata mesajı. `role="alert"` var: hata gönderim sonrası
 * belirdiği için ekran okuyucunun odak taşınmadan da duyurması gerekir.
 * Yanındaki ikon, mesajı yalnız renkle ayırt edilir olmaktan çıkarır.
 */
export function FieldError({ id, children }: FieldErrorProps) {
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs text-danger-ink">
      <CircleAlert aria-hidden className="size-3.5 shrink-0" />
      {children}
    </p>
  )
}
