import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { FieldFrame, type FieldLayout } from './FieldFrame'
import { buildFieldAria } from './fieldAria'
import {
  ADMIN_FOCUS_RING,
  adminFieldVariants,
  fieldIconPadding,
  fieldLeadingIconVariants,
} from '../adminVariants'

interface PasswordFieldProps {
  id: string
  label: string
  labelNote?: string
  value: string
  placeholder?: string
  hint?: string
  error?: string
  /** Yeni kullanıcıda "new-password", girişte "current-password". */
  autoComplete?: 'new-password' | 'current-password'
  layout?: FieldLayout
  leftIcon?: LucideIcon
  onChange: (value: string) => void
}

/** Göz düğmesi girdinin İÇİNDE sağda; metin altına girmesin diye sağ boşluk. */
const TRAILING_BUTTON_PADDING = 'pr-11'

/**
 * Şifre alanı (KK-17). `TextField`'dan ayrı: göster/gizle durumu alanın kendi
 * içinde yaşamalı — form durumuna taşınsaydı her form onu yeniden kurar ve
 * kaydederken temizlemeyi unutabilirdi.
 */
export function PasswordField({
  id,
  label,
  labelNote,
  value,
  placeholder,
  hint,
  error,
  autoComplete = 'new-password',
  layout,
  leftIcon,
  onChange,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ToggleIcon = isVisible ? EyeOff : Eye
  const LeftIcon = leftIcon

  return (
    <FieldFrame id={id} label={label} labelNote={labelNote} hint={hint} error={error} layout={layout}>
      {/* Konumlandırma kabı `FieldControl`'e bırakılmıyor: o, ikon verilmediğinde
          `relative` sarmalayıcıyı hiç kurmuyor ve göz düğmesi alandan kaçardı. */}
      <div className="relative flex min-w-0 flex-col">
        {LeftIcon !== undefined && (
          <LeftIcon aria-hidden className={fieldLeadingIconVariants()} />
        )}
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          {...buildFieldAria(id, { hint, error })}
          className={adminFieldVariants({
            tone: error === undefined ? 'plain' : 'invalid',
            className: `${TRAILING_BUTTON_PADDING} ${fieldIconPadding(leftIcon !== undefined) ?? ''}`.trim(),
          })}
        />

        {/* Giriş ekranıyla aynı metinler: kullanıcı aynı düğmeyi iki yerde tanısın. */}
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          className={`absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted hover:text-ink ${ADMIN_FOCUS_RING}`}
        >
          <ToggleIcon aria-hidden className="size-4" />
        </button>
      </div>
    </FieldFrame>
  )
}
