import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { FieldControl } from './FieldControl'
import { FieldFrame, type FieldLayout } from './FieldFrame'
import { buildFieldAria } from './fieldAria'
import { adminFieldVariants, fieldIconPadding } from '../adminVariants'

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
  layout?: FieldLayout
  /** Girdinin içinde solda duran alanı temsil eden ikon; verilmezse hiç render edilmez. */
  leftIcon?: LucideIcon
  /** Girdinin SAĞINDA duran ek eylem ("+" ile yeni kayıt gibi); girdinin parçası değil. */
  action?: ReactNode
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
  layout,
  leftIcon,
  action,
  onChange,
}: SelectFieldProps) {
  const select = (
    <select
      id={id}
      value={value}
      disabled={isDisabled}
      onChange={(event) => onChange(event.target.value)}
      {...buildFieldAria(id, { hint, error })}
      // `pr-8`: sağdaki açılır ok yazının üstüne binmesin.
      className={adminFieldVariants({
        tone: error === undefined ? 'plain' : 'invalid',
        className: `pr-8 ${fieldIconPadding(leftIcon !== undefined) ?? ''}`.trim(),
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
  )

  return (
    <FieldFrame
      id={id}
      label={label}
      labelNote={labelNote}
      hint={hint}
      error={error}
      layout={layout}
    >
      {action === undefined ? (
        <FieldControl leftIcon={leftIcon}>{select}</FieldControl>
      ) : (
        // Eylem girdinin YANINDA, içinde değil: seçim kutusunun kendi açılır oku
        // zaten sağ kenarı kullanıyor.
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <FieldControl leftIcon={leftIcon}>{select}</FieldControl>
          </div>
          {action}
        </div>
      )}
    </FieldFrame>
  )
}
