import { adminFieldVariants } from './adminVariants'

export interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  id: string
  label: string
  /** "Tümü" / "Hepsi" gibi seçim yapılmamış hâlin etiketi; değeri boş dizedir. */
  emptyLabel: string
  value: string | null
  options: FilterSelectOption[]
  isDisabled?: boolean
  /** Kutunun altındaki küçük açıklama; pasif kutuda SEBEBİNİ söylemek için. */
  hint?: string
  onChange: (value: string | null) => void
}

/** Filtre çubuklarının seçim kutusu. Veri ÇEKMEZ — seçenekler prop olarak gelir,
    böylece aynı kutu hem sunucudan hem sabit listeden beslenebilir. */
export function FilterSelect({
  id,
  label,
  emptyLabel,
  value,
  options,
  isDisabled = false,
  hint,
  onChange,
}: FilterSelectProps) {
  const hintId = `${id}-hint`

  return (
    <div className="flex min-w-56 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        disabled={isDisabled}
        aria-describedby={hint === undefined ? undefined : hintId}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        className={adminFieldVariants({ className: 'pr-8' })}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint !== undefined && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
