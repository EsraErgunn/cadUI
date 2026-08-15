import { useId, useState } from 'react'

export type PropertySelectOption = { value: string; label: string }

type PropertySelectFieldProps = {
  label: string
  /** Ayrışan değer: çoklu seçimde nesneler farklıysa undefined gelir. */
  value: string | undefined
  options: readonly PropertySelectOption[]
  /** Değer hangi nesneye ait — PropertyNumberField/PropertyTextField ile aynı imza,
   *  burada yalnız tutarlılık için tutulur (seçimde taslak metin yok, senkron gerekmez). */
  targetKey: string
  isReadOnly?: boolean
  /** false dönerse yazım reddedilmiştir. */
  onCommit?: (value: string) => boolean
  rejectionMessage?: string
}

const MIXED_VALUE = ''

/**
 * Özellik panelinin seçim (select) alanı. Metin/sayı alanlarındaki taslak-metin
 * sorunu yok (kullanıcı harf harf yazmıyor, bir seçenek seçiyor), bu yüzden
 * değişiklik DOĞRUDAN commit edilir.
 */
export function PropertySelectField({
  label,
  value,
  options,
  targetKey,
  isReadOnly = false,
  onCommit,
  rejectionMessage,
}: PropertySelectFieldProps) {
  const inputId = useId()

  const [isRejected, setIsRejected] = useState(false)
  const [syncedTargetKey, setSyncedTargetKey] = useState(targetKey)

  // Seçim değişince red bayrağı tazelenir — önceki nesnenin reddi yeni
  // nesnede görünmesin.
  if (syncedTargetKey !== targetKey) {
    setSyncedTargetKey(targetKey)
    setIsRejected(false)
  }

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isReadOnly || !onCommit) return
    const isApplied = onCommit(event.target.value)
    setIsRejected(!isApplied)
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <label className="text-xs text-ink-muted" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex flex-col items-end">
        <select
          id={inputId}
          className="w-24 rounded border border-edge bg-surface px-1.5 py-0.5 text-right text-sm text-ink disabled:text-ink-muted aria-invalid:border-danger"
          value={value ?? MIXED_VALUE}
          disabled={isReadOnly}
          aria-invalid={isRejected}
          onChange={handleChange}
        >
          {value === undefined && (
            <option value={MIXED_VALUE} disabled hidden>
              Farklı
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isRejected && rejectionMessage && (
          <span aria-live="polite" className="mt-0.5 text-xs text-danger">
            {rejectionMessage}
          </span>
        )}
      </div>
    </div>
  )
}
