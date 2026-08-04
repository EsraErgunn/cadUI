import type { ReactNode } from 'react'

import { FieldError } from './FieldError'
import { FieldHint } from './FieldHint'
import { errorId, hintId } from './fieldAria'
import { fieldLabelVariants } from '../adminVariants'

export interface FieldFrameProps {
  /** Etiketin `htmlFor`'u ve girdinin `id`'si aynı; bağ burada kurulur. */
  id: string
  label: string
  /** Etiketin yanındaki soluk ek: "(parametrik)", "(servis kutusu)" gibi. */
  labelNote?: string
  hint?: string
  error?: string
  children: ReactNode
}

/**
 * Alanların ortak iskeleti: etiket → girdi → yardım metni → hata.
 * Girdiyi kendisi render ETMEZ, yalnız çevresini kurar; böylece metin, seçim,
 * tarih ve sayı alanları aynı dikey ritmi ve aynı etiket bağını paylaşır.
 */
export function FieldFrame({ id, label, labelNote, hint, error, children }: FieldFrameProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabelVariants()}>
        {label}
        {/* Boşluk metin düğümü olarak konuyor: yalnız `ml-1` ile ayrılsaydı
            erişilebilir ad "Proje Tipi(parametrik)" diye bitişik okunurdu. */}
        {labelNote !== undefined && ' '}
        {labelNote !== undefined && (
          <span className="text-xs font-normal text-ink-muted">{labelNote}</span>
        )}
      </label>

      {children}

      {hint !== undefined && <FieldHint id={hintId(id)}>{hint}</FieldHint>}
      {error !== undefined && <FieldError id={errorId(id)}>{error}</FieldError>}
    </div>
  )
}
