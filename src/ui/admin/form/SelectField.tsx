import { FieldFrame } from './FieldFrame'
import { buildFieldAria } from './fieldAria'
import { adminFieldVariants } from '../adminVariants'

export interface SelectFieldOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id: string
  label: string
  labelNote?: string
  /** Boş dize = henüz seçilmedi. */
  value: string
  options: SelectFieldOption[]
  /** Seçim yapılmamış hâlin metni; "Seçiniz" gibi. */
  placeholder: string
  hint?: string
  error?: string
  isDisabled?: boolean
  onChange: (value: string) => void
}

export function SelectField({
  id,
  label,
  labelNote,
  value,
  options,
  placeholder,
  hint,
  error,
  isDisabled = false,
  onChange,
}: SelectFieldProps) {
  return (
    <FieldFrame id={id} label={label} labelNote={labelNote} hint={hint} error={error}>
      <select
        id={id}
        value={value}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
        {...buildFieldAria(id, { hint, error })}
        className={adminFieldVariants({
          tone: error === undefined ? 'plain' : 'invalid',
          className: 'pr-8',
        })}
      >
        {/* Seçenek listesi sunucudan geldiği için boş seçenek HER ZAMAN durur:
            kaldırılsaydı tarayıcı ilk seçeneği kullanıcı seçmiş gibi gösterirdi. */}
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  )
}
