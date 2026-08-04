import { FieldFrame } from './FieldFrame'
import { buildFieldAria } from './fieldAria'
import { adminFieldVariants } from '../adminVariants'

interface DateFieldProps {
  id: string
  label: string
  labelNote?: string
  /** yyyy-aa-gg. Kullanıcıya gösterilen biçimi (gg.aa.yyyy) tarayıcı yerelden çözer. */
  value: string
  /** Geçersiz aralık takvimde hiç seçilemesin diye sınır. */
  min?: string
  max?: string
  hint?: string
  error?: string
  isDisabled?: boolean
  onChange: (value: string) => void
}

/**
 * Native `input[type=date]`: liste ekranındaki filtre çubuğu da bunu kullanıyor
 * (aynı takvim, aynı klavye davranışı) ve ek paket gerektirmiyor.
 */
export function DateField({
  id,
  label,
  labelNote,
  value,
  min,
  max,
  hint,
  error,
  isDisabled = false,
  onChange,
}: DateFieldProps) {
  return (
    <FieldFrame id={id} label={label} labelNote={labelNote} hint={hint} error={error}>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
        {...buildFieldAria(id, { hint, error })}
        className={adminFieldVariants({ tone: error === undefined ? 'plain' : 'invalid' })}
      />
    </FieldFrame>
  )
}
