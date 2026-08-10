import { Info } from 'lucide-react'

interface FieldWarningProps {
  id: string
  children: string
}

/**
 * Alan altındaki ENGELLEMEYEN bilgi (ör. "bu isme benzeyen kayıtlar var").
 *
 * Hata değildir: `danger` tonu kullanılmaz, kenarlığı kırmızıya çevirmez,
 * kaydetmeyi durdurmaz. Ton bilerek nötr — kullanıcı bakıp kendisi karar verir.
 *
 * `role="status"`: uyarı çoğunlukla alandan ÇIKINCA belirir, yani odak artık
 * girdide değildir. Yalnız `aria-describedby` ile bağlansaydı ekran okuyucu
 * kullanıcısı uyarıyı hiç duymazdı.
 */
export function FieldWarning({ id, children }: FieldWarningProps) {
  return (
    <p id={id} role="status" className="flex items-start gap-1.5 text-xs text-ink-muted">
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent-ink" />
      {children}
    </p>
  )
}
