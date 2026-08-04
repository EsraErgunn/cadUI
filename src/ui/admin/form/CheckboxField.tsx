import { FieldError } from './FieldError'
import { FieldHint } from './FieldHint'
import { buildFieldAria, errorId, hintId } from './fieldAria'
import { ADMIN_FOCUS_RING, fieldLabelVariants } from '../adminVariants'

interface CheckboxFieldProps {
  id: string
  label: string
  labelNote?: string
  value: boolean
  hint?: string
  error?: string
  isDisabled?: boolean
  onChange: (value: boolean) => void
}

/**
 * Onay kutusu `FieldFrame` kullanmaz: etiketi girdinin SAĞINDA durur, diğer
 * alanlarda üstünde. Aynı iskeleti zorlamak, etiket-girdi sırasını çevirmek
 * için iskelete bir "yön" seçeneği eklemeyi gerektirirdi.
 */
export function CheckboxField({
  id,
  label,
  labelNote,
  value,
  hint,
  error,
  isDisabled = false,
  onChange,
}: CheckboxFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          checked={value}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.checked)}
          {...buildFieldAria(id, { hint, error })}
          className={`size-4 shrink-0 accent-admin-primary ${ADMIN_FOCUS_RING}`}
        />
        <label htmlFor={id} className={fieldLabelVariants()}>
          {label}
          {/* Bkz. FieldFrame: boşluk metin düğümü, erişilebilir ad bitişik okunmasın. */}
          {labelNote !== undefined && ' '}
          {labelNote !== undefined && (
            <span className="text-xs font-normal text-ink-muted">{labelNote}</span>
          )}
        </label>
      </div>

      {hint !== undefined && <FieldHint id={hintId(id)}>{hint}</FieldHint>}
      {error !== undefined && <FieldError id={errorId(id)}>{error}</FieldError>}
    </div>
  )
}
