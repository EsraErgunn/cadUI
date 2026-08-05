import { useId, useState } from 'react'

type PropertyNumberFieldProps = {
  label: string
  /** Ayrışan değer: çoklu seçimde nesneler farklı değerdeyse undefined gelir. */
  valueCm: number | undefined
  /** Değer hangi nesneye ait — hedef değişince taslak metin tazelenir. */
  targetKey: string
  minCm?: number
  stepCm?: number
  isReadOnly?: boolean
  /** false dönerse yazım reddedilmiştir: alan eski değerine döner ve uyarı gösterilir. */
  onCommit?: (valueCm: number) => boolean
  rejectionMessage?: string
}

const MIXED_PLACEHOLDER = 'Farklı'

/**
 * Özellik panelinin sayısal alanı.
 *
 * Yazarken store'a YAZILMAZ: girdi doğrudan store'dan beslenirse her tuş yeniden
 * render eder ve rakamlar eski değerin üstüne eklenir (90 + "100" → 90100).
 * Yazım blur ya da Enter'da yapılır — OpeningToolOptions ile aynı desen, buraya
 * çıkarıldı çünkü panelde üç alan aynı davranışı istiyor.
 */
export function PropertyNumberField({
  label,
  valueCm,
  targetKey,
  minCm,
  stepCm = 1,
  isReadOnly = false,
  onCommit,
  rejectionMessage,
}: PropertyNumberFieldProps) {
  const inputId = useId()
  const displayText = valueCm === undefined ? '' : String(valueCm)

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

    const nextValue = Number.parseFloat(draftText)
    if (!Number.isFinite(nextValue)) {
      setDraftText(displayText)
      setIsRejected(false)
      return
    }

    const isApplied = onCommit(nextValue)
    setIsRejected(!isApplied)
    // Reddedilen değer ekranda kalmaz — yalan bir sayı göstermek yerine geri döner.
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
          type="number"
          className="w-24 rounded border border-edge bg-surface px-1.5 py-0.5 text-right text-sm text-ink read-only:text-ink-muted aria-[invalid=true]:border-danger"
          value={draftText}
          placeholder={valueCm === undefined ? MIXED_PLACEHOLDER : undefined}
          min={minCm}
          step={stepCm}
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
