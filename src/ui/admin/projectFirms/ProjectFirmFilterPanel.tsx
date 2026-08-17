import { X } from 'lucide-react'

import { FilterSelect } from '../FilterSelect'
import { ADMIN_FOCUS_RING } from '../adminVariants'

/**
 * İki kutu da pasif ama sebepleri ARTIK AYNI DEĞİL, bu yüzden ipuçları da ayrı:
 *
 * - Yeterlilik durumu: satır bu bilgiyi taşımıyor ve veren uç yok. Seçim
 *   uygulanabilseydi liste ilk seçimde boşalır ve kullanıcı veri kaybettiğini
 *   sanardı (docs/kararlar.md K27, K29).
 * - G.D. firması: veri GELDİ (yetki ucu, "G.D. Firması" sütunu dolu) ama süzgeç
 *   henüz bağlanmadı — süzmek KK-5 satır kararına bağlı, önce o verilecek.
 *
 * Panel yine de açılıyor: gereksinim 4.3 "Filtrele tıklanınca kriter alanı
 * açılır" diyor ve kullanıcının hangi kriterlerin geleceğini görmesi, düğmenin
 * hiçbir şey yapmamasından iyi.
 */
const MISSING_DATA_HINT = 'Bu bilgi sunucudan gelene kadar filtre kullanılamıyor.'
const NOT_WIRED_HINT = 'Bu süzgeç henüz açılmadı.'

const ANY_GAS_FIRM_LABEL = 'Tümü'
const ANY_QUALIFICATION_LABEL = 'Tümü'

const NO_OPTIONS: never[] = []

interface ProjectFirmFilterPanelProps {
  onClose: () => void
}

export function ProjectFirmFilterPanel({ onClose }: ProjectFirmFilterPanelProps) {
  return (
    <section
      aria-label="Ek filtre kriterleri"
      className="flex flex-wrap items-start gap-4 rounded-xl border border-edge bg-surface p-4"
    >
      {/* Seçenekler ÇEKİLMİYOR: pasif kutuya liste doldurmak için ağ isteği
          atmak boşuna. Süzgeç açılınca kaynak uçlar buraya bağlanacak. */}
      <FilterSelect
        id="project-firm-filter-gas-firm"
        label="G.D. Firması"
        emptyLabel={ANY_GAS_FIRM_LABEL}
        value={null}
        options={NO_OPTIONS}
        isDisabled
        hint={NOT_WIRED_HINT}
        onChange={() => {}}
      />
      <FilterSelect
        id="project-firm-filter-qualification"
        label="Yeterlilik Durumu"
        emptyLabel={ANY_QUALIFICATION_LABEL}
        value={null}
        options={NO_OPTIONS}
        isDisabled
        hint={MISSING_DATA_HINT}
        onChange={() => {}}
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Filtre alanını kapat"
        className={`ml-auto inline-flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken ${ADMIN_FOCUS_RING}`}
      >
        <X aria-hidden className="size-4" />
      </button>
    </section>
  )
}
