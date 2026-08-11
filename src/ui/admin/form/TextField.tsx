import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { FieldControl } from './FieldControl'
import { FieldFrame, type FieldLayout } from './FieldFrame'
import { buildFieldAria } from './fieldAria'
import { adminFieldVariants, fieldIconPadding } from '../adminVariants'

interface TextFieldProps {
  id: string
  label: string
  labelNote?: string
  value: string
  placeholder?: string
  hint?: string
  /** Engellemeyen bilgi; hata değildir, kenarlığı kırmızıya çevirmez. */
  warning?: string
  error?: string
  isDisabled?: boolean
  /** Salt okunur alan odaklanabilir ve kopyalanabilir kalır — `isDisabled` ikisini de alır. */
  isReadOnly?: boolean
  maxLength?: number
  /** Mobil klavyeyi doğru açar; sayısal alanlarda 'numeric'. */
  inputMode?: 'text' | 'numeric' | 'tel'
  layout?: FieldLayout
  /** Girdinin içinde solda duran alanı temsil eden ikon; verilmezse hiç render edilmez. */
  leftIcon?: LucideIcon
  /**
   * Girdinin SAĞINDA, aynı satırda duran ek denetim (proje firması formunda
   * "Şahıs Şirketi" onay kutusu). Ayrı bir alan satırı açılsaydı mockup'taki
   * "vergi no ↔ şahıs şirketi" bağı görsel olarak kopardı.
   */
  trailing?: ReactNode
  onChange: (value: string) => void
  onBlur?: () => void
}

export function TextField({
  id,
  label,
  labelNote,
  value,
  placeholder,
  hint,
  warning,
  error,
  isDisabled = false,
  isReadOnly = false,
  maxLength,
  inputMode,
  layout,
  leftIcon,
  trailing,
  onChange,
  onBlur,
}: TextFieldProps) {
  const input = (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      disabled={isDisabled}
      readOnly={isReadOnly}
      maxLength={maxLength}
      inputMode={inputMode}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      {...buildFieldAria(id, { hint, warning, error })}
      className={adminFieldVariants({
        tone: error === undefined ? 'plain' : 'invalid',
        className: fieldIconPadding(leftIcon !== undefined),
      })}
    />
  )

  const control = <FieldControl leftIcon={leftIcon}>{input}</FieldControl>

  return (
    <FieldFrame
      id={id}
      label={label}
      labelNote={labelNote}
      hint={hint}
      warning={warning}
      error={error}
      layout={layout}
    >
      {trailing === undefined ? (
        control
      ) : (
        // `min-w-48`: dar ekranda girdi ile yanındaki denetim alt alta insin,
        // yan yana sıkışıp okunmaz hâle gelmesin.
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-48 flex-1 flex-col">{control}</div>
          {trailing}
        </div>
      )}
    </FieldFrame>
  )
}
