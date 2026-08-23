import { Search } from 'lucide-react'

import { roomDefinitionChipVariants } from './canvasBarVariants'
import type { RoomUsageType } from '../../core/roomUsage'

type RoomUsagePickerProps = {
  query: string
  onQueryChange: (query: string) => void
  /** Aramadan GEÇMİŞ seçenekler; rakam rozetleri bu sıraya göre basılır. */
  visibleOptions: readonly { value: RoomUsageType; label: string }[]
  onPick: (usageType: RoomUsageType) => void
  /** Arama kutusu boşken Esc: kip kapanır. */
  onDismiss: () => void
}

/**
 * Mahal tipi seçici: arama kutusu + rozetler. Karttan AYRI dosya çünkü kart
 * 200 satırı aşıyordu; sınır kendiliğinden buradan geçti — kart durakları ve
 * gezinmeyi, bu ise tip seçmeyi biliyor.
 */
export function RoomUsagePicker({
  query,
  onQueryChange,
  visibleOptions,
  onPick,
  onDismiss,
}: RoomUsagePickerProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Enter = görünen ilk rozet. Tek sonuca inen aramada tipi yazmanın en kısa
      // yolu ("cama" + Enter → Çamaşırlık).
      event.preventDefault()
      const option = visibleOptions[0]
      if (option) onPick(option.value)
      return
    }
    if (event.key !== 'Escape') return

    // Esc önce ARAMAYI temizler: kutu doluyken Esc'e basan kullanıcı aramadan
    // vazgeçiyor, işten değil. Kutu boşken ikinci Esc kipi kapatır.
    //
    // ⚠️ Kapatma BURADA yapılıyor, pencere dinleyicisine bırakılarak değil: o
    // dinleyici yazı alanlarını atlıyor (`isTypingTarget`), yani kutu
    // odaktayken Esc oraya hiç ulaşmaz.
    if (query === '') onDismiss()
    else onQueryChange('')
  }

  return (
    <>
      {/* Kutu ODAK ALMIYOR (autoFocus yok): odaklı olsaydı rakam tuşları rozet
          seçmek yerine kutuya yazardı. Kutuya girmenin bedeli bir tık. */}
      <div className="relative px-4 pt-2.5">
        <Search
          size={14}
          strokeWidth={1.8}
          aria-hidden
          className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mahal tipi ara…"
          aria-label="Mahal tipi ara"
          className="w-full rounded-lg border border-edge bg-surface py-1 pl-7 pr-2 text-sm text-ink placeholder:text-ink-muted"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 p-4 pt-2.5">
        {visibleOptions.length === 0 && (
          <p className="py-1 text-xs text-ink-muted">Aramaya uyan mahal tipi yok.</p>
        )}
        {/* Rozetlerde RAKAM KISAYOLU YOK (kullanıcı kararı): tek basışlık tuş
            dokuz taneydi, liste yirmi beş — kısayol tiplerin ancak üçte birine
            yetiyordu. Yarısına yeten bir kısayol, "hangileri var?" diye
            bakılan ikinci bir kural üretir. Hızlı yol arama kutusu. */}
        {visibleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPick(option.value)}
            className={roomDefinitionChipVariants()}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  )
}
