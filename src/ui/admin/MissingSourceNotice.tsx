import { DatabaseZap } from 'lucide-react'

const TITLE = 'Bu bölümün veri kaynağı henüz yok.'

/**
 * Üretim derlemesinde mock üretilmediği için boş kalan bölümün karşılığı (K50).
 *
 * Sahte veri yerine BOŞLUK gösteriliyor ve boşluğun sebebi yazıyor: veri
 * olmadığını söylemek, olmayan veriyi uydurmaktan iyidir. Geliştirmede bu kutu
 * görünmez, yerine örnek veri + kalıcı uyarı şeridi çıkar.
 */
export function MissingSourceNotice({ endpointHint }: { endpointHint: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-edge bg-surface px-4 py-6 text-sm">
      <DatabaseZap aria-hidden className="size-5 shrink-0 text-ink-disabled" />

      <div>
        <p className="font-semibold text-ink">{TITLE}</p>
        <p className="mt-0.5 text-ink-muted">
          Sunucuda karşılığı olan bir uç açılınca bu bölüm dolacak ({endpointHint}).
        </p>
      </div>
    </div>
  )
}
