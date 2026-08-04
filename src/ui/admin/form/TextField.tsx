import { FieldFrame } from './FieldFrame'
import { buildFieldAria } from './fieldAria'
import { adminFieldVariants } from '../adminVariants'

interface TextFieldProps {
  id: string
  label: string
  labelNote?: string
  value: string
  placeholder?: string
  hint?: string
  error?: string
  isDisabled?: boolean
  onChange: (value: string) => void
}

export function TextField({
  id,
  label,
  labelNote,
  value,
  placeholder,
  hint,
  error,
  isDisabled = false,
  onChange,
}: TextFieldProps) {
  return (
    <FieldFrame id={id} label={label} labelNote={labelNote} hint={hint} error={error}>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
        {...buildFieldAria(id, { hint, error })}
        className={adminFieldVariants({ tone: error === undefined ? 'plain' : 'invalid' })}
      />
    </FieldFrame>
  )
}
