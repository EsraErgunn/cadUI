import { useId, useState } from 'react'

import { FLOOR_FOCUS_RING } from './floorVariants'
import { isFloorHeightValid } from '../../core/floors'

type NewFloorHeightFieldProps = {
  heightCm: number
  onChange: (heightCm: number) => void
}

/**
 * "Yeni kat yüksekliği" (madde 3). Bu alan MEVCUT katların yüksekliğini
 * değiştirmez — yalnız bundan sonra eklenecek katlara uygulanır; kural alanın
 * altında yazılı, çünkü tersini varsayan kullanıcı bütün binayı tek alandan
 * ayarlamayı dener.
 */
export function NewFloorHeightField({ heightCm, onChange }: NewFloorHeightFieldProps) {
  const inputId = useId()
  const [draftText, setDraftText] = useState(String(heightCm))

  const commit = () => {
    const parsed = Number.parseInt(draftText, 10)
    if (Number.isFinite(parsed) && isFloorHeightValid(parsed)) {
      onChange(parsed)
      return
    }
    // Sınır dışı değer kabul edilmez ve ekranda da kalmaz.
    setDraftText(String(heightCm))
  }

  return (
    <div>
      <label className="text-xs text-ink-muted" htmlFor={inputId}>
        Yeni kat yüksekliği
      </label>
      <div className="mt-1 inline-flex items-center gap-1">
        <input
          id={inputId}
          value={draftText}
          inputMode="numeric"
          onChange={(event) => setDraftText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          className={`w-20 rounded-md border border-edge bg-surface px-2 py-1 text-sm text-ink ${FLOOR_FOCUS_RING}`}
        />
        <span className="text-xs text-ink-muted">cm</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Yalnızca bundan sonra eklenen katlara uygulanır; mevcut katları değiştirmez.
      </p>
    </div>
  )
}
