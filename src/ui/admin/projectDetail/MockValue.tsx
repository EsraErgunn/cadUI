import type { ReactNode } from 'react'

const MOCK_HINT = 'Örnek değer — bu alanın sunucuda karşılığı henüz yok.'

/**
 * Sunucuda karşılığı olmayan, geliştirmede uydurulmuş değerin işareti.
 *
 * BİLEREK renk token'ı KULLANMIYOR. Ekranda amber zaten olağan bir renk
 * ("Proje Güncelleme" etiketi, onay kartının kenarlığı); mock işareti de amber
 * olsaydı tam olarak arka plana karışırdı. Bunun yerine kesikli alt çizgi:
 * renkten ve temadan bağımsız, iki temada da aynı okunur.
 *
 * İşaret yalnız görsel değil — açıklaması `sr-only` metinle ekran okuyucuya da
 * ulaşıyor; yalnız kesikli çizgiyle verilseydi ulaşmazdı.
 */
export function MockValue({ children }: { children: ReactNode }) {
  return (
    <span className="cursor-help border-b border-dashed border-current" title={MOCK_HINT}>
      {children}
      <span className="sr-only"> ({MOCK_HINT})</span>
    </span>
  )
}
