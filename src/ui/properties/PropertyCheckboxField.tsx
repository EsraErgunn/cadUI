import { useId, useState } from 'react'

type PropertyCheckboxFieldProps = {
  label: string
  /** Ayrışan değer: çoklu seçimde nesneler farklıysa undefined gelir (checkbox
   *  `indeterminate` ile gösterilir). */
  checked: boolean | undefined
  /** Değer hangi nesneye ait — hedef değişince red bayrağı sıfırlanır. */
  targetKey: string
  isReadOnly?: boolean
  /** false dönerse yazım reddedilmiştir: kutu eski değerine döner. */
  onCommit?: (next: boolean) => boolean
  rejectionMessage?: string
}

/**
 * Özellik panelinin onay kutusu alanı. PropertyNumberField'daki gibi bir
 * taslak-metin sorunu yok (yarım yazım diye bir durum yoktur), bu yüzden
 * değişiklik DOĞRUDAN commit edilir — draft metin state'i gerekmez, yalnız
 * red bayrağı (PropertyNumberField'daki isRejected ile aynı gerekçe) tutulur.
 */
export function PropertyCheckboxField({
  label,
  checked,
  targetKey,
  isReadOnly = false,
  onCommit,
  rejectionMessage,
}: PropertyCheckboxFieldProps) {
  const inputId = useId()

  const [isRejected, setIsRejected] = useState(false)
  const [syncedTargetKey, setSyncedTargetKey] = useState(targetKey)

  // Seçim değişince red bayrağı tazelenir — önceki nesnenin reddi yeni
  // nesnede görünmesin.
  if (syncedTargetKey !== targetKey) {
    setSyncedTargetKey(targetKey)
    setIsRejected(false)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || !onCommit) return
    const isApplied = onCommit(event.target.checked)
    setIsRejected(!isApplied)
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <label className="text-xs text-ink-muted" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex flex-col items-end">
        <input
          id={inputId}
          type="checkbox"
          className="h-4 w-4 rounded border-edge text-brand aria-[invalid=true]:border-danger"
          checked={checked ?? false}
          ref={(element) => {
            if (element) element.indeterminate = checked === undefined
          }}
          readOnly={isReadOnly}
          disabled={isReadOnly}
          aria-invalid={isRejected}
          onChange={handleChange}
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
