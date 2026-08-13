import { TriangleAlert } from 'lucide-react'

const TITLE = 'Bu ekrandaki bazı veriler sunucudan gelmiyor.'

const EXPLANATION =
  'Aşağıdaki bölümlerin uçları henüz yazılmadı; değerler örnektir ve kaydedilmez. Örnek değerler kesikli çizgiyle işaretlendi.'

interface MockDataNoticeProps {
  /** Hangi bölümlerin uydurma olduğu; boşsa şerit hiç çizilmez. */
  sections: string[]
}

/**
 * Mock veri uyarısı. KAPATILAMAZ ve kalıcıdır (`NoticeBar` kullanılmadı, onun
 * kapatma düğmesi zorunlu): karma veri gösteren bir ekranın en bilinen
 * başarısızlığı, uyarının bir kez kapatılıp sahte kayıtların gerçek sanılması.
 *
 * Metin genel değil, bölümleri SAYAR — "bazı veriler eksik" cümlesi kullanıcıya
 * hangi kartın uydurma olduğunu söylemez.
 *
 * Üretim derlemesinde bu şerit hiç görünmez: orada mock zaten üretilmiyor,
 * bölümler boş kalıyor (K50).
 */
export function MockDataNotice({ sections }: MockDataNoticeProps) {
  if (sections.length === 0) return null

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-edge border-l-4 border-l-warning bg-surface px-4 py-3 text-sm text-ink"
    >
      <TriangleAlert aria-hidden className="size-5 shrink-0 text-warning" />

      <div className="flex-1">
        <p className="font-semibold">{TITLE}</p>
        <p className="mt-0.5 text-ink-muted">{EXPLANATION}</p>
        <ul className="mt-1 list-inside list-disc text-ink-muted">
          {sections.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
