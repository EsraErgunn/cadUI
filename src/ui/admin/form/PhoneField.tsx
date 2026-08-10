import type { LucideIcon } from 'lucide-react'
import { useLayoutEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react'

import { FieldControl } from './FieldControl'
import { FieldFrame, type FieldLayout } from './FieldFrame'
import { buildFieldAria } from './fieldAria'
import {
  caretIndexAfterDigits,
  countDigits,
  formatPhone,
  toPhoneDigits,
} from '../../../core/phone'
import { adminFieldVariants, fieldIconPadding } from '../adminVariants'

interface PhoneFieldProps {
  id: string
  label: string
  labelNote?: string
  /** HAM rakamlar (maskesiz). Maske yalnız görüntüde kurulur. */
  digits: string
  placeholder?: string
  hint?: string
  warning?: string
  error?: string
  isDisabled?: boolean
  layout?: FieldLayout
  leftIcon?: LucideIcon
  onChange: (digits: string) => void
}

/**
 * Maskeli telefon girdisi. `TextField`'dan ayrı: maske uygulandıktan sonra
 * imleci geri konumlandırmak için girdinin DOM düğümüne erişmek gerekiyor,
 * `TextField` ise yalnız değer yayınlayan denetimli bir alan.
 */
export function PhoneField({
  id,
  label,
  labelNote,
  digits,
  placeholder,
  hint,
  warning,
  error,
  isDisabled = false,
  layout,
  leftIcon,
  onChange,
}: PhoneFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  /** Bir sonraki boyamada yazılacak imleç konumu; yoksa `null`. */
  const caretRef = useRef<number | null>(null)

  // Maske yeniden kurulunca tarayıcı imleci sona atıyor. İstenen konum burada
  // geri yazılıyor; `useLayoutEffect` çünkü boyamadan ÖNCE olmalı, yoksa imleç
  // bir kare boyunca yanlış yerde görünür.
  useLayoutEffect(() => {
    const caret = caretRef.current
    if (caret === null) return

    caretRef.current = null
    inputRef.current?.setSelectionRange(caret, caret)
  })

  /**
   * Ayıraç üzerinde geri silme. Tarayıcı boşluğu silerdi ama maske hemen
   * yeniden kurulduğu için RAKAMLAR değişmez, ekranda hiçbir şey olmamış gibi
   * görünür ve kullanıcının iki kez basması gerekirdi. Burada boşluk yerine
   * ondan önceki rakam siliniyor.
   *
   * Yalnız `Backspace` ele alınıyor: `Delete` ayıracın SAĞINDAKİ rakamı
   * silmeli, yönü değişim olayından ayırt edilemez.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace') return

    const { value, selectionStart, selectionEnd } = event.currentTarget
    const hasCollapsedCaret = selectionStart !== null && selectionStart === selectionEnd
    if (!hasCollapsedCaret || selectionStart === 0) return

    // İmlecin solunda rakam varsa tarayıcının normal davranışı zaten doğru.
    if (countDigits(value[selectionStart - 1]) === 1) return

    const digitsBeforeCaret = countDigits(value.slice(0, selectionStart))
    if (digitsBeforeCaret === 0) return

    event.preventDefault()
    const nextDigits =
      digits.slice(0, digitsBeforeCaret - 1) + digits.slice(digitsBeforeCaret)

    caretRef.current = caretIndexAfterDigits(formatPhone(nextDigits), digitsBeforeCaret - 1)
    onChange(nextDigits)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, selectionStart } = event.currentTarget
    const caret = selectionStart ?? value.length
    // Konum rakam SAYISIYLA taşınır: maskedeki boşluklar kayma yaratmasın.
    const digitsBeforeCaret = countDigits(value.slice(0, caret))
    const nextDigits = toPhoneDigits(value)

    caretRef.current = caretIndexAfterDigits(formatPhone(nextDigits), digitsBeforeCaret)
    onChange(nextDigits)
  }

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="tel"
      autoComplete="tel"
      value={formatPhone(digits)}
      placeholder={placeholder}
      disabled={isDisabled}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...buildFieldAria(id, { hint, warning, error })}
      className={adminFieldVariants({
        tone: error === undefined ? 'plain' : 'invalid',
        className: fieldIconPadding(leftIcon !== undefined),
      })}
    />
  )

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
      <FieldControl leftIcon={leftIcon}>{input}</FieldControl>
    </FieldFrame>
  )
}
