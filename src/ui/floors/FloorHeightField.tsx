import { useState } from 'react'

import { FLOOR_FOCUS_RING } from './floorVariants'
import { MAX_FLOOR_HEIGHT_CM, MIN_FLOOR_HEIGHT_CM } from '../../core/floors'

const STEP_CM = 10

type FloorHeightFieldProps = {
  label: string
  heightCm: number
  /** false dönerse yazım reddedilmiştir: alan eski değerine döner. */
  onCommit: (heightCm: number) => boolean
}

/**
 * Satır içi yükseklik alanı (madde 6). Yazarken taslağa YAZILMAZ: girdi doğrudan
 * taslaktan beslenirse her tuşta yeniden render olur ve rakamlar eski değerin
 * üstüne eklenir (30 + "0" → 300 yerine 3000). Yazım blur/Enter'da yapılır —
 * PropertyNumberField ile aynı desen, ama o alan satır düzeninde (etiket solda,
 * geniş kutu) ve tablo hücresine sığmıyor.
 */
export function FloorHeightField({ label, heightCm, onCommit }: FloorHeightFieldProps) {
  const displayText = String(heightCm)
  const [draftText, setDraftText] = useState(displayText)
  const [syncedText, setSyncedText] = useState(displayText)

  // Değer dışarıdan değişti (artır/azalt, geri alma): metin tazelenir.
  if (syncedText !== displayText) {
    setSyncedText(displayText)
    setDraftText(displayText)
  }

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed) || !onCommit(parsed)) setDraftText(displayText)
  }

  const nudge = (deltaCm: number) => {
    const next = Math.min(MAX_FLOOR_HEIGHT_CM, Math.max(MIN_FLOOR_HEIGHT_CM, heightCm + deltaCm))
    onCommit(next)
  }

  return (
    <div className="inline-flex items-center gap-1">
      <div className="inline-flex items-center rounded-md border border-edge bg-surface">
        <button
          type="button"
          onClick={() => nudge(-STEP_CM)}
          disabled={heightCm <= MIN_FLOOR_HEIGHT_CM}
          aria-label={`${label} yüksekliğini azalt`}
          className={`size-6 text-ink-muted disabled:text-ink-disabled ${FLOOR_FOCUS_RING}`}
        >
          −
        </button>
        <input
          value={draftText}
          inputMode="numeric"
          aria-label={`${label} yüksekliği`}
          onChange={(event) => setDraftText(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          className={`w-12 border-x border-edge bg-transparent py-0.5 text-center text-sm text-ink ${FLOOR_FOCUS_RING}`}
        />
        <button
          type="button"
          onClick={() => nudge(STEP_CM)}
          disabled={heightCm >= MAX_FLOOR_HEIGHT_CM}
          aria-label={`${label} yüksekliğini artır`}
          className={`size-6 text-ink-muted disabled:text-ink-disabled ${FLOOR_FOCUS_RING}`}
        >
          +
        </button>
      </div>
      <span className="text-xs text-ink-muted">cm</span>
    </div>
  )
}
