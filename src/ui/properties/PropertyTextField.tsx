import { useId, useState } from 'react'

type PropertyTextFieldProps = {
  label: string
  /** Ayrışan değer: çoklu seçimde nesneler farklıysa undefined gelir. */
  value: string | undefined
  /** Değer hangi nesneye ait — hedef değişince taslak metin tazelenir. */
  targetKey: string
  isReadOnly?: boolean
  /** false dönerse yazım reddedilmiştir: alan eski değerine döner ve gerekçe gösterilir. */
  onCommit?: (value: string) => boolean
  rejectionMessage?: string
}

const MIXED_PLACEHOLDER = 'Farklı'

/**
 * Özellik panelinin metin alanı — `PropertyNumberField` ile AYNI commit-on-
 * blur/Enter deseni (taslak metin, hedef senkronu, red görünümü), yalnız sayı
 * ayrıştırma/min/step yok: yazılan metin OLDUĞU GİBİ commit edilir.
 */
export function PropertyTextField({
  label,
  value,
  targetKey,
  isReadOnly = false,
  onCommit,
  rejectionMessage,
}: PropertyTextFieldProps) {
  const inputId = useId()
  const displayText = value ?? ''

  const [draftText, setDraftText] = useState(displayText)
  const [syncedFrom, setSyncedFrom] = useState({ targetKey, displayText })
  const [isRejected, setIsRejected] = useState(false)

  // Seçim değişince ya da değer dışarıdan güncellenince metin tazelenir.
  if (syncedFrom.targetKey !== targetKey || syncedFrom.displayText !== displayText) {
    setSyncedFrom({ targetKey, displayText })
    setDraftText(displayText)
    setIsRejected(false)
  }

  const commit = () => {
    if (!onCommit) return

    const isApplied = onCommit(draftText)
    setIsRejected(!isApplied)
    // Reddedilen değer ekranda kalmaz — yalan bir metin bırakmak yerine geri döner.
    if (!isApplied) setDraftText(displayText)
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <label className="text-xs text-ink-muted" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex flex-col items-end">
        <input
          id={inputId}
          type="text"
          className="w-24 rounded border border-edge bg-surface px-1.5 py-0.5 text-right text-sm text-ink read-only:text-ink-muted aria-invalid:border-danger"
          value={draftText}
          placeholder={value === undefined ? MIXED_PLACEHOLDER : undefined}
          readOnly={isReadOnly}
          aria-invalid={isRejected}
          onChange={(event) => setDraftText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
        {isRejected && rejectionMessage && (
          <span aria-live="polite" className="mt-0.5 text-xs text-danger">
            {rejectionMessage}
          </span>
        )}
      </div>
    </div>
  )
}
