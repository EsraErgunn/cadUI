import { FieldFrame } from './FieldFrame'
import { buildFieldAria } from './fieldAria'
import { adminTextAreaVariants } from '../adminVariants'

interface TextAreaFieldProps {
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

export function TextAreaField({
  id,
  label,
  labelNote,
  value,
  placeholder,
  hint,
  error,
  isDisabled = false,
  onChange,
}: TextAreaFieldProps) {
  return (
    <FieldFrame id={id} label={label} labelNote={labelNote} hint={hint} error={error}>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
        {...buildFieldAria(id, { hint, error })}
        className={adminTextAreaVariants({ tone: error === undefined ? 'plain' : 'invalid' })}
      />
    </FieldFrame>
  )
}
